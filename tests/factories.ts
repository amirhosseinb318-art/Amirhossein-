import type { EventRecord, ReportRecord, SourceRecord } from "@/lib/types";

const now = new Date("2026-01-01T12:00:00.000Z").toISOString();

export function makeReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: "rep_1",
    eventId: "evt_1",
    sourceId: "src_a",
    sourceName: "Source A",
    sourceReliability: "high",
    title: "A reported event in the northern district",
    url: "https://example.com/a",
    canonicalUrl: "https://example.com/a",
    excerpt: "A reported event.",
    language: "en",
    publishedAt: now,
    fetchedAt: now,
    contentHash: "hash-a",
    independenceKey: "source-a.example",
    isPrimary: false,
    status: "linked",
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "evt_1",
    title: { fa: "رویداد نمونه", en: "Sample event" },
    summary: { fa: "خلاصه", en: "Summary" },
    category: "infrastructure",
    regions: ["Region A"],
    severity: 3,
    confidence: 0.5,
    confidenceRationale: { fa: "دلیل", en: "Because" },
    status: "developing",
    isDemo: false,
    firstSeenAt: now,
    createdAt: now,
    updatedAt: now,
    statusHistory: [],
    facts: [],
    claims: [],
    unknowns: [],
    assessments: [],
    corrections: [],
    reportIds: ["rep_1", "rep_2"],
    alert: { state: "none", requiresHumanApproval: true },
    clusterKey: "sample",
    createdBy: "ingestion",
    ...overrides,
  };
}

export function primaryReport(): ReportRecord {
  return makeReport({
    id: "rep_2",
    sourceId: "src_official",
    sourceName: "Official Agency",
    sourceReliability: "primary",
    independenceKey: "official.example",
    isPrimary: true,
    title: "Official statement on the northern district event",
    url: "https://official.example/statement",
    canonicalUrl: "https://official.example/statement",
    contentHash: "hash-official",
  });
}

export function makeSource(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: "src_a",
    name: { fa: "منبع الف", en: "Source A" },
    organization: "Example News",
    homepageUrl: "https://news.example/",
    feedUrl: "https://news.example/rss.xml",
    kind: "news",
    reliability: "high",
    language: "en",
    enabled: true,
    termsNote: "Public RSS, short excerpts only.",
    errorCount: 0,
    createdAt: now,
    ...overrides,
  };
}
