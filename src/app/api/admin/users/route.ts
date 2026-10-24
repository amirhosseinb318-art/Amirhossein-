import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import type { UserRecord } from "@/lib/types";

const schema = z.object({
  userId: z.string().min(3).max(120),
  role: z.enum(["admin", "analyst", "viewer"]),
});

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser("users:manage");
    const body = await parseBody(request, schema);
    const repo = await getRepo();
    const target = await repo.get<UserRecord>("users", body.userId);
    if (!target) return jsonError(404, "not_found", "User not found.");

    if (target.role === "admin" && body.role !== "admin") {
      const admins = await repo.list<UserRecord>(
        "users",
        (user) => user.role === "admin" && user.status === "active",
      );
      if (admins.length <= 1) {
        return jsonError(409, "last_admin", "The last active administrator cannot be demoted.");
      }
    }
    if (target.id === admin.id && body.role !== "admin") {
      return jsonError(409, "self_demotion", "You cannot remove your own administrator role.");
    }

    await repo.update<UserRecord>("users", target.id, { role: body.role });
    await writeAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "user.role_changed",
      targetType: "user",
      targetId: target.id,
      summary: `Role changed for ${target.email}: ${target.role} → ${body.role}`,
      meta: { from: target.role, to: body.role },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
