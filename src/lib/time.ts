import type { EventRecord } from "@/lib/types";

/** Indirection so server components never call Date.now() directly during render. */
export function nowMs(): number {
  return Date.now();
}

export function hoursSince(iso: string | null | undefined, now = nowMs()): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return (now - parsed) / 3_600_000;
}

export function hasFreshLiveEvents(events: EventRecord[], maxHours = 6): boolean {
  const now = nowMs();
  return events.some((event) => {
    if (event.isDemo) return false;
    const age = hoursSince(event.updatedAt, now);
    return age !== null && age < maxHours;
  });
}
