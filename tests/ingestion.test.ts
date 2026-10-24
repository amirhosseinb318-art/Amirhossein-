import { describe, expect, it } from "vitest";
import { parseFeed } from "@/lib/ingestion/rss";
import { classifyCategory, findCluster, suggestSeverity } from "@/lib/ingestion/cluster";
import { makeEvent } from "./factories";

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Example World</title>
<item><title><![CDATA[Flood warning issued for northern districts]]></title>
<link>https://example.com/flood</link>
<description><![CDATA[<p>Authorities issued a warning after heavy rain.</p>]]></description>
<pubDate>Tue, 06 Jan 2026 10:00:00 GMT</pubDate><guid>flood-1</guid></item>
<item><title>Missing link item</title><description>No link here</description></item>
</channel></rss>`;

const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Official Alerts</title>
<entry><title>Earthquake of magnitude 5.4 recorded</title>
<link rel="alternate" href="https://official.example/quake"/>
<id>urn:quake-1</id><updated>2026-01-06T11:30:00Z</updated>
<summary>No damage reported so far.</summary></entry></feed>`;

describe("feed parsing", () => {
  it("parses RSS items and strips HTML from excerpts", () => {
    const parsed = parseFeed(rss);
    expect(parsed.title).toBe("Example World");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.title).toContain("Flood warning");
    expect(parsed.items[0]?.excerpt).toBe("Authorities issued a warning after heavy rain.");
    expect(parsed.items[0]?.url).toBe("https://example.com/flood");
    expect(Number.isNaN(Date.parse(parsed.items[0]?.publishedAt ?? ""))).toBe(false);
  });

  it("parses Atom entries and alternate links", () => {
    const parsed = parseFeed(atom);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.url).toBe("https://official.example/quake");
    expect(parsed.items[0]?.guid).toBe("urn:quake-1");
  });

  it("throws on unrecognised documents instead of silently succeeding", () => {
    expect(() => parseFeed("<html><body>Not a feed</body></html>")).toThrow();
  });
});

describe("classification and clustering", () => {
  it("classifies categories from keywords", () => {
    expect(classifyCategory("Magnitude 5.4 earthquake strikes region").category).toBe("disaster");
    expect(classifyCategory("Power outage hits the city grid").category).toBe("infrastructure");
  });

  it("keeps automated severity suggestions conservative", () => {
    expect(suggestSeverity("Routine maintenance announced")).toBe(1);
    expect(suggestSeverity("Casualties reported after explosion")).toBe(3);
    expect(suggestSeverity("M 7.1 - 100 km SW of Somewhere")).toBe(4);
    expect(suggestSeverity("Magnitude 6.2 earthquake strikes region")).toBe(3);
    expect(suggestSeverity("Magnitude 5.0 earthquake recorded")).toBe(2);
    expect(suggestSeverity("M 8.4 offshore earthquake")).toBe(4);
  });

  it("clusters a matching report onto a recent event", () => {
    const event = makeEvent({
      title: { fa: "زمین‌لرزه در منطقه شمالی", en: "Earthquake strikes the northern district" },
      category: "disaster",
      updatedAt: new Date().toISOString(),
    });
    const match = findCluster(
      {
        title: "Earthquake strikes northern district",
        excerpt: "A magnitude 5.4 earthquake was recorded.",
        publishedAt: new Date().toISOString(),
      },
      [event],
    );
    expect(match.event?.id).toBe(event.id);
    expect(match.score).toBeGreaterThan(0.5);
  });

  it("does not cluster unrelated subjects", () => {
    const event = makeEvent({
      title: { fa: "زمین‌لرزه", en: "Earthquake strikes the northern district" },
      updatedAt: new Date().toISOString(),
    });
    const match = findCluster(
      {
        title: "Central bank raises interest rates",
        excerpt: "Markets react to the decision.",
        publishedAt: new Date().toISOString(),
      },
      [event],
    );
    expect(match.event).toBeNull();
  });
});
