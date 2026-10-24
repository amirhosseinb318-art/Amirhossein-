import { cn } from "@/lib/utils";

export function RadarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("h-7 w-7", className)}
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeOpacity="0.25" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeOpacity="0.4" />
      <circle cx="16" cy="16" r="4" stroke="currentColor" strokeOpacity="0.6" />
      <path d="M16 16L16 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M16 16L27 21" stroke="currentColor" strokeOpacity="0.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
      <circle cx="23.5" cy="9.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function Brand({ title, tagline }: { title: string; tagline: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-panel-soft text-accent">
        <RadarMark className="h-5 w-5" />
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-accent/10" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold tracking-tight text-ink">{title}</span>
        <span className="block truncate text-[10.5px] text-ink-faint">{tagline}</span>
      </span>
    </div>
  );
}
