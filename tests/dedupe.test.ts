import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  contentHash,
  normalizeText,
  similarity,
} from "@/lib/ingestion/normalize";
import { dedupeBatch, findDuplicate } from "@/lib/ingestion/dedupe";
import { makeReport } from "./factories";

describe("URL canonicalisation", () => {
  it("strips tracking parameters, fragments and trailing slashes", () => {
    expect(
      canonicalizeUrl("https://News.Example.com/story/?utm_source=x&utm_medium=y&id=7#top"),
    ).toBe("https://news.example.com/story?id=7");
  });

  it("keeps distinct paths distinct", () => {
    expect(canonicalizeUrl("https://a.example/x")).not.toBe(canonicalizeUrl("https://a.example/y"));
  });
});

describe("text normalisation", () => {
  it("normalises Persian/Arabic variants and ZWNJ", () => {
    expect(normalizeText("برق‌آبی كرج")).toBe(normalizeText("برق ابی کرج"));
  });

  it("produces stable content hashes", () => {
    expect(contentHash("Flood hits region", "Water rising")).toBe(
      contentHash("Flood hits region", "Water rising"),
    );
    expect(contentHash("Flood hits region", "Water rising")).not.toBe(
      contentHash("Flood hits region", "Water falling"),
    );
  });

  it("scores similar titles higher than unrelated ones", () => {
    const a = "Earthquake strikes the northern region";
    const b = "Earthquake strikes northern region";
    const c = "Currency markets close higher";
    expect(similarity(a, b)).toBeGreaterThan(0.7);
    expect(similarity(a, c)).toBeLessThan(0.2);
  });
});

describe("report deduplication", () => {
  const existing = [makeReport({ id: "rep_existing" })];

  it("detects the same canonical URL from the same source", () => {
    const decision = findDuplicate(
      {
        sourceId: "src_a",
        canonicalUrl: "https://example.com/a",
        contentHash: "different-hash",
        title: "Completely different headline",
        publishedAt: new Date().toISOString(),
      },
      existing,
    );
    expect(decision.duplicate).toBe(true);
    expect(decision.reason).toBe("canonical_url");
  });

  it("detects identical content from the same source", () => {
    const decision = findDuplicate(
      {
        sourceId: "src_a",
        canonicalUrl: "https://example.com/other",
        contentHash: "hash-a",
        title: "Other headline",
        publishedAt: new Date().toISOString(),
      },
      existing,
    );
    expect(decision.duplicate).toBe(true);
    expect(decision.reason).toBe("content_hash");
  });

  it("does NOT merge coverage from a different source — corroboration needs both records", () => {
    const decision = findDuplicate(
      {
        sourceId: "src_other",
        canonicalUrl: "https://other.example/a",
        contentHash: "hash-a",
        title: "A reported event in the northern district",
        publishedAt: new Date().toISOString(),
      },
      existing,
    );
    expect(decision.duplicate).toBe(false);
  });

  it("drops duplicates inside a single fetch batch", () => {
    const batch = [
      { sourceId: "src_a", canonicalUrl: "https://a/1", contentHash: "h1", title: "One", publishedAt: new Date().toISOString() },
      { sourceId: "src_a", canonicalUrl: "https://a/1?utm_source=x", contentHash: "h2", title: "One again", publishedAt: new Date().toISOString() },
      { sourceId: "src_a", canonicalUrl: "https://a/2", contentHash: "h1", title: "Two", publishedAt: new Date().toISOString() },
      { sourceId: "src_a", canonicalUrl: "https://a/3", contentHash: "h3", title: "Three", publishedAt: new Date().toISOString() },
    ];
    const { accepted, dropped } = dedupeBatch(batch);
    expect(accepted).toHaveLength(2);
    expect(dropped).toHaveLength(2);
  });
});
