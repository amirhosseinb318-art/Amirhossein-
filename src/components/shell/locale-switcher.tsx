"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === locale) return;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `radar_locale=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="inline-flex h-8 items-center rounded-lg border border-line bg-panel-soft p-0.5"
      role="group"
      aria-label={label}
    >
      {(["fa", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cn(
            "flex h-7 min-w-8 items-center justify-center rounded-[6px] px-2 text-[11px] font-semibold uppercase transition-colors focus-ring",
            locale === code ? "bg-raised text-ink shadow-sm" : "text-ink-faint hover:text-ink-muted",
          )}
        >
          {pending && locale !== code ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : code}
        </button>
      ))}
    </div>
  );
}
