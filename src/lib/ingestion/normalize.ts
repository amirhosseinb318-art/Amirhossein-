import { createHash } from "node:crypto";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "cmp",
];

/** Remove tracking parameters and normalise a URL for equality checks. */
export function canonicalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    url.protocol = url.protocol.toLowerCase();
    for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
    url.searchParams.sort();
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

export function sourceIndependenceKey(homepageUrl: string): string {
  try {
    return new URL(homepageUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return homepageUrl;
  }
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function stripHtml(input: string): string {
  let text = input.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  for (const [entity, value] of Object.entries(ENTITIES)) text = text.split(entity).join(value);
  return text.replace(/\s+/g, " ").trim();
}

export function truncate(text: string, max = 480): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Normalise text for hashing/similarity, including Persian/Arabic variants.
 * ZWNJ is replaced with a space so "برق‌آبی" and "برق آبی" compare equally.
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/\u0629/g, "ه")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSet(input: string): Set<string> {
  return new Set(
    normalizeText(input)
      .split(" ")
      .filter((token) => token.length > 1),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function similarity(a: string, b: string): number {
  return jaccard(tokenSet(a), tokenSet(b));
}

export function contentHash(title: string, excerpt: string): string {
  return createHash("sha256")
    .update(`${normalizeText(title)}\n${normalizeText(excerpt)}`)
    .digest("hex");
}
