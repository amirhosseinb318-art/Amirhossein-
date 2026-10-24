import { hashPassword, verifyPassword } from "@/lib/crypto";
import { getRepo } from "@/lib/store";
import type { SessionUser, UserRecord } from "@/lib/types";

export async function changePassword(
  actor: SessionUser,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (newPassword.length < 12) return { ok: false, reason: "weak_password" };
  const repo = await getRepo();
  const user = await repo.get<UserRecord>("users", actor.id);
  if (!user) return { ok: false, reason: "not_found" };
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, reason: "invalid_current_password" };
  }
  await repo.update<UserRecord>("users", user.id, {
    passwordHash: await hashPassword(newPassword),
  });
  return { ok: true };
}
