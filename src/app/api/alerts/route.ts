import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertScope } from "@/lib/rbac";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const category = searchParams.get("category"); // OVERLAPS | SLA | ESCALATIONS | UNREAD | ALL
    const type = searchParams.get("type");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.AlertWhereInput = {
      ...alertScope(session),
    };

    if (unreadOnly || category === "UNREAD") {
      baseWhere.isRead = false;
    }

    if (type) {
      baseWhere.type = type;
    } else if (category === "OVERLAPS") {
      baseWhere.type = "OVERLAP_DETECTED";
    } else if (category === "SLA") {
      baseWhere.type = { in: ["SLA_NEARING", "SLA_CRITICAL", "OVERDUE", "IDLE"] };
    } else if (category === "ESCALATIONS") {
      baseWhere.type = "ESCALATION";
    }

    const [alerts, total, unreadCount] = await Promise.all([
      db.alert.findMany({
        where: baseWhere,
        include: {
          case: {
            select: {
              id: true,
              caseNo: true,
              category: true,
              currentBureau: {
                select: {
                  code: true,
                  name: true,
                },
              },
              institution: {
                select: {
                  id: true,
                  name: true,
                  aicteId: true,
                  region: true,
                },
              },
            },
          },
        },
        orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip,
      }),
      db.alert.count({ where: baseWhere }),
      db.alert.count({
        where: {
          ...alertScope(session),
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        alerts,
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/alerts error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to fetch alerts" } },
      { status: 500 }
    );
  }
}
