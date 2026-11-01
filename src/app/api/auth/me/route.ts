import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED", message: "Not signed in." } },
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { bureau: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "User account no longer exists." } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      bureauId: user.bureauId,
      bureauCode: user.bureau?.code || null,
      bureauName: user.bureau?.name || null,
      region: user.region,
    },
  });
}

