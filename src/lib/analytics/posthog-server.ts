/**
 * Server-side PostHog event tracking.
 *
 * Uses posthog-node for server actions, API routes, and cron jobs.
 * Events are fire-and-forget — never block the response.
 */

import { PostHog } from "posthog-node";

let serverPosthog: PostHog | null = null;

function getServerPosthog(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  if (!serverPosthog) {
    serverPosthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1, // Flush immediately in serverless
      flushInterval: 0,
    });
  }
  return serverPosthog;
}

/**
 * Track a server-side event. Fire-and-forget.
 * @param userId - The user's UUID
 * @param event - Event name (e.g., "dm.sent")
 * @param properties - Optional properties
 */
export function trackServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    const ph = getServerPosthog();
    if (!ph) return;

    ph.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        $lib: "posthog-node",
        source: "server",
      },
    });
  } catch {
    // Never crash the server for analytics
  }
}

/**
 * Identify a user server-side (call on signup/profile update).
 */
export function identifyServerUser(
  userId: string,
  properties: Record<string, unknown>
) {
  try {
    const ph = getServerPosthog();
    if (!ph) return;

    ph.identify({
      distinctId: userId,
      properties,
    });
  } catch {
    // Silent
  }
}
