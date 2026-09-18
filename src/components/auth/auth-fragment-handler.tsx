"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseAuthFragment, authFragmentDestination } from "@/lib/utils/auth-fragment";

/**
 * Catches confirmation/sign-in links that come back with the session in the
 * URL fragment (`#access_token=…`) instead of the `?code=` our callback route
 * exchanges. Those never reach the server, so without this the person lands on
 * a public page — signed in, but never taken to their dashboard.
 *
 * Renders nothing and does nothing on a normal page view: the fragment has to
 * carry an auth token or an auth error.
 */
export function AuthFragmentHandler() {
  const router = useRouter();

  useEffect(() => {
    const action = parseAuthFragment(window.location.hash);
    const destination = authFragmentDestination(action);
    if (!destination) return;

    if (action === "error") {
      router.replace(destination);
      return;
    }

    // Supabase's browser client reads the fragment on first use and stores the
    // session (in cookies, so the server sees it too). Wait for that, then go
    // where the callback route would have sent them.
    const supabase = createClient();
    let navigated = false;
    const go = () => {
      if (navigated) return;
      navigated = true;
      router.replace(destination);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });

    // Signing in can fail silently (expired token, revoked session) — don't
    // leave them staring at a page with a token in the address bar.
    const timeout = window.setTimeout(go, 4000);

    return () => {
      subscription.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [router]);

  return null;
}
