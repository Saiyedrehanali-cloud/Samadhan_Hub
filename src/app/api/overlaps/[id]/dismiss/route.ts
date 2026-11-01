import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dismissGroup } from "@/lib/services/overlap";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    if (!body.reason || body.reason.trim().length < 5) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION", message: "A clear dismissal justification (minimum 5 characters) is required." } },
        { status: 422 }
      );
    }

    await dismissGroup(params.id, body.reason, session);
    return NextResponse.json({ ok: true, data: { message: "Overlap advisory dismissed." } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to dismiss overlap.";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 400 });
  }
}

