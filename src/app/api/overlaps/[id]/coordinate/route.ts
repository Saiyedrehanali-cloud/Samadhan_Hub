import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markGroupCoordinated } from "@/lib/services/overlap";

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
    if (!body.leadBureauCode || !body.remarks) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION", message: "Lead Bureau and coordination remarks are required." } },
        { status: 422 }
      );
    }

    await markGroupCoordinated(params.id, body.leadBureauCode, body.remarks, session);
    return NextResponse.json({ ok: true, data: { message: "Group marked as coordinated." } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to coordinate overlap.";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 400 });
  }
}

