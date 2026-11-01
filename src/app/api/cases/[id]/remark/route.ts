import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addCaseRemark } from "@/lib/services/cases";

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
    if (!body.remarks || !body.remarks.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION", message: "Remarks cannot be empty." } },
        { status: 422 }
      );
    }

    const action = await addCaseRemark(params.id, body.remarks, session);
    return NextResponse.json({ ok: true, data: action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add remark";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 400 });
  }
}

