import type { Dictionary } from "@/i18n/dictionary";
import type { EventRecord, Severity } from "@/lib/types";
import { severityColor } from "@/lib/utils";

export function SeverityDistribution({
  events,
  d,
}: {
  events: EventRecord[];
  d: Dictionary;
}) {
  const active = events.filter((event) => event.status !== "retracted");
  const counts = ([1, 2, 3, 4, 5] as Severity[]).map((severity) => ({
    severity,
    count: active.filter((event) => event.severity === severity).length,
  }));
  const max = Math.max(1, ...counts.map((row) => row.count));

  return (
    <ul className="space-y-2.5">
      {counts.map((row) => (
        <li key={row.severity} className="flex items-center gap-2.5">
          <span className="w-14 shrink-0 text-[10.5px] text-ink-faint">
            {d.severity[row.severity]}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(row.count / max) * 100}%`,
                backgroundColor: severityColor(row.severity),
                opacity: row.count === 0 ? 0 : 1,
              }}
            />
          </span>
          <span className="num w-6 shrink-0 text-end text-[11px] text-ink-muted">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}
