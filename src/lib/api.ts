import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requirePermission, type Permission } from "@/lib/rbac";
import { serverEnv } from "@/lib/config";
import type { SessionUser } from "@/lib/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status });
}

export async function requireApiUser(permission?: Permission): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new ApiError(401, "unauthorized", "Authentication required.");
  if (permission) requirePermission(user, permission);
  return user;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(
      400,
      "validation_failed",
      parsed.error.issues[0]?.message ?? "Invalid input.",
    );
  }
  return parsed.data;
}

/** CSRF hardening for cookie-authenticated mutations: reject cross-origin POSTs. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // same-origin form posts without Origin (older browsers)
  let expected: string;
  try {
    expected = new URL(serverEnv.appUrl).origin;
  } catch {
    expected = new URL(request.url).origin;
  }
  const host = request.headers.get("host");
  const requestOrigin = new URL(request.url).origin;
  const allowed = new Set([expected, requestOrigin, host ? `${new URL(request.url).protocol}//${host}` : requestOrigin]);
  if (!allowed.has(origin)) {
    throw new ApiError(403, "bad_origin", "Cross-origin request rejected.");
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message);
  }
  if (error instanceof AuthorizationError) {
    return jsonError(403, "forbidden", error.message);
  }
  if (error instanceof ZodError) {
    return jsonError(400, "validation_failed", error.issues[0]?.message ?? "Invalid input.");
  }
  console.error("[api] unhandled error", error instanceof Error ? error.message : error);
  return jsonError(500, "internal_error", "An unexpected error occurred.");
}
