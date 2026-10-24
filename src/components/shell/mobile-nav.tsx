"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import type { Dictionary } from "@/i18n/dictionary";
import type { Role } from "@/lib/types";

export function MobileNav({
  d,
  role,
  unreadCount,
}: {
  d: Dictionary;
  role: Role;
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-panel-soft hover:text-ink focus-ring lg:hidden"
        aria-label={d.nav.overview}
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={d.common.close}
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 flex w-[276px] max-w-[85vw] flex-col border-e border-line bg-panel shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between px-4 pb-4 pt-4">
              <Brand title={d.meta.title} tagline={d.meta.tagline} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-ink-faint hover:bg-panel-soft hover:text-ink focus-ring"
                aria-label={d.common.close}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 pb-6">
              <SidebarNav d={d} role={role} unreadCount={unreadCount} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
