import type { AnalysisOutput, EventRecord, Locale, ReportRecord } from "@/lib/types";
import { scanForInjection } from "./prompt";
import { truncate } from "@/lib/ingestion/normalize";

/**
 * Deterministic, extractive analysis used when no model provider is configured.
 * It is labelled as a heuristic fallback everywhere in the UI: it performs no
 * generation, invents nothing, and only cites stored report IDs.
 */
export function heuristicAnalysis(
  event: EventRecord,
  reports: ReportRecord[],
  lang: Locale,
): AnalysisOutput {
  const keys = new Set(reports.map((r) => r.independenceKey || r.sourceId));
  const primary = new Set(
    reports.filter((r) => r.isPrimary).map((r) => r.independenceKey || r.sourceId),
  );
  const flags = reports.flatMap((report) => scanForInjection(`${report.title} ${report.excerpt}`));

  const fa = lang === "fa";
  const newest = [...reports].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  )[0];

  const summary = fa
    ? `این تحلیل اکتشافی بدون مدل زبانی و تنها بر پایهٔ ${reports.length} گزارش ذخیره‌شده از ${keys.size} منبع مستقل تهیه شده است. جدیدترین گزارش از «${newest?.sourceName ?? "—"}» در ${newest ? new Date(newest.publishedAt).toISOString().slice(0, 10) : "—"} منتشر شده است. این متن خلاصهٔ محتوای موجود است و هیچ نتیجه‌گیری فراتر از گزارش‌ها انجام نمی‌دهد.`
    : `This heuristic analysis was produced without a language model, using only ${reports.length} stored report(s) from ${keys.size} independent source(s). The most recent report is from "${newest?.sourceName ?? "—"}" on ${newest ? new Date(newest.publishedAt).toISOString().slice(0, 10) : "—"}. It summarises available content and draws no conclusion beyond the stored records.`;

  const keyClaims = reports.slice(0, 6).map((report, index) => ({
    id: `finding-${index + 1}`,
    text: fa
      ? `«${report.sourceName}» گزارش می‌دهد: ${truncate(report.title, 220)}`
      : `"${report.sourceName}" reports: ${truncate(report.title, 220)}`,
    reportIds: [report.id],
  }));

  const contradictions = event.claims
    .filter((claim) => claim.status === "contested" && claim.reportIds.length > 0)
    .slice(0, 4)
    .map((claim, index) => ({
      id: `contradiction-${index + 1}`,
      text: fa
        ? `ادعای مورد اختلاف: ${claim.text.fa}`
        : `Contested claim: ${claim.text.en}`,
      reportIds: claim.reportIds,
    }));

  const gaps: string[] = [];
  if (keys.size < 2) gaps.push(fa ? "فقط یک منبع مستقل در دسترس است." : "Only one independent source is available.");
  if (primary.size === 0) gaps.push(fa ? "هیچ منبع اولیه/رسمی ثبت نشده است." : "No primary or official source is stored.");
  if (event.unknowns.length > 0) {
    gaps.push(
      fa
        ? `${event.unknowns.length} پرسش باز بدون پاسخ در پرونده ثبت شده است.`
        : `${event.unknowns.length} open question(s) remain unanswered in the record.`,
    );
  }

  const suggestedStatus =
    keys.size >= 2 && primary.size >= 1 ? ("corroborated" as const) : ("unverified" as const);

  return {
    summary,
    keyClaims,
    contradictions,
    coverage: { independentSources: keys.size, primarySources: primary.size, gaps },
    uncertainty: fa
      ? "این ارزیابی اکتشافی است: تازگی، استقلال و کیفیت منابع به‌صورت انسانی بررسی نشده است. نبود گزارش تکمیلی به معنای نبود رویداد نیست."
      : "This is a heuristic assessment: source freshness, independence and quality have not been reviewed by a human. Missing reports do not mean the event did not occur.",
    missingEvidence: [
      ...(primary.size === 0
        ? [fa ? "بیانیه یا دادهٔ منبع اولیه" : "Primary-source statement or data"]
        : []),
      ...(keys.size < 2
        ? [fa ? "گزارش مستقل دوم برای تأیید متقابل" : "A second independent report for corroboration"]
        : []),
      ...(event.unknowns.length > 0
        ? [fa ? "پاسخ مستند به پرسش‌های باز پرونده" : "Documented answers to the record's open questions"]
        : []),
    ],
    suggestedStatus,
    suggestions: [
      fa
        ? "پیش از هر تغییر وضعیت، گزارش‌ها را به‌صورت انسانی بررسی کنید."
        : "Review the stored reports manually before changing verification status.",
      fa
        ? "برای این تحلیل مدل زبانی پیکربندی نشده است؛ خروجی صرفاً استخراجی است."
        : "No language model is configured; this output is purely extractive.",
    ],
    citationsDropped: 0,
    promptInjectionFlags: [...new Set(flags)],
  };
}
