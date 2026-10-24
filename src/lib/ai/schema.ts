import { z } from "zod";
import type { AnalysisOutput, EventStatus, ReportRecord } from "@/lib/types";

export const modelOutputSchema = z.object({
  summary: z.string().min(20).max(2400),
  keyClaims: z
    .array(
      z.object({
        text: z.string().min(5).max(600),
        reportIds: z.array(z.string()).max(8).default([]),
      }),
    )
    .max(10)
    .default([]),
  contradictions: z
    .array(
      z.object({
        description: z.string().min(5).max(600),
        reportIds: z.array(z.string()).max(8).default([]),
      }),
    )
    .max(6)
    .default([]),
  gaps: z.array(z.string().max(400)).max(8).default([]),
  uncertainty: z.string().min(5).max(1600),
  missingEvidence: z.array(z.string().max(400)).max(8).default([]),
  suggestedStatus: z
    .enum(["unverified", "developing", "corroborated", "verified", "retracted"])
    .nullable()
    .optional(),
  suggestions: z.array(z.string().max(400)).max(6).default([]),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;

export class AnalysisFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisFormatError";
  }
}

export function parseModelJson(text: string): ModelOutput {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new AnalysisFormatError("Model response did not contain a JSON object.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new AnalysisFormatError("Model response was not valid JSON.");
  }
  const parsed = modelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AnalysisFormatError(
      `Model response failed schema validation: ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
    );
  }
  return parsed.data;
}

const SAFE_SUGGESTED_STATUSES: EventStatus[] = [
  "unverified",
  "developing",
  "corroborated",
  "retracted",
];

/**
 * Enforces the core citation guarantee: only IDs of reports actually attached
 * to the event survive, and factual findings without a valid citation are
 * dropped. Coverage numbers are computed from stored records, not the model.
 */
export function validateCitations(
  output: ModelOutput,
  reports: ReportRecord[],
): AnalysisOutput {
  const allowed = new Set(reports.map((report) => report.id));
  let dropped = 0;
  let citationsDropped = 0;

  const keepIds = (ids: string[]): string[] => {
    const valid = Array.from(new Set(ids.filter((id) => allowed.has(id))));
    citationsDropped += ids.length - valid.length;
    return valid;
  };

  const keyClaims = output.keyClaims
    .map((claim, index) => ({
      id: `finding-${index + 1}`,
      text: claim.text.trim(),
      reportIds: keepIds(claim.reportIds),
    }))
    .filter((claim) => {
      if (claim.reportIds.length === 0) {
        dropped += 1;
        return false;
      }
      return true;
    });

  const contradictions = output.contradictions
    .map((item, index) => ({
      id: `contradiction-${index + 1}`,
      text: item.description.trim(),
      reportIds: keepIds(item.reportIds),
    }))
    .filter((item) => {
      if (item.reportIds.length === 0) {
        dropped += 1;
        return false;
      }
      return true;
    });

  const independentKeys = new Set(reports.map((r) => r.independenceKey || r.sourceId));
  const primaryKeys = new Set(
    reports.filter((r) => r.isPrimary).map((r) => r.independenceKey || r.sourceId),
  );

  const suggestedStatus =
    output.suggestedStatus && SAFE_SUGGESTED_STATUSES.includes(output.suggestedStatus)
      ? output.suggestedStatus
      : undefined;

  return {
    summary: output.summary.trim(),
    keyClaims,
    contradictions,
    coverage: {
      independentSources: independentKeys.size,
      primarySources: primaryKeys.size,
      gaps: output.gaps.map((gap) => gap.trim()).filter(Boolean),
    },
    uncertainty: output.uncertainty.trim(),
    missingEvidence: output.missingEvidence.map((item) => item.trim()).filter(Boolean),
    suggestedStatus,
    suggestions: output.suggestions.map((item) => item.trim()).filter(Boolean),
    citationsDropped: citationsDropped + dropped,
    promptInjectionFlags: [],
  };
}
