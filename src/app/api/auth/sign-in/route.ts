import { NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation";
import { signInWithPassword } from "@/lib/auth/signin";
import { createSession } from "@/lib/auth/session";
import { apiRateLimitKey, clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, handleApiError, jsonError, parseBody } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientIpFrom(request.headers);
    const coarse = rateLimit(apiRateLimitKey("signin-route", ip), 30, 15 * 60 * 1000);
    if (!coarse.ok) {
      return jsonError(429, "rate_limited", "Too many sign-in attempts.", {
        retryAfterSeconds: coarse.retryAfterSeconds,
      });
    }

    const body = await parseBody(request, signInSchema);
    const result = await signInWithPassword({ ...body, ip });

    if (!result.ok) {
      if (result.reason === "rate_limited") {
        return jsonError(429, "rate_limited", "Too many attempts. Try again later.", {
          retryAfterSeconds: result.retryAfterSeconds,
        });
      }
      if (result.reason === "suspended") {
        return jsonError(403, "suspended", "This account has been suspended.");
      }
      return jsonError(401, "invalid_credentials", "Incorrect email or password.");
    }

    await createSession(result.user);
    return NextResponse.json({ ok: true, redirect: "/overview" });
  } catch (error) {
    return handleApiError(error);
  }
}
