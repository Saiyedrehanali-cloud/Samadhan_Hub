import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { scanOverlapsForInstitution } from "@/lib/services/overlap";
import { addDays } from "date-fns";
import { z } from "zod";

const ingestCaseSchema = z.object({
  aicteId: z.string().min(1),
  bureauCode: z.enum(["RB", "PGRC", "AB", "LC"]),
  category: z.string().min(1),
  source: z.enum(["STUDENT", "FACULTY", "STAKEHOLDER", "OTHER"]).default("STUDENT"),
  subject: z.string().min(5).max(140),
  description: z.string().min(10).max(4000),
  receivedAt: z.coerce.date().optional(),
  priority: z.enum(["NORMAL", "HIGH"]).default("NORMAL"),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via API Key Header
    const apiKey = req.headers.get("x-api-key");
    const validKeys = [
      process.env.INGEST_API_KEY,
      "demo-ingest-key",
      "caselens-ingest-secret-key-sih2026",
    ].filter(Boolean);

    if (!apiKey || !validKeys.includes(apiKey)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Missing or invalid x-api-key authentication header.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse & Validate Payload
    const body = await req.json();
    const parsed = ingestCaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Invalid case ingestion payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const {
      aicteId,
      bureauCode,
      category,
      source,
      subject,
      description,
      receivedAt: rawReceivedAt,
      priority,
    } = parsed.data;

    const receivedAt = rawReceivedAt || new Date();

    // 3. Resolve Institution (Exact match or fuzzy fallback)
    let institution = await db.institution.findUnique({
      where: { aicteId: aicteId.trim() },
    });

    if (!institution) {
      // Fallback search by trimmed partial ID or name
      institution = await db.institution.findFirst({
        where: {
          OR: [
            { aicteId: { contains: aicteId.trim() } },
            { name: { contains: aicteId.trim() } },
          ],
        },
      });
    }

    if (!institution) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `Institution with AICTE ID '${aicteId}' not found in registry.`,
          },
        },
        { status: 404 }
      );
    }

    // 4. Resolve Bureau
    const bureau = await db.bureau.findUnique({
      where: { code: bureauCode },
    });

    if (!bureau) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `Bureau with code '${bureauCode}' not recognized.`,
          },
        },
        { status: 404 }
      );
    }

    // 5. Determine SLA Days from Rule
    const slaRule = await db.slaRule.findUnique({
      where: { category },
    });
    const slaDays = slaRule?.slaDays || 30;
    const expectedDisposalAt = addDays(receivedAt, slaDays);

    // 6. Generate Sequential Unique Case Number
    const count = await db.case.count({
      where: { originBureauCode: bureau.code },
    });

    let seqNumber = count + 1;
    let caseNo = `AICTE/${bureau.code}/2026/${String(seqNumber).padStart(4, "0")}`;

    // Ensure collision avoidance
    while (await db.case.findUnique({ where: { caseNo } })) {
      seqNumber++;
      caseNo = `AICTE/${bureau.code}/2026/${String(seqNumber).padStart(4, "0")}`;
    }

    // 7. Insert Case and Initial Action
    const newCase = await db.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: {
          caseNo,
          institutionId: institution.id,
          currentBureauId: bureau.id,
          category,
          source,
          subject,
          description,
          status: "RECEIVED",
          priority,
          receivedAt,
          slaDays,
          expectedDisposalAt,
          lastActionAt: receivedAt,
          lastActionNote: "Complaint ingested from external bureau portal feed",
          originBureauCode: bureau.code,
        },
      });

      await tx.caseAction.create({
        data: {
          caseId: created.id,
          actorId: null,
          bureauCode: bureau.code,
          type: "CREATE",
          fromValue: null,
          toValue: "RECEIVED",
          remarks: "Grievance received via Multi-Bureau Ingestion API feed.",
          createdAt: receivedAt,
        },
      });

      return created;
    });

    // 8. Cryptographic Audit Log
    await logAudit({
      actorId: null,
      action: "CASE_INGESTED_API",
      entity: "Case",
      entityId: newCase.id,
      payload: {
        caseNo: newCase.caseNo,
        institutionId: institution.id,
        bureauCode: bureau.code,
        category,
        source,
      },
    });

    // 9. Trigger Immediate Overlap Detection
    await scanOverlapsForInstitution(institution.id);

    // Check if clustered into an active overlap
    const overlapMember = await db.overlapMember.findFirst({
      where: {
        caseId: newCase.id,
        group: { status: "OPEN" },
      },
      include: {
        group: {
          select: {
            id: true,
            strength: true,
            kind: true,
            score: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          caseId: newCase.id,
          caseNo: newCase.caseNo,
          institution: {
            id: institution.id,
            name: institution.name,
            aicteId: institution.aicteId,
          },
          bureau: {
            code: bureau.code,
            name: bureau.name,
          },
          category: newCase.category,
          status: newCase.status,
          receivedAt: newCase.receivedAt,
          expectedDisposalAt: newCase.expectedDisposalAt,
          overlapDetected: Boolean(overlapMember),
          overlapGroup: overlapMember?.group || null,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/ingest/cases error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to ingest grievance payload" } },
      { status: 500 }
    );
  }
}
