import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertScope } from "@/lib/rbac";

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const result = await db.alert.updateMany({
      where: {
        ...alertScope(session),
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { count: result.count },
    });
  } catch (err: unknown) {
    console.error("POST /api/alerts/read-all error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to mark all alerts as read" } },
      { status: 500 }
    );
  }
}

