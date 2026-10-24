import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  Lock,
  MailPlus,
  RadioTower,
  ScrollText,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getRepo } from "@/lib/store";
import { listEvents } from "@/lib/events/query";
import { serverEnv } from "@/lib/config";
import { timeAgo } from "@/lib/utils";
import type {
  AuditLogRecord,
  IngestionRunRecord,
  InvitationRecord,
  SourceRecord,
  UserRecord,
} from "@/lib/types";
import { Badge, EmptyState, Notice, PageHeader, Panel, StatusBadge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SourceManager } from "@/components/admin/source-manager";
import { InvitationManager } from "@/components/admin/invitation-manager";
import { AlertActions } from "@/components/events/alert-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "sources" | "invitations" | "review" | "audit";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, d } = await getI18n();
  const user = await getSession();
  const params = await searchParams;
  const tabParam = typeof params.tab === "string" ? params.tab : "sources";
  const tab: Tab = (["sources", "invitations", "review", "audit"] as Tab[]).includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "sources";

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-warn/30 bg-warn-soft text-warn">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-ink">{d.common.denied}</h1>
        <p className="mt-2 text-[12.5px] leading-6 text-ink-muted">{d.admin.adminOnly}</p>
        <ButtonLink href="/overview" variant="secondary" size="sm" className="mt-4">
          {d.nav.overview}
        </ButtonLink>
      </div>
    );
  }

  const repo = await getRepo();
  const [sources, invitations, users, events, audits, runs] = await Promise.all([
    repo.list<SourceRecord>("sources"),
    repo.list<InvitationRecord>("invitations"),
    repo.list<UserRecord>("users"),
    listEvents(),
    repo.list<AuditLogRecord>("auditLogs"),
    repo.list<IngestionRunRecord>("ingestionRuns"),
  ]);

  const pendingReview = events.filter((event) => event.alert.state === "pending_review");
  const recentAudit = [...audits].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 60);
  const recentRuns = [...runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const lastRun = recentRuns[0];
  const failedRuns = recentRuns.filter((run) => run.errors.length > 0).slice(0, 5);

  const tabs: { key: Tab; label: string; icon: typeof RadioTower; count?: number }[] = [
    { key: "sources", label: d.admin.tabSources, icon: RadioTower },
    { key: "invitations", label: d.admin.tabInvitations, icon: MailPlus },
    { key: "review", label: d.admin.tabReview, icon: Siren, count: pendingReview.length },
    { key: "audit", label: d.admin.tabAudit, icon: ScrollText },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={d.nav.sectionOps}
        title={d.admin.title}
        description={d.admin.subtitle}
        meta={
          <>
            <Badge tone="accent" dot>
              {sources.filter((source) => source.enabled).length}/{sources.length} {d.admin.tabSources}
            </Badge>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <ShieldCheck className="h-3 w-3 text-ok" aria-hidden />
              {d.admin.invariants}
            </span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-[10.5px] text-ink-faint">{d.admin.ingestionStatus}</p>
          <p className="mt-1 text-[12.5px] font-medium text-ink">
            {lastRun ? timeAgo(lastRun.startedAt, locale) : d.settings.never}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-faint">
            {lastRun ? `${lastRun.itemsNew} new · ${lastRun.duplicates} dup` : d.overview.ingestionNever}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-[10.5px] text-ink-faint">{d.overview.pendingReviews}</p>
          <p className="num mt-1 text-[12.5px] font-medium text-ink">{pendingReview.length}</p>
          <p className="mt-0.5 text-[10px] text-ink-faint">{d.overview.reviewRequired}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-[10.5px] text-ink-faint">{d.settings.ingestion}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
            <span className={cn("h-1.5 w-1.5 rounded-full", serverEnv.cronSecret ? "bg-ok" : "bg-warn")} aria-hidden />
            {serverEnv.cronSecret ? d.settings.connected : d.settings.missing}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-faint">{d.admin.workerWarning}</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-b border-line pb-px" aria-label={d.admin.title}>
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/admin?tab=${item.key}`}
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-[12px] font-medium transition-colors focus-ring",
              tab === item.key
                ? "text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:bg-accent"
                : "text-ink-faint hover:text-ink-muted",
            )}
            aria-current={tab === item.key ? "page" : undefined}
          >
            <item.icon className="h-3.5 w-3.5" aria-hidden />
            {item.label}
            {item.count ? (
              <span className="num rounded-full border border-warn/30 bg-warn-soft px-1.5 text-[9.5px] text-warn">
                {item.count}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {tab === "sources" ? (
        <div className="space-y-4">
          <SourceManager sources={sources} d={d} locale={locale} />
          <Panel>
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-hidden />
                {d.admin.errorLog}
              </h3>
              <span className="text-[10px] text-ink-faint">{d.admin.workerWarning}</span>
            </div>
            {failedRuns.length === 0 ? (
              <p className="px-4 py-4 text-[11px] text-ink-faint">{d.admin.noErrors}</p>
            ) : (
              <ul className="divide-y divide-line">
                {failedRuns.map((run) => {
                  const source = sources.find((item) => item.id === run.sourceId);
                  return (
                    <li key={run.id} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                        <span className="font-medium text-ink">{source?.organization ?? run.sourceId}</span>
                        <Badge tone={run.status === "failed" ? "danger" : "warn"}>{run.status}</Badge>
                        <span className="ms-auto text-ink-faint">{timeAgo(run.startedAt, locale)}</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-danger">{run.errors.join(" · ")}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "invitations" ? (
        <InvitationManager
          invitations={[...invitations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))}
          users={[...users].sort((a, b) => a.name.localeCompare(b.name))}
          d={d}
          locale={locale}
          currentUserId={user.id}
        />
      ) : null}

      {tab === "review" ? (
        <div className="space-y-4">
          <Notice tone="warn" title={d.admin.reviewTitle}>
            {d.admin.reviewHint}
          </Notice>
          {pendingReview.length === 0 ? (
            <Panel>
              <EmptyState
                icon={<ClipboardList className="h-4 w-4" aria-hidden />}
                title={d.admin.noReviews}
                body={d.event.policyNote}
              />
            </Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pendingReview.map((event) => (
                <Panel key={event.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={event.status} d={d} />
                    <Badge tone="danger">{d.severity[event.severity]}</Badge>
                    {event.isDemo ? <Badge tone="warn">{d.common.demo}</Badge> : null}
                    <span className="ms-auto text-[10px] text-ink-faint">{timeAgo(event.updatedAt, locale)}</span>
                  </div>
                  <Link
                    href={`/events/${event.id}`}
                    className="mt-2 block text-[12.5px] font-medium leading-6 text-ink hover:text-accent focus-ring"
                  >
                    {event.title[locale] || event.title.en}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-[10.5px] leading-5 text-ink-faint">
                    {event.summary[locale] || event.summary.en}
                  </p>
                  <div className="mt-3 border-t border-line pt-3">
                    <AlertActions event={event} role={user.role} d={d} />
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "audit" ? (
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <div>
              <h2 className="text-[12.5px] font-semibold text-ink">{d.admin.auditTitle}</h2>
              <p className="mt-0.5 text-[10px] text-ink-faint">{d.admin.auditHint}</p>
            </div>
            <Badge tone="outline">{recentAudit.length}</Badge>
          </div>
          {recentAudit.length === 0 ? (
            <p className="px-4 py-8 text-center text-[11px] text-ink-faint">{d.admin.noAudit}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[11px]">
                <thead>
                  <tr className="border-b border-line bg-panel-soft/60 text-[9.5px] uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-2 text-start font-semibold">{d.admin.when}</th>
                    <th className="px-3 py-2 text-start font-semibold">{d.admin.action}</th>
                    <th className="px-3 py-2 text-start font-semibold">{d.admin.actor}</th>
                    <th className="px-3 py-2 text-start font-semibold">{d.admin.target}</th>
                    <th className="px-3 py-2 text-start font-semibold">{d.common.summary}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentAudit.map((entry) => (
                    <tr key={entry.id} className="hover:bg-panel-soft/40">
                      <td className="whitespace-nowrap px-4 py-2 text-[10px] text-ink-faint">
                        {timeAgo(entry.at, locale)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone="outline" className="font-mono text-[9px]">{entry.action}</Badge>
                      </td>
                      <td className="px-3 py-2 text-ink-muted" dir="ltr">{entry.actorEmail}</td>
                      <td className="px-3 py-2 font-mono text-[9.5px] text-ink-faint">{entry.targetType}:{entry.targetId}</td>
                      <td className="px-3 py-2 text-ink-muted">{entry.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
