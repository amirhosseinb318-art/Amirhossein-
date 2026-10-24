import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handleApiError, parseBody, requireApiUser } from "@/lib/api";
import { pushSubscribeSchema } from "@/lib/validation";
import { getRepo } from "@/lib/store";
import { pushConfigured } from "@/lib/config";
import { writeAudit } from "@/lib/audit";
import { newId } from "@/lib/crypto";
import type { PushSubscriptionRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    if (!pushConfigured()) {
      return NextResponse.json(
        { ok: false, code: "push_unconfigured", message: "Web Push is not configured on this server." },
        { status: 503 },
      );
    }
    const body = await parseBody(request, pushSubscribeSchema);
    const repo = await getRepo();
    const existing = await repo.list<PushSubscriptionRecord>(
      "pushSubscriptions",
      (row) => row.userId === user.id && row.endpoint === body.endpoint,
    );

    if (existing[0]) {
      await repo.update<PushSubscriptionRecord>("pushSubscriptions", existing[0].id, {
        keys: body.keys,
      });
    } else {
      await repo.insert<PushSubscriptionRecord>("pushSubscriptions", {
        id: newId("psh"),
        userId: user.id,
        endpoint: body.endpoint,
        keys: body.keys,
        createdAt: new Date().toISOString(),
        userAgent: request.headers.get("user-agent")?.slice(0, 200),
      });
    }

    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "push.subscribed",
      targetType: "pushSubscription",
      targetId: body.endpoint.slice(0, 80),
      summary: "Registered a push subscription",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

const deleteSchema = z.object({ endpoint: z.string().url().max(800) });

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const body = await parseBody(request, deleteSchema);
    const repo = await getRepo();
    const matches = await repo.list<PushSubscriptionRecord>(
      "pushSubscriptions",
      (row) => row.userId === user.id && row.endpoint === body.endpoint,
    );
    for (const match of matches) {
      await repo.remove("pushSubscriptions", match.id);
    }
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "push.unsubscribed",
      targetType: "pushSubscription",
      targetId: body.endpoint.slice(0, 80),
      summary: "Removed a push subscription",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
