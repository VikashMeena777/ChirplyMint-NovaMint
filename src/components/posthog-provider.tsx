"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useCallback } from "react";
import { getCookie } from "cookies-next";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const initPostHog = useCallback(() => {
    const consent = getCookie("cookie_consent");

    if (
      consent === "accepted" &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      typeof window !== "undefined"
    ) {
      if (!posthog.__loaded) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: true,
          capture_pageleave: true,
          loaded: (ph) => {
            if (process.env.NODE_ENV === "development") {
              ph.debug();
            }
          },
        });
      }
    }
  }, []);

  useEffect(() => {
    // Init on mount
    initPostHog();

    // Listen for cookie consent changes (fired from CookieConsent component)
    const handleConsentChange = () => initPostHog();
    window.addEventListener("cookie-consent-changed", handleConsentChange);
    return () =>
      window.removeEventListener("cookie-consent-changed", handleConsentChange);
  }, [initPostHog]);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
