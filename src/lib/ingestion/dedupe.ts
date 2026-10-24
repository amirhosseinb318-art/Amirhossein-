import type { ReportRecord } from "@/lib/types";
import { canonicalizeUrl, similarity } from "./normalize";

export interface DedupeCandidate {
  sourceId: string;
  canonicalUrl: string;
  contentHash: string;
  title: string;
  publishedAt: string;
}

export interface DedupeOptions {
  /** Same-source near-duplicate window, default 7 days. */
  windowMs?: number;
  /** Title similarity threshold for same-source near-duplicates, default 0.92. */
  similarityThreshold?: number;
}

export interface DedupeDecision {
  duplicate: boolean;
  reason?: "canonical_url" | "content_hash" | "near_duplicate_title";
  matchedId?: string;
}

/**
 * Deduplication is intentionally *per source*. Two outlets covering the same
 * event must both be stored: they are the evidence used for corroboration.
 * Re-fetching the same article, however, must not create a second record.
 */
export function findDuplicate(
  candidate: DedupeCandidate,
  existing: ReportRecord[],
  options: DedupeOptions = {},
): DedupeDecision {
  const windowMs = options.windowMs ?? 7 * 86_400_000;
  const threshold = options.similarityThreshold ?? 0.92;
  const candidateTime = Date.parse(candidate.publishedAt);

  for (const report of existing) {
    if (report.sourceId !== candidate.sourceId) continue;

    if (report.canonicalUrl === candidate.canonicalUrl) {
      return { duplicate: true, reason: "canonical_url", matchedId: report.id };
    }
    if (report.contentHash === candidate.contentHash) {
      return { duplicate: true, reason: "content_hash", matchedId: report.id };
    }

    const reportTime = Date.parse(report.publishedAt);
    const withinWindow =
      Number.isFinite(candidateTime) && Number.isFinite(reportTime)
        ? Math.abs(candidateTime - reportTime) <= windowMs
        : true;

    if (withinWindow && similarity(report.title, candidate.title) >= threshold) {
      return { duplicate: true, reason: "near_duplicate_title", matchedId: report.id };
    }
  }

  return { duplicate: false };
}

/** Removes duplicates inside a freshly fetched batch (same-source only). */
export function dedupeBatch<T extends DedupeCandidate & { title: string }>(items: T[]): {
  accepted: T[];
  dropped: T[];
} {
  const accepted: T[] = [];
  const dropped: T[] = [];
  const seenUrls = new Set<string>();
  const seenHashes = new Set<string>();

  for (const item of items) {
    const urlKey = item.canonicalUrl ? canonicalizeUrl(item.canonicalUrl) : item.title;
    if (seenUrls.has(urlKey) || seenHashes.has(item.contentHash)) {
      dropped.push(item);
      continue;
    }
    seenUrls.add(urlKey);
    seenHashes.add(item.contentHash);
    accepted.push(item);
  }

  return { accepted, dropped };
}
