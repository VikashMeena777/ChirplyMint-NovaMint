"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * "Your email is confirmed" — said out loud.
 *
 * Clicking the confirmation link used to sign you in silently: the person
 * landed in the dashboard (or the onboarding wizard) with nothing telling them
 * the step had worked, so the natural conclusion was that it hadn't.
 *
 * The callback route appends ?verified=1 only when the address was confirmed
 * in the last couple of minutes, so a normal Google sign-in stays quiet.
 */
export function ConfirmedNotice() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") !== "1") return;

    toast.success("Email confirmed — your account is active 🎉", {
      description: "Nothing else to do. Let's get your Instagram connected.",
      duration: 8000,
    });

    // Drop the marker so a refresh (or sharing the URL) doesn't repeat it.
    params.delete("verified");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash
    );
  }, []);

  return null;
}
