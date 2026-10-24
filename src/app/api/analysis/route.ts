import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { analysisRequestSchema } from "@/lib/validation";
import { getEventDetail } from "@/lib/events/query";
import { analyzeEvent } from "@/lib/ai/analysis";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser("analysis:run");
    const body = await parseBody(request, analysisRequestSchema);

    const detail = await getEventDetail(body.eventId);
    if (!detail) return jsonError(404, "not_found", "Event not found.");

    const allowed = detail.reports.filter((report) => detail.event.reportIds.includes(report.id));
    const selected = body.reportIds.filter((id) => allowed.some((report) => report.id === id));
    if (selected.length === 0) {
      return jsonError(400, "no_evidence", "No eligible reports were selected.");
    }

    const run = await analyzeEvent({
      actor: user,
      event: detail.event,
      reports: detail.reports,
      reportIds: selected,
      lang: body.lang,
    });

    return NextResponse.json({ ok: run.status === "ok", run });
  } catch (error) {
    return handleApiError(error);
  }
}
