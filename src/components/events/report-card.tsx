import Link from "next/link";
import { ExternalLink, FileWarning } from "lucide-react";
import { Badge, ReliabilityBadge } from "@/components/ui/primitives";
import { formatDateTime, safeExternalUrl } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionary";
import type { Locale, ReportRecord } from "@/lib/types";

export function ReportCard({
  report,
  d,
  locale,
}: {
  report: ReportRecord;
  d: Dictionary;
  locale: Locale;
}) {
  const href = report.isDemo ? null : safeExternalUrl(report.url);

  return (
    <article
      id={`report-${report.id}`}
      className="scroll-mt-24 rounded-xl border border-line bg-panel px-4 py-3.5 transition-colors hover:border-line-strong"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink-faint">
        <span className="font-medium text-ink-muted">{report.sourceName}</span>
        <ReliabilityBadge reliability={report.sourceReliability} lang={locale} />
        {report.isPrimary ? <Badge tone="accent">{d.event.primarySources}</Badge> : null}
        {report.isDemo ? <Badge tone="warn">{d.common.demoRecord}</Badge> : null}
        <span className="num ms-auto" title={d.common.collected}>
          {d.common.published}: {formatDateTime(report.publishedAt, locale)}
        </span>
      </div>

      <h3 className="mt-2 text-[12.5px] font-medium leading-6 text-ink">
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-start gap-1.5 hover:text-accent hover:underline focus-ring"
          >
            {report.title}
            <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
          </Link>
        ) : (
          report.title
        )}
      </h3>

      {report.excerpt ? (
        <p className="mt-1.5 text-[11.5px] leading-5 text-ink-muted">{report.excerpt}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2 text-[10px] text-ink-faint">
        <span>{d.common.collected}: {formatDateTime(report.fetchedAt, locale)}</span>
        {!href ? (
          <span className="inline-flex items-center gap-1 text-warn">
            <FileWarning className="h-3 w-3" aria-hidden />
            {report.isDemo ? d.common.demoRecord : d.common.unknown}
          </span>
        ) : null}
        <span className="ms-auto font-mono text-[9.5px]" dir="ltr">
          {report.id}
        </span>
      </div>
    </article>
  );
}
