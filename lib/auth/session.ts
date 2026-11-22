import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "starlight_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days: students stay signed in on their device

export interface SessionData {
  parentId: string;
  /** Set when a student is practising (student sessions cannot open the parent area). */
  studentId?: string;
  role: "parent" | "student";
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (32+ characters)");
    return new TextEncoder().encode("dev-only-secret-dev-only-secret-dev-only!");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string | undefined): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.parentId !== "string" || (payload.role !== "parent" && payload.role !== "student")) return null;
    return { parentId: payload.parentId, studentId: typeof payload.studentId === "string" ? payload.studentId : undefined, role: payload.role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(data: SessionData): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
