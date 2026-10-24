import { serverEnv } from "@/lib/config";
import type { SourceRecord } from "@/lib/types";
import { parseFeed, type ParsedFeedItem } from "./rss";

export const MAX_FEED_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

export type CollectResult =
  | { ok: true; status: "ok" | "not_modified"; items: ParsedFeedItem[]; etag?: string; lastModified?: string }
  | { ok: false; status: "error"; error: string; retryable: boolean };

export function ingestionUserAgent(): string {
  return `AICrisisRadar/0.1 (invitation-only monitoring; contact: ${serverEnv.contacts})`;
}

const robotsCache = new Map<string, { allowed: boolean; at: number }>();

/**
 * Minimal robots.txt check for the feed path. Fail-open on network errors but
 * record a warning upstream; operators can set RESPECT_ROBOTS=false only for
 * feeds they are contractually permitted to poll.
 */
export async function robotsAllows(feedUrl: string): Promise<boolean> {
  if (process.env.RESPECT_ROBOTS === "false") return true;
  let url: URL;
  try {
    url = new URL(feedUrl);
  } catch {
    return false;
  }

  const cached = robotsCache.get(url.origin);
  if (cached && Date.now() - cached.at < 6 * 3_600_000) return cached.allowed;

  try {
    const response = await fetch(`${url.origin}/robots.txt`, {
      headers: { "User-Agent": ingestionUserAgent() },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) {
      robotsCache.set(url.origin, { allowed: true, at: Date.now() });
      return true;
    }
    const body = (await response.text()).slice(0, 100_000);
    const lines = body.split(/\r?\n/);
    let applies = false;
    const disallows: string[] = [];
    for (const line of lines) {
      const clean = line.split("#")[0].trim();
      if (!clean) continue;
      const [field, ...rest] = clean.split(":");
      const value = rest.join(":").trim();
      if (field.toLowerCase() === "user-agent") {
        applies = value === "*" || value.toLowerCase().includes("aicrisisradar");
      } else if (applies && field.toLowerCase() === "disallow") {
        if (value) disallows.push(value);
      }
    }
    const allowed = !disallows.some((rule) => url.pathname.startsWith(rule.replace(/\*.*$/, "")));
    robotsCache.set(url.origin, { allowed, at: Date.now() });
    return allowed;
  } catch {
    return true;
  }
}

export async function collectFeed(source: SourceRecord): Promise<CollectResult> {
  if (!(await robotsAllows(source.feedUrl))) {
    return {
      ok: false,
      status: "error",
      error: "Blocked by robots.txt — review the source terms before enabling.",
      retryable: false,
    };
  }

  const headers: Record<string, string> = {
    "User-Agent": ingestionUserAgent(),
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
  };
  if (source.etag) headers["If-None-Match"] = source.etag;
  if (source.lastModified) headers["If-Modified-Since"] = source.lastModified;

  let response: Response;
  try {
    response = await fetch(source.feedUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network failure";
    return {
      ok: false,
      status: "error",
      error: `Fetch failed: ${message.slice(0, 200)}`,
      retryable: true,
    };
  }

  if (response.status === 304) {
    return { ok: true, status: "not_modified", items: [] };
  }
  if (response.status === 429) {
    return {
      ok: false,
      status: "error",
      error: "Rate limited by source (HTTP 429). Collection will back off.",
      retryable: true,
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      status: "error",
      error: `Source returned HTTP ${response.status}`,
      retryable: response.status >= 500,
    };
  }

  const lengthHeader = Number(response.headers.get("content-length") ?? "0");
  if (lengthHeader > MAX_FEED_BYTES) {
    return { ok: false, status: "error", error: "Feed exceeds size limit (2 MB).", retryable: false };
  }

  let body: string;
  try {
    body = await response.text();
  } catch {
    return { ok: false, status: "error", error: "Failed to read response body.", retryable: true };
  }
  if (body.length > MAX_FEED_BYTES) {
    return { ok: false, status: "error", error: "Feed exceeds size limit (2 MB).", retryable: false };
  }

  let parsed;
  try {
    parsed = parseFeed(body, { maxItems: 40 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unparseable feed";
    return {
      ok: false,
      status: "error",
      error: `Malformed feed: ${message.slice(0, 200)}`,
      retryable: false,
    };
  }

  return {
    ok: true,
    status: "ok",
    items: parsed.items,
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
  };
}
