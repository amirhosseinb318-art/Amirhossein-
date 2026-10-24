import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, requireApiUser } from "@/lib/api";
import { sendTestNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { getSettings } from "@/lib/settings";
import { pushConfigured } from "@/lib/config";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const notification = await sendTestNotification(user);
    const settings = await getSettings(user.id);

    let push: string | null = null;
    if (settings.pushEnabled && pushConfigured()) {
      push = await sendPushToUser(user.id, {
        title: "AI Crisis Radar",
        body: "Test notification — delivery is working.",
        url: "/notifications",
        tag: "test",
      });
    }

    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "notification.test",
      targetType: "notification",
      targetId: notification.id,
      summary: "Sent a test notification",
      meta: { push: push ?? "not_requested" },
    });

    return NextResponse.json({ ok: true, notification, push });
  } catch (error) {
    return handleApiError(error);
  }
}
