/**
 * Structured server-side logger.
 *
 * In production (Vercel), logs go to Vercel Functions logs.
 * Set LOG_LEVEL=debug to enable verbose output.
 * Default: only warn/error in production, all levels in dev.
 */

const isDev = process.env.NODE_ENV === "development";
const logLevel = process.env.LOG_LEVEL || (isDev ? "debug" : "info");

import { captureException } from "@/lib/sentry";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

function shouldLog(level: Level): boolean {
  return LEVELS[level] >= LEVELS[logLevel as Level] || isDev;
}

function formatMessage(tag: string, message: string, data?: Record<string, unknown>): string {
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${tag}] ${message}${dataStr}`;
}

/** Debug-level log — stripped in production unless LOG_LEVEL=debug */
export function logDebug(tag: string, message: string, data?: Record<string, unknown>) {
  if (shouldLog("debug")) {
    console.log(formatMessage(tag, message, data));
  }
}

/** Info-level log — shown in production */
export function logInfo(tag: string, message: string, data?: Record<string, unknown>) {
  if (shouldLog("info")) {
    console.log(formatMessage(tag, message, data));
  }
}

/** Warning-level log — always shown */
export function logWarn(tag: string, message: string, data?: Record<string, unknown>) {
  if (shouldLog("warn")) {
    console.warn(formatMessage(tag, message, data));
  }
}

/** Error-level log — always shown */
export function logError(tag: string, message: string, error?: unknown) {
  console.error(
    formatMessage(tag, message),
    error instanceof Error ? { message: error.message, stack: error.stack } : error
  );

  // Forward to error tracking (Sentry if SENTRY_DSN is set, PostHog on client).
  // No-op when no DSN is configured, so this is safe in all environments.
  captureException(error ?? new Error(message), { tag, message });
}
