import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { sourceCreateSchema, sourceToggleSchema } from "@/lib/validation";
import { getRepo } from "@/lib/store";
import { writeAudit } from "@/lib/audit";
import { newId } from "@/lib/crypto";
import type { SourceRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser("sources:manage");
    const body = await parseBody(request, sourceCreateSchema);
    const repo = await getRepo();

    const existing = await repo.list<SourceRecord>(
      "sources",
      (source) => source.feedUrl === body.feedUrl,
    );
    if (existing.length > 0) {
      return jsonError(409, "duplicate_source", "A source with this feed URL already exists.");
    }

    const source: SourceRecord = {
      id: newId("src"),
      name: { fa: body.nameFa, en: body.nameEn },
      organization: body.organization,
      homepageUrl: body.homepageUrl,
      feedUrl: body.feedUrl,
      kind: body.kind,
      reliability: body.reliability,
      language: body.language,
      enabled: false,
      termsNote: body.termsNote,
      errorCount: 0,
      createdAt: new Date().toISOString(),
    };
    await repo.insert("sources", source);
    await writeAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "source.created",
      targetType: "source",
      targetId: source.id,
      summary: `Source added: ${source.organization}`,
      meta: { feedUrl: source.feedUrl.slice(0, 200) },
    });
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser("sources:manage");
    const body = await parseBody(request, sourceToggleSchema);
    const repo = await getRepo();
    const source = await repo.get<SourceRecord>("sources", body.sourceId);
    if (!source) return jsonError(404, "not_found", "Source not found.");

    await repo.update<SourceRecord>("sources", source.id, {
      enabled: body.enabled,
      lastError: body.enabled ? source.lastError : undefined,
    });
    await writeAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "source.toggled",
      targetType: "source",
      targetId: source.id,
      summary: `${body.enabled ? "Enabled" : "Disabled"} source ${source.organization}`,
      meta: { enabled: body.enabled },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
