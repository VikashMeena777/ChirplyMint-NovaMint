/**
 * PostHog event tracking utilities.
 *
 * Client-side: import { trackEvent } from "@/lib/analytics/posthog"
 * Server-side: import { trackServerEvent } from "@/lib/analytics/posthog-server"
 *
 * Key events tracked:
 * - user.signed_up     — on signup completion
 * - user.logged_in     — on login
 * - user.onboarding_complete — after onboarding
 * - automation.created  — when user creates an automation
 * - automation.toggled  — when user enables/disables
 * - automation.deleted  — when user deletes
 * - dm.sent             — when a DM is sent (server-side, sampled)
 * - lead.captured       — when a lead is captured
 * - ig.connected        — Instagram account connected
 * - ig.disconnected     — Instagram account disconnected
 * - plan.upgraded       — plan change
 * - ai_agent.configured — AI agent setup
 * - bio_page.created    — Bio page created
 */

import posthog from "posthog-js";

/**
 * Track a client-side event. Safe to call even if PostHog isn't initialized.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture(event, properties);
    }
  } catch {
    // Never crash the app for analytics
  }
}

/**
 * Identify a user in PostHog (call after login/signup).
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
) {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.identify(userId, traits);
    }
  } catch {
    // Never crash the app for analytics
  }
}

/**
 * Reset PostHog identity (call on logout).
 */
export function resetAnalytics() {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.reset();
    }
  } catch {
    // Silent
  }
}
