import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let hasWarnedRedisMissing = false;

function getRedis() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    if (!hasWarnedRedisMissing) {
      console.warn(
        "[RateLimiter] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured — operating in degraded mode (rate limiting bypassed)"
      );
      hasWarnedRedisMissing = true;
    }
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * Auth rate limiter: 5 requests per 15 minutes per IP
 */
export function getAuthLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:auth",
  });
}

/**
 * API rate limiter: 60 requests per minute per user
 */
export function getApiLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "rl:api",
  });
}

/**
 * DM send rate limiter: 1 per second per user
 */
export function getDmLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, "1 s"),
    prefix: "rl:dm",
  });
}

/**
 * AI generation rate limiter: 20 per minute per user
 */
export function getAiLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "rl:ai",
  });
}

/**
 * Check rate limit — returns { allowed, remaining, resetAt }
 * Gracefully returns allowed=true if Redis is not configured or fails.
 */

// In-memory fallback so a Redis outage degrades to per-instance throttling
// instead of no throttling at all (Strix vuln-0001).
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(identifier: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = memoryBuckets.get(identifier);
  if (!bucket || now > bucket.resetAt) {
    memoryBuckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  if (!limiter) {
    // Degraded mode: per-instance in-memory fallback (5 per 15 min) rather
    // than unthrottled access.
    const allowed = memoryRateLimit(identifier, 5, 15 * 60 * 1000);
    return { allowed, remaining: allowed ? 998 : 0, resetAt: new Date() };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: new Date(result.reset),
    };
  } catch (error) {
    console.warn(
      `[RateLimiter] Redis connection error during check for "${identifier}" — failing open:`,
      error
    );
    return { allowed: true, remaining: 999, resetAt: new Date() };
  }
}
