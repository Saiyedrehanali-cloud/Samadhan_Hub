import { db } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { canMutateCase } from "@/lib/rbac";
import { logAudit } from "./audit";
import { scanOverlapsForInstitution } from "./overlap";

export interface CreateCaseInput {
  institutionId: string;
  category: string;
  source: string;
  subject: string;
  description: string;
  receivedAt?: Date;
  bureauId?: string;
  priority?: string;
  nextAction?: string;
}

export async function createCase(input: CreateCaseInput, session: SessionUser) {
  // Determine assigned bureau
  const bureauId =
    session.role === "MANAGEMENT" && input.bureauId ? input.bureauId : session.bureauId;

  if (!bureauId) {
    throw new Error("A valid Bureau must be assigned to create a case.");
  }

  const bureau = await db.bureau.findUnique({ where: { id: bureauId } });
  if (!bureau) throw new Error("Assigned Bureau not found.");

  const institution = await db.institution.findUnique({ where: { id: input.institutionId } });
  if (!institution) throw new Error("Selected Institution not found.");

  // Fetch SLA rule
  const slaRule = await db.slaRule.findUnique({ where: { category: input.category } });
  const slaDays = slaRule?.slaDays || 30;

  const now = new Date();
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : now;
  const expectedDisposalAt = new Date(receivedAt.getTime() + slaDays * 86400000);

  // Generate sequence Case No: AICTE/{BUREAU}/{YYYY}/{SEQ}
  const year = receivedAt.getFullYear();
  const bureauCaseCount = await db.case.count({
    where: {
      originBureauCode: bureau.code,
      receivedAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });
  const seqStr = String(bureauCaseCount + 1).padStart(4, "0");
  const caseNo = `AICTE/${bureau.code}/${year}/${seqStr}`;

  const initialActionNote = "Case registered into AICTE Central Monitoring System";

  // Create Case
  const createdCase = await db.case.create({
    data: {
      caseNo,
      institutionId: input.institutionId,
      currentBureauId: bureau.id,
      assigneeId: session.userId,
      category: input.category,
      source: input.source,
      subject: input.subject.trim(),
      description: input.description.trim(),
      status: "RECEIVED",
      priority: input.priority || "NORMAL",
      receivedAt,
      slaDays,
      expectedDisposalAt,
      lastActionAt: receivedAt,
      lastActionNote: initialActionNote,
      nextAction: input.nextAction || "Preliminary document scrutiny",
      originBureauCode: bureau.code,
      createdAt: now,
    },
    include: {
      institution: true,
      currentBureau: true,
    },
  });

  // Write initial CaseAction
  await db.caseAction.create({
    data: {
      caseId: createdCase.id,
      actorId: session.userId,
      bureauCode: bureau.code,
      type: "CREATE",
      fromValue: null,
      toValue: "RECEIVED",
      remarks: initialActionNote,
      createdAt: now,
    },
  });

  // Cryptographic audit log
  await logAudit({
    actorId: session.userId,
    action: "CASE_CREATED",
    entity: "Case",
    entityId: createdCase.id,
    payload: {
      caseNo: createdCase.caseNo,
      institution: institution.name,
      bureau: bureau.code,
      category: input.category,
    },
  });

  // Trigger immediate overlap detection scan
  await scanOverlapsForInstitution(createdCase.institutionId);

  // Check if an overlap group was formed on this case
  const activeOverlapMember = await db.overlapMember.findFirst({
    where: {
      caseId: createdCase.id,
      group: { status: "OPEN" },
    },
    include: { group: true },
  });

  return {
    case: createdCase,
    overlapFlag: activeOverlapMember?.group || null,
  };
}

export async function addCaseRemark(caseId: string, remarks: string, session: SessionUser) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { currentBureau: true },
  });
  if (!c) throw new Error("Case not found.");

  if (!canMutateCase(session, c.currentBureauId)) {
    throw new Error("You do not have permission to modify cases held by another Bureau.");
  }

  const now = new Date();
  await db.case.update({
    where: { id: caseId },
    data: {
      lastActionAt: now,
      lastActionNote: remarks.trim(),
    },
  });

  const action = await db.caseAction.create({
    data: {
      caseId,
      actorId: session.userId,
      bureauCode: session.bureauCode || c.currentBureau.code,
      type: "REMARK",
      fromValue: null,
      toValue: null,
      remarks: remarks.trim(),
      createdAt: now,
    },
  });

  await logAudit({
    actorId: session.userId,
    action: "CASE_REMARK_ADDED",
    entity: "Case",
    entityId: caseId,
    payload: { remarks: remarks.trim() },
  });

  return action;
}

export async function updateCaseStatus(
  caseId: string,
  toStatus: string,
  remarks: string,
  session: SessionUser
) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { currentBureau: true },
  });
  if (!c) throw new Error("Case not found.");

  if (!canMutateCase(session, c.currentBureauId)) {
    throw new Error("You do not have permission to update status for cases held by another Bureau.");
  }

  const now = new Date();
  const oldStatus = c.status;

  await db.case.update({
    where: { id: caseId },
    data: {
      status: toStatus,
      lastActionAt: now,
      lastActionNote: remarks.trim(),
    },
  });

  const action = await db.caseAction.create({
    data: {
      caseId,
      actorId: session.userId,
      bureauCode: session.bureauCode || c.currentBureau.code,
      type: "STATUS_CHANGE",
      fromValue: oldStatus,
      toValue: toStatus,
      remarks: remarks.trim(),
      createdAt: now,
    },
  });

  await logAudit({
    actorId: session.userId,
    action: "CASE_STATUS_CHANGED",
    entity: "Case",
    entityId: caseId,
    payload: { fromStatus: oldStatus, toStatus, remarks },
  });

  return action;
}

