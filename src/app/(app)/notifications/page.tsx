import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getRepo } from "@/lib/store";
import { getSettings } from "@/lib/settings";
import { serverEnv, pushConfigured } from "@/lib/config";
import { EVENT_CATEGORIES } from "@/lib/config";
import type { NotificationRecord } from "@/lib/types";
import { Badge, PageHeader, Panel } from "@/components/ui/primitives";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationPreferences } from "@/components/notifications/preferences";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, d } = await getI18n();
  const user = await getSession();
  const params = await searchParams;
  const showUnread = params.filter === "unread";

  const repo = await getRepo();
  const all = (await repo.list<NotificationRecord>("notifications", (row) => row.userId === user!.id))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unreadCount = all.filter((notification) => !notification.readAt).length;
  const visible = showUnread ? all.filter((notification) => !notification.readAt) : all;
  const settings = await getSettings(user!.id);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={d.nav.notifications}
        title={d.notifications.title}
        description={d.notifications.subtitle}
        meta={
          <>
            <Badge tone={unreadCount > 0 ? "accent" : "neutral"} dot={unreadCount > 0}>
              {unreadCount} {d.notifications.unread}
            </Badge>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <Bell className="h-3 w-3" aria-hidden />
              {pushConfigured() ? d.settings.connected : d.notifications.pushUnavailable}
            </span>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="overflow-hidden self-start">
          <div className="flex items-center gap-1 border-b border-line px-3 py-2">
            {[
              { href: "/notifications", label: d.notifications.all, active: !showUnread },
              {
                href: "/notifications?filter=unread",
                label: d.notifications.unread,
                active: showUnread,
                count: unreadCount,
              },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition-colors focus-ring",
                  tab.active
                    ? "bg-panel-soft text-ink"
                    : "text-ink-faint hover:text-ink-muted",
                )}
              >
                {tab.label}
                {tab.count ? (
                  <span className="num rounded-full border border-accent/30 bg-accent-soft px-1.5 text-[9.5px] text-accent">
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <Inbox className="mb-3 h-5 w-5 text-ink-faint" aria-hidden />
              <p className="text-[12.5px] font-medium text-ink">{d.notifications.empty}</p>
              <p className="mt-1 text-[11px] text-ink-faint">{d.notifications.emptyBody}</p>
            </div>
          ) : (
            <NotificationList
              notifications={visible}
              d={d}
              locale={locale}
              unreadCount={unreadCount}
            />
          )}
        </Panel>

        <NotificationPreferences
          settings={settings}
          categories={EVENT_CATEGORIES}
          d={d}
          vapidPublicKey={serverEnv.vapidPublicKey ?? null}
        />
      </div>
    </div>
  );
}
