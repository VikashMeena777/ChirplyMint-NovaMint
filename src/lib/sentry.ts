/**
 * Sentry Error Tracking & Observability Module
 * Handles error tracking for server and client with fallback to PostHog and structured logging.
 */

let isSentryInitialized = false;

export function initSentry() {
  if (isSentryInitialized) return;

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  try {
    if (typeof window === "undefined") {
      // Server-side initialization
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require("@sentry/node");
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || "production",
        tracesSampleRate: 0.1,
        enabled: process.env.NODE_ENV === "production",
      });
      isSentryInitialized = true;
    }
  } catch (err) {
    console.warn("[Sentry] Failed to initialize:", err);
  }
}

/**
 * Capture an exception in Sentry and PostHog
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    // Server-side capture
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn) {
      try {
        initSentry();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sentry = require("@sentry/node");
        Sentry.captureException(error, { extra: context });
      } catch (e) {
        console.warn("[Sentry] Server capture error:", e);
      }
    }
  } else {
    // Client-side capture via PostHog if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const posthog = require("posthog-js").default;
      if (posthog && typeof posthog.capture === "function") {
        posthog.capture("$exception", {
          $exception_message: error instanceof Error ? error.message : String(error),
          $exception_stack: error instanceof Error ? error.stack : undefined,
          ...context,
        });
      }
    } catch {
      // PostHog not loaded or failed
    }
  }

  // Structured console output for development/debugging
  if (process.env.NODE_ENV !== "production") {
    console.error("[Error Captured]", error, context || "");
  }
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
) {
  if (typeof window === "undefined") {
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (dsn) {
      try {
        initSentry();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sentry = require("@sentry/node");
        Sentry.captureMessage(message, { level, extra: context });
      } catch (e) {
        console.warn("[Sentry] Server capture message error:", e);
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[Message Captured: ${level}]`, message, context || "");
  }
}
