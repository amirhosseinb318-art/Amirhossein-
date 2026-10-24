import { serverEnv, supabaseConfigured, DEMO_SEED_PASSWORD_FALLBACK } from "@/lib/config";
import { hashPassword } from "@/lib/crypto";
import { SOURCE_CATALOGUE, DEMO_REPORTS, buildDemoUsers, buildDemoSettings } from "@/lib/demo-data";
import { buildDemoEvents, buildDemoNotifications } from "@/lib/demo-events";
import type { AuditLogRecord, UserRecord } from "@/lib/types";
import { LocalRepository, type Repository } from "./local";
import { SupabaseRepository } from "./supabase";

export type { Repository } from "./local";

let cached: Repository | null = null;
let seeding: Promise<void> | null = null;

export function repositoryMode(): "local" | "supabase" {
  return supabaseConfigured() ? "supabase" : "local";
}

export async function getRepo(): Promise<Repository> {
  if (cached) return cached;
  if (supabaseConfigured()) {
    cached = new SupabaseRepository(serverEnv.supabaseUrl!, serverEnv.supabaseServiceRoleKey!);
  } else {
    const repo = new LocalRepository();
    await ensureSeed(repo);
    cached = repo;
  }
  return cached;
}

async function ensureSeed(repo: Repository): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    const existingUsers = await repo.list<UserRecord>("users");
    const existingSources = await repo.list("sources");
    const existingEvents = await repo.list("events");
    const existingReports = await repo.list("reports");

    if (existingSources.length === 0) {
      for (const source of SOURCE_CATALOGUE) {
        await repo.insert("sources", source);
      }
    }

    if (existingUsers.length === 0) {
      const bootstrapEmail = serverEnv.adminBootstrapEmail;
      const bootstrapPassword = serverEnv.adminBootstrapPassword;

      if (bootstrapEmail && bootstrapPassword) {
        const passwordHash = await hashPassword(bootstrapPassword);
        await repo.insert("users", {
          id: "usr_bootstrap_admin",
          email: bootstrapEmail.toLowerCase(),
          name: "Administrator",
          role: "admin",
          status: "active",
          passwordHash,
          createdAt: new Date().toISOString(),
          locale: "fa",
        } satisfies UserRecord);
      }

      if (serverEnv.demoMode) {
        const demoPassword = serverEnv.demoPassword ?? DEMO_SEED_PASSWORD_FALLBACK;
        const passwordHash = await hashPassword(demoPassword);
        const demoUsers = await buildDemoUsers(passwordHash);
        for (const user of demoUsers) {
          await repo.insert("users", user);
        }
        for (const settings of buildDemoSettings()) {
          await repo.insert("settings", settings);
        }
      }
    }

    if (existingReports.length === 0 && serverEnv.demoMode) {
      for (const report of DEMO_REPORTS) {
        await repo.insert("reports", report);
      }
    }

    if (existingEvents.length === 0 && serverEnv.demoMode) {
      for (const event of buildDemoEvents()) {
        await repo.insert("events", event);
      }
      for (const notification of buildDemoNotifications()) {
        await repo.insert("notifications", notification);
      }
      const audit: AuditLogRecord = {
        id: "aud_demo_seed",
        at: new Date().toISOString(),
        actorId: "system",
        actorEmail: "system@local",
        action: "event.status_changed",
        targetType: "event",
        targetId: "evt_demo_grid",
        summary: "Seeded synthetic demo events (demo mode)",
        meta: { demo: true, events: 4 },
      };
      await repo.insert("auditLogs", audit);
    }

    if (existingUsers.length === 0 && !serverEnv.demoMode) {
      console.warn(
        "[ai-crisis-radar] No users exist. Set ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap the first administrator, then restart.",
      );
    }
  })();
  try {
    await seeding;
  } finally {
    seeding = null;
  }
}
