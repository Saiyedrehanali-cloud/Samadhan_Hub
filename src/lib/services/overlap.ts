import { db } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { logAudit } from "./audit";
import {
  jaccardSimilarity,
  tfIdfCosineSimilarity,
  extractSharedKeywords,
} from "./text";

interface CaseRecord {
  id: string;
  caseNo: string;
  institutionId: string;
  currentBureauId: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  receivedAt: Date;
  nextAction?: string | null;
  lastActionNote?: string | null;
}

const RELATED_CATEGORIES: Record<string, string[]> = {
  "Fee Regulation": ["Admission"],
  Admission: ["Fee Regulation", "Affiliation"],
  Harassment: ["Other"],
  Affiliation: ["Admission"],
};

export interface OverlapScoreResult {
  score: number;
  strength: "STRONG" | "POSSIBLE" | "NONE";
  kind: "CROSS_BUREAU" | "DUPLICATE" | "POSSIBLE_CONFLICT";
  reasons: Array<{ code: string; label: string; weight: number }>;
}

export function scorePair(
  caseA: CaseRecord,
  caseB: CaseRecord,
  institutionName: string,
  aicteId: string,
  bureauACode: string,
  bureauBCode: string
): OverlapScoreResult {
  const reasons: Array<{ code: string; label: string; weight: number }> = [];
  let totalScore = 0;

  // 1. Same institution (0.40 base)
  totalScore += 0.4;
  reasons.push({
    code: "SAME_INSTITUTION",
    label: `Same institution: ${institutionName} (${aicteId})`,
    weight: 0.4,
  });

  // 2. Different Bureaus/Cells (0.20 if different, 0 if same)
  const isDifferentBureaus = caseA.currentBureauId !== caseB.currentBureauId;
  if (isDifferentBureaus) {
    totalScore += 0.2;
    reasons.push({
      code: "DIFFERENT_BUREAUS",
      label: `Handled across ${bureauACode} and ${bureauBCode}`,
      weight: 0.2,
    });
  }

  // 3. Category Match (0.15 equal, 0.08 related)
  if (caseA.category === caseB.category) {
    totalScore += 0.15;
    reasons.push({
      code: "SAME_CATEGORY",
      label: `Identical category: ${caseA.category}`,
      weight: 0.15,
    });
  } else if (
    RELATED_CATEGORIES[caseA.category]?.includes(caseB.category) ||
    RELATED_CATEGORIES[caseB.category]?.includes(caseA.category)
  ) {
    totalScore += 0.08;
    reasons.push({
      code: "RELATED_CATEGORY",
      label: `Related categories: ${caseA.category} ↔ ${caseB.category}`,
      weight: 0.08,
    });
  }

  // 4. Text Similarity (up to 0.15 max via TF-IDF Cosine & Jaccard)
  const textA = `${caseA.subject} ${caseA.description}`;
  const textB = `${caseB.subject} ${caseB.description}`;
  const jaccard = jaccardSimilarity(textA, textB);
  const cosine = tfIdfCosineSimilarity(textA, textB);
  const maxSimilarity = Math.max(jaccard, cosine);
  const textScore = Math.min(0.15, Math.round(maxSimilarity * 0.3 * 100) / 100);

  if (textScore >= 0.05) {
    const sharedTerms = extractSharedKeywords(textA, textB);
    totalScore += textScore;
    reasons.push({
      code: "SIMILAR_WORDING",
      label: `Textual similarity (key terms: ${sharedTerms.join(", ") || "shared allegations"})`,
      weight: textScore,
    });
  }

  // 5. Time Proximity (within 90 days = 0.10, within 180 days = 0.05)
  const diffDays = Math.abs(caseA.receivedAt.getTime() - caseB.receivedAt.getTime()) / 86400000;
  if (diffDays <= 90) {
    totalScore += 0.1;
    reasons.push({
      code: "WITHIN_90_DAYS",
      label: `Received within ${Math.round(diffDays)} days of each other`,
      weight: 0.1,
    });
  } else if (diffDays <= 180) {
    totalScore += 0.05;
    reasons.push({
      code: "WITHIN_180_DAYS",
      label: `Received ${Math.round(diffDays)} days apart`,
      weight: 0.05,
    });
  }

  const roundedScore = Math.min(1.0, Math.round(totalScore * 100) / 100);

  // Determine Overlap Kind
  let kind: "CROSS_BUREAU" | "DUPLICATE" | "POSSIBLE_CONFLICT" = "CROSS_BUREAU";
  if (!isDifferentBureaus) {
    kind = "DUPLICATE";
  } else {
    // Check for conflicting actions
    const combinedNotes = `${caseA.nextAction || ""} ${caseA.lastActionNote || ""} ${caseB.nextAction || ""} ${caseB.lastActionNote || ""}`.toLowerCase();
    const hasAdverse =
      combinedNotes.includes("show-cause") ||
      combinedNotes.includes("penalty") ||
      combinedNotes.includes("withdraw approval") ||
      combinedNotes.includes("notice");
    const hasClosing =
      combinedNotes.includes("resolve") ||
      combinedNotes.includes("closing") ||
      combinedNotes.includes("compliance accepted") ||
      combinedNotes.includes("closed");

    if (hasAdverse && hasClosing) {
      kind = "POSSIBLE_CONFLICT";
      reasons.push({
        code: "CONFLICTING_ACTIONS",
        label: "Conflicting actions detected: one Bureau pursuing adverse regulatory step while another is closing inquiry",
        weight: 0.1,
      });
    }
  }

  let strength: "STRONG" | "POSSIBLE" | "NONE" = "NONE";
  if (roundedScore >= 0.75) {
    strength = "STRONG";
  } else if (roundedScore >= 0.6) {
    strength = "POSSIBLE";
  }

  return {
    score: roundedScore,
    strength,
    kind,
    reasons,
  };
}

