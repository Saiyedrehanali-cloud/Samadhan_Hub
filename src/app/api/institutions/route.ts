import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const whereConditions: Prisma.InstitutionWhereInput[] = [];

    // Regional officer scoping
    if (session.role === "REGIONAL_OFFICER" && session.region) {
      whereConditions.push({ region: session.region });
    } else if (region) {
      whereConditions.push({ region });
    }

    if (q) {
      whereConditions.push({
        OR: [
          { name: { contains: q } },
          { aicteId: { contains: q } },
          { city: { contains: q } },
          { state: { contains: q } },
        ],
      });
    }

    const where: Prisma.InstitutionWhereInput =
      whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [institutions, total] = await Promise.all([
      db.institution.findMany({
        where,
        select: {
          id: true,
          aicteId: true,
          name: true,
          city: true,
          state: true,
          region: true,
          type: true,
          _count: {
            select: {
              cases: {
                where: { status: { not: "DISPOSED" } },
              },
            },
          },
          overlapGroups: {
            where: { status: "OPEN" },
            select: {
              id: true,
              strength: true,
              kind: true,
            },
          },
        },
        orderBy: [{ name: "asc" }],
        take: limit,
        skip,
      }),
      db.institution.count({ where }),
    ]);

    const formatted = institutions.map((inst) => {
      const activeOverlap = inst.overlapGroups[0] || null;
      return {
        id: inst.id,
        aicteId: inst.aicteId,
        name: inst.name,
        city: inst.city,
        state: inst.state,
        region: inst.region,
        type: inst.type,
        openCasesCount: inst._count.cases,
        hasActiveOverlap: inst.overlapGroups.length > 0,
        overlapStrength: activeOverlap?.strength || null,
        overlapGroupId: activeOverlap?.id || null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        institutions: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/institutions error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to fetch institutions" } },
      { status: 500 }
    );
  }
}
