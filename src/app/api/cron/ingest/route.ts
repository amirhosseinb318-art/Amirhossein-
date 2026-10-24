import { NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/crypto";
import { serverEnv } from "@/lib/config";
import { ingestionRunning, runIngestion } from "@/lib/ingestion/pipeline";

/**
 * Scheduler entry point. Configure your scheduler (Vercel Cron, systemd timer,
 * GitHub Actions) to call this with `Authorization: Bearer $CRON_SECRET`.
 * Monitoring is only live while this is actually invoked.
 */
async function handle(request: Request) {
  const secret = serverEnv.cronSecret;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        code: "cron_unconfigured",
        message:
          "CRON_SECRET is not configured. Set it and call this endpoint from an authenticated scheduler. No collection was performed.",
      },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  if (!constantTimeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  }

  if (ingestionRunning()) {
    return NextResponse.json({ ok: false, code: "ingestion_running" }, { status: 409 });
  }

  const summary = await runIngestion({ triggeredBy: "cron" });
  return NextResponse.json({ ok: summary.errors.length === 0, summary });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
