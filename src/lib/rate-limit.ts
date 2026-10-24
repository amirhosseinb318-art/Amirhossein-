type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as { __radarBuckets?: Map<string, Bucket> };

function buckets(): Map<string, Bucket> {
  globalStore.__radarBuckets ??= new Map();
  return globalStore.__radarBuckets;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter for sensitive endpoints.
 *
 * Intentionally in-process: sufficient for single-instance self-hosting and
 * for blunting credential stuffing in this deployment profile. Multi-instance
 * production deployments must back this with a shared store (Supabase table or
 * Redis); see README "Hardening".
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const map = buckets();
  const current = map.get(key);

  if (!current || current.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true, remaining: limit - current.count, retryAfterSeconds: 0 };
}

/** Used by tests to isolate limiter state. */
export function resetRateLimits(): void {
  buckets().clear();
}

export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export function apiRateLimitKey(scope: string, ip: string): string {
  return `${scope}:${ip}`;
}
