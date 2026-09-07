import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient, isKvConfigured } from "./kv";

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, tokens: number, window: `${number} ${"s" | "m" | "h"}`): Ratelimit {
  const cacheKey = `${name}:${tokens}:${window}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `dwky-connect:ratelimit:${name}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/** Best-effort client IP from Vercel's forwarding headers — falls back to a shared
 * bucket (never throws/blocks) if neither header is present, e.g. in local dev. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds: number;
}

/**
 * Sliding-window rate limit backed by the same Upstash Redis the app already uses.
 * Skips (always allows) when no KV database is configured, matching every other
 * kv.ts/db.ts helper's local-dev-without-Redis fallback.
 */
export async function checkRateLimit(
  name: string,
  key: string,
  tokens: number,
  window: `${number} ${"s" | "m" | "h"}`
): Promise<RateLimitResult> {
  if (!isKvConfigured()) return { success: true, retryAfterSeconds: 0 };
  const limiter = getLimiter(name, tokens, window);
  const result = await limiter.limit(key);
  return { success: result.success, retryAfterSeconds: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)) };
}

// Distinct from the AI chat route's "rate_limited" code, whose client-facing copy
// ("You've reached the current AI usage limit") would be wrong here.
export function rateLimitedResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "auth_rate_limited", message: "Too many attempts. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
