import { XMLParser } from "fast-xml-parser";
import { stripHtml, truncate } from "./normalize";

export interface ParsedFeedItem {
  guid: string;
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string;
}

export interface ParsedFeed {
  title: string;
  items: ParsedFeedItem[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
  processEntities: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["#text"] === "string") return record["#text"];
    if (typeof record["@_href"] === "string") return record["@_href"];
  }
  return "";
}

function linkOf(entry: Record<string, unknown>): string {
  const raw = entry.link;
  if (typeof raw === "string") return raw.trim();
  const links = asArray(raw as Array<Record<string, unknown>> | Record<string, unknown>);
  const alternate = links.find((link) => {
    const rel = link?.["@_rel"];
    return !rel || rel === "alternate";
  });
  return textOf(alternate ?? raw).trim();
}

function parseDate(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const raw = textOf(candidate);
    if (!raw) continue;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      // Guard against feeds with absurd future timestamps.
      const max = Date.now() + 6 * 3_600_000;
      return new Date(Math.min(parsed, max)).toISOString();
    }
  }
  return new Date().toISOString();
}

/**
 * Parse RSS 2.0 or Atom into a flat structure. Malformed entries are skipped
 * rather than throwing, so one bad item cannot fail a whole collection run.
 */
export function parseFeed(xml: string, options: { maxItems?: number } = {}): ParsedFeed {
  const maxItems = options.maxItems ?? 40;
  const doc = parser.parse(xml) as Record<string, unknown>;

  const rss = doc.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const atom = doc.feed as Record<string, unknown> | undefined;

  const root = channel ?? atom;
  if (!root) throw new Error("Unrecognised feed format (expected RSS or Atom).");

  const rawItems = asArray(
    (channel?.item ?? atom?.entry) as Record<string, unknown> | Record<string, unknown>[] | undefined,
  );

  const items: ParsedFeedItem[] = [];
  for (const raw of rawItems.slice(0, maxItems)) {
    try {
      const title = stripHtml(textOf(raw.title)).slice(0, 300);
      const url = linkOf(raw);
      if (!title || !url || !/^https?:\/\//i.test(url)) continue;

      const description = textOf(raw.description ?? raw.summary ?? raw.content ?? raw["media:description"]);
      const excerpt = truncate(stripHtml(description), 480);
      const guid = textOf(raw.guid ?? raw.id) || url;

      items.push({
        guid: guid.slice(0, 300),
        title,
        url,
        excerpt,
        publishedAt: parseDate(raw.pubDate, raw.published, raw.updated, raw["dc:date"]),
      });
    } catch {
      // Skip malformed entry, keep processing the rest.
    }
  }

  return {
    title: stripHtml(textOf(root.title)).slice(0, 200),
    items,
  };
}
