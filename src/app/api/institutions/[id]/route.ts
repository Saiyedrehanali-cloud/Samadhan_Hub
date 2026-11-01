import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
        { status: 401 }
      );
    }

    const { id } = params;

    const institution = await db.institution.findUnique({
      where: { id },
      include: {
        overlapGroups: {
          where: { status: "OPEN" },
          include: {
            members: {
              include: {
                case: {
                  select: {
                    id: true,
                    caseNo: true,
                    currentBureau: true,
                  },
                },
              },
            },
          },
        },
        cases: {
          include: {
            currentBureau: {
              select: {
                code: true,
                name: true,
              },
            },
            assignee: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { receivedAt: "desc" },
        },
      },
    });

    if (!institution) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Institution not found" } },
        { status: 404 }
      );
    }

    // Regional Officer scope check
    if (session.role === "REGIONAL_OFFICER" && session.region && institution.region !== session.region) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Access restricted to institutions in your region." } },
        { status: 403 }
      );
    }

    // Calculate active workload mini-distribution across bureaus
    const openCases = institution.cases.filter((c) => c.status !== "DISPOSED");
    const workloadByBureau: Record<string, number> = {
      RB: 0,
      PGRC: 0,
      AB: 0,
      LC: 0,
    };

    openCases.forEach((c) => {
      const code = c.currentBureau.code;
      if (workloadByBureau[code] !== undefined) {
        workloadByBureau[code]++;
      } else {
        workloadByBureau[code] = 1;
      }
    });

    const activeOverlap = institution.overlapGroups[0] || null;

    return NextResponse.json({
      ok: true,
      data: {
        institution: {
          id: institution.id,
          aicteId: institution.aicteId,
          name: institution.name,
          address: institution.address,
          city: institution.city,
          state: institution.state,
          region: institution.region,
          type: institution.type,
        },
        stats: {
          totalCases: institution.cases.length,
          openCases: openCases.length,
          disposedCases: institution.cases.length - openCases.length,
          workloadByBureau,
        },
        activeOverlap: activeOverlap
          ? {
              id: activeOverlap.id,
              strength: activeOverlap.strength,
              kind: activeOverlap.kind,
              score: activeOverlap.score,
              reasons: JSON.parse(activeOverlap.reasonsJson || "[]"),
              detectedAt: activeOverlap.detectedAt,
              bureausInvolved: Array.from(
                new Set(activeOverlap.members.map((m) => m.case.currentBureau.code))
              ),
            }
          : null,
        cases: institution.cases.map((c) => ({
          id: c.id,
          caseNo: c.caseNo,
          subject: c.subject,
          category: c.category,
          source: c.source,
          status: c.status,
          priority: c.priority,
          receivedAt: c.receivedAt,
          expectedDisposalAt: c.expectedDisposalAt,
          disposedAt: c.disposedAt,
          bureauCode: c.currentBureau.code,
          bureauName: c.currentBureau.name,
          assigneeName: c.assignee?.name || "Unassigned",
        })),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/institutions/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to load institution profile" } },
      { status: 500 }
    );
  }
}
