import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const group = await db.overlapGroup.findUnique({
    where: { id: params.id },
    include: {
      institution: true,
      members: {
        include: {
          case: {
            include: {
              currentBureau: true,
              assignee: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Overlap group not found." } },
      { status: 404 }
    );
  }

  let reasons: Array<{ code: string; label: string; weight: number }> = [];
  try {
    reasons = JSON.parse(group.reasonsJson);
  } catch {
    reasons = [];
  }

  const involvedBureaus = Array.from(
    new Set(group.members.map((m) => m.case.currentBureau.code))
  );

  return NextResponse.json({
    ok: true,
    data: {
      id: group.id,
      institution: group.institution,
      kind: group.kind,
      score: group.score,
      strength: group.strength,
      status: group.status,
      leadBureauCode: group.leadBureauCode,
      resolutionNote: group.resolutionNote,
      detectedAt: group.detectedAt,
      resolvedAt: group.resolvedAt,
      reasons,
      involvedBureaus,
      members: group.members.map((m) => m.case),
      currentUserRole: session.role,
      userBureauCode: session.bureauCode,
    },
  });
}

