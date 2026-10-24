import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { ingestionRunSchema } from "@/lib/validation";
import { ingestionRunning, runIngestion } from "@/lib/ingestion/pipeline";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser("ingestion:run");
    const body = await parseBody(request, ingestionRunSchema);
    if (ingestionRunning()) {
      return jsonError(409, "ingestion_running", "An ingestion run is already in progress.");
    }
    const summary = await runIngestion({
      sourceIds: body.sourceIds,
      triggeredBy: admin.email,
      force: true,
    });
    return NextResponse.json({ ok: summary.errors.length === 0, summary });
  } catch (error) {
    return handleApiError(error);
  }
}
