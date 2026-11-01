import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canMutateCase } from "@/lib/rbac";

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

  const { id } = params;

  const caseItem = await db.case.findUnique({
    where: { id },
    include: {
      institution: true,
      currentBureau: true,
      assignee: { select: { id: true, name: true, email: true, role: true } },
      actions: {
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      overlapMembers: {
        where: { group: { status: "OPEN" } },
        include: {
          group: {
            include: {
              members: {
                include: {
                  case: {
                    include: {
                      currentBureau: { select: { code: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      linksA: {
        include: {
          caseB: {
            include: { currentBureau: { select: { code: true } } },
          },
        },
      },
      linksB: {
        include: {
          caseA: {
            include: { currentBureau: { select: { code: true } } },
          },
        },
      },
    },
  });

  if (!caseItem) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Case not found." } },
      { status: 404 }
    );
  }

  // Fetch other related cases for this institution
  const relatedCases = await db.case.findMany({
    where: {
      institutionId: caseItem.institutionId,
      id: { not: caseItem.id },
    },
    select: {
      id: true,
      caseNo: true,
      category: true,
      subject: true,
      status: true,
      receivedAt: true,
      expectedDisposalAt: true,
      currentBureau: { select: { code: true, name: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: 6,
  });

  const activeOverlap = caseItem.overlapMembers[0]?.group || null;

  return NextResponse.json({
    ok: true,
    data: {
      case: caseItem,
      relatedCases,
      activeOverlap,
      canMutate: canMutateCase(session, caseItem.currentBureauId),
      currentUser: {
        id: session.userId,
        name: session.name,
        role: session.role,
        bureauCode: session.bureauCode,
      },
    },
  });
}

