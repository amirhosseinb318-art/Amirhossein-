import type {
  ReportRecord,
  SourceRecord,
  UserRecord,
  UserSettingsRecord,
} from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/config";

const iso = (daysAgo: number, hoursAgo = 0): string =>
  new Date(Date.now() - daysAgo * 86_400_000 - hoursAgo * 3_600_000).toISOString();

export const DEMO_IDS = {
  userAdmin: "usr_demo_admin",
  userAnalyst: "usr_demo_analyst",
  userViewer: "usr_demo_viewer",
} as const;

/**
 * Approved public source catalogue.
 *
 * Real, documented public feeds, seeded disabled by default. An administrator
 * must enable them (and confirm current terms) before collection runs.
 */
export const SOURCE_CATALOGUE: SourceRecord[] = [
  {
    id: "src_usgs",
    name: { fa: "زمین‌لرزه‌های سازمان زمین‌شناسی آمریکا", en: "USGS significant earthquakes" },
    organization: "U.S. Geological Survey",
    homepageUrl: "https://earthquake.usgs.gov/",
    feedUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom",
    kind: "official",
    reliability: "primary",
    language: "en",
    enabled: false,
    termsNote:
      "Public US government data feed. Attribution requested; do not imply endorsement. Apply conservative polling intervals.",
    errorCount: 0,
    createdAt: iso(60),
  },
  {
    id: "src_gdacs",
    name: { fa: "سامانهٔ هشدار بلایای جهانی", en: "GDACS disaster alerts" },
    organization: "European Commission JRC / UN OCHA",
    homepageUrl: "https://www.gdacs.org/",
    feedUrl: "https://www.gdacs.org/xml/rss.xml",
    kind: "official",
    reliability: "primary",
    language: "en",
    enabled: false,
    termsNote: "Public humanitarian alert feed. Attribute GDACS; verify before redistribution.",
    errorCount: 0,
    createdAt: iso(60),
  },
  {
    id: "src_nws",
    name: { fa: "هشدارهای هواشناسی آمریکا", en: "U.S. National Weather Service alerts" },
    organization: "NOAA / NWS",
    homepageUrl: "https://www.weather.gov/",
    feedUrl: "https://api.weather.gov/alerts/active.atom",
    kind: "weather",
    reliability: "primary",
    language: "en",
    enabled: false,
    termsNote: "Public domain US government alerts. NWS asks for a descriptive User-Agent.",
    errorCount: 0,
    createdAt: iso(60),
  },
  {
    id: "src_reliefweb",
    name: { fa: "به‌روزرسانی‌های رلیف‌وب", en: "ReliefWeb updates" },
    organization: "UN OCHA",
    homepageUrl: "https://reliefweb.int/",
    feedUrl: "https://reliefweb.int/updates/rss.xml",
    kind: "agency",
    reliability: "high",
    language: "en",
    enabled: false,
    termsNote: "Humanitarian reporting feed. Check OCHA reuse terms before redistribution.",
    errorCount: 0,
    createdAt: iso(60),
  },
  {
    id: "src_bbc_world",
    name: { fa: "بی‌بی‌سی — جهان", en: "BBC News — World" },
    organization: "BBC",
    homepageUrl: "https://www.bbc.com/news/world",
    feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
    kind: "news",
    reliability: "high",
    language: "en",
    enabled: false,
    termsNote:
      "Public RSS. BBC content is copyrighted; store short excerpts only and always link to origin.",
    errorCount: 0,
    createdAt: iso(60),
  },
  {
    id: "src_guardian_world",
    name: { fa: "گاردین — جهان", en: "The Guardian — World" },
    organization: "Guardian News & Media",
    homepageUrl: "https://www.theguardian.com/world",
    feedUrl: "https://www.theguardian.com/world/rss",
    kind: "news",
    reliability: "high",
    language: "en",
    enabled: false,
    termsNote:
      "Public RSS. Guardian open-platform terms apply; excerpts only with attribution and links.",
    errorCount: 0,
    createdAt: iso(60),
  },
  {
    id: "src_aljazeera",
    name: { fa: "الجزیره — همهٔ اخبار", en: "Al Jazeera — All news" },
    organization: "Al Jazeera Media Network",
    homepageUrl: "https://www.aljazeera.com/",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
    kind: "news",
    reliability: "high",
    language: "en",
    enabled: false,
    termsNote: "Public RSS feed. Copyright Al Jazeera; excerpts and links only.",
    errorCount: 0,
    createdAt: iso(60),
  },
];

