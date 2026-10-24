import webpush from "web-push";
import { pushConfigured, serverEnv } from "@/lib/config";
import { getRepo } from "@/lib/store";
import type { PushSubscriptionRecord } from "@/lib/types";

let configuredFor: string | null = null;

function ensureVapid(): boolean {
  if (!pushConfigured()) return false;
  const publicKey = serverEnv.vapidPublicKey!;
  if (configuredFor === publicKey) return true;
  webpush.setVapidDetails(serverEnv.vapidSubject, publicKey, serverEnv.vapidPrivateKey!);
  configuredFor = publicKey;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  severity?: number;
}

export type PushResult = "sent" | "failed" | "unavailable" | "skipped";

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  if (!ensureVapid()) return "unavailable";

  const repo = await getRepo();
  const subscriptions = await repo.list<PushSubscriptionRecord>(
    "pushSubscriptions",
    (row) => row.userId === userId,
  );
  if (subscriptions.length === 0) return "skipped";

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(payload),
        { TTL: 3600, urgency: payload.severity && payload.severity >= 4 ? "high" : "normal" },
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await repo.remove("pushSubscriptions", subscription.id);
      } else {
        console.warn("[push] delivery failed", statusCode ?? "unknown");
      }
    }
  }

  return sent > 0 ? "sent" : "failed";
}