/**
 * Scans open cases for an institution and creates/updates OverlapGroup entities.
 */
export async function scanOverlapsForInstitution(institutionId: string) {
  const institution = await db.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true, aicteId: true },
  });
  if (!institution) return;

  const openCases = await db.case.findMany({
    where: {
      institutionId,
      status: { not: "DISPOSED" },
    },
    include: {
      currentBureau: { select: { code: true } },
    },
    orderBy: { receivedAt: "asc" },
  });

  // If fewer than 2 open cases, auto-resolve any open overlap groups
  if (openCases.length < 2) {
    await db.overlapGroup.updateMany({
      where: {
        institutionId,
        status: "OPEN",
      },
      data: {
        status: "COORDINATED",
        resolutionNote: "Auto-coordinated: fewer than 2 active open cases remain for this institution.",
        resolvedAt: new Date(),
      },
    });
    return;
  }

  // Find all pairs with score >= 0.60
  const overlappingPairs: Array<{
    caseA: typeof openCases[0];
    caseB: typeof openCases[0];
    result: OverlapScoreResult;
  }> = [];

  for (let i = 0; i < openCases.length; i++) {
    for (let j = i + 1; j < openCases.length; j++) {
      const a = openCases[i];
      const b = openCases[j];
      const result = scorePair(
        a,
        b,
        institution.name,
        institution.aicteId,
        a.currentBureau.code,
        b.currentBureau.code
      );

      if (result.score >= 0.6) {
        overlappingPairs.push({ caseA: a, caseB: b, result });
      }
    }
  }

  // Connected Components / Union-Find
  const parent: Record<string, string> = {};
  function find(id: string): string {
    if (!parent[id]) parent[id] = id;
    if (parent[id] !== id) parent[id] = find(parent[id]);
    return parent[id];
  }
  function union(idA: string, idB: string) {
    const rootA = find(idA);
    const rootB = find(idB);
    if (rootA !== rootB) parent[rootA] = rootB;
  }

  for (const pair of overlappingPairs) {
    union(pair.caseA.id, pair.caseB.id);
  }

  const groupsByRoot: Record<string, Set<string>> = {};
  for (const pair of overlappingPairs) {
    const root = find(pair.caseA.id);
    if (!groupsByRoot[root]) groupsByRoot[root] = new Set();
    groupsByRoot[root].add(pair.caseA.id);
    groupsByRoot[root].add(pair.caseB.id);
  }

  for (const root of Object.keys(groupsByRoot)) {
    const memberCaseIds = Array.from(groupsByRoot[root]).sort();
    if (memberCaseIds.length < 2) continue;

    const relevantPairs = overlappingPairs.filter(
      (p) => memberCaseIds.includes(p.caseA.id) && memberCaseIds.includes(p.caseB.id)
    );
    const topPair = relevantPairs.sort((a, b) => b.result.score - a.result.score)[0];
    if (!topPair) continue;

    const existingGroups = await db.overlapGroup.findMany({
      where: {
        institutionId,
        members: { some: { caseId: { in: memberCaseIds } } },
      },
      include: { members: true },
    });

    const matchingGroup = existingGroups.find((g) => {
      const gMemberIds = g.members.map((m) => m.caseId).sort();
      return (
        gMemberIds.length === memberCaseIds.length &&
        gMemberIds.every((id, idx) => id === memberCaseIds[idx])
      );
    });

    // Dismissed group stays dismissed if members unchanged
    if (matchingGroup && matchingGroup.status === "DISMISSED") {
      continue;
    }

    if (matchingGroup) {
      await db.overlapGroup.update({
        where: { id: matchingGroup.id },
        data: {
          score: topPair.result.score,
          strength: topPair.result.strength,
          kind: topPair.result.kind,
          reasonsJson: JSON.stringify(topPair.result.reasons),
        },
      });
    } else {
      const newGroup = await db.overlapGroup.create({
        data: {
          institutionId,
          score: topPair.result.score,
          strength: topPair.result.strength,
          kind: topPair.result.kind,
          reasonsJson: JSON.stringify(topPair.result.reasons),
          status: "OPEN",
          members: {
            create: memberCaseIds.map((caseId) => ({ caseId })),
          },
        },
      });

      const bureausInvolved = Array.from(
        new Set(
          openCases
            .filter((c) => memberCaseIds.includes(c.id))
            .map((c) => c.currentBureau.code)
        )
      );

      for (const bCode of bureausInvolved) {
        await db.alert.upsert({
          where: {
            caseId_type_key_audience: {
              caseId: memberCaseIds[0],
              type: "OVERLAP_DETECTED",
              key: `overlap_${newGroup.id}`,
              audience: `BUREAU:${bCode}`,
            },
          },
          update: {},
          create: {
            overlapGroupId: newGroup.id,
            caseId: memberCaseIds[0],
            type: "OVERLAP_DETECTED",
            key: `overlap_${newGroup.id}`,
            severity: "WARNING",
            audience: `BUREAU:${bCode}`,
            title: "Potential Overlapping Case – Coordination Required",
            message: `Overlap detected on ${institution.name} across ${bureausInvolved.join(" and ")}.`,
          },
        });
      }

      if (topPair.result.strength === "STRONG" || topPair.result.kind === "POSSIBLE_CONFLICT") {
        await db.alert.upsert({
          where: {
            caseId_type_key_audience: {
              caseId: memberCaseIds[0],
              type: "OVERLAP_DETECTED",
              key: `overlap_${newGroup.id}`,
              audience: "MANAGEMENT",
            },
          },
          update: {},
          create: {
            overlapGroupId: newGroup.id,
            caseId: memberCaseIds[0],
            type: "OVERLAP_DETECTED",
            key: `overlap_${newGroup.id}`,
            severity: topPair.result.kind === "POSSIBLE_CONFLICT" ? "DANGER" : "WARNING",
            audience: "MANAGEMENT",
            title: `Cross-Bureau Overlap: ${institution.name}`,
            message: `${topPair.result.strength} overlap (${topPair.result.kind}) detected across ${bureausInvolved.join(", ")}.`,
          },
        });
      }
    }
  }
}

