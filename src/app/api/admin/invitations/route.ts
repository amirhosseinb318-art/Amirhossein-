import { NextResponse } from "next/server";
import { assertSameOrigin, handleApiError, jsonError, parseBody, requireApiUser } from "@/lib/api";
import { createInvitationSchema } from "@/lib/validation";
import { createInvitation } from "@/lib/auth/invitations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser("invitations:manage");
    const body = await parseBody(request, createInvitationSchema);

    const { invitation, token } = await createInvitation({
      actor: admin,
      email: body.email,
      name: body.name,
      role: body.role,
      expiresInHours: body.expiresInHours,
    });

    const origin = new URL(request.url).origin;
    return NextResponse.json({
      ok: true,
      invitation,
      token,
      url: `${origin}/invite/${token}`,
      warning: "This link is shown once. It is single-use and expires.",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      return jsonError(409, "exists", error.message);
    }
    return handleApiError(error);
  }
}
