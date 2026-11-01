import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseScope } from "@/lib/rbac";
import { createCase } from "@/lib/services/cases";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const bureau = searchParams.get("bureau")?.trim() || "";
  const region = searchParams.get("region")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const overlapOnly = searchParams.get("overlap") === "true";
  const overdueOnly = searchParams.get("overdue") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
  const skip = (page - 1) * limit;

  const baseScope = caseScope(session);
  const now = new Date();

  const whereConditions: Prisma.CaseWhereInput[] = [baseScope];

  if (q) {
    whereConditions.push({
      OR: [
        { caseNo: { contains: q } },
        { subject: { contains: q } },
        { institution: { name: { contains: q } } },
        { institution: { aicteId: { contains: q } } },
      ],
    });
  }

  if (bureau) {
    whereConditions.push({ currentBureau: { code: bureau } });
  }

  if (region) {
    whereConditions.push({ institution: { region } });
  }

  if (category) {
    whereConditions.push({ category });
  }

  if (status) {
    whereConditions.push({ status });
  }

  if (overlapOnly) {
    whereConditions.push({
      overlapMembers: {
        some: {
          group: { status: "OPEN" },
        },
      },
    });
  }

  if (overdueOnly) {
    whereConditions.push({
      status: { not: "DISPOSED" },
      expectedDisposalAt: { lt: now },
    });
  }

  const where: Prisma.CaseWhereInput = {
    AND: whereConditions,
  };

  const [total, cases] = await Promise.all([
    db.case.count({ where }),
    db.case.findMany({
      where,
      include: {
        institution: {
          select: { id: true, name: true, aicteId: true, region: true, city: true },
        },
        currentBureau: {
          select: { id: true, code: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        overlapMembers: {
          where: { group: { status: "OPEN" } },
          include: {
            group: {
              select: { id: true, kind: true, strength: true, score: true },
            },
          },
        },
      },
      orderBy: [{ expectedDisposalAt: "asc" }, { receivedAt: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  const mappedCases = cases.map((c) => ({
    id: c.id,
    caseNo: c.caseNo,
    category: c.category,
    source: c.source,
    subject: c.subject,
    status: c.status,
    priority: c.priority,
    receivedAt: c.receivedAt,
    expectedDisposalAt: c.expectedDisposalAt,
    lastActionAt: c.lastActionAt,
    lastActionNote: c.lastActionNote,
    institution: c.institution,
    currentBureau: c.currentBureau,
    assignee: c.assignee,
    hasActiveOverlap: c.overlapMembers.length > 0,
    activeOverlap: c.overlapMembers[0]?.group || null,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      cases: mappedCases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  if (session.role === "REGIONAL_OFFICER") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "Regional Officers have view-only access." } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    if (!body.institutionId || !body.category || !body.subject || !body.description) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION", message: "Missing required fields." } },
        { status: 422 }
      );
    }

    const result = await createCase(
      {
        institutionId: body.institutionId,
        category: body.category,
        source: body.source || "STUDENT",
        subject: body.subject,
        description: body.description,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
        bureauId: body.bureauId,
        priority: body.priority,
        nextAction: body.nextAction,
      },
      session
    );

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Case creation failed";
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message } },
      { status: 500 }
    );
  }
}

