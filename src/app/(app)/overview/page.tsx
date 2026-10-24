import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  RadioTower,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getDashboardStats, listEvents } from "@/lib/events/query";
import { getRepo, repositoryMode } from "@/lib/store";
import { providerStatus } from "@/lib/ai";
import { pushConfigured, serverEnv } from "@/lib/config";
import { hoursSince } from "@/lib/time";
import { timeAgo, formatDateTime, cn } from "@/lib/utils";
import type { IngestionRunRecord, ReportRecord } from "@/lib/types";
import { Badge, EmptyState, Notice, Panel, PanelHeader, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { EventRow } from "@/components/events/event-row";
import { SeverityDistribution } from "@/components/events/severity-distribution";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { locale, d } = await getI18n();
  const events = await listEvents();
  const stats = await getDashboardStats(events);
  const repo = await getRepo();
  const reports = await repo.list<ReportRecord>("reports");
  const runs = await repo.list<IngestionRunRecord>("ingestionRuns");
  const provider = providerStatus();
  const demoMode = serverEnv.demoMode || events.some((event) => event.isDemo);
  const lastRun = [...runs]
    .filter((run) => run.finishedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];

  const reportsFor = (eventId: string) => reports.filter((report) => report.eventId === eventId);
  const recent = events.slice(0, 6);

  const staleHours = hoursSince(stats.lastIngestionAt);
  const ingestionStale = staleHours !== null && staleHours > 6;

  const kpis = [
    {
      label: d.overview.activeEvents,
      value: stats.activeEvents,
      hint: `${stats.highImpact} · ${d.severity[4]}+`,
      icon: RadioTower,
      tone: "text-accent",
    },
    {
      label: d.overview.verified24h,
      value: stats.verified24h,
      hint: d.status.verified,
      icon: CheckCircle2,
      tone: "text-ok",
    },
    {
      label: d.overview.unverified,
      value: stats.unverified,
      hint: d.status.unverified,
      icon: AlertTriangle,
      tone: "text-warn",
    },
    {
      label: d.overview.pendingReviews,
      value: stats.pendingReviews,
      hint: d.overview.reviewRequired,
      icon: Siren,
      tone: "text-danger",
    },
  ];

  const health = [
    {
      label: d.admin.ingestionStatus,
      value: lastRun ? formatDateTime(lastRun.startedAt, locale) : d.settings.never,
      hint: lastRun
        ? `${lastRun.itemsNew} new · ${lastRun.duplicates} dup · ${lastRun.errors.length} errors`
        : d.overview.ingestionNever,
      ok: Boolean(lastRun) && !ingestionStale && lastRun.status !== "failed",
      warnOnly: Boolean(lastRun) && ingestionStale,
    },
    {
      label: d.overview.sourcesHealthy,
      value: `${stats.sourcesHealthy}/${stats.sourcesEnabled}`,
      hint: `${stats.sourcesTotal} sources`,
      ok: stats.sourcesEnabled > 0 && stats.sourcesHealthy > 0,
      warnOnly: stats.sourcesEnabled === 0,
    },
    {
      label: d.overview.aiMode,
      value: provider.configured
        ? `${provider.provider} · ${provider.model}`
        : d.overview.heuristicShort,
      hint: provider.configured ? d.analysis.safety : d.analysis.configHint,
      ok: provider.configured,
      warnOnly: !provider.configured,
    },
    {
      label: d.overview.storeMode,
      value: repositoryMode() === "supabase" ? "Supabase" : d.overview.localStore,
      hint:
        repositoryMode() === "supabase"
          ? d.settings.servicesHint
          : d.common.demoBannerBody.slice(0, 90),
      ok: repositoryMode() === "supabase",
      warnOnly: repositoryMode() !== "supabase",
    },
    {
      label: d.notifications.push,
      value: pushConfigured() ? d.settings.connected : d.settings.missing,
      hint: pushConfigured() ? d.notifications.pushHint : d.notifications.pushUnavailable,
      ok: pushConfigured(),
      warnOnly: !pushConfigured(),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={d.nav.overview}
        title={d.overview.title}
        description={d.overview.subtitle}
        meta={
          <>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  ingestionStale || !lastRun ? "bg-warn" : "bg-ok",
                )}
                aria-hidden
              />
              {stats.lastUpdatedAt
                ? `${d.common.lastUpdated}: ${timeAgo(stats.lastUpdatedAt, locale)}`
                : d.overview.ingestionNever}
            </span>
            {demoMode ? (
              <Badge tone="warn">{d.common.demoBadge}</Badge>
            ) : (
              <Badge tone="ok">{d.common.online}</Badge>
            )}
          </>
        }
        actions={
          <>
            <ButtonLink href="/analysis" variant="secondary" size="sm">
              <BrainCircuit className="h-3.5 w-3.5" aria-hidden />
              {d.nav.analysis}
            </ButtonLink>
            <ButtonLink href="/feed" variant="primary" size="sm">
              {d.nav.feed}
              <ArrowUpRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
            </ButtonLink>
          </>
        }
      />

      {demoMode ? (
        <Notice
          tone="warn"
          title={
            events.some((event) => !event.isDemo)
              ? d.common.mixedBannerTitle
              : d.common.demoBannerTitle
          }
        >
          {events.some((event) => !event.isDemo)
            ? d.common.mixedBannerBody
            : d.common.demoBannerBody}
        </Notice>
      ) : null}

      <section
        aria-label={d.overview.activeEvents}
        className="grid grid-cols-2 divide-line overflow-hidden rounded-xl border border-line bg-panel shadow-panel md:grid-cols-4 md:divide-x rtl:md:divide-x-reverse"
      >
        {kpis.map((kpi) => (
          <div key={kpi.label} className="relative border-b border-line px-4 py-4 md:border-b-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium text-ink-faint">{kpi.label}</p>
              <kpi.icon className={cn("h-3.5 w-3.5", kpi.tone)} aria-hidden />
            </div>
            <p className="num mt-2 text-[26px] font-semibold leading-none tracking-tight text-ink">
              {kpi.value}
            </p>
            <p className="mt-1.5 truncate text-[10.5px] text-ink-faint">{kpi.hint}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={d.overview.feedTitle}
            subtitle={d.overview.feedSubtitle}
            icon={<Activity className="h-3.5 w-3.5" aria-hidden />}
            action={
              <Link
                href="/feed"
                className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline focus-ring"
              >
                {d.common.viewAll}
                <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden />
              </Link>
            }
          />
          <div className="divide-y divide-line border-t border-line">
            {recent.length === 0 ? (
              <EmptyState
                icon={<RadioTower className="h-4 w-4" aria-hidden />}
                title={d.overview.noEvents}
                body={d.overview.noEventsBody}
              />
            ) : (
              recent.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  reports={reportsFor(event.id)}
                  d={d}
                  locale={locale}
                  compact
                />
              ))
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title={d.overview.healthTitle}
              subtitle={d.overview.healthSubtitle}
              icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
            />
            <dl className="divide-y divide-line border-t border-line">
              {health.map((row) => (
                <div key={row.label} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-[11.5px] text-ink-muted">{row.label}</dt>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        row.ok ? "bg-ok" : row.warnOnly ? "bg-warn" : "bg-danger",
                      )}
                      aria-hidden
                    />
                  </div>
                  <dd className="mt-0.5 truncate text-[11px] text-ink" title={row.value}>
                    {row.value}
                  </dd>
                  <dd className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-ink-faint">
                    {row.hint}
                  </dd>
                </div>
              ))}
            </dl>
            {ingestionStale || !lastRun ? (
              <div className="border-t border-line px-4 py-2.5">
                <p className="flex items-start gap-1.5 text-[10.5px] leading-4 text-warn">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  {d.admin.workerWarning}
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader
              title={d.overview.distributionTitle}
              subtitle={d.overview.distributionSubtitle}
              icon={<Siren className="h-3.5 w-3.5" aria-hidden />}
            />
            <div className="border-t border-line px-4 py-4">
              <SeverityDistribution events={events} d={d} />
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <p className="flex items-start gap-1.5 text-[10.5px] leading-4 text-ink-faint">
                <Database className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {d.event.policyNote}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
