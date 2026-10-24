"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileWarning,
  Loader2,
  Quote,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";
import type { AnalysisRunRecord, EventRecord, EventStatus, Locale, ReportRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface AnalysisEventOption {
  event: EventRecord;
  reports: ReportRecord[];
}

export function AnalysisWorkspace({
  options,
  initialEventId,
  d,
  locale,
  provider,
}: {
  options: AnalysisEventOption[];
  initialEventId: string | null;
  d: Dictionary;
  locale: Locale;
  provider: { configured: boolean; provider: string; model: string | null };
}) {
  const initialOption = useMemo(
    () => options.find((option) => option.event.id === initialEventId) ?? options[0],
    [initialEventId, options],
  );
  const [eventId, setEventId] = useState(initialOption?.event.id ?? "");
  const selectedOption = useMemo(
    () => options.find((option) => option.event.id === eventId) ?? options[0],
    [eventId, options],
  );
  const [selectedReports, setSelectedReports] = useState<string[]>(
    initialOption?.reports.slice(0, 8).map((report) => report.id) ?? [],
  );
  const [lang, setLang] = useState<Locale>(locale);
  const [run, setRun] = useState<AnalysisRunRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportMap = useMemo(
    () => new Map((selectedOption?.reports ?? []).map((report) => [report.id, report])),
    [selectedOption],
  );

  async function runAnalysis() {
    if (!selectedOption) return;
    if (selectedReports.length === 0) {
      setError(d.analysis.noSelection);
      return;
    }
    setPending(true);
    setError(null);
    setRun(null);
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedOption.event.id,
          reportIds: selectedReports,
          lang,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        run?: AnalysisRunRecord;
        message?: string;
      };
      if (!response.ok || !data.run) {
        setError(data.message ?? d.errors.generic);
        setPending(false);
        return;
      }
      setRun(data.run);
      setPending(false);
    } catch {
      setError(d.errors.generic);
      setPending(false);
    }
  }

  const output = run?.output;

  const citationChips = (ids: string[]) => (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {ids.map((id) => {
        const report = reportMap.get(id);
        if (!report) return null;
        return (
          <Link
            key={id}
            href={`/events/${selectedOption?.event.id}#report-${id}`}
            className="inline-flex max-w-56 items-center gap-1 rounded border border-line bg-panel-soft px-1.5 py-0.5 text-[9.5px] text-ink-faint transition-colors hover:border-accent/30 hover:text-accent focus-ring"
            title={report.title}
          >
            <Quote className="h-2.5 w-2.5 shrink-0" aria-hidden />
            <span className="truncate">{report.sourceName}</span>
          </Link>
        );
      })}
    </div>
  );

  if (options.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel px-6 py-12 text-center">
        <p className="text-[13px] text-ink-muted">{d.analysis.noEvents}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
      <div className="space-y-4">
        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-[13px] font-semibold text-ink">{d.analysis.selectEvent}</h2>
          <Select
            value={eventId}
            onChange={(changeEvent) => {
              const next = options.find((option) => option.event.id === changeEvent.target.value);
              setEventId(changeEvent.target.value);
              setSelectedReports(next?.reports.slice(0, 8).map((report) => report.id) ?? []);
              setRun(null);
              setError(null);
            }}
            aria-label={d.analysis.selectEvent}
            className="mt-2 text-[12px]"
          >
            {options.map((option) => (
              <option key={option.event.id} value={option.event.id}>
                {option.event.isDemo ? `[${d.common.demo}] ` : ""}
                {option.event.title[locale] || option.event.title.en}
              </option>
            ))}
          </Select>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge tone="outline">{d.status[selectedOption?.event.status ?? "unverified"]}</Badge>
            <Badge tone="outline">{d.common.severity} {selectedOption?.event.severity}</Badge>
            {selectedOption?.event.isDemo ? <Badge tone="warn">{d.common.demo}</Badge> : null}
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[12px] font-semibold text-ink">{d.analysis.selectReports}</h3>
              <button
                type="button"
                onClick={() =>
                  setSelectedReports(
                    selectedReports.length === (selectedOption?.reports.length ?? 0)
                      ? []
                      : (selectedOption?.reports.slice(0, 8).map((report) => report.id) ?? []),
                  )
                }
                className="text-[10.5px] font-medium text-accent hover:underline focus-ring"
              >
                {d.analysis.selectAll}
              </button>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-ink-faint">{d.analysis.selectReportsHint}</p>
            <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto pe-1">
              {(selectedOption?.reports ?? []).map((report) => (
                <Checkbox
                  key={report.id}
                  label={<span className="line-clamp-2 text-[11px] leading-4">{report.title}</span>}
                  description={<span className="text-[9.5px]">{report.sourceName} · {report.publishedAt.slice(0, 10)}</span>}
                  checked={selectedReports.includes(report.id)}
                  onChange={(changeEvent) => {
                    setSelectedReports((current) =>
                      changeEvent.target.checked
                        ? [...current, report.id]
                        : current.filter((id) => id !== report.id),
                    );
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
            <span className="text-[10.5px] text-ink-faint">{d.common.language}</span>
            <div className="inline-flex rounded-lg border border-line bg-canvas/60 p-0.5">
              {(["fa", "en"] as Locale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[10.5px] font-semibold uppercase focus-ring",
                    lang === code ? "bg-raised text-ink" : "text-ink-faint hover:text-ink-muted",
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" size="md" className="mt-3 w-full" onClick={runAnalysis} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <BrainCircuit className="h-3.5 w-3.5" aria-hidden />}
            {pending ? d.analysis.running : d.analysis.run}
          </Button>

          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-ink-faint">
            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            {d.analysis.safety}
          </p>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="text-[12px] font-semibold text-ink">{d.analysis.provider}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={provider.configured ? "accent" : "warn"}>
              {provider.configured ? provider.provider : d.overview.heuristicShort}
            </Badge>
            {provider.model ? (
              <span className="font-mono text-[10px] text-ink-faint" dir="ltr">{provider.model}</span>
            ) : null}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-ink-faint">
            {provider.configured ? d.analysis.safety : d.analysis.configHint}
          </p>
        </section>
      </div>

      <section className="min-w-0 space-y-4">
        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[12px] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        ) : null}

        {!run ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/50 px-6 py-12 text-center">
            <BrainCircuit className="mb-3 h-6 w-6 text-ink-faint" aria-hidden />
            <p className="text-[12.5px] font-medium text-ink-muted">{d.analysis.result}</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-ink-faint">{d.analysis.selectReportsHint}</p>
          </div>
        ) : run.status === "error" ? (
          <div className="rounded-xl border border-danger/25 bg-danger-soft/60 p-5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-danger">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {d.analysis.failed}
            </p>
            <p className="mt-2 break-anywhere text-[11.5px] leading-5 text-ink-muted">{run.error}</p>
            <p className="mt-2 text-[10.5px] text-ink-faint">{d.analysis.configHint}</p>
          </div>
        ) : output ? (
          <>
            <div className="rounded-xl border border-line bg-panel">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="text-[13px] font-semibold text-ink">{d.analysis.result}</h2>
                  <Badge tone={run.usedFallback ? "warn" : "accent"}>
                    {run.usedFallback ? d.analysis.heuristic : run.provider}
                  </Badge>
                  {run.isDemo ? <Badge tone="warn">{d.common.demo}</Badge> : null}
                </div>
                <span className="font-mono text-[10px] text-ink-faint" dir="ltr">{run.model}</span>
              </div>
              <div className="space-y-3 p-4">
                {run.usedFallback ? (
                  <p className="rounded-lg border border-warn/25 bg-warn-soft px-3 py-2 text-[10.5px] leading-4 text-ink-muted">
                    {d.analysis.heuristicNotice}
                  </p>
                ) : null}
                <p className="whitespace-pre-line text-[12.5px] leading-7 text-ink">{output.summary}</p>
                {output.citationsDropped > 0 ? (
                  <p className="flex items-center gap-1.5 text-[10.5px] text-warn">
                    <FileWarning className="h-3.5 w-3.5" aria-hidden />
                    {output.citationsDropped} {d.analysis.citationDropped}
                  </p>
                ) : null}
                {output.promptInjectionFlags.length > 0 ? (
                  <p className="flex items-start gap-1.5 rounded-lg border border-warn/25 bg-warn-soft px-3 py-2 text-[10.5px] leading-4 text-ink-muted">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
                    {d.event.injectionFlag}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-line bg-panel p-4">
                <h3 className="text-[12px] font-semibold text-ink">{d.analysis.keyClaims}</h3>
                <ul className="mt-2 space-y-3">
                  {output.keyClaims.map((claim) => (
                    <li key={claim.id} className="border-s-2 border-accent/40 ps-2.5">
                      <p className="text-[11.5px] leading-5 text-ink-muted">{claim.text}</p>
                      {citationChips(claim.reportIds)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-line bg-panel p-4">
                <h3 className="text-[12px] font-semibold text-ink">{d.analysis.contradictions}</h3>
                {output.contradictions.length === 0 ? (
                  <p className="mt-2 text-[11px] text-ink-faint">{d.common.none}</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {output.contradictions.map((item) => (
                      <li key={item.id} className="border-s-2 border-danger/40 ps-2.5">
                        <p className="text-[11.5px] leading-5 text-ink-muted">{item.text}</p>
                        {citationChips(item.reportIds)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-line bg-panel p-4">
                <h3 className="text-[12px] font-semibold text-ink">{d.analysis.coverage}</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-line bg-panel-soft px-2.5 py-2">
                    <p className="num text-lg font-semibold text-ink">{output.coverage.independentSources}</p>
                    <p className="text-[10px] text-ink-faint">{d.analysis.independent}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-panel-soft px-2.5 py-2">
                    <p className="num text-lg font-semibold text-ink">{output.coverage.primarySources}</p>
                    <p className="text-[10px] text-ink-faint">{d.analysis.primary}</p>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {output.coverage.gaps.map((gap) => (
                    <li key={gap} className="flex items-start gap-1.5 text-[10.5px] leading-4 text-ink-faint">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" aria-hidden />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-line bg-panel p-4">
                <h3 className="text-[12px] font-semibold text-ink">{d.analysis.uncertainty}</h3>
                <p className="mt-2 text-[11.5px] leading-5 text-ink-muted">{output.uncertainty}</p>
                <h4 className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{d.analysis.missingEvidence}</h4>
                <ul className="mt-1.5 space-y-1">
                  {output.missingEvidence.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[10.5px] leading-4 text-ink-faint">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold text-ink">{d.analysis.suggestions}</h3>
                {output.suggestedStatus ? (
                  <span className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
                    {d.analysis.suggestedStatus}:
                    <Badge tone="outline">{d.status[output.suggestedStatus as EventStatus]}</Badge>
                    <span className="text-[9.5px]">({d.event.modelSuggestionsHint})</span>
                  </span>
                ) : null}
              </div>
              <ul className="mt-2 space-y-1.5">
                {output.suggestions.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px] leading-5 text-ink-muted">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-line pt-2 text-[9.5px] text-ink-faint">
                {d.analysis.evidenceUsed}: {run.reportIds.length} · {d.analysis.safety}
              </p>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
