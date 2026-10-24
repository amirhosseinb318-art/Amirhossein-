import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validation";
import { changePassword } from "@/lib/auth/password";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const body = await parseBody(request, passwordChangeSchema);
    const result = await changePassword(user, body.currentPassword, body.newPassword);
    if (!result.ok) {
      return jsonError(400, result.reason ?? "failed", "Password could not be changed.");
    }
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.password_changed",
      targetType: "user",
      targetId: user.id,
      summary: "Password changed",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
