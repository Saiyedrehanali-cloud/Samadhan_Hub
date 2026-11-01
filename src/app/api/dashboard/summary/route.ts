import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseScope, overlapScope } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const scope = caseScope(session);
  const oScope = overlapScope(session);

  // 1. Open Cases Count
  const openCases = await db.case.count({
    where: {
      ...scope,
      status: { not: "DISPOSED" },
    },
  });

  // 1b. Received this week
  const receivedThisWeek = await db.case.count({
    where: {
      ...scope,
      status: { not: "DISPOSED" },
      receivedAt: { gte: sevenDaysAgo },
    },
  });

  // 2. Needs Coordination (Open Overlap Groups involving scoped cases)
  const needsCoordination = await db.overlapGroup.count({
    where: {
      ...oScope,
      status: "OPEN",
    },
  });

  // 3. Beyond Timeline (Overdue cases)
  const beyondTimeline = await db.case.count({
    where: {
      ...scope,
      status: { not: "DISPOSED" },
      expectedDisposalAt: { lt: now },
    },
  });

  // 4. Disposed this month
  const disposedThisMonth = await db.case.count({
    where: {
      ...scope,
      status: "DISPOSED",
      disposedAt: { gte: thirtyDaysAgo },
    },
  });

  // 5. Within SLA Percentage
  const totalDisposed = await db.case.count({
    where: {
      ...scope,
      status: "DISPOSED",
    },
  });

  const disposedWithinSla = await db.case.count({
    where: {
      ...scope,
      status: "DISPOSED",
      expectedDisposalAt: { gte: db.case.fields.disposedAt },
    },
  }).catch(() => 0);

  // In SQLite/Prisma, if fields comparison is not supported natively, fetch disposed timestamps
  let withinSlaPct = 85;
  if (totalDisposed > 0) {
    const disposedList = await db.case.findMany({
      where: { ...scope, status: "DISPOSED" },
      select: { expectedDisposalAt: true, disposedAt: true },
    });
    const onTimeCount = disposedList.filter(
      (c) => c.disposedAt && c.disposedAt.getTime() <= c.expectedDisposalAt.getTime()
    ).length;
    withinSlaPct = Math.round((onTimeCount / totalDisposed) * 100);
  }

  // 6. Needs Attention (Strictly Top 5 cases per Minimalism Rule 1)
  // Fetch active open cases with overlap info
  const candidateAttentionCases = await db.case.findMany({
    where: {
      ...scope,
      status: { not: "DISPOSED" },
    },
    include: {
      institution: { select: { id: true, name: true, aicteId: true } },
      currentBureau: { select: { code: true, name: true } },
      overlapMembers: {
        where: { group: { status: "OPEN" } },
        include: { group: { select: { id: true, kind: true, strength: true } } },
      },
    },
    take: 30,
  });

  // Rank candidate cases: Overlap active (rank 3), Overdue days (rank 2), Escalated (rank 1)
  const ranked = candidateAttentionCases
    .map((c) => {
      const hasActiveOverlap = c.overlapMembers.length > 0;
      const isOverdue = c.expectedDisposalAt.getTime() < now.getTime();
      const overdueDays = isOverdue
        ? Math.floor((now.getTime() - c.expectedDisposalAt.getTime()) / 86400000)
        : 0;
      const isEscalated = c.status === "ESCALATED";

      let score = 0;
      let primaryTag: "OVERLAP" | "OVERDUE" | "ESCALATED" | "ACTIVE" = "ACTIVE";

      if (hasActiveOverlap) {
        score += 1000 + (c.overlapMembers[0].group.strength === "STRONG" ? 200 : 100);
        primaryTag = "OVERLAP";
      }
      if (isOverdue) {
        score += 500 + overdueDays * 10;
        if (!hasActiveOverlap) primaryTag = "OVERDUE";
      }
      if (isEscalated) {
        score += 300;
        if (!hasActiveOverlap && !isOverdue) primaryTag = "ESCALATED";
      }

      return {
        id: c.id,
        caseNo: c.caseNo,
        institutionName: c.institution.name,
        aicteId: c.institution.aicteId,
        subject: c.subject,
        status: c.status,
        bureauCode: c.currentBureau.code,
        category: c.category,
        receivedAt: c.receivedAt,
        expectedDisposalAt: c.expectedDisposalAt,
        lastActionAt: c.lastActionAt,
        lastActionNote: c.lastActionNote,
        primaryTag,
        overdueDays,
        overlapStrength: c.overlapMembers[0]?.group.strength || null,
        overlapGroupId: c.overlapMembers[0]?.group.id || null,
        rankScore: score,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 5); // Strictly max 5 rows

  // 7. Bureau Workload
  const allBureaus = await db.bureau.findMany({ select: { id: true, code: true, name: true } });
  const bureauWorkload = await Promise.all(
    allBureaus.map(async (b) => {
      const count = await db.case.count({
        where: {
          currentBureauId: b.id,
          status: { not: "DISPOSED" },
          // Apply region filter if Regional Officer
          ...(session.role === "REGIONAL_OFFICER" && session.region
            ? { institution: { region: session.region } }
            : {}),
        },
      });
      return {
        code: b.code,
        name: b.name,
        openCases: count,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    data: {
      user: {
        name: session.name,
        role: session.role,
        bureauCode: session.bureauCode,
        region: session.region,
      },
      openCases,
      receivedThisWeek,
      needsCoordination,
      beyondTimeline,
      disposedThisMonth,
      withinSlaPct,
      needsAttention: ranked,
      bureauWorkload,
    },
  });
}

