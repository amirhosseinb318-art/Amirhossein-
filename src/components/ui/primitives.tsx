import type { ComponentProps, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  MinusCircle,
  ShieldCheck,
} from "lucide-react";
import { cn, percent, severityColor, STATUS_TONE } from "@/lib/utils";
import type { EventStatus, Severity, SourceReliability } from "@/lib/types";
import type { Dictionary } from "@/i18n/dictionary";

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info" | "outline";

const TONES: Record<Tone, string> = {
  neutral: "bg-panel-soft text-ink-muted border-line",
  accent: "bg-accent-soft text-accent border-accent/25",
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-accent-soft text-accent border-accent/20",
  outline: "bg-transparent text-ink-muted border-line-strong",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-medium leading-5 whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  d,
  dot = true,
  className,
}: {
  status: EventStatus;
  d: Dictionary;
  dot?: boolean;
  className?: string;
}) {
  const tone = STATUS_TONE[status] as Tone;
  return (
    <Badge tone={tone} dot={dot} className={className}>
      {d.status[status]}
    </Badge>
  );
}

export function SeverityBadge({ severity, d }: { severity: Severity; d: Dictionary }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: severityColor(severity) }}
        aria-hidden
      />
      <span className="num">{severity}</span>
      <span className="text-ink-faint">{d.severity[severity]}</span>
    </span>
  );
}

export function DemoBadge({ label }: { label: string }) {
  return (
    <Badge tone="warn" className="uppercase tracking-wide text-[10px] font-semibold">
      {label}
    </Badge>
  );
}

export const RELIABILITY_LABEL: Record<SourceReliability, { fa: string; en: string }> = {
  primary: { fa: "اولیه", en: "Primary" },
  high: { fa: "بالا", en: "High" },
  medium: { fa: "متوسط", en: "Medium" },
};

export function ReliabilityBadge({
  reliability,
  lang,
}: {
  reliability: SourceReliability;
  lang: "fa" | "en";
}) {
  return (
    <Badge tone={reliability === "primary" ? "accent" : "neutral"}>
      {RELIABILITY_LABEL[reliability][lang]}
    </Badge>
  );
}

export function ConfidenceBar({
  value,
  label,
  compact = false,
}: {
  value: number;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("w-full", compact ? "space-y-1" : "space-y-1.5")}>
      {label ? (
        <div className="flex items-center justify-between text-[11px] text-ink-faint">
          <span>{label}</span>
          <span className="num text-ink-muted">{percent(value)}</span>
        </div>
      ) : null}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-line"
        role="meter"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: percent(value) }}
        />
      </div>
    </div>
  );
}

export function Panel({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("panel", className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4 pb-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 text-ink-faint">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <div className="label-caps">{eyebrow}</div> : null}
        <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-ink md:text-[26px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-[13px] leading-6 text-ink-muted">{description}</p>
        ) : null}
        {meta ? <div className="flex flex-wrap items-center gap-3 pt-1">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-soft text-ink-faint">
        {icon ?? <MinusCircle className="h-4 w-4" aria-hidden />}
      </div>
      <h3 className="text-[13.5px] font-semibold text-ink">{title}</h3>
      {body ? <p className="mt-1.5 max-w-sm text-xs leading-5 text-ink-faint">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  icon,
  className,
  action,
}: {
  tone?: "info" | "warn" | "danger" | "ok";
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const styles = {
    info: "border-accent/20 bg-accent-soft/60 text-ink-muted",
    warn: "border-warn/25 bg-warn-soft/70 text-ink-muted",
    danger: "border-danger/25 bg-danger-soft/70 text-ink-muted",
    ok: "border-ok/25 bg-ok-soft/70 text-ink-muted",
  }[tone];
  const defaultIcon = {
    info: <Info className="h-4 w-4 text-accent" aria-hidden />,
    warn: <AlertTriangle className="h-4 w-4 text-warn" aria-hidden />,
    danger: <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />,
    ok: <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />,
  }[tone];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-5", styles, className)}>
      <span className="mt-0.5 shrink-0">{icon ?? defaultIcon}</span>
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="text-[12.5px] font-semibold text-ink">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  count,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
          {title}
          {typeof count === "number" ? (
            <span className="num rounded-md border border-line bg-panel-soft px-1.5 text-[11px] font-medium text-ink-faint">
              {count}
            </span>
          ) : null}
        </h2>
        {hint ? <p className="mt-0.5 text-[11.5px] text-ink-faint">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function KeyValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-xs">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-end text-ink">{value}</dd>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-panel-soft", className)} aria-hidden />;
}

export function ShieldNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[11.5px] leading-5 text-ink-faint">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
