import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handleApiError, parseBody, requireApiUser } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { getRepo } from "@/lib/store";
import type { UserRecord, UserSettingsRecord } from "@/lib/types";

const schema = z.object({
  locale: z.enum(["fa", "en"]),
  theme: z.enum(["dark", "light", "system"]),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const body = await parseBody(request, schema);
    const repo = await getRepo();
    const settings = await getSettings(user.id);

    const next: UserSettingsRecord = { ...settings, locale: body.locale, theme: body.theme };
    await repo.update<UserSettingsRecord>("settings", settings.id, {
      locale: body.locale,
      theme: body.theme,
    });
    await repo.update<UserRecord>("users", user.id, { locale: body.locale });

    const response = NextResponse.json({ ok: true, settings: next });
    response.cookies.set("radar_locale", body.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    if (body.theme !== "system") {
      response.cookies.set("radar_theme", body.theme, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
