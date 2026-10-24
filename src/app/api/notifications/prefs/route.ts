import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, parseBody, requireApiUser } from "@/lib/api";
import { notificationPrefsSchema } from "@/lib/validation";
import { getRepo } from "@/lib/store";
import { getSettings } from "@/lib/settings";
import { pushConfigured } from "@/lib/config";
import type { UserSettingsRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const body = await parseBody(request, notificationPrefsSchema);
    const current = await getSettings(user.id);
    const repo = await getRepo();

    const next: UserSettingsRecord = {
      ...current,
      alertCategories: body.alertCategories as UserSettingsRecord["alertCategories"],
      minSeverity: body.minSeverity as UserSettingsRecord["minSeverity"],
      inAppEnabled: body.inAppEnabled,
      pushEnabled: body.pushEnabled && pushConfigured(),
      quietHours: body.quietHours,
    };

    await repo.update<UserSettingsRecord>("settings", current.id, next);
    return NextResponse.json({ ok: true, settings: next });
  } catch (error) {
    return handleApiError(error);
  }
}
