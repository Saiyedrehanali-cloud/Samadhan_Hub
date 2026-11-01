import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { transferCase } from "@/lib/services/cases";

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
    if (!body.toBureauCode || !body.reason) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION", message: "Target Bureau code and transfer justification are required." } },
        { status: 422 }
      );
    }

    const action = await transferCase(params.id, body.toBureauCode, body.reason, session);
    return NextResponse.json({ ok: true, data: action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to transfer case";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 400 });
  }
}

