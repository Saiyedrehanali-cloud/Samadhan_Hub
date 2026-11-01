import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

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

    if (session.role !== "MANAGEMENT") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Access to immutable audit logs is restricted to AICTE Management.",
          },
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        orderBy: { id: "desc" },
        take: limit,
        skip,
      }),
      db.auditLog.count(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/audit error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to fetch audit log entries" } },
      { status: 500 }
    );
  }
}

