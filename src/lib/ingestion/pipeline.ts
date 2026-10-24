import { newId } from "@/lib/crypto";
import { serverEnv } from "@/lib/config";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { notifyReviewQueue } from "@/lib/notifications";
import { buildEventFromReport } from "@/lib/events/build";
import { collectFeed } from "./collector";
import { dedupeBatch, findDuplicate } from "./dedupe";
import { canonicalizeUrl, contentHash, sourceIndependenceKey, truncate } from "./normalize";
import { findCluster } from "./cluster";
import type { EventRecord, IngestionRunRecord, ReportRecord, SourceRecord } from "@/lib/types";

export interface IngestionOptions {
  sourceIds?: string[];
  triggeredBy: string;
  force?: boolean;
}

export interface IngestionSummary {
  runs: IngestionRunRecord[];
  newReports: number;
  newEvents: number;
  linked: number;
  duplicates: number;
  errors: string[];
  skipped: number;
}

let running = false;

export function ingestionRunning(): boolean {
  return running;
}

function toReport(
  source: SourceRecord,
  item: { title: string; url: string; excerpt: string; publishedAt: string },
): ReportRecord {
  const canonicalUrl = canonicalizeUrl(item.url);
  const excerpt = truncate(item.excerpt, 480);
  return {
    id: newId("rep"),
    eventId: null,
    sourceId: source.id,
    sourceName: source.name.en,
    sourceReliability: source.reliability,
    title: truncate(item.title, 300),
    url: item.url,
    canonicalUrl,
    excerpt,
    language: source.language,
    publishedAt: item.publishedAt,
    fetchedAt: new Date().toISOString(),
    contentHash: contentHash(item.title, excerpt),
    independenceKey: sourceIndependenceKey(source.homepageUrl),
    isPrimary: source.reliability === "primary",
    status: "unlinked",
  };
}

/**
 * Collect → normalize → dedupe → cluster. Never fabricates event content: a new
 * event is always created as `unverified` from the stored report, and high
 * severity alerts enter the human review queue rather than being delivered.
 */
export async function runIngestion(options: IngestionOptions): Promise<IngestionSummary> {
  if (running) throw new Error("An ingestion run is already in progress.");
  running = true;
  const summary: IngestionSummary = {
    runs: [],
    newReports: 0,
    newEvents: 0,
    linked: 0,
    duplicates: 0,
    errors: [],
    skipped: 0,
  };

  try {
    const repo = await getRepo();
    const sources = await repo.list<SourceRecord>("sources");
    const targets = sources.filter(
      (source) => source.enabled && (!options.sourceIds || options.sourceIds.includes(source.id)),
    );
    if (targets.length === 0) {
      return { ...summary, errors: ["No enabled sources matched this run."] };
    }

    const events = await repo.list<EventRecord>("events", (event) => !event.isDemo);

    for (const source of targets) {
      const lastAttempt = source.lastAttemptAt ? Date.parse(source.lastAttemptAt) : 0;
      if (!options.force && Date.now() - lastAttempt < serverEnv.ingestionMinIntervalMs) {
        summary.skipped += 1;
        continue;
      }

      const startedAt = new Date().toISOString();
      const run: IngestionRunRecord = {
        id: newId("ing"),
        sourceId: source.id,
        startedAt,
        status: "running",
        itemsFound: 0,
        itemsNew: 0,
        duplicates: 0,
        linked: 0,
        errors: [],
        triggeredBy: options.triggeredBy.slice(0, 120),
      };
      await repo.insert("ingestionRuns", run);
      await repo.update<SourceRecord>("sources", source.id, { lastAttemptAt: startedAt });

      try {
        const result = await collectFeed(source);

        if (!result.ok) {
          run.status = "failed";
          run.errors.push(result.error);
          summary.errors.push(`${source.name.en}: ${result.error}`);
          await repo.update<SourceRecord>("sources", source.id, {
            lastError: result.error.slice(0, 300),
            errorCount: source.errorCount + 1,
          });
          continue;
        }

        if (result.status === "not_modified") {
          run.status = "ok";
          await repo.update<SourceRecord>("sources", source.id, {
            lastSuccessAt: new Date().toISOString(),
            lastError: undefined,
            errorCount: 0,
          });
          continue;
        }

        run.itemsFound = result.items.length;
        const existingReports = await repo.list<ReportRecord>(
          "reports",
          (report) => report.sourceId === source.id,
        );

        const candidates = result.items.map((item) => toReport(source, item));
        const { accepted, dropped } = dedupeBatch(candidates);
        run.duplicates += dropped.length;
        summary.duplicates += dropped.length;

        for (const candidate of accepted) {
          const duplicate = findDuplicate(candidate, existingReports);
          if (duplicate.duplicate) {
            run.duplicates += 1;
            summary.duplicates += 1;
            continue;
          }

          await repo.insert("reports", candidate);
          existingReports.push(candidate);
          summary.newReports += 1;
          run.itemsNew += 1;

          const match = findCluster(
            {
              title: candidate.title,
              excerpt: candidate.excerpt,
              publishedAt: candidate.publishedAt,
            },
            events,
          );

          if (match.event) {
            const linkedEvent: EventRecord = {
              ...match.event,
              reportIds: [...match.event.reportIds, candidate.id],
              updatedAt: new Date().toISOString(),
            };
            await repo.update<EventRecord>("events", linkedEvent.id, {
              reportIds: linkedEvent.reportIds,
              updatedAt: linkedEvent.updatedAt,
            });
            await repo.update<ReportRecord>("reports", candidate.id, {
              eventId: linkedEvent.id,
              status: "linked",
            });
            const index = events.findIndex((event) => event.id === linkedEvent.id);
            if (index >= 0) events[index] = linkedEvent;
            run.linked += 1;
            summary.linked += 1;
          } else {
            const event = buildEventFromReport({ report: candidate });
            await repo.insert("events", event);
            await repo.update<ReportRecord>("reports", candidate.id, {
              eventId: event.id,
              status: "linked",
            });
            events.unshift(event);
            run.linked += 1;
            summary.linked += 1;
            summary.newEvents += 1;
            if (event.alert.state === "pending_review") await notifyReviewQueue(event);
          }
        }

        run.status = run.errors.length > 0 ? "partial" : "ok";
        await repo.update<SourceRecord>("sources", source.id, {
          lastSuccessAt: new Date().toISOString(),
          lastError: undefined,
          errorCount: 0,
          etag: result.etag ?? source.etag,
          lastModified: result.lastModified ?? source.lastModified,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected ingestion failure";
        run.status = "failed";
        run.errors.push(message.slice(0, 300));
        summary.errors.push(`${source.name.en}: ${message.slice(0, 200)}`);
        await repo.update<SourceRecord>("sources", source.id, {
          lastError: message.slice(0, 300),
          errorCount: source.errorCount + 1,
        });
      } finally {
        run.finishedAt = new Date().toISOString();
        await repo.update<IngestionRunRecord>("ingestionRuns", run.id, run);
        summary.runs.push(run);
      }
    }

    await writeAudit({
      actorId: options.triggeredBy === "cron" ? "cron" : "ingestion",
      actorEmail: options.triggeredBy.slice(0, 120),
      action: "ingestion.run",
      targetType: "ingestion",
      targetId: summary.runs[0]?.id ?? "none",
      summary: `Ingestion completed: ${summary.newReports} new reports, ${summary.newEvents} events`,
      meta: {
        newReports: summary.newReports,
        newEvents: summary.newEvents,
        duplicates: summary.duplicates,
        errors: summary.errors.length,
      },
    });

    return summary;
  } finally {
    running = false;
  }
}
