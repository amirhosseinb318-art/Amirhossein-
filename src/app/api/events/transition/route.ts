import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { transitionSchema } from "@/lib/validation";
import { applyTransition } from "@/lib/verification";
import { getEventDetail } from "@/lib/events/query";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { dispatchEventNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser("events:transition");
    const body = await parseBody(request, transitionSchema);

    const detail = await getEventDetail(body.eventId);
    if (!detail) return jsonError(404, "not_found", "Event not found.");

    const result = applyTransition({
      event: detail.event,
      reports: detail.reports,
      to: body.to,
      reason: body.reason,
      evidenceReportIds: body.evidenceReportIds,
      actor: {
        kind: "human",
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });

    if (!result.ok) {
      return jsonError(400, result.code, result.message);
    }

    const repo = await getRepo();
    await repo.update<import("@/lib/types").EventRecord>("events", result.event.id, {
      status: result.event.status,
      lastVerifiedAt: result.event.lastVerifiedAt,
      updatedAt: result.event.updatedAt,
      statusHistory: result.event.statusHistory,
      alert: result.event.alert,
    });

    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "event.status_changed",
      targetType: "event",
      targetId: result.event.id,
      summary: `Status ${detail.event.status} → ${result.event.status}`,
      meta: {
        from: detail.event.status,
        to: result.event.status,
        reason: body.reason.slice(0, 200),
        evidence: body.evidenceReportIds.length,
        demo: result.event.isDemo,
      },
    });

    const dispatch = await dispatchEventNotifications(result.event);

    return NextResponse.json({
      ok: true,
      notes: result.notes,
      status: result.event.status,
      dispatch,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
