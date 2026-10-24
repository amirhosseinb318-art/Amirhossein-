import type { EventCategory, EventRecord, Severity } from "@/lib/types";
import { normalizeText, similarity } from "./normalize";

const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  conflict: [
    "airstrike",
    "air strike",
    "military strike",
    "airstrike",
    "missile",
    "troops",
    "ceasefire",
    "military",
    "حمله",
    "موشک",
    "نظامی",
    "آتش‌بس",
    "درگیری",
  ],
  disaster: [
    "earthquake",
    "wildfire",
    "flood",
    "landslide",
    "explosion",
    "زمین‌لرزه",
    "سیل",
    "آتش‌سوزی",
    "رانش زمین",
    "انفجار",
  ],
  weather: [
    "storm",
    "hurricane",
    "cyclone",
    "heatwave",
    "blizzard",
    "tornado",
    "توفان",
    "طوفان",
    "گرما",
    "برف",
    "گردباد",
  ],
  infrastructure: [
    "outage",
    "blackout",
    "power grid",
    "pipeline",
    "cable",
    "rail",
    "airport",
    "قطع برق",
    "برق",
    "خط لوله",
    "کابل",
    "ریلی",
    "فرودگاه",
  ],
  health: [
    "outbreak",
    "epidemic",
    "recall",
    "hospital",
    "vaccine",
    "شیوع",
    "همه‌گیری",
    "فراخوان",
    "بیمارستان",
    "واکسن",
  ],
  geopolitical: [
    "sanctions",
    "summit",
    "treaty",
    "diplomatic",
    "border",
    "تحریم",
    "نشست",
    "پیمان",
    "دیپلماتیک",
    "مرز",
  ],
  economy: [
    "inflation",
    "currency",
    "market",
    "bank",
    "trade",
    "تورم",
    "ارز",
    "بازار",
    "بانک",
    "تجارت",
  ],
  other: [],
};

export function classifyCategory(text: string): { category: EventCategory; score: number } {
  const normalized = normalizeText(text);
  let best: EventCategory = "other";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    EventCategory,
    string[],
  ][]) {
    let score = 0;
    for (const keyword of keywords) {
      if (normalized.includes(normalizeText(keyword))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  return { category: best, score: bestScore };
}

/**
 * Conservative severity suggestion. Anything above 3 is never implied by a
 * single feed item; high severity requires analyst review.
 */
export function suggestSeverity(text: string): Severity {
  // Magnitude is a factual measurement present in official feeds (e.g. "M 7.0 - ...").
  // Mapped conservatively: nothing is auto-escalated to critical, and severity 4
  // still requires human alert review.
  const magnitude = text.match(/(?:magnitude|\bm)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (magnitude) {
    const value = Number(magnitude[1]);
    if (Number.isFinite(value)) {
      if (value >= 7.0) return 4;
      if (value >= 6.0) return 3;
      if (value >= 5.0) return 2;
    }
  }

  const normalized = normalizeText(text);
  const severeSignals = ["casualt", "dead", "killed", "evacuat", "کشته", "تلفات", "تخلیه"];
  const moderateSignals = ["injur", "damage", "closure", "suspend", "زخمی", "خسارت", "تعطیل"];
  if (severeSignals.some((signal) => normalized.includes(normalizeText(signal)))) return 3;
  if (moderateSignals.some((signal) => normalized.includes(normalizeText(signal)))) return 2;
  return 1;
}

export interface ClusterCandidate {
  title: string;
  excerpt: string;
  publishedAt: string;
  category?: EventCategory;
}

export interface ClusterMatch {
  event: EventRecord | null;
  score: number;
}

/**
 * Deterministic clustering aid. A model may propose clusters, but linking is
 * always recorded and reversible. Thresholds are intentionally conservative.
 */
export function findCluster(
  candidate: ClusterCandidate,
  events: EventRecord[],
  options: { now?: number; windowHours?: number; threshold?: number } = {},
): ClusterMatch {
  const now = options.now ?? Date.now();
  const windowMs = (options.windowHours ?? 72) * 3_600_000;
  const threshold = options.threshold ?? 0.55;
  const category = candidate.category ?? classifyCategory(`${candidate.title} ${candidate.excerpt}`).category;
  const candidateTime = Date.parse(candidate.publishedAt);

  let best: EventRecord | null = null;
  let bestScore = 0;

  for (const event of events) {
    if (event.status === "retracted") continue;
    const updated = Date.parse(event.updatedAt);
    if (!Number.isFinite(updated) || now - updated > windowMs) continue;

    const titleScore = Math.max(
      similarity(candidate.title, event.title.en),
      similarity(candidate.title, event.title.fa),
    );
    const categoryScore = event.category === category && category !== "other" ? 1 : 0;
    const timeScore = Math.max(0, 1 - Math.abs(now - (Number.isFinite(candidateTime) ? candidateTime : now)) / windowMs);
    const score = titleScore * 0.62 + categoryScore * 0.23 + timeScore * 0.15;

    if (score > bestScore) {
      bestScore = score;
      best = event;
    }
  }

  return { event: bestScore >= threshold ? best : null, score: Number(bestScore.toFixed(3)) };
}
