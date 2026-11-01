import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { overlapScope } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") || "OPEN"; // OPEN | COORDINATED | DISMISSED

  const baseScope = overlapScope(session);

  const groups = await db.overlapGroup.findMany({
    where: {
      ...baseScope,
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    },
    include: {
      institution: {
        select: { id: true, name: true, aicteId: true, region: true, city: true },
      },
      members: {
        include: {
          case: {
            select: {
              id: true,
              caseNo: true,
              category: true,
              subject: true,
              status: true,
              priority: true,
              receivedAt: true,
              currentBureau: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ score: "desc" }, { detectedAt: "desc" }],
  });

  const mapped = groups.map((g) => {
    let reasons: Array<{ code: string; label: string; weight: number }> = [];
    try {
      reasons = JSON.parse(g.reasonsJson);
    } catch {
      reasons = [];
    }

    const involvedBureaus = Array.from(
      new Set(g.members.map((m) => m.case.currentBureau.code))
    );

    return {
      id: g.id,
      institution: g.institution,
      kind: g.kind,
      score: g.score,
      strength: g.strength,
      status: g.status,
      leadBureauCode: g.leadBureauCode,
      resolutionNote: g.resolutionNote,
      detectedAt: g.detectedAt,
      resolvedAt: g.resolvedAt,
      reasons,
      involvedBureaus,
      members: g.members.map((m) => m.case),
    };
  });

  return NextResponse.json({
    ok: true,
    data: mapped,
  });
}

