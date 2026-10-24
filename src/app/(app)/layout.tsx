import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getI18n, getTheme } from "@/i18n/server";
import { getSettings } from "@/lib/settings";
import { getRepo, repositoryMode } from "@/lib/store";
import { serverEnv } from "@/lib/config";
import { listEvents } from "@/lib/events/query";
import { hoursSince } from "@/lib/time";
import type { IngestionRunRecord, NotificationRecord } from "@/lib/types";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/sign-in");

  const { locale, d } = await getI18n();
  const theme = await getTheme();
  await getSettings(user.id);

  const repo = await getRepo();
  const notifications = await repo.list<NotificationRecord>(
    "notifications",
    (row) => row.userId === user.id && !row.readAt,
  );
  const events = await listEvents();
  const hasDemoRecords = events.some((event) => event.isDemo);
  const hasLiveRecords = events.some((event) => !event.isDemo);
  const demoMode = serverEnv.demoMode || hasDemoRecords;
  const runs = await repo.list<IngestionRunRecord>("ingestionRuns");
  const lastRun = runs
    .filter((run) => run.finishedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  const ingestionAge = hoursSince(lastRun?.finishedAt);
  const ingestionHealthy =
    Boolean(lastRun) &&
    lastRun.status !== "failed" &&
    ingestionAge !== null &&
    ingestionAge < 6;

  return (
    <div className="app-background min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1680px]">
        <Sidebar
          d={d}
          user={user}
          unreadCount={notifications.length}
          demoMode={demoMode}
          ingestionHealthy={ingestionHealthy}
          lastIngestionAt={lastRun?.startedAt ?? null}
          ingestionStatus={lastRun?.status ?? "never"}
          storeMode={repositoryMode()}
          locale={locale}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            d={d}
            locale={locale}
            theme={theme}
            user={user}
            unreadCount={notifications.length}
            demoMode={demoMode}
          />

          {demoMode ? (
            <div className="border-b border-warn/20 bg-warn-soft/50">
              <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-2 gap-y-1 px-4 py-1.5 text-[11px] text-ink-muted md:px-7">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
                <span className="font-medium text-ink">
                  {hasLiveRecords ? d.common.mixedBannerTitle : d.common.demoBannerTitle}
                </span>
                <span className="hidden sm:inline">
                  {hasLiveRecords ? d.common.mixedBannerBody : d.common.demoBannerBody}
                </span>
                <Link
                  href="/admin?tab=sources"
                  className="ms-auto shrink-0 font-medium text-accent hover:underline focus-ring"
                >
                  {d.nav.admin}
                </Link>
              </div>
            </div>
          ) : null}

          <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-5 md:px-7 md:py-7">
            {children}
          </main>

          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-[1320px] flex-col gap-1.5 px-4 py-4 text-[10.5px] text-ink-faint md:flex-row md:items-center md:justify-between md:px-7">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                {d.footer.privacy}
              </p>
              <p className="num" dir="ltr">
                AI Crisis Radar v0.1 · {repositoryMode() === "supabase" ? "Supabase" : "local store"}
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
