import { NextResponse } from "next/server";
import { inviteRedemptionSchema } from "@/lib/validation";
import { redeemInvitation } from "@/lib/auth/invitations";
import { createSession } from "@/lib/auth/session";
import { clientIpFrom } from "@/lib/rate-limit";
import { assertSameOrigin, handleApiError, jsonError, parseBody } from "@/lib/api";
import { getDictionary } from "@/i18n/dictionary";
import { getLocale } from "@/i18n/server";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await parseBody(request, inviteRedemptionSchema);
    const ip = clientIpFrom(request.headers);
    const result = await redeemInvitation({
      token: body.token,
      password: body.password,
      name: body.name,
      ip,
    });

    if (!result.ok) {
      const locale = await getLocale();
      const d = getDictionary(locale);
      const messages: Record<string, string> = {
        used: d.auth.inviteUsed,
        expired: d.auth.inviteExpired,
        revoked: d.auth.inviteRevoked,
        not_found: d.auth.inviteNotFound,
        weak_password: d.auth.weakPassword,
        already_registered: d.auth.alreadyRegistered,
      };
      const status = result.reason === "rate_limited" ? 429 : 400;
      return jsonError(status, result.reason, messages[result.reason] ?? d.auth.inviteInvalid);
    }

    await createSession(result.user);
    return NextResponse.json({ ok: true, redirect: "/overview" });
  } catch (error) {
    return handleApiError(error);
  }
}
