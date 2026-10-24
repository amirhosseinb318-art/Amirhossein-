import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BrainCircuit,
  ExternalLink,
  FileText,
  History,
  MapPin,
  PencilLine,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getEventDetail } from "@/lib/events/query";
import { getRepo } from "@/lib/store";
import { can } from "@/lib/rbac";
import { independentCoverage } from "@/lib/verification";
import { formatDateTime, timeAgo } from "@/lib/utils";
import type { AnalysisRunRecord } from "@/lib/types";
import {
  Badge,
  ConfidenceBar,
  DemoBadge,
  KeyValue,
  Notice,
  Panel,
  PanelHeader,
  SectionTitle,
  SeverityBadge,
  StatusBadge,
} from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { IntelligenceSections } from "@/components/events/intelligence-sections";
import { ReportCard } from "@/components/events/report-card";
import { EventTimeline } from "@/components/events/event-timeline";
import { StatusForm } from "@/components/events/status-form";
import { AlertActions } from "@/components/events/alert-actions";
import { CorrectionForm } from "@/components/events/correction-form";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, d } = await getI18n();
  const user = await getSession();
  if (!user) notFound();

  const detail = await getEventDetail(decodeURIComponent(id));
  if (!detail) notFound();
  const { event, reports } = detail;

  const repo = await getRepo();
  const analysisRuns = await repo.list<AnalysisRunRecord>(
    "analysisRuns",
    (run) => run.eventId === event.id,
  );
  const latestAnalysis = analysisRuns.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )[0];

  const coverage = independentCoverage(reports);
  const canTransition = can(user.role, "events:transition");
  const title = event.title[locale] || event.title.en;
  const summary = event.summary[locale] || event.summary.en;

  return (
    <div className="space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink focus-ring"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        {d.event.backToFeed}
      </Link>

      <header className="space-y-3 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={event.status} d={d} />
          <Badge tone="outline">{d.category[event.category]}</Badge>
          <SeverityBadge severity={event.severity} d={d} />
          {event.isDemo ? <DemoBadge label={d.common.demo} /> : null}
          <span className="ms-auto hidden items-center gap-1.5 text-[10.5px] text-ink-faint sm:flex">
            <History className="h-3 w-3" aria-hidden />
            {d.common.lastUpdated}: {timeAgo(event.updatedAt, locale)}
          </span>
        </div>

        <h1 className="max-w-4xl text-[22px] font-semibold leading-8 tracking-[-0.01em] text-ink md:text-[26px] md:leading-9">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-faint">
          {event.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {event.location.name[locale] || event.location.name.en}
            </span>
          ) : event.regions.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              <span dir="ltr">{event.regions.join(", ")}</span>
            </span>
          ) : null}
          <span className="num">
            {d.event.reportsCount}: {reports.length}
          </span>
          <span className="num">
            {d.event.firstSeen}: {formatDateTime(event.firstSeenAt, locale)}
          </span>
          {event.lastVerifiedAt ? (
            <span className="inline-flex items-center gap-1 text-ok">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              {d.event.lastVerified}: {formatDateTime(event.lastVerifiedAt, locale)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <ButtonLink href={`/analysis?event=${event.id}`} variant="secondary" size="sm">
            <BrainCircuit className="h-3.5 w-3.5" aria-hidden />
            {d.event.openAnalysis}
          </ButtonLink>
          {reports[0] && !reports[0].isDemo ? (
            <a
              href={reports[0].url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] text-ink-muted transition-colors hover:bg-panel-soft hover:text-ink focus-ring"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {d.common.source}
            </a>
          ) : null}
        </div>
      </header>

      {event.isDemo ? (
        <Notice tone="warn" title={d.event.demoTitle}>
          {d.event.demoBody}
        </Notice>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel className="p-5">
            <SectionTitle title={d.common.summary} hint={d.common.translationNote} />
            <p className="text-[13px] leading-7 text-ink-muted">{summary}</p>
            {event.corrections.length > 0 ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="label-caps mb-2 flex items-center gap-1.5">
                  <Siren className="h-3 w-3 text-danger" aria-hidden />
                  {d.event.corrections}
                </p>
                <ul className="space-y-2">
                  {event.corrections.map((correction) => (
                    <li
                      key={correction.id}
                      className="rounded-lg border border-danger/20 bg-danger-soft/50 px-3 py-2"
                    >
                      <p className="text-[11.5px] leading-5 text-ink-muted">
                        {correction.note[locale] || correction.note.en}
                      </p>
                      <p className="mt-1 text-[10px] text-ink-faint">
                        {correction.byName} · {formatDateTime(correction.at, locale)} ·{" "}
                        {correction.kind === "retraction" ? d.status.retracted : d.event.corrections}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <IntelligenceSections event={event} reports={reports} d={d} locale={locale} />

          <Panel>
            <PanelHeader
              title={`${d.event.sourcesTitle} (${reports.length})`}
              subtitle={d.event.sourcesHint}
              icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
            />
            <div className="space-y-2.5 border-t border-line p-4">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} d={d} locale={locale} />
              ))}
            </div>
          </Panel>

          <EventTimeline event={event} d={d} locale={locale} />
        </div>

        <aside className="space-y-4">
          <Panel>
            <PanelHeader
              title={d.common.status}
              icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
            />
            <div className="space-y-3 border-t border-line p-4">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={event.status} d={d} />
                <SeverityBadge severity={event.severity} d={d} />
              </div>
              <p className="text-[10.5px] leading-4 text-ink-faint">{d.statusHint[event.status]}</p>

              <ConfidenceBar value={event.confidence} label={d.common.confidence} />
              <p className="text-[10.5px] leading-4 text-ink-faint">
                {event.confidenceRationale[locale] || event.confidenceRationale.en}
              </p>

              <dl className="divide-y divide-line border-t border-line pt-1 text-[11px]">
                <KeyValue label={d.event.independentSources} value={<span className="num">{coverage.independentSources}</span>} />
                <KeyValue label={d.event.primarySources} value={<span className="num">{coverage.primarySources}</span>} />
                <KeyValue label={d.event.reportsCount} value={<span className="num">{reports.length}</span>} />
              </dl>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title={d.event.alertReview}
              icon={<Siren className="h-3.5 w-3.5" aria-hidden />}
            />
            <div className="border-t border-line p-4">
              <AlertActions event={event} role={user.role} d={d} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title={d.event.changeStatus}
              icon={<History className="h-3.5 w-3.5" aria-hidden />}
            />
            <div className="border-t border-line p-4">
              {canTransition ? (
                <StatusForm event={event} reports={reports} role={user.role} d={d} />
              ) : (
                <p className="text-[11px] leading-5 text-ink-faint">{d.errors.forbidden}</p>
              )}
            </div>
          </Panel>

          {user.role === "admin" ? (
            <Panel>
              <PanelHeader
                title={d.event.addCorrection}
                icon={<PencilLine className="h-3.5 w-3.5" aria-hidden />}
              />
              <div className="border-t border-line p-4">
                <CorrectionForm eventId={event.id} d={d} />
              </div>
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader
              title={d.analysis.result}
              icon={<BrainCircuit className="h-3.5 w-3.5" aria-hidden />}
              action={
                <Link
                  href={`/analysis?event=${event.id}`}
                  className="text-[10.5px] font-medium text-accent hover:underline focus-ring"
                >
                  {d.common.open}
                </Link>
              }
            />
            <div className="border-t border-line p-4">
              {latestAnalysis?.output ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={latestAnalysis.usedFallback ? "warn" : "accent"}>
                      {latestAnalysis.usedFallback ? d.overview.heuristicShort : latestAnalysis.provider}
                    </Badge>
                    <span className="text-[10px] text-ink-faint">
                      {timeAgo(latestAnalysis.createdAt, locale)}
                    </span>
                  </div>
                  <p className="line-clamp-6 text-[11px] leading-5 text-ink-muted">
                    {latestAnalysis.output.summary}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] leading-5 text-ink-faint">
                  {latestAnalysis?.status === "error" ? latestAnalysis.error : d.analysis.noRuns}
                </p>
              )}
            </div>
          </Panel>

          <p className="px-1 text-[10px] leading-4 text-ink-faint">{d.event.policyNote}</p>
        </aside>
      </div>
    </div>
  );
}
