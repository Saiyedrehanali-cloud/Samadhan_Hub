import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateCaseStatus } from "@/lib/services/cases";

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
    if (!body.status || !body.remarks) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION", message: "Status and action remarks are required." } },
        { status: 422 }
      );
    }

    const action = await updateCaseStatus(params.id, body.status, body.remarks, session);
    return NextResponse.json({ ok: true, data: action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 400 });
  }
}

