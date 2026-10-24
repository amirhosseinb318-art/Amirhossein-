import Link from "next/link";
import { BrainCircuit, History, ShieldCheck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { listEvents } from "@/lib/events/query";
import { getRepo } from "@/lib/store";
import { providerStatus } from "@/lib/ai";
import { timeAgo } from "@/lib/utils";
import type { AnalysisRunRecord, ReportRecord } from "@/lib/types";
import { Badge, Notice, PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";
import { AnalysisWorkspace, type AnalysisEventOption } from "@/components/analysis/workspace";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, d } = await getI18n();
  const user = await getSession();
  const params = await searchParams;
  const initialEventId = typeof params.event === "string" ? params.event : null;

  const events = await listEvents();
  const repo = await getRepo();
  const reports = await repo.list<ReportRecord>("reports");

  const options: AnalysisEventOption[] = events.map((event) => ({
    event,
    reports: reports
      .filter((report) => event.reportIds.includes(report.id))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
  }));

  const runs = (await repo.list<AnalysisRunRecord>("analysisRuns"))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6);

  const provider = providerStatus();
  const eventById = new Map(events.map((event) => [event.id, event]));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={d.nav.sectionIntel}
        title={d.analysis.title}
        description={d.analysis.subtitle}
        meta={
          <>
            <Badge tone={provider.configured ? "accent" : "warn"}>
              {provider.configured ? provider.provider : d.overview.heuristicShort}
            </Badge>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <ShieldCheck className="h-3 w-3 text-ok" aria-hidden />
              {d.analysis.safety}
            </span>
          </>
        }
      />

      {!user ? null : null}

      <Notice tone="info" title={d.analysis.provider}>
        {provider.configured ? d.analysis.safety : d.analysis.configHint}
      </Notice>

      <AnalysisWorkspace
        options={options}
        initialEventId={initialEventId}
        d={d}
        locale={locale}
        provider={{
          configured: provider.configured,
          provider: provider.provider,
          model: provider.model,
        }}
      />

      <Panel>
        <PanelHeader
          title={d.analysis.history}
          subtitle={d.analysis.safety}
          icon={<History className="h-3.5 w-3.5" aria-hidden />}
        />
        <div className="border-t border-line">
          {runs.length === 0 ? (
            <p className="px-4 py-6 text-center text-[11.5px] text-ink-faint">{d.analysis.noRuns}</p>
          ) : (
            <ul className="divide-y divide-line">
              {runs.map((run) => {
                const event = eventById.get(run.eventId);
                return (
                  <li key={run.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                    <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                    <Link
                      href={`/events/${run.eventId}`}
                      className="min-w-0 flex-1 truncate text-[11.5px] text-ink hover:text-accent hover:underline focus-ring"
                    >
                      {event ? event.title[locale] || event.title.en : run.eventId}
                    </Link>
                    <Badge tone={run.status === "error" ? "danger" : run.usedFallback ? "warn" : "accent"}>
                      {run.status === "error" ? d.analysis.failed : run.usedFallback ? d.overview.heuristicShort : run.provider}
                    </Badge>
                    {run.isDemo ? <Badge tone="warn">{d.common.demo}</Badge> : null}
                    <span className="num text-[10px] text-ink-faint">{run.reportIds.length} reports</span>
                    <span className="text-[10px] text-ink-faint">{timeAgo(run.createdAt, locale)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
