"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { Badge, SeverityBadge } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/dictionary";
import type { Locale, NotificationRecord } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export function NotificationList({
  notifications,
  d,
  locale,
  unreadCount,
}: {
  notifications: NotificationRecord[];
  d: Dictionary;
  locale: Locale;
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function mark(payload: { id?: string; all?: boolean }) {
    setPending(payload.all ? "all" : (payload.id ?? null));
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  const kindTone = {
    event: "accent",
    review: "warn",
    system: "neutral",
    test: "outline",
  } as const;

  const kindLabel = (kind: NotificationRecord["kind"]) => {
    switch (kind) {
      case "event":
        return d.notifications.eventAlert;
      case "review":
        return d.notifications.reviewQueue;
      case "test":
        return d.notifications.test;
      default:
        return d.notifications.system;
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <Bell className="mb-3 h-5 w-5 text-ink-faint" aria-hidden />
        <p className="text-[12.5px] font-medium text-ink">{d.notifications.empty}</p>
        <p className="mt-1 max-w-sm text-[11px] leading-5 text-ink-faint">{d.notifications.emptyBody}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <span className="text-[11px] text-ink-faint">
          {unreadCount} {d.notifications.unread}
        </span>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => mark({ all: true })}
            disabled={pending !== null}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium text-accent hover:bg-accent-soft focus-ring disabled:opacity-50"
          >
            {pending === "all" ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="h-3 w-3" aria-hidden />
            )}
            {d.notifications.markAllRead}
          </button>
        ) : null}
      </div>
      <ul className="divide-y divide-line">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={cn(
              "relative px-4 py-3.5 transition-colors",
              !notification.readAt ? "bg-accent-soft/20" : "",
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {!notification.readAt ? (
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label={d.notifications.unread} />
              ) : null}
              <Badge tone={kindTone[notification.kind]}>{kindLabel(notification.kind)}</Badge>
              {notification.isDemo ? <Badge tone="warn">{d.common.demo}</Badge> : null}
              {notification.severity ? (
                <SeverityBadge severity={notification.severity} d={d} />
              ) : null}
              <span className="ms-auto text-[10px] text-ink-faint">
                {timeAgo(notification.createdAt, locale)}
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] font-medium text-ink">
              {notification.title[locale] || notification.title.en}
            </p>
            <p className="mt-1 text-[11.5px] leading-5 text-ink-muted">
              {notification.body[locale] || notification.body.en}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px]">
              {notification.eventId ? (
                <Link
                  href={`/events/${notification.eventId}`}
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline focus-ring"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  {d.notifications.openEvent}
                </Link>
              ) : null}
              <span className="flex items-center gap-1 text-ink-faint">
                {notification.channels.map((channel) => (
                  <Badge key={channel} tone="outline" className="text-[9px]">
                    {channel === "push" ? d.notifications.channelPush : d.notifications.channelInApp}
                  </Badge>
                ))}
                {notification.pushState === "unavailable" ? (
                  <span className="text-[9.5px] text-warn">{d.notifications.pushNotConfigured}</span>
                ) : null}
              </span>
              {!notification.readAt ? (
                <button
                  type="button"
                  onClick={() => mark({ id: notification.id })}
                  disabled={pending !== null}
                  className="ms-auto rounded px-1.5 py-0.5 text-[10px] font-medium text-ink-faint hover:text-ink focus-ring disabled:opacity-50"
                >
                  {pending === notification.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    d.notifications.markRead
                  )}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
