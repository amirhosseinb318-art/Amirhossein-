import { EVENT_CATEGORIES } from "@/lib/config";
import { getRepo } from "@/lib/store";
import type { UserSettingsRecord } from "@/lib/types";

export function defaultSettings(userId: string): UserSettingsRecord {
  return {
    id: userId,
    userId,
    locale: "fa",
    theme: "dark",
    alertCategories: [...EVENT_CATEGORIES],
    minSeverity: 3,
    inAppEnabled: true,
    pushEnabled: false,
    quietHours: { enabled: false, start: "23:00", end: "07:00" },
  };
}

export async function getSettings(userId: string): Promise<UserSettingsRecord> {
  const repo = await getRepo();
  const existing = await repo.list<UserSettingsRecord>("settings", (row) => row.userId === userId);
  if (existing[0]) return existing[0];
  const created = defaultSettings(userId);
  await repo.insert("settings", created);
  return created;
}
