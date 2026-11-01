import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyAuditChain } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
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
            message: "Cryptographic audit chain verification is restricted to AICTE Management.",
          },
        },
        { status: 403 }
      );
    }

    const verification = await verifyAuditChain();

    return NextResponse.json({
      ok: true,
      data: verification,
    });
  } catch (err: unknown) {
    console.error("GET /api/audit/verify error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER", message: "Failed to verify cryptographic audit chain" } },
      { status: 500 }
    );
  }
}