export async function transferCase(
  caseId: string,
  toBureauCode: string,
  reason: string,
  session: SessionUser
) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { currentBureau: true },
  });
  if (!c) throw new Error("Case not found.");

  if (!canMutateCase(session, c.currentBureauId)) {
    throw new Error("You do not have permission to transfer cases held by another Bureau.");
  }

  const targetBureau = await db.bureau.findUnique({ where: { code: toBureauCode } });
  if (!targetBureau) throw new Error(`Target Bureau ${toBureauCode} not found.`);

  if (targetBureau.id === c.currentBureauId) {
    throw new Error("Case is already assigned to this Bureau.");
  }

  const now = new Date();
  const fromBureauCode = c.currentBureau.code;

  await db.case.update({
    where: { id: caseId },
    data: {
      currentBureauId: targetBureau.id,
      status: "TRANSFERRED",
      lastActionAt: now,
      lastActionNote: `Transferred to ${toBureauCode}: ${reason.trim()}`,
      nextAction: "Assign investigator at receiving Bureau",
    },
  });

  const action = await db.caseAction.create({
    data: {
      caseId,
      actorId: session.userId,
      bureauCode: fromBureauCode,
      type: "TRANSFER",
      fromValue: fromBureauCode,
      toValue: toBureauCode,
      remarks: reason.trim(),
      createdAt: now,
    },
  });

  await logAudit({
    actorId: session.userId,
    action: "CASE_TRANSFERRED",
    entity: "Case",
    entityId: caseId,
    payload: { fromBureau: fromBureauCode, toBureau: toBureauCode, reason: reason.trim() },
  });

  // Re-run overlap scan for this institution because moving bureaus can trigger or resolve overlaps
  await scanOverlapsForInstitution(c.institutionId);

  return action;
}

export async function escalateCase(caseId: string, remarks: string, session: SessionUser) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { currentBureau: true, institution: true },
  });
  if (!c) throw new Error("Case not found.");

  const now = new Date();
  const oldStatus = c.status;

  await db.case.update({
    where: { id: caseId },
    data: {
      status: "ESCALATED",
      priority: "HIGH",
      lastActionAt: now,
      lastActionNote: `Escalated to Management: ${remarks.trim()}`,
      nextAction: "Advisor Management hearing & review",
    },
  });

  const action = await db.caseAction.create({
    data: {
      caseId,
      actorId: session.userId,
      bureauCode: session.bureauCode || c.currentBureau.code,
      type: "ESCALATE",
      fromValue: oldStatus,
      toValue: "ESCALATED",
      remarks: remarks.trim(),
      createdAt: now,
    },
  });

  // Create high-priority alert for Management
  await db.alert.upsert({
    where: {
      caseId_type_key_audience: {
        caseId: c.id,
        type: "ESCALATION",
        key: `escalate_${c.id}`,
        audience: "MANAGEMENT",
      },
    },
    update: { isRead: false },
    create: {
      caseId: c.id,
      type: "ESCALATION",
      key: `escalate_${c.id}`,
      severity: "DANGER",
      audience: "MANAGEMENT",
      title: `Case Escalated: ${c.caseNo}`,
      message: `Escalated by ${session.name}: ${remarks.trim()} (${c.institution.name})`,
    },
  });

  await logAudit({
    actorId: session.userId,
    action: "CASE_ESCALATED",
    entity: "Case",
    entityId: caseId,
    payload: { remarks: remarks.trim() },
  });

  return action;
}

export async function disposeCase(caseId: string, outcome: string, session: SessionUser) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { currentBureau: true },
  });
  if (!c) throw new Error("Case not found.");

  if (!canMutateCase(session, c.currentBureauId)) {
    throw new Error("You do not have permission to dispose cases held by another Bureau.");
  }

  if (!outcome || outcome.trim().length < 5) {
    throw new Error("A clear resolution outcome (minimum 5 characters) is required to dispose a case.");
  }

  const now = new Date();
  const oldStatus = c.status;

  await db.case.update({
    where: { id: caseId },
    data: {
      status: "DISPOSED",
      disposedAt: now,
      outcome: outcome.trim(),
      lastActionAt: now,
      lastActionNote: `Case disposed: ${outcome.trim()}`,
      nextAction: null,
    },
  });

  const action = await db.caseAction.create({
    data: {
      caseId,
      actorId: session.userId,
      bureauCode: session.bureauCode || c.currentBureau.code,
      type: "DISPOSE",
      fromValue: oldStatus,
      toValue: "DISPOSED",
      remarks: outcome.trim(),
      createdAt: now,
    },
  });

  await logAudit({
    actorId: session.userId,
    action: "CASE_DISPOSED",
    entity: "Case",
    entityId: caseId,
    payload: { outcome: outcome.trim() },
  });

  // Re-run overlap scan so any overlap groups with < 2 remaining open cases are auto-resolved
  await scanOverlapsForInstitution(c.institutionId);

  return action;
}

