import { newId } from "@/lib/crypto";
import { getRepo } from "@/lib/store";
import { sendPushToUser } from "@/lib/push";
import { mayDispatchAlert } from "@/lib/alerts/policy";
import type {
  EventRecord,
  NotificationKind,
  NotificationRecord,
  SessionUser,
  Severity,
  UserRecord,
  UserSettingsRecord,
} from "@/lib/types";

export interface NotificationAudience {
  userId: string;
  settings: UserSettingsRecord;
}

export function isInQuietHours(settings: UserSettingsRecord, now = new Date()): boolean {
  if (!settings.quietHours.enabled) return false;
  const [startH, startM] = settings.quietHours.start.split(":").map(Number);
  const [endH, endM] = settings.quietHours.end.split(":").map(Number);
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/**
 * A notification may only be read by its recipient, or by administrators for
 * operational review. Enforced server-side; never by the UI alone.
 */
export function canReadNotification(
  actor: SessionUser,
  notification: NotificationRecord,
): boolean {
  return notification.userId === actor.id || actor.role === "admin";
}

export function matchesPreferences(event: EventRecord, settings: UserSettingsRecord): boolean {
  if (!settings.inAppEnabled) return false;
  if (event.severity < settings.minSeverity) return false;
  return settings.alertCategories.includes(event.category);
}

export async function resolveAudience(event: EventRecord): Promise<NotificationAudience[]> {
  const repo = await getRepo();
  const users = await repo.list<UserRecord>("users", (user) => user.status === "active");
  const settings = await repo.list<UserSettingsRecord>("settings");
  const result: NotificationAudience[] = [];
  for (const user of users) {
    const userSettings = settings.find((row) => row.userId === user.id);
    if (!userSettings) continue;
    if (matchesPreferences(event, userSettings)) {
      result.push({ userId: user.id, settings: userSettings });
    }
  }
  return result;
}

export async function createNotification(input: {
  userId: string;
  kind: NotificationKind;
  event?: EventRecord;
  severity: Severity | null;
  title: { fa: string; en: string };
  body: { fa: string; en: string };
  channels: Array<"in_app" | "push">;
  isDemo?: boolean;
  pushState?: NotificationRecord["pushState"];
}): Promise<NotificationRecord> {
  const repo = await getRepo();
  const notification: NotificationRecord = {
    id: newId("ntf"),
    userId: input.userId,
    eventId: input.event?.id,
    kind: input.kind,
    title: input.title,
    body: input.body,
    severity: input.severity,
    createdAt: new Date().toISOString(),
    channels: input.channels,
    pushState: input.pushState,
    isDemo: input.isDemo ?? input.event?.isDemo ?? false,
  };
  await repo.insert("notifications", notification);
  return notification;
}

export async function deliverPush(
  userId: string,
  event: EventRecord,
  notificationId: string,
): Promise<void> {
  const result = await sendPushToUser(userId, {
    title: event.title.en,
    body: event.summary.en.slice(0, 160),
    url: `/events/${event.id}`,
    tag: `event-${event.id}`,
    severity: event.severity,
  });
  const repo = await getRepo();
  await repo.update<NotificationRecord>("notifications", notificationId, {
    pushState:
      result === "sent"
        ? "sent"
        : result === "unavailable"
          ? "unavailable"
          : result === "skipped"
            ? "skipped"
            : "failed",
  });
}

/** Internal review-queue ping for administrators. Not a public alert. */
export async function notifyReviewQueue(event: EventRecord): Promise<void> {
  const repo = await getRepo();
  const admins = await repo.list<UserRecord>(
    "users",
    (user) => user.role === "admin" && user.status === "active",
  );
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      kind: "review",
      event,
      severity: event.severity,
      title: {
        fa: "رویداد با تأثیر بالا در انتظار بررسی",
        en: "High-impact event awaiting review",
      },
      body: {
        fa: "این رویداد به تأیید انسانی نیاز دارد و هیچ هشداری تا بررسی ارسال نمی‌شود.",
        en: "This event requires human approval. No alert is dispatched until it has been reviewed.",
      },
      channels: ["in_app"],
      isDemo: event.isDemo,
    });
  }
}

/**
 * Dispatch notifications for an event once policy allows it. High-impact events
 * stay in `pending_review` until an administrator approves the alert.
 */
export async function dispatchEventNotifications(
  event: EventRecord,
  kind: NotificationKind = "event",
): Promise<{ delivered: number; withheld: boolean; reason?: string }> {
  if (event.status === "unverified") {
    return { delivered: 0, withheld: true, reason: "unverified" };
  }

  const policy = mayDispatchAlert(event);
  if (!policy.allowed) {
    return { delivered: 0, withheld: true, reason: policy.reason };
  }

  const audience = await resolveAudience(event);
  let delivered = 0;

  for (const { userId, settings } of audience) {
    const canPush = settings.pushEnabled && !isInQuietHours(settings);
    const notification = await createNotification({
      userId,
      kind,
      event,
      severity: event.severity,
      title: { fa: event.title.fa, en: event.title.en },
      body: { fa: event.summary.fa.slice(0, 220), en: event.summary.en.slice(0, 220) },
      channels: canPush ? ["in_app", "push"] : ["in_app"],
      isDemo: event.isDemo,
    });
    delivered += 1;
    if (canPush) await deliverPush(userId, event, notification.id);
  }

  return { delivered, withheld: false };
}

export async function sendTestNotification(actor: SessionUser): Promise<NotificationRecord> {
  return createNotification({
    userId: actor.id,
    kind: "test",
    severity: null,
    title: { fa: "اعلان آزمایشی", en: "Test notification" },
    body: {
      fa: "این یک اعلان آزمایشی است که فقط برای حساب شما ارسال شده است.",
      en: "This is a test notification delivered only to your account.",
    },
    channels: ["in_app"],
  });
}
