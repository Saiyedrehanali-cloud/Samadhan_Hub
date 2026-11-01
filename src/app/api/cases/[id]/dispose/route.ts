import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { disposeCase } from "@/lib/services/cases";

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
    if (!body.outcome || body.outcome.trim().length < 5) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION", message: "A clear disposal outcome of at least 5 characters is required." } },
        { status: 422 }
      );
    }

    const action = await disposeCase(params.id, body.outcome, session);
    return NextResponse.json({ ok: true, data: action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to dispose case";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 400 });
  }
}

