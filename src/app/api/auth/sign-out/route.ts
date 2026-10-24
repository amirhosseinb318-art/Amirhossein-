import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { assertSameOrigin, handleApiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getSession();
    if (user) {
      await writeAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: "auth.sign_out",
        targetType: "user",
        targetId: user.id,
        summary: "Signed out",
      });
    }
    await destroySession();
    return NextResponse.redirect(new URL("/sign-in", request.url), { status: 303 });
  } catch (error) {
    return handleApiError(error);
  }
}