/**
 * Coordination Action 1: Link Cases mutually in a group.
 */
export async function linkCasesInGroup(
  groupId: string,
  remarks: string,
  session: SessionUser
) {
  const group = await db.overlapGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { case: true } } },
  });
  if (!group) throw new Error("Overlap group not found.");

  const memberCases = group.members.map((m) => m.case);
  const now = new Date();

  // Create mutual CaseLinks for all pairs
  for (let i = 0; i < memberCases.length; i++) {
    for (let j = i + 1; j < memberCases.length; j++) {
      const cA = memberCases[i];
      const cB = memberCases[j];
      const [caseAId, caseBId] = cA.id < cB.id ? [cA.id, cB.id] : [cB.id, cA.id];

      await db.caseLink.upsert({
        where: {
          caseAId_caseBId: { caseAId, caseBId },
        },
        update: { reason: remarks },
        create: {
          caseAId,
          caseBId,
          reason: remarks,
          linkedById: session.userId,
          createdAt: now,
        },
      });
    }
  }

  // Append timeline note to each case
  for (const c of memberCases) {
    await db.caseAction.create({
      data: {
        caseId: c.id,
        actorId: session.userId,
        bureauCode: session.bureauCode || "RB",
        type: "LINK",
        remarks: `Cases linked for joint review: ${remarks}`,
        createdAt: now,
      },
    });
  }

  await logAudit({
    actorId: session.userId,
    action: "OVERLAP_CASES_LINKED",
    entity: "OverlapGroup",
    entityId: groupId,
    payload: { remarks, memberCount: memberCases.length },
  });

  return { success: true };
}

