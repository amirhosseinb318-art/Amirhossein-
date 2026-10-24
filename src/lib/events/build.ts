import { newId } from "@/lib/crypto";
import { initialAlertState } from "@/lib/alerts/policy";
import { tokenSet } from "@/lib/ingestion/normalize";
import { classifyCategory, suggestSeverity } from "@/lib/ingestion/cluster";
import type { EventCategory, EventRecord, ReportRecord, Severity } from "@/lib/types";

export function buildClusterKey(title: string): string {
  const tokens = Array.from(tokenSet(title)).slice(0, 6);
  return tokens.length > 0 ? tokens.join("-").slice(0, 80) : newId("cluster");
}

/**
 * Create an unverified event around a single collected report. Automated
 * creation may never exceed `unverified`; promotion requires a human reviewer.
 * Titles are not machine-translated: both locales store the source text so no
 * translation is fabricated.
 */
export function buildEventFromReport(input: {
  report: ReportRecord;
  severity?: Severity;
  category?: EventCategory;
}): EventRecord {
  const { report } = input;
  const classification = classifyCategory(`${report.title} ${report.excerpt}`);
  const severity = input.severity ?? suggestSeverity(`${report.title} ${report.excerpt}`);
  const category = input.category ?? classification.category;
  const now = new Date().toISOString();
  const alert = initialAlertState(severity);

  return {
    id: newId("evt"),
    title: { fa: report.title, en: report.title },
    summary: {
      fa: report.excerpt || report.title,
      en: report.excerpt || report.title,
    },
    category,
    regions: [],
    severity,
    confidence: 0.2,
    confidenceRationale: {
      fa: "تنها یک گزارش اولیه در دسترس است؛ این مقدار اعتماد تحلیلی است، نه تأیید رویداد.",
      en: "Only one initial report is available. This is analytical confidence, not verification of the event.",
    },
    status: "unverified",
    isDemo: Boolean(report.isDemo),
    firstSeenAt: report.publishedAt,
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      {
        id: newId("sch"),
        at: now,
        byUserId: "system",
        byName: "Ingestion",
        from: null,
        to: "unverified",
        reason: `Created from collected report ${report.id}. Automated processes cannot verify events.`,
        evidenceReportIds: [report.id],
        demo: report.isDemo,
      },
    ],
    facts: [],
    claims: [],
    unknowns: [
      {
        id: newId("q"),
        text: {
          fa: "هیچ ارزیابی مستقل انسانی هنوز ثبت نشده است.",
          en: "No independent human assessment has been recorded yet.",
        },
      },
    ],
    assessments: [],
    corrections: [],
    reportIds: [report.id],
    alert: { ...alert },
    clusterKey: buildClusterKey(report.title),
    createdBy: "ingestion",
  };
}
