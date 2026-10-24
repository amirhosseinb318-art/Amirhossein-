import { describe, expect, it } from "vitest";
import { applyTransition, independentCoverage, type ActorIdentity } from "@/lib/verification";
import { makeEvent, makeReport, primaryReport } from "./factories";

const analyst: ActorIdentity = { kind: "human", id: "usr_a", name: "Analyst", role: "analyst" };
const admin: ActorIdentity = { kind: "human", id: "usr_admin", name: "Admin", role: "admin" };
const system: ActorIdentity = { kind: "system", id: "system", name: "Ingestion", role: null };

const twoIndependent = [
  makeReport(),
  makeReport({
    id: "rep_2",
    sourceId: "src_b",
    sourceName: "Source B",
    independenceKey: "source-b.example",
    title: "Second outlet covers the northern district",
    url: "https://example.com/b",
    contentHash: "hash-b",
  }),
];

const independentPlusPrimary = [makeReport(), primaryReport()];

const base = { reason: "Reviewed both reports and confirmed scope.", evidenceReportIds: ["rep_1"] };

describe("event verification transitions", () => {
  it("never lets an automated process verify an event", () => {
    const result = applyTransition({
      event: makeEvent({ status: "corroborated" }),
      reports: independentPlusPrimary,
      to: "verified",
      actor: system,
      reason: "Automated model output",
      evidenceReportIds: ["rep_1"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("system_cannot_verify");
  });

  it("requires two independent sources for corroboration", () => {
    const result = applyTransition({
      event: makeEvent({ status: "unverified" }),
      reports: [makeReport()],
      to: "corroborated",
      actor: analyst,
      ...base,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("insufficient_corroboration");
  });

  it("requires a primary source before verification", () => {
    const result = applyTransition({
      event: makeEvent({ status: "corroborated" }),
      reports: twoIndependent,
      to: "verified",
      actor: analyst,
      ...base,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("primary_source_required");
  });

  it("allows an analyst to verify a low-severity event with independent primary evidence", () => {
    const result = applyTransition({
      event: makeEvent({ status: "corroborated", severity: 3 }),
      reports: independentPlusPrimary,
      to: "verified",
      actor: analyst,
      ...base,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.status).toBe("verified");
      expect(result.event.lastVerifiedAt).toBeTruthy();
      expect(result.event.statusHistory).toHaveLength(1);
      expect(result.event.statusHistory[0]?.evidenceReportIds).toEqual(["rep_1"]);
    }
  });

  it("requires an administrator to verify high-severity events", () => {
    const result = applyTransition({
      event: makeEvent({ status: "corroborated", severity: 4 }),
      reports: independentPlusPrimary,
      to: "verified",
      actor: analyst,
      ...base,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("admin_required");
  });

  it("allows an administrator to verify a high-severity event", () => {
    const result = applyTransition({
      event: makeEvent({ status: "corroborated", severity: 5 }),
      reports: independentPlusPrimary,
      to: "verified",
      actor: admin,
      ...base,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects short reasons", () => {
    const result = applyTransition({
      event: makeEvent(),
      reports: twoIndependent,
      to: "corroborated",
      actor: analyst,
      reason: "ok",
      evidenceReportIds: ["rep_1"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("reason_required");
  });

  it("rejects evidence that is not attached to the event", () => {
    const result = applyTransition({
      event: makeEvent(),
      reports: twoIndependent,
      to: "corroborated",
      actor: analyst,
      reason: "Reviewed and corroborated by second source.",
      evidenceReportIds: ["rep_not_attached"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unknown_evidence");
  });

  it("treats retracted as terminal", () => {
    const result = applyTransition({
      event: makeEvent({ status: "retracted" }),
      reports: twoIndependent,
      to: "developing",
      actor: admin,
      ...base,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("terminal_status");
  });

  it("only administrators may retract", () => {
    const result = applyTransition({
      event: makeEvent({ status: "developing" }),
      reports: twoIndependent,
      to: "retracted",
      actor: analyst,
      ...base,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("admin_required");
  });

  it("rejects invalid state jumps", () => {
    const result = applyTransition({
      event: makeEvent({ status: "unverified" }),
      reports: independentPlusPrimary,
      to: "verified",
      actor: admin,
      ...base,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_transition");
  });
});

describe("coverage calculation", () => {
  it("counts independent hosts and primary sources separately", () => {
    const coverage = independentCoverage(twoIndependent);
    expect(coverage.independentSources).toBe(2);
    expect(coverage.primarySources).toBe(0);
    expect(independentCoverage(independentPlusPrimary).primarySources).toBe(1);
  });
});
