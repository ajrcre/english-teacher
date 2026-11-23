import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getSession, type SessionData } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { RewardError } from "@/lib/services/rewards";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema.parse(raw);
}

/** Wraps a route handler: maps validation/auth errors to clean JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof HttpError || error instanceof RewardError) return json({ error: error.message }, error.status);
      if (error instanceof ZodError) return json({ error: "Invalid request", issues: error.issues.slice(0, 5) }, 400);
      logger.error("request failed", { error: error instanceof Error ? error.message : String(error) });
      return json({ error: "Something went wrong" }, 500);
    }
  };
}

export async function requireStudent(): Promise<SessionData & { studentId: string }> {
  const s = await getSession();
  if (!s?.studentId) throw new HttpError(401, "Please sign in");
  return s as SessionData & { studentId: string };
}

export async function requireParent(): Promise<SessionData> {
  const s = await getSession();
  if (!s || s.role !== "parent") throw new HttpError(401, "Parent sign-in required");
  return s;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
