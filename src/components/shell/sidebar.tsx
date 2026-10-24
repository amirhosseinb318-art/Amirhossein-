import Link from "next/link";
import { Database, RadioTower } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionary";
import type { Role, SessionUser } from "@/lib/types";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { DemoBadge } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

export function Sidebar({
  d,
  user,
  unreadCount,
  demoMode,
  ingestionHealthy,
  lastIngestionAt,
  ingestionStatus,
  storeMode,
  locale,
}: {
  d: Dictionary;
  user: SessionUser;
  unreadCount: number;
  demoMode: boolean;
  ingestionHealthy: boolean;
  lastIngestionAt: string | null;
  ingestionStatus: string;
  storeMode: "local" | "supabase";
  locale: "fa" | "en";
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[238px] shrink-0 flex-col border-e border-line bg-panel/50 backdrop-blur-xl lg:flex">
      <div className="px-4 pb-5 pt-5">
        <Link href="/overview" className="block rounded-lg focus-ring" aria-label={d.meta.title}>
          <Brand title={d.meta.title} tagline={d.meta.tagline} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-4">
        <SidebarNav d={d} role={user.role} unreadCount={unreadCount} />
      </div>

      <div className="border-t border-line px-3 py-3.5">
        <div className="rounded-xl border border-line bg-panel-soft/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="label-caps">{d.common.lastUpdated}</span>
            {demoMode ? <DemoBadge label={d.common.demo} /> : null}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <RadioTower className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {lastIngestionAt ? timeAgo(lastIngestionAt, locale) : d.overview.ingestionNever}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-faint">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: ingestionHealthy ? "var(--ok)" : "var(--warn)",
              }}
              aria-hidden
            />
            <span className="truncate">
              {ingestionStatus === "never"
                ? d.overview.ingestionNever
                : ingestionHealthy
                  ? d.overview.ingestionHealthy
                  : d.overview.ingestionStale}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[10.5px] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <Database className="h-3 w-3" aria-hidden />
            {storeMode === "supabase" ? "Supabase" : d.overview.localStore}
          </span>
          <span className="num" dir="ltr">v0.1</span>
        </div>
      </div>
    </aside>
  );
}

export function roleLabel(role: Role, d: Dictionary): string {
  return d.role[role];
}