/**
 * Coordination Action 2: Mark Coordinated (Designate Lead Bureau).
 */
export async function markGroupCoordinated(
  groupId: string,
  leadBureauCode: string,
  remarks: string,
  session: SessionUser
) {
  const group = await db.overlapGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { case: true } } },
  });
  if (!group) throw new Error("Overlap group not found.");

  const now = new Date();

  await db.overlapGroup.update({
    where: { id: groupId },
    data: {
      status: "COORDINATED",
      leadBureauCode,
      resolutionNote: remarks,
      resolvedById: session.userId,
      resolvedAt: now,
    },
  });

  // Clear active overlap alerts for this group
  await db.alert.updateMany({
    where: { overlapGroupId: groupId },
    data: { isRead: true },
  });

  // Record timeline event on each member case
  for (const m of group.members) {
    await db.caseAction.create({
      data: {
        caseId: m.case.id,
        actorId: session.userId,
        bureauCode: session.bureauCode || leadBureauCode,
        type: "OVERLAP_COORDINATED",
        remarks: `Overlap coordinated with Lead Bureau ${leadBureauCode}: ${remarks}`,
        createdAt: now,
      },
    });
  }

  await logAudit({
    actorId: session.userId,
    action: "OVERLAP_COORDINATED",
    entity: "OverlapGroup",
    entityId: groupId,
    payload: { leadBureauCode, remarks },
  });

  return { success: true };
}

/**
 * Coordination Action 3: Dismiss Advisory with Reason.
 */
export async function dismissGroup(
  groupId: string,
  reason: string,
  session: SessionUser
) {
  const group = await db.overlapGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { case: true } } },
  });
  if (!group) throw new Error("Overlap group not found.");

  if (!reason || reason.trim().length < 5) {
    throw new Error("A clear justification (minimum 5 characters) is required to dismiss an overlap advisory.");
  }

  const now = new Date();

  await db.overlapGroup.update({
    where: { id: groupId },
    data: {
      status: "DISMISSED",
      resolutionNote: reason.trim(),
      resolvedById: session.userId,
      resolvedAt: now,
    },
  });

  // Clear active alerts
  await db.alert.updateMany({
    where: { overlapGroupId: groupId },
    data: { isRead: true },
  });

  // Record timeline event on each member case
  for (const m of group.members) {
    await db.caseAction.create({
      data: {
        caseId: m.case.id,
        actorId: session.userId,
        bureauCode: session.bureauCode || "RB",
        type: "OVERLAP_DISMISSED",
        remarks: `Overlap advisory dismissed: ${reason.trim()}`,
        createdAt: now,
      },
    });
  }

  await logAudit({
    actorId: session.userId,
    action: "OVERLAP_DISMISSED",
    entity: "OverlapGroup",
    entityId: groupId,
    payload: { reason: reason.trim() },
  });

  return { success: true };
}

/**
 * Scans all technical institutions across AICTE for active overlaps.
 */
export async function scanAllOverlaps() {
  const institutions = await db.institution.findMany({
    select: { id: true },
  });

  for (const inst of institutions) {
    await scanOverlapsForInstitution(inst.id);
  }
}
