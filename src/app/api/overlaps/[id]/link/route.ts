import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { linkCasesInGroup } from "@/lib/services/overlap";

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
    const remarks = body.remarks?.trim() || "Cases linked for joint cross-bureau review.";
    await linkCasesInGroup(params.id, remarks, session);
    return NextResponse.json({ ok: true, data: { message: "Cases linked successfully." } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to link cases.";
    return NextResponse.json({ ok: false, error: { code: "SERVER", message } }, { status: 400 });
  }
}

