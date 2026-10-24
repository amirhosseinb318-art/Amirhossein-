import { ArrowLeft } from "lucide-react";
import { Badge, Panel, PanelHeader, StatusBadge } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionary";
import type { EventRecord, Locale } from "@/lib/types";

export function EventTimeline({
  event,
  d,
  locale,
}: {
  event: EventRecord;
  d: Dictionary;
  locale: Locale;
}) {
  const history = [...event.statusHistory].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return (
    <Panel>
      <PanelHeader title={d.event.chronology} subtitle={d.event.changeStatusHint} />
      <ol className="border-t border-line px-5 pb-5 pt-4">
        {history.map((change, index) => (
          <li key={change.id} className="relative flex gap-3 pb-4 last:pb-0">
            <span className="relative flex w-4 shrink-0 justify-center">
              <span
                className="mt-1 h-2 w-2 rounded-full border-2 border-panel"
                style={{
                  backgroundColor:
                    change.to === "verified"
                      ? "var(--ok)"
                      : change.to === "retracted"
                        ? "var(--danger)"
                        : change.to === "corroborated"
                          ? "var(--accent)"
                          : change.to === "developing"
                            ? "var(--warn)"
                            : "var(--ink-faint)",
                }}
                aria-hidden
              />
              {index < history.length - 1 ? (
                <span className="absolute bottom-0 top-3 w-px bg-line" aria-hidden />
              ) : null}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {change.from ? (
                  <>
                    <StatusBadge status={change.from} d={d} dot={false} className="text-[9.5px]" />
                    <ArrowLeft className="h-3 w-3 text-ink-faint rtl:rotate-180" aria-hidden />
                  </>
                ) : null}
                <StatusBadge status={change.to} d={d} className="text-[9.5px]" />
                <span className="ms-auto text-[10px] text-ink-faint">
                  {formatDateTime(change.at, locale)}
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-5 text-ink-muted">{change.reason}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-ink-faint">
                <span>{change.byName}</span>
                {change.demo ? <Badge tone="warn" className="text-[9px]">{d.common.demo}</Badge> : null}
                {change.evidenceReportIds.length > 0 ? (
                  <span className="num">
                    {change.evidenceReportIds.length} {d.event.evidenceCount}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
