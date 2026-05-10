"use client";

import { useState, useEffect } from "react";
import { OnboardingTour } from "@/components/dashboard/onboarding-tour";

/**
 * Wrapper that shows the onboarding tour for first-time users.
 * Uses localStorage to track if the tour has been dismissed.
 */
export function OnboardingWrapper() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Check if user has already seen the tour
    const seen = localStorage.getItem("chirplymint_onboarding_seen");
    if (!seen) {
      // Delay slightly so the dashboard loads first
      const timer = setTimeout(() => setShowTour(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleDismiss() {
    setShowTour(false);
    localStorage.setItem("chirplymint_onboarding_seen", "true");
  }

  return <OnboardingTour show={showTour} onDismiss={handleDismiss} />;
}
