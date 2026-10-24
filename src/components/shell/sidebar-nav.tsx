"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Gauge, Radio, Shield, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, type NavItem } from "./nav-items";
import type { Dictionary } from "@/i18n/dictionary";
import type { Role } from "@/lib/types";

const ICONS = {
  gauge: Gauge,
  radio: Radio,
  sparkles: Sparkles,
  bell: Bell,
  shield: Shield,
  sliders: SlidersHorizontal,
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({
  d,
  role,
  unreadCount,
  onNavigate,
}: {
  d: Dictionary;
  role: Role;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={d.nav.overview} className="space-y-6">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => item.key !== "admin" || role === "admin");
        if (items.length === 0) return null;
        return (
          <div key={section.titleKey}>
            <p className="label-caps mb-2 px-2.5">{d.nav[section.titleKey]}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors focus-ring",
                        active
                          ? "bg-panel-soft font-medium text-ink"
                          : "text-ink-muted hover:bg-panel-soft/70 hover:text-ink",
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute inset-y-1.5 start-0 w-[2px] rounded-full bg-accent"
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "h-[15px] w-[15px] shrink-0",
                          active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{d.nav[item.key]}</span>
                      {item.key === "notifications" && unreadCount > 0 ? (
                        <span className="num ms-auto rounded-full border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
