import Link from "next/link";
import { Bell, Search } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionary";
import type { Locale, SessionUser } from "@/lib/types";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

export function Topbar({
  d,
  locale,
  theme,
  user,
  unreadCount,
  demoMode,
}: {
  d: Dictionary;
  locale: Locale;
  theme: "dark" | "light";
  user: SessionUser;
  unreadCount: number;
  demoMode: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line glass">
      <div className="flex h-14 items-center gap-2 px-3 md:px-5">
        <MobileNav d={d} role={user.role} unreadCount={unreadCount} />

        <form action="/feed" method="get" role="search" className="hidden min-w-0 flex-1 md:block md:max-w-sm">
          <label htmlFor="global-search" className="sr-only">
            {d.common.search}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-ink-faint"
              aria-hidden
            />
            <input
              id="global-search"
              name="q"
              type="search"
              placeholder={d.common.searchPlaceholder}
              className="h-8 w-full rounded-lg border border-line bg-canvas/50 ps-8 pe-3 text-[12px] text-ink placeholder:text-ink-faint/80 transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </form>

        <div className="ms-auto flex items-center gap-1">
          {demoMode ? (
            <span className="me-1 hidden items-center gap-1.5 rounded-md border border-warn/30 bg-warn-soft px-2 py-1 text-[10.5px] font-medium text-warn sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden />
              {d.common.demoBadge}
            </span>
          ) : null}

          <LocaleSwitcher locale={locale} label={d.common.language} />
          <ThemeToggle theme={theme} label={d.common.theme} />

          <Link
            href="/notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ink-muted transition-colors hover:border-line hover:bg-panel-soft hover:text-ink focus-ring"
            aria-label={d.nav.notifications}
          >
            <Bell className="h-4 w-4" aria-hidden />
            {unreadCount > 0 ? (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-panel bg-accent px-1 text-[9.5px] font-bold text-accent-ink">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
          <UserMenu name={user.name} email={user.email} role={user.role} d={d} />
        </div>
      </div>
    </header>
  );
}
