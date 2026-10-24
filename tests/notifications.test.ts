import { describe, expect, it } from "vitest";
import {
  canReadNotification,
  isInQuietHours,
  matchesPreferences,
} from "@/lib/notifications";
import { initialAlertState, mayDispatchAlert, requiresHumanApproval } from "@/lib/alerts/policy";
import type { NotificationRecord, SessionUser, UserSettingsRecord } from "@/lib/types";
import { makeEvent } from "./factories";

const owner: SessionUser = { id: "usr_1", email: "one@example.com", name: "One", role: "viewer", locale: "en" };
const other: SessionUser = { id: "usr_2", email: "two@example.com", name: "Two", role: "analyst", locale: "en" };
const admin: SessionUser = { id: "usr_3", email: "admin@example.com", name: "Admin", role: "admin", locale: "en" };

const notification: NotificationRecord = {
  id: "ntf_1",
  userId: owner.id,
  kind: "event",
  title: { fa: "x", en: "x" },
  body: { fa: "y", en: "y" },
  severity: 3,
  createdAt: new Date().toISOString(),
  channels: ["in_app"],
};

const settings: UserSettingsRecord = {
  id: "usr_1",
  userId: owner.id,
  locale: "fa",
  theme: "dark",
  alertCategories: ["infrastructure"],
  minSeverity: 3,
  inAppEnabled: true,
  pushEnabled: false,
  quietHours: { enabled: true, start: "22:00", end: "06:00" },
};

describe("notification authorization", () => {
  it("allows only the recipient to read a notification", () => {
    expect(canReadNotification(owner, notification)).toBe(true);
    expect(canReadNotification(other, notification)).toBe(false);
  });

  it("allows administrators to review notifications", () => {
    expect(canReadNotification(admin, notification)).toBe(true);
  });
});

describe("alert preferences", () => {
  it("filters by category and minimum severity", () => {
    const low = makeEvent({ severity: 2 });
    const high = makeEvent({ severity: 4 });
    expect(matchesPreferences(low, settings)).toBe(false);
    expect(matchesPreferences(high, settings)).toBe(true);
    expect(matchesPreferences(makeEvent({ severity: 5, category: "weather" }), settings)).toBe(false);
  });

  it("respects disabled in-app notifications", () => {
    expect(matchesPreferences(makeEvent({ severity: 4 }), { ...settings, inAppEnabled: false })).toBe(false);
  });

  it("handles quiet hours across midnight", () => {
    expect(isInQuietHours(settings, new Date("2026-01-01T23:30:00"))).toBe(true);
    expect(isInQuietHours(settings, new Date("2026-01-01T05:30:00"))).toBe(true);
    expect(isInQuietHours(settings, new Date("2026-01-01T12:00:00"))).toBe(false);
    expect(isInQuietHours({ ...settings, quietHours: { enabled: false, start: "22:00", end: "06:00" } })).toBe(false);
  });
});

describe("high-impact alert gating", () => {
  it("requires human approval for severity 4 and 5", () => {
    expect(requiresHumanApproval(4)).toBe(true);
    expect(requiresHumanApproval(5)).toBe(true);
    expect(requiresHumanApproval(3)).toBe(false);
  });

  it("creates a pending review state for high-impact events", () => {
    expect(initialAlertState(5)).toEqual({ state: "pending_review", requiresHumanApproval: true });
    expect(initialAlertState(2).state).toBe("none");
  });

  it("withholds delivery until an administrator approves", () => {
    const pending = makeEvent({ severity: 5, status: "verified", alert: { state: "pending_review", requiresHumanApproval: true } });
    expect(mayDispatchAlert(pending).allowed).toBe(false);

    const approved = makeEvent({ severity: 5, status: "verified", alert: { state: "approved", requiresHumanApproval: true } });
    expect(mayDispatchAlert(approved).allowed).toBe(true);
  });

  it("always dispatches retractions so corrections propagate", () => {
    const retracted = makeEvent({ severity: 5, status: "retracted", alert: { state: "rejected", requiresHumanApproval: true } });
    expect(mayDispatchAlert(retracted).allowed).toBe(true);
  });
});
