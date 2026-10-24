import { constantTimeEqual, hashPassword, newId, newToken, sha256 } from "@/lib/crypto";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { defaultSettings } from "@/lib/settings";
import type { InvitationRecord, SessionUser, UserRecord } from "@/lib/types";
import { normalizeEmail } from "./signin";

export async function createInvitation(input: {
  actor: SessionUser;
  email: string;
  name: string;
  role: "admin" | "analyst" | "viewer";
  expiresInHours?: number;
}): Promise<{ invitation: InvitationRecord; token: string }> {
  const repo = await getRepo();
  const email = normalizeEmail(input.email);
  const existingUser = await repo.list<UserRecord>("users", (row) => row.email === email);
  if (existingUser.length > 0) throw new Error("A user with this email already exists.");

  const pending = await repo.list<InvitationRecord>(
    "invitations",
    (row) => row.email === email && !row.usedAt && !row.revokedAt,
  );
  for (const invite of pending) {
    await repo.update<InvitationRecord>("invitations", invite.id, {
      revokedAt: new Date().toISOString(),
    });
  }

  const token = newToken(32);
  const now = Date.now();
  const invitation: InvitationRecord = {
    id: newId("inv"),
    email,
    name: input.name.trim().slice(0, 120),
    role: input.role,
    tokenHash: sha256(token),
    createdBy: input.actor.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (input.expiresInHours ?? 72) * 3_600_000).toISOString(),
  };
  await repo.insert("invitations", invitation);
  await writeAudit({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: "invitation.created",
    targetType: "invitation",
    targetId: invitation.id,
    summary: `Invitation created for ${email} as ${input.role}`,
  });

  return { invitation, token };
}

export async function getInvitationByToken(token: string): Promise<InvitationRecord | null> {
  if (!token || token.length < 20) return null;
  const repo = await getRepo();
  const hash = sha256(token);
  const matches = await repo.list<InvitationRecord>(
    "invitations",
    (row) => constantTimeEqual(row.tokenHash, hash),
  );
  return matches[0] ?? null;
}

export function invitationState(invitation: InvitationRecord | null): {
  valid: boolean;
  reason?: "not_found" | "used" | "revoked" | "expired";
} {
  if (!invitation) return { valid: false, reason: "not_found" };
  if (invitation.usedAt) return { valid: false, reason: "used" };
  if (invitation.revokedAt) return { valid: false, reason: "revoked" };
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true };
}

export async function redeemInvitation(input: {
  token: string;
  password: string;
  name?: string;
  ip: string;
}): Promise<{ ok: true; user: UserRecord } | { ok: false; reason: string }> {
  const limit = rateLimit(`invite:${input.ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { ok: false, reason: "rate_limited" };

  const invitation = await getInvitationByToken(input.token);
  const state = invitationState(invitation);
  if (!state.valid || !invitation) return { ok: false, reason: state.reason ?? "not_found" };
  if (input.password.length < 12) return { ok: false, reason: "weak_password" };

  const repo = await getRepo();
  const existing = await repo.list<UserRecord>("users", (row) => row.email === invitation.email);
  if (existing.length > 0) return { ok: false, reason: "already_registered" };

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: newId("usr"),
    email: invitation.email,
    name: (input.name?.trim() || invitation.name || invitation.email.split("@")[0]).slice(0, 120),
    role: invitation.role,
    status: "active",
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    locale: "fa",
  };

  await repo.insert("users", user);
  await repo.update<InvitationRecord>("invitations", invitation.id, { usedAt: now });
  await repo.insert("settings", defaultSettings(user.id));
  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "invitation.redeemed",
    targetType: "invitation",
    targetId: invitation.id,
    summary: `Invitation redeemed by ${user.email}`,
  });

  return { ok: true, user };
}
