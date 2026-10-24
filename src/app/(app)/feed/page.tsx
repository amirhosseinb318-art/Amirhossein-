import Link from "next/link";
import { Filter, Inbox, RadioTower } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { availableRegions, listEvents } from "@/lib/events/query";
import { getRepo } from "@/lib/store";
import { EVENT_CATEGORIES, EVENT_STATUSES, SEVERITIES } from "@/lib/config";
import type { EventCategory, EventStatus, ReportRecord, Severity, EventFilters } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Badge, EmptyState, PageHeader, Panel } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { EventRow } from "@/components/events/event-row";
import { FeedFilters } from "@/components/events/feed-filters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { locale, d } = await getI18n();
  const params = await searchParams;

  const query = one(params.q) ?? "";
  const statusParam = one(params.status);
  const categoryParam = one(params.category);
  const severityParam = one(params.severity);
  const regionParam = one(params.region);
  const windowParam = one(params.window);
  const sortParam = one(params.sort) ?? "recent";
  const page = Math.max(1, Number(one(params.page) ?? "1") || 1);

  const status: EventStatus | "all" = EVENT_STATUSES.includes(statusParam as EventStatus)
    ? (statusParam as EventStatus)
    : "all";
  const category: EventCategory | "all" = EVENT_CATEGORIES.includes(categoryParam as EventCategory)
    ? (categoryParam as EventCategory)
    : "all";
  const severity: Severity | "all" = SEVERITIES.includes(Number(severityParam) as Severity)
    ? (Number(severityParam) as Severity)
    : "all";
  const windowHours = ["24", "72", "168"].includes(windowParam ?? "")
    ? Number(windowParam)
    : null;

  const filters: EventFilters = {
    query,
    status,
    category,
    severity,
    region: regionParam ?? "all",
    updatedWithinHours: windowHours,
  };

  const [allEvents, events, repo] = await Promise.all([
    listEvents(),
    listEvents(filters),
    getRepo(),
  ]);
  const reports = await repo.list<ReportRecord>("reports");

  const sorted = [...events].sort((a, b) => {
    if (sortParam === "severity") return b.severity - a.severity || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (sortParam === "confidence") return b.confidence - a.confidence;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });

  const total = sorted.length;
  const visible = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = total > visible.length;
  const regions = availableRegions(allEvents);

  function nextHref() {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (status !== "all") next.set("status", status);
    if (category !== "all") next.set("category", category);
    if (severity !== "all") next.set("severity", String(severity));
    if (regionParam) next.set("region", regionParam);
    if (windowHours) next.set("window", String(windowHours));
    if (sortParam !== "recent") next.set("sort", sortParam);
    next.set("page", String(page + 1));
    return `/feed?${next.toString()}`;
  }

  const lastUpdate = allEvents[0]?.updatedAt ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={d.nav.feed}
        title={d.feed.title}
        description={d.feed.subtitle}
        meta={
          <>
            <Badge tone="accent" dot>
              {total} {d.feed.results}
            </Badge>
            {lastUpdate ? (
              <span className="text-[11px] text-ink-faint">
                {d.common.lastUpdated}: {timeAgo(lastUpdate, locale)}
              </span>
            ) : null}
          </>
        }
      />

      <FeedFilters
        d={d}
        options={{
          categories: EVENT_CATEGORIES,
          statuses: EVENT_STATUSES,
          severities: SEVERITIES,
          regions,
        }}
        initial={{
          q: query,
          status,
          category,
          severity: severity === "all" ? "all" : String(severity),
          region: regionParam ?? "all",
          window: windowHours ? String(windowHours) : "any",
          sort: sortParam,
        }}
      />

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <Filter className="h-3 w-3" aria-hidden />
            {total} {d.feed.results}
            {query ? <span className="text-ink-muted">· “{query}”</span> : null}
          </p>
          <p className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
            <RadioTower className="h-3 w-3" aria-hidden />
            {d.feed.sortBy}: {sortParam === "severity" ? d.feed.sortSeverity : sortParam === "confidence" ? d.feed.sortConfidence : d.feed.sortRecent}
          </p>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-4 w-4" aria-hidden />}
            title={d.common.noResults}
            body={d.common.noResultsBody}
            action={
              <ButtonLink href="/feed" variant="secondary" size="sm">
                {d.common.clearFilters}
              </ButtonLink>
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {visible.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                reports={reports.filter((report) => report.eventId === event.id)}
                d={d}
                locale={locale}
              />
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-4">
            <Link
              href={nextHref()}
              scroll={false}
              className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-panel-soft px-4 text-[12.5px] font-medium text-ink hover:bg-raised focus-ring"
            >
              {d.feed.loadMore}
              <span className="num ms-1.5 text-ink-faint">
                {visible.length}/{total}
              </span>
            </Link>
            <p className="text-[10.5px] text-ink-faint">
              {total - visible.length} {d.feed.results}
            </p>
          </div>
        ) : visible.length > 0 ? (
          <div className="border-t border-line px-4 py-3 text-center text-[10.5px] text-ink-faint">
            {d.feed.endOfList}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
