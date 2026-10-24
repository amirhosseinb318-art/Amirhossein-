import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import { Badge, ConfidenceBar, DemoBadge, SeverityBadge, StatusBadge } from "@/components/ui/primitives";
import { cn, severityColor, timeAgo } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionary";
import type { EventRecord, Locale, ReportRecord } from "@/lib/types";

export function EventRow({
  event,
  reports,
  d,
  locale,
  compact = false,
}: {
  event: EventRecord;
  reports: ReportRecord[];
  d: Dictionary;
  locale: Locale;
  compact?: boolean;
}) {
  const latest = [...reports].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  )[0];
  const title = event.title[locale] || event.title.en;
  const summary = event.summary[locale] || event.summary.en;

  return (
    <Link
      href={`/events/${event.id}`}
      className="row-link group relative flex items-stretch gap-3 px-4 py-3 focus-ring"
    >
      <span
        className="mt-1 w-[2px] shrink-0 rounded-full"
        style={{ backgroundColor: severityColor(event.severity) }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink-faint">
          <StatusBadge status={event.status} d={d} />
          <Badge tone="outline" className="text-[10.5px]">
            {d.category[event.category]}
          </Badge>
          {event.isDemo ? <DemoBadge label={d.common.demo} /> : null}
          <span className="num" aria-hidden>·</span>
          <time dateTime={event.updatedAt}>{timeAgo(event.updatedAt, locale)}</time>
          {event.reportIds.length > 1 ? (
            <>
              <span aria-hidden>·</span>
              <span className="num">
                {event.reportIds.length} {d.feed.reports}
              </span>
            </>
          ) : null}
        </div>

        <h3 className="mt-1.5 line-clamp-1 text-[13.5px] font-medium leading-6 text-ink transition-colors group-hover:text-accent">
          {title}
        </h3>
        {!compact ? (
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-5 text-ink-muted">{summary}</p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-faint">
          <SeverityBadge severity={event.severity} d={d} />
          {event.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              <span className="max-w-40 truncate">{event.location.name[locale]}</span>
            </span>
          ) : event.regions.length > 0 ? (
            <span dir="ltr" className="max-w-40 truncate">{event.regions[0]}</span>
          ) : null}
          {latest ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
              <span className="max-w-44 truncate" title={latest.sourceName}>
                {latest.sourceName}
              </span>
            </span>
          ) : null}
          <span className="ms-auto hidden w-24 sm:block">
            <ConfidenceBar
              value={event.confidence}
              compact
              label={`${d.common.confidence} ${Math.round(event.confidence * 100)}%`}
            />
          </span>
        </div>
      </div>

      <ChevronLeft
        className={cn(
          "mt-2 h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5",
        )}
        aria-hidden
      />
    </Link>
  );
}
