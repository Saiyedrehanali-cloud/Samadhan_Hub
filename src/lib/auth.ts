import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "samadhan-hub-super-secret-jwt-key-sih2026-minimum-32-chars";
const encodedKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = "samadhan_hub_session";

export interface SessionUser {
  userId: string;
  email: string;
  role: "MANAGEMENT" | "BUREAU_OFFICER" | "REGIONAL_OFFICER";
  bureauId: string | null;
  bureauCode: string | null;
  region: string | null;
  name: string;
}

export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(encodedKey);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value || cookieStore.get("caselens_session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

