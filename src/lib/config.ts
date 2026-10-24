import type { EventCategory, EventStatus, Locale, Severity } from "./types";

/**
 * Centralised environment access. Only referenced from server modules
 * (`src/lib/**` used by server components / route handlers).
 */
function env(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const serverEnv = {
  get sessionSecret() {
    return env("SESSION_SECRET");
  },
  get cronSecret() {
    return env("CRON_SECRET");
  },
  get demoMode() {
    const flag = env("DEMO_MODE");
    if (flag === "true") return true;
    if (flag === "false") return false;
    // Default: demo unless a production store is configured.
    return !supabaseConfigured();
  },
  get supabaseUrl() {
    return env("SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return env("SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return env("SUPABASE_SERVICE_ROLE_KEY");
  },
  get adminBootstrapEmail() {
    return env("ADMIN_EMAIL");
  },
  get adminBootstrapPassword() {
    return env("ADMIN_PASSWORD");
  },
  get demoPassword() {
    return env("DEMO_SEED_PASSWORD");
  },
  get aiProvider() {
    return env("AI_PROVIDER") ?? "auto";
  },
  get aiApiKey() {
    return env("AI_API_KEY");
  },
  get aiBaseUrl() {
    return env("AI_BASE_URL");
  },
  get aiModel() {
    return env("AI_MODEL");
  },
  get aiTimeoutMs() {
    return Number(env("AI_TIMEOUT_MS") ?? 25_000);
  },
  get vapidPublicKey() {
    return env("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  },
  get vapidPrivateKey() {
    return env("VAPID_PRIVATE_KEY");
  },
  get vapidSubject() {
    return env("VAPID_SUBJECT") ?? "mailto:ops@example.invalid";
  },
  get contacts() {
    return env("INGEST_USER_AGENT_CONTACT") ?? "ops@example.invalid";
  },
  get appUrl() {
    return env("APP_URL") ?? "http://localhost:3000";
  },
  get ingestionMinIntervalMs() {
    return Number(env("INGEST_MIN_INTERVAL_MS") ?? 5 * 60 * 1000);
  },
  get allowInsecureCookies() {
    return env("ALLOW_INSECURE_COOKIES") === "true";
  },
};

export function supabaseConfigured(): boolean {
  return Boolean(serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
}

export function aiConfigured(): boolean {
  return Boolean(serverEnv.aiApiKey) && (serverEnv.aiProvider !== "none");
}

export function pushConfigured(): boolean {
  return Boolean(serverEnv.vapidPublicKey && serverEnv.vapidPrivateKey);
}

export function sessionSecret(): string {
  const secret = serverEnv.sessionSecret;
  if (secret && secret.length >= 24) return secret;
  if (process.env.NODE_ENV === "production" && !serverEnv.demoMode) {
    throw new Error(
      "SESSION_SECRET is required (min 24 chars) outside demo mode. Run `npm run setup:env` or configure your host.",
    );
  }
  // Local/demo fallback. Never used in production without an explicit demo mode.
  return "insecure-dev-only-session-secret-change-me";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export const EVENT_CATEGORIES: EventCategory[] = [
  "conflict",
  "disaster",
  "weather",
  "infrastructure",
  "health",
  "geopolitical",
  "economy",
  "other",
];

export const EVENT_STATUSES: EventStatus[] = [
  "unverified",
  "developing",
  "corroborated",
  "verified",
  "retracted",
];

export const SEVERITIES: Severity[] = [1, 2, 3, 4, 5];

export const SUPPORTED_LOCALES: Locale[] = ["fa", "en"];

export const HIGH_IMPACT_SEVERITY: Severity = 4;

export const DEMO_SEED_PASSWORD_FALLBACK = "radar-demo-2026";
