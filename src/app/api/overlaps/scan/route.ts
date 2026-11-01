import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { scanAllOverlaps } from "@/lib/services/overlap";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  if (session.role !== "MANAGEMENT") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "Only Management can trigger a full overlap re-scan." } },
      { status: 403 }
    );
  }

  try {
    await scanAllOverlaps();
    return NextResponse.json({
      ok: true,
      data: { message: "AICTE-wide overlap scan completed successfully." },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 500 });
  }
}

