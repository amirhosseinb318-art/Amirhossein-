import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { correctionSchema } from "@/lib/validation";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { newId } from "@/lib/crypto";
import type { EventRecord } from "@/lib/types";

/**
 * Records a correction on an existing event. Retractions go through the
 * verification endpoint (they change status and propagate to readers). A
 * correction leaves status intact but is permanently visible and audited.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser("events:retract");
    const body = await parseBody(request, correctionSchema);
    const repo = await getRepo();
    const event = await repo.get<EventRecord>("events", body.eventId);
    if (!event) return jsonError(404, "not_found", "Event not found.");

    const now = new Date().toISOString();
    const correction = {
      id: newId("corr"),
      at: now,
      byName: user.name,
      kind: "correction" as const,
      note: { fa: body.note, en: body.note },
    };

    await repo.update<EventRecord>("events", event.id, {
      corrections: [...event.corrections, correction],
      updatedAt: now,
    });

    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "event.corrected",
      targetType: "event",
      targetId: event.id,
      summary: "Correction recorded",
      meta: { note: body.note.slice(0, 200), demo: event.isDemo },
    });

    return NextResponse.json({ ok: true, correction });
  } catch (error) {
    return handleApiError(error);
  }
}