function demoReport(
  id: string,
  eventId: string,
  sourceId: string,
  sourceName: string,
  title: string,
  excerpt: string,
  reliability: ReportRecord["sourceReliability"],
  hoursAgo: number,
): ReportRecord {
  return {
    id,
    eventId,
    sourceId,
    sourceName,
    sourceReliability: reliability,
    title,
    url: `https://demo.invalid/reports/${id}`,
    canonicalUrl: `https://demo.invalid/reports/${id}`,
    excerpt,
    language: "en",
    publishedAt: iso(0, hoursAgo),
    fetchedAt: iso(0, Math.max(0, hoursAgo - 0.2)),
    contentHash: `demo-${id}`,
    independenceKey: sourceId,
    isPrimary: reliability === "primary",
    isDemo: true,
    status: "linked",
  };
}

/**
 * Synthetic reports. They use the reserved `.invalid` TLD and are flagged
 * `isDemo`, so they can never be mistaken for real published articles.
 */
export const DEMO_REPORTS: ReportRecord[] = [
  demoReport(
    "rep_demo_grid_1",
    "evt_demo_grid",
    "src_demo_grid_operator",
    "Demo Grid Operator (synthetic)",
    "[DEMO] Operator reports controlled load-shedding in drill sector",
    "Synthetic record for interface demonstration. A fictional operator says rotating load-shedding affects three fictional districts for up to 90 minutes.",
    "primary",
    3,
  ),
  demoReport(
    "rep_demo_grid_2",
    "evt_demo_grid",
    "src_demo_wire",
    "Demo Wire Service (synthetic)",
    "[DEMO] Fictional wire report: substation fault under investigation",
    "Synthetic record. A fictional wire service attributes the outage to a substation fault, citing an unnamed official.",
    "high",
    2.5,
  ),
  demoReport(
    "rep_demo_grid_3",
    "evt_demo_grid",
    "src_demo_social",
    "Demo Social Account (synthetic)",
    "[DEMO] Fictional social post claims wider outage",
    "Synthetic record. A fictional account claims the outage is nationwide; no corroboration exists in this demo dataset.",
    "medium",
    1.5,
  ),
  demoReport(
    "rep_demo_storm_1",
    "evt_demo_storm",
    "src_demo_met",
    "Demo Meteorological Office (synthetic)",
    "[DEMO] Coastal storm watch issued for drill coastline",
    "Synthetic record. A fictional meteorological office issues a storm watch for a fictional coastline, valid for 12 hours.",
    "primary",
    5,
  ),
  demoReport(
    "rep_demo_storm_2",
    "evt_demo_storm",
    "src_demo_local_news",
    "Demo Local News (synthetic)",
    "[DEMO] Fictional local outlet: ferries suspended ahead of weather",
    "Synthetic record. A fictional local outlet reports ferry suspensions as a precaution; no damage reported.",
    "high",
    4,
  ),
  demoReport(
    "rep_demo_cable_1",
    "evt_demo_cable",
    "src_demo_social",
    "Demo Social Account (synthetic)",
    "[DEMO] Fictional post: undersea cable maintenance affects connectivity",
    "Synthetic record. A single fictional post claims connectivity degradation during scheduled maintenance. Unverified.",
    "medium",
    2,
  ),
  demoReport(
    "rep_demo_health_1",
    "evt_demo_health",
    "src_demo_health_agency",
    "Demo Health Agency (synthetic)",
    "[DEMO] Fictional advisory about a product recall",
    "Synthetic record. A fictional agency issues a product recall advisory for a fictional product batch.",
    "primary",
    30,
  ),
  demoReport(
    "rep_demo_health_2",
    "evt_demo_health",
    "src_demo_local_news",
    "Demo Local News (synthetic)",
    "[DEMO] Fictional outlet retracts overstated recall scope",
    "Synthetic record. A fictional outlet corrects an earlier claim that the recall covered all batches.",
    "high",
    26,
  ),
];

const DEMO_USERS_SPEC = [
  { id: DEMO_IDS.userAdmin, email: "admin@demo.local", name: "Demo Administrator", role: "admin" as const },
  { id: DEMO_IDS.userAnalyst, email: "analyst@demo.local", name: "Demo Analyst", role: "analyst" as const },
  { id: DEMO_IDS.userViewer, email: "viewer@demo.local", name: "Demo Viewer", role: "viewer" as const },
];

export async function buildDemoUsers(passwordHash: string): Promise<UserRecord[]> {
  return DEMO_USERS_SPEC.map((user) => ({
    ...user,
    status: "active" as const,
    passwordHash,
    createdAt: iso(45),
    locale: "fa" as const,
  }));
}

export function buildDemoSettings(): UserSettingsRecord[] {
  return DEMO_USERS_SPEC.map((user) => ({
    id: user.id,
    userId: user.id,
    locale: "fa" as const,
    theme: "dark" as const,
    alertCategories: [...EVENT_CATEGORIES],
    minSeverity: 3 as const,
    inAppEnabled: true,
    pushEnabled: false,
    quietHours: { enabled: false, start: "23:00", end: "07:00" },
  }));
}
