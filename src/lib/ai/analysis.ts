import { randomBytes } from "node:crypto";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { newId } from "@/lib/crypto";
import { serverEnv } from "@/lib/config";
import { truncate } from "@/lib/ingestion/normalize";
import type { AnalysisRunRecord, EventRecord, Locale, ReportRecord, SessionUser } from "@/lib/types";
import { getModelAdapter } from "./index";
import { buildAnalysisPrompt, scanForInjection } from "./prompt";
import { parseModelJson, validateCitations, type AnalysisFormatError } from "./schema";
import { heuristicAnalysis } from "./heuristic";

export class AnalysisError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AnalysisError";
  }
}

export interface AnalyzeInput {
  actor: SessionUser;
  event: EventRecord;
  reports: ReportRecord[];
  reportIds?: string[];
  lang: Locale;
}

/**
 * Evidence-backed analysis pipeline.
 * - Only reports already attached to the event are eligible as evidence.
 * - The model receives untrusted content in nonce-delimited data blocks.
 * - Output is schema-validated and every citation is checked against stored IDs.
 * - Model output is never written to the event; it becomes a reviewable run.
 */
export async function analyzeEvent(input: AnalyzeInput): Promise<AnalysisRunRecord> {
  const { event, reports, actor, lang } = input;
  const linked = reports.filter((report) => event.reportIds.includes(report.id));
  const selected = input.reportIds && input.reportIds.length > 0
    ? linked.filter((report) => input.reportIds!.includes(report.id))
    : linked;

  if (selected.length === 0) {
    throw new AnalysisError("no_reports", "Select at least one stored report attached to this event.");
  }

  const adapter = getModelAdapter();
  const base: Omit<AnalysisRunRecord, "status" | "provider" | "model" | "usedFallback" | "output" | "error"> = {
    id: newId("ana"),
    userId: actor.id,
    eventId: event.id,
    reportIds: selected.map((report) => report.id),
    lang,
    createdAt: new Date().toISOString(),
    isDemo: event.isDemo,
  };

  const repo = await getRepo();

  if (!adapter) {
    const output = heuristicAnalysis(event, selected, lang);
    output.promptInjectionFlags = [
      ...new Set(
        selected.flatMap((report) => scanForInjection(`${report.title} ${report.excerpt}`)),
      ),
    ];
    const run: AnalysisRunRecord = {
      ...base,
      status: "ok",
      provider: "heuristic",
      model: "extractive-v1",
      usedFallback: true,
      output,
    };
    await repo.insert("analysisRuns", run);
    await writeAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "analysis.run",
      targetType: "event",
      targetId: event.id,
      summary: "Ran heuristic (no model) analysis",
      meta: { reports: selected.length, runId: run.id },
    });
    return run;
  }

  const nonce = randomBytes(8).toString("hex");
  const prompt = buildAnalysisPrompt({ event, reports: selected, lang, nonce });

  try {
    const completion = await adapter.complete({
      system: prompt.system,
      user: prompt.user,
      timeoutMs: serverEnv.aiTimeoutMs,
    });
    const parsed = parseModelJson(completion.text);
    const output = validateCitations(parsed, selected);
    output.promptInjectionFlags = [
      ...new Set(
        selected.flatMap((report) => scanForInjection(`${report.title} ${report.excerpt}`)),
      ),
    ];

    const run: AnalysisRunRecord = {
      ...base,
      status: "ok",
      provider: completion.provider,
      model: completion.model,
      usedFallback: completion.fallback,
      output,
    };
    await repo.insert("analysisRuns", run);
    await writeAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "analysis.run",
      targetType: "event",
      targetId: event.id,
      summary: `Ran ${completion.provider} analysis`,
      meta: { reports: selected.length, runId: run.id, droppedCitations: output.citationsDropped },
    });
    return run;
  } catch (error) {
    const formatError = error as AnalysisFormatError;
    const message = formatError?.name === "AnalysisFormatError"
      ? formatError.message
      : truncate(error instanceof Error ? error.message : "Model request failed", 400);
    const run: AnalysisRunRecord = {
      ...base,
      status: "error",
      provider: adapter.providerLabel,
      model: adapter.model,
      usedFallback: false,
      error: message,
    };
    await repo.insert("analysisRuns", run);
    await writeAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "analysis.run",
      targetType: "event",
      targetId: event.id,
      summary: "Analysis failed",
      meta: { error: message.slice(0, 200) },
    });
    return run;
  }
}
