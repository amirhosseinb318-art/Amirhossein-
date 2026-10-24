import Link from "next/link";
import { Link2 } from "lucide-react";
import type { ReportRecord } from "@/lib/types";

export function CitationList({
  reportIds,
  reports,
  label,
}: {
  reportIds: string[];
  reports: ReportRecord[];
  label: string;
}) {
  const citations = reportIds
    .map((id) => reports.find((report) => report.id === id))
    .filter((report): report is ReportRecord => Boolean(report));

  if (citations.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-warn">
        <Link2 className="h-3 w-3" aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      {citations.map((report, index) => (
        <Link
          key={report.id}
          href={`#report-${report.id}`}
          className="inline-flex max-w-56 items-center gap-1 rounded border border-line bg-panel-soft px-1.5 py-0.5 text-[9.5px] text-ink-faint transition-colors hover:border-accent/30 hover:text-accent focus-ring"
          title={`${report.sourceName} — ${report.title}`}
        >
          <span className="num">{index + 1}</span>
          <span className="truncate">{report.sourceName}</span>
        </Link>
      ))}
    </span>
  );
}
