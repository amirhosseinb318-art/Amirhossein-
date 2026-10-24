import type { EventRecord, Severity } from "@/lib/types";

/**
 * Alert safety policy.
 *
 * Default: high-impact events (severity ≥ 4) require a human administrator to
 * approve the alert before any user notification or push is delivered. An
 * alternative policy only applies when an operator sets BOTH
 * `ALERT_AUTO_APPROVE=true` and `ALERT_POLICY_TESTED=true`.
 */
export function autoApprovalEnabled(): boolean {
  return process.env.ALERT_AUTO_APPROVE === "true" && process.env.ALERT_POLICY_TESTED === "true";
}

export function requiresHumanApproval(severity: Severity): boolean {
  if (severity === 5) return true;
  return severity >= 4 && !autoApprovalEnabled();
}

export function initialAlertState(severity: Severity): {
  state: "none" | "pending_review";
  requiresHumanApproval: boolean;
} {
  const requires = requiresHumanApproval(severity);
  return { state: requires ? "pending_review" : "none", requiresHumanApproval: requires };
}

export function mayDispatchAlert(event: EventRecord): {
  allowed: boolean;
  reason?: "not_approved" | "no_alert";
} {
  // Retractions and corrections must always propagate to affected readers.
  if (event.status === "retracted") return { allowed: true };
  if (!requiresHumanApproval(event.severity)) return { allowed: true };
  if (event.alert.state === "approved" || event.alert.state === "sent") return { allowed: true };
  return { allowed: false, reason: event.alert.state === "none" ? "no_alert" : "not_approved" };
}

export const ALERT_POLICY_SUMMARY = {
  default:
    "High-impact alerts (severity 4–5) require administrator approval before delivery. Severity 5 always requires review.",
  override:
    "ALERT_AUTO_APPROVE + ALERT_POLICY_TESTED are both required to bypass review for severity 4.",
};
