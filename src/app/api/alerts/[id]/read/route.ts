import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertScope } from "@/lib/rbac";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const { id } = params;

    // Verify alert exists within user's scoped visibility
    const alert = await db.alert.findFirst({
      where: {
        id,
        ...alertScope(session),
      },
    });

    if (!alert) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Alert not found or access denied" } },
        { status: 404 }
      );
    }

    const updated = await db.alert.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({
      ok: true,
      data: { alert: updated },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/alerts/[id]/read error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to mark alert as read" } },
      { status: 500 }
    );
  }
}

