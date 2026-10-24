import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { sessionSecret, isProduction, serverEnv } from "@/lib/config";
import { getRepo } from "@/lib/store";
import type { SessionUser, UserRecord } from "@/lib/types";

const COOKIE_NAME = "radar_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(sessionSecret());
}

export async function createSession(user: UserRecord): Promise<void> {
  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer("ai-crisis-radar")
    .setAudience("radar-app")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction() && !serverEnv.allowInsecureCookies,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "ai-crisis-radar",
      audience: "radar-app",
    });
    const userId = payload.sub;
    if (!userId) return null;

    const repo = await getRepo();
    const user = await repo.get<UserRecord>("users", userId);
    if (!user || user.status !== "active") return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      locale: user.locale ?? "fa",
    };
  } catch {
    return null;
  }
});

/** Server-page guard. Redirects are handled by the caller layout. */
export async function requireSessionUser(): Promise<SessionUser | null> {
  return getSession();
}
