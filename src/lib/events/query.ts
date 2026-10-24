import { getRepo } from "@/lib/store";
import { normalizeText } from "@/lib/ingestion/normalize";
import type {
  EventFilters,
  EventRecord,
  IngestionRunRecord,
  ReportRecord,
  SourceRecord,
} from "@/lib/types";

export function eventMatchesQuery(event: EventRecord, query: string): boolean {
  const needle = normalizeText(query);
  if (!needle) return true;
  const haystack = normalizeText(
    [event.title.fa, event.title.en, event.summary.fa, event.summary.en, ...event.regions].join(" "),
  );
  return needle.split(" ").every((token) => haystack.includes(token));
}

export async function listEvents(filters: EventFilters = {}): Promise<EventRecord[]> {
  const repo = await getRepo();
  let events = await repo.list<EventRecord>("events");

  if (filters.demo !== undefined) events = events.filter((event) => event.isDemo === filters.demo);
  if (filters.status && filters.status !== "all") {
    events = events.filter((event) => event.status === filters.status);
  }
  if (filters.category && filters.category !== "all") {
    events = events.filter((event) => event.category === filters.category);
  }
  if (filters.severity && filters.severity !== "all") {
    events = events.filter((event) => event.severity === filters.severity);
  }
  if (filters.region && filters.region !== "all") {
    events = events.filter((event) => event.regions.includes(filters.region as string));
  }
  if (filters.updatedWithinHours) {
    const cutoff = Date.now() - filters.updatedWithinHours * 3_600_000;
    events = events.filter((event) => Date.parse(event.updatedAt) >= cutoff);
  }
  if (filters.query) events = events.filter((event) => eventMatchesQuery(event, filters.query!));

  return events.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function getEventDetail(
  id: string,
): Promise<{ event: EventRecord; reports: ReportRecord[] } | null> {
  const repo = await getRepo();
  const event = await repo.get<EventRecord>("events", id);
  if (!event) return null;
  const reports = await repo.list<ReportRecord>(
    "reports",
    (report) => event.reportIds.includes(report.id),
  );
  reports.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return { event, reports };
}

export function availableRegions(events: EventRecord[]): string[] {
  return Array.from(new Set(events.flatMap((event) => event.regions))).sort();
}

export interface DashboardStats {
  activeEvents: number;
  verified24h: number;
  unverified: number;
  pendingReviews: number;
  highImpact: number;
  lastUpdatedAt: string | null;
  sourcesEnabled: number;
  sourcesTotal: number;
  sourcesHealthy: number;
  lastIngestionAt: string | null;
  ingestionStatus: "ok" | "partial" | "failed" | "never";
}

export async function getDashboardStats(events: EventRecord[]): Promise<DashboardStats> {
  const repo = await getRepo();
  const sources = await repo.list<SourceRecord>("sources");
  const runs = await repo.list<IngestionRunRecord>("ingestionRuns");
  const completed = runs.filter((run) => run.finishedAt);
  const lastRun = completed.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  const cutoff = Date.now() - 24 * 3_600_000;

  return {
    activeEvents: events.filter((event) => event.status !== "retracted").length,
    verified24h: events.filter(
      (event) =>
        event.status === "verified" &&
        event.lastVerifiedAt &&
        Date.parse(event.lastVerifiedAt) >= cutoff,
    ).length,
    unverified: events.filter((event) => event.status === "unverified").length,
    pendingReviews: events.filter((event) => event.alert.state === "pending_review").length,
    highImpact: events.filter((event) => event.severity >= 4 && event.status !== "retracted").length,
    lastUpdatedAt:
      events.length > 0
        ? new Date(Math.max(...events.map((event) => Date.parse(event.updatedAt)))).toISOString()
        : null,
    sourcesEnabled: sources.filter((source) => source.enabled).length,
    sourcesTotal: sources.length,
    sourcesHealthy: sources.filter(
      (source) =>
        source.enabled &&
        source.lastSuccessAt &&
        Date.now() - Date.parse(source.lastSuccessAt) < 24 * 3_600_000,
    ).length,
    lastIngestionAt: lastRun?.startedAt ?? null,
    ingestionStatus: lastRun
      ? lastRun.status === "running"
        ? "partial"
        : lastRun.status
      : "never",
  };
}
