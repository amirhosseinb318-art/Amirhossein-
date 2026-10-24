import { verifyPassword } from "@/lib/crypto";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import type { UserRecord } from "@/lib/types";

const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type SignInResult =
  | { ok: true; user: UserRecord }
  | { ok: false; reason: "invalid" | "suspended" | "rate_limited"; retryAfterSeconds?: number };

/**
 * Password sign-in with per-identity and per-IP throttling.
 * The account is only considered valid after a real scrypt comparison; a dummy
 * comparison runs for unknown emails so timing does not reveal account existence.
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
  ip: string;
}): Promise<SignInResult> {
  const email = normalizeEmail(input.email);

  const perIdentity = rateLimit(`signin:${input.ip}:${email}`, 5, 15 * 60 * 1000);
  const perIp = rateLimit(`signin-ip:${input.ip}`, 25, 15 * 60 * 1000);
  if (!perIdentity.ok || !perIp.ok) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.max(perIdentity.retryAfterSeconds, perIp.retryAfterSeconds),
    };
  }

  const repo = await getRepo();
  const user = (await repo.list<UserRecord>("users", (row) => row.email === email))[0] ?? null;
  const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    await writeAudit({
      actorId: user?.id ?? "unknown",
      actorEmail: email.slice(0, 120),
      action: "auth.sign_in_failed",
      targetType: "user",
      targetId: user?.id ?? "unknown",
      summary: "Failed sign-in attempt",
      meta: { ip: input.ip.slice(0, 64) },
    });
    return { ok: false, reason: "invalid" };
  }

  if (user.status !== "active") return { ok: false, reason: "suspended" };

  await repo.update<UserRecord>("users", user.id, { lastLoginAt: new Date().toISOString() });
  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.sign_in",
    targetType: "user",
    targetId: user.id,
    summary: "Signed in",
  });

  return { ok: true, user };
}
