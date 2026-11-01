import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true, data: { message: "Signed out successfully." } });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

