import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { scanAndDispatchAlerts } from "@/lib/services/alerts";
import { logAudit } from "@/lib/services/audit";

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    if (session.role !== "MANAGEMENT") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Only Management officers have authorization to trigger on-demand SLA scans",
          },
        },
        { status: 403 }
      );
    }

    // Force scan (bypasses 5-minute background throttle)
    const result = await scanAndDispatchAlerts({ force: true });

    // Write audit record
    await logAudit({
      actorId: session.userId,
      action: "ALERT_SCAN_TRIGGERED",
      entity: "Alert",
      entityId: "SYSTEM",
      payload: {
        scannedCases: result.scannedCases,
        createdAlerts: result.createdAlerts,
        skippedDuplicates: result.skippedDuplicates,
      },
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: unknown) {
    console.error("POST /api/alerts/scan error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to execute SLA scan" } },
      { status: 500 }
    );
  }
}

