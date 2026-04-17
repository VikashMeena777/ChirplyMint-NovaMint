import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function getRedis() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
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
 * Gracefully returns allowed=true if Redis is not configured.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  if (!limiter) {
    return { allowed: true, remaining: 999, resetAt: new Date() };
  }

  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: new Date(result.reset),
  };
}
