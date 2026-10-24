import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { notificationReadSchema } from "@/lib/validation";
import { getRepo } from "@/lib/store";
import { canReadNotification } from "@/lib/notifications";
import type { NotificationRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const body = await parseBody(request, notificationReadSchema);
    const repo = await getRepo();
    const now = new Date().toISOString();

    if (body.all) {
      const mine = await repo.list<NotificationRecord>(
        "notifications",
        (row) => row.userId === user.id && !row.readAt,
      );
      for (const notification of mine) {
        await repo.update<NotificationRecord>("notifications", notification.id, { readAt: now });
      }
      return NextResponse.json({ ok: true, updated: mine.length });
    }

    if (!body.id) return jsonError(400, "missing_id", "Notification id is required.");
    const notification = await repo.get<NotificationRecord>("notifications", body.id);
    if (!notification) return jsonError(404, "not_found", "Notification not found.");
    if (!canReadNotification(user, notification)) {
      return jsonError(403, "forbidden", "You cannot modify this notification.");
    }
    await repo.update<NotificationRecord>("notifications", notification.id, { readAt: now });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
