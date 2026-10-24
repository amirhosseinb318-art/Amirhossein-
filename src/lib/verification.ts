import { newId } from "@/lib/crypto";
import type { EventRecord, EventStatus, ReportRecord, Role } from "@/lib/types";

/**
 * Explicit event verification workflow.
 *
 * Status is deliberately separate from `confidence` and `severity`. The model
 * may *suggest* a status but can never execute a transition: `applyTransition`
 * requires a human actor and is only called from server-authorized handlers.
 */
export const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  unverified: ["developing", "corroborated", "retracted"],
  developing: ["corroborated", "unverified", "retracted"],
  corroborated: ["verified", "developing", "retracted"],
  verified: ["corroborated", "retracted"],
  retracted: [],
};

export type TransitionErrorCode =
  | "invalid_transition"
  | "reason_required"
  | "insufficient_corroboration"
  | "primary_source_required"
  | "admin_required"
  | "evidence_required"
  | "unknown_evidence"
  | "system_cannot_verify"
  | "terminal_status";

export interface ActorIdentity {
  kind: "human" | "system";
  id: string;
  name: string;
  role: Role | null;
}

export interface TransitionInput {
  event: EventRecord;
  reports: ReportRecord[];
  to: EventStatus;
  actor: ActorIdentity;
  reason: string;
  evidenceReportIds: string[];
}

export type TransitionResult =
  | { ok: true; event: EventRecord; notes: string[] }
  | { ok: false; code: TransitionErrorCode; message: string };

export function independentCoverage(reports: ReportRecord[]): {
  independentSources: number;
  primarySources: number;
  sources: number;
} {
  const independent = new Set<string>();
  const primary = new Set<string>();
  for (const report of reports) {
    const key = report.independenceKey || report.sourceId;
    independent.add(key);
    if (report.isPrimary) primary.add(key);
  }
  return {
    independentSources: independent.size,
    primarySources: primary.size,
    sources: new Set(reports.map((r) => r.sourceId)).size,
  };
}

export function applyTransition(input: TransitionInput): TransitionResult {
  const { event, to, actor, reason } = input;

  if (event.status === to) {
    return { ok: false, code: "invalid_transition", message: "Event is already in this status." };
  }
  if (event.status === "retracted") {
    return {
      ok: false,
      code: "terminal_status",
      message:
        "Retracted events are terminal. Create a new event if the situation develops again, preserving the retraction history.",
    };
  }
  if (!ALLOWED_TRANSITIONS[event.status].includes(to)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: `Transition ${event.status} → ${to} is not allowed.`,
    };
  }
  if (reason.trim().length < 10) {
    return { ok: false, code: "reason_required", message: "A specific reason (10+ characters) is required." };
  }

  const reports = event.reportIds
    .map((id) => input.reports.find((report) => report.id === id))
    .filter((report): report is ReportRecord => Boolean(report));

  const evidenceIds = Array.from(new Set(input.evidenceReportIds));
  if (evidenceIds.length === 0 && to !== "retracted") {
    return { ok: false, code: "evidence_required", message: "Cite at least one stored report as evidence." };
  }
  const unknown = evidenceIds.filter((id) => !event.reportIds.includes(id));
  if (unknown.length > 0) {
    return {
      ok: false,
      code: "unknown_evidence",
      message: "Evidence must reference reports already attached to this event.",
    };
  }

  const coverage = independentCoverage(reports);
  const notes: string[] = [];

  if (actor.kind === "system" && (to === "verified" || to === "corroborated" || to === "retracted")) {
    return {
      ok: false,
      code: "system_cannot_verify",
      message:
        "Automated processes cannot verify, corroborate or retract events. A human reviewer is required.",
    };
  }

  if (to === "developing" && reports.length === 0) {
    return { ok: false, code: "evidence_required", message: "At least one report is required." };
  }

  if (to === "corroborated" && coverage.independentSources < 2) {
    return {
      ok: false,
      code: "insufficient_corroboration",
      message: "Corroboration requires at least two independent sources.",
    };
  }

  if (to === "verified") {
    if (coverage.independentSources < 2) {
      return {
        ok: false,
        code: "insufficient_corroboration",
        message: "Verification requires at least two independent sources.",
      };
    }
    if (coverage.primarySources < 1) {
      return {
        ok: false,
        code: "primary_source_required",
        message: "Verification requires at least one primary source record (official / first-party).",
      };
    }
    if (event.severity >= 4 && actor.role !== "admin") {
      return {
        ok: false,
        code: "admin_required",
        message: "High-severity events (4–5) may only be verified by an administrator.",
      };
    }
    notes.push("Verification is a human decision based on cited evidence; it is not a guarantee of ground truth.");
  }

  if (to === "retracted" && actor.role !== "admin") {
    return { ok: false, code: "admin_required", message: "Only an administrator may retract an event." };
  }

  const now = new Date().toISOString();
  const updated: EventRecord = {
    ...event,
    status: to,
    updatedAt: now,
    lastVerifiedAt: to === "verified" ? now : event.lastVerifiedAt,
    statusHistory: [
      ...event.statusHistory,
      {
        id: newId("sch"),
        at: now,
        byUserId: actor.id,
        byName: actor.name,
        from: event.status,
        to,
        reason: reason.trim().slice(0, 600),
        evidenceReportIds: evidenceIds,
      },
    ],
    alert:
      to === "retracted"
        ? { ...event.alert, state: "rejected", reviewNote: "Event retracted; alert withdrawn." }
        : event.alert,
  };

  return { ok: true, event: updated, notes };
}
