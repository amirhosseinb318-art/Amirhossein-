import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { alertReviewSchema } from "@/lib/validation";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { dispatchEventNotifications } from "@/lib/notifications";
import type { EventRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser("alerts:review");
    const body = await parseBody(request, alertReviewSchema);

    const repo = await getRepo();
    const event = await repo.get<EventRecord>("events", body.eventId);
    if (!event) return jsonError(404, "not_found", "Event not found.");

    if (event.status === "retracted") {
      return jsonError(409, "retracted", "A retracted event cannot issue an alert.");
    }

    const now = new Date().toISOString();

    if (body.decision === "reject") {
      const updated = await repo.update<EventRecord>("events", event.id, {
        alert: {
          ...event.alert,
          state: "rejected",
          approvedBy: user.id,
          approvedAt: now,
          reviewNote: body.note?.slice(0, 400) || "Rejected by administrator.",
        },
        updatedAt: now,
      });
      await writeAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "event.alert_reviewed",
        targetType: "event",
        targetId: event.id,
        summary: "Alert rejected",
        meta: { decision: "reject", note: body.note?.slice(0, 200) ?? null },
      });
      return NextResponse.json({ ok: true, alert: updated?.alert });
    }

    const approved = await repo.update<EventRecord>("events", event.id, {
      alert: {
        ...event.alert,
        state: "approved",
        approvedBy: user.id,
        approvedAt: now,
        reviewNote: body.note?.slice(0, 400),
      },
      updatedAt: now,
    });
    if (!approved) return jsonError(404, "not_found", "Event not found.");

    const dispatch = await dispatchEventNotifications(approved);
    if (dispatch.delivered > 0) {
      await repo.update<EventRecord>("events", event.id, {
        alert: { ...approved.alert, state: "sent", notifiedAt: new Date().toISOString() },
      });
    }

    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "event.alert_reviewed",
      targetType: "event",
      targetId: event.id,
      summary: "Alert approved and dispatched",
      meta: {
        decision: "approve",
        delivered: dispatch.delivered,
        note: body.note?.slice(0, 200) ?? null,
      },
    });

    return NextResponse.json({ ok: true, dispatch });
  } catch (error) {
    return handleApiError(error);
  }
}
