"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings2 } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionary";
import type { Role } from "@/lib/types";

export function UserMenu({
  name,
  email,
  role,
  d,
}: {
  name: string;
  email: string;
  role: Role;
  d: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 text-start transition-colors hover:border-line hover:bg-panel-soft focus-ring"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-panel-soft text-[10.5px] font-semibold text-ink-muted">
          {initials(name)}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-[12px] font-medium text-ink">{name}</span>
          <span className="block text-[10.5px] text-ink-faint">{d.role[role]}</span>
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-ink-faint transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-line-strong bg-panel shadow-xl animate-fade-up"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[12.5px] font-medium text-ink">{name}</p>
            <p className="truncate text-[11px] text-ink-faint" dir="ltr">{email}</p>
          </div>
          <div className="p-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-muted hover:bg-panel-soft hover:text-ink focus-ring"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden />
              {d.settings.title}
            </Link>
            <form action="/api/auth/sign-out" method="post">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[12.5px] text-ink-muted hover:bg-danger-soft hover:text-danger focus-ring"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                {d.common.signOut}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
