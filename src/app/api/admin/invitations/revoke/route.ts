import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import type { InvitationRecord } from "@/lib/types";

const schema = z.object({ id: z.string().min(3).max(120) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser("invitations:manage");
    const body = await parseBody(request, schema);
    const repo = await getRepo();
    const invitation = await repo.get<InvitationRecord>("invitations", body.id);
    if (!invitation) return jsonError(404, "not_found", "Invitation not found.");
    if (invitation.usedAt) return jsonError(409, "used", "A used invitation cannot be revoked.");

    await repo.update<InvitationRecord>("invitations", invitation.id, {
      revokedAt: new Date().toISOString(),
    });
    await writeAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "invitation.revoked",
      targetType: "invitation",
      targetId: invitation.id,
      summary: `Invitation revoked for ${invitation.email}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
