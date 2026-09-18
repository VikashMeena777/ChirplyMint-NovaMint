/**
 * Confirmation links don't always come back as `?code=` (the PKCE flow our
 * /api/auth/callback exchanges server-side). Supabase can also return the
 * session in the URL FRAGMENT (`#access_token=…`), which never reaches the
 * server — so the callback route is skipped entirely and the person lands on
 * whatever page the link pointed at, signed in but with no idea what happened.
 *
 * This decides what, if anything, a landing page should do about a fragment.
 * Kept pure so it can be tested against the exact hashes seen in production.
 */
export type AuthFragmentAction = "error" | "session" | null;

export function parseAuthFragment(hash: string | null | undefined): AuthFragmentAction {
  if (!hash) return null;

  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw || raw.length < 3) return null;
  // Anchors (#pricing, #features) and any non-query fragment are ignored.
  if (!raw.includes("=")) return null;

  const params = new URLSearchParams(raw);
  if (params.get("error") || params.get("error_code")) return "error";
  if (params.get("access_token")) return "session";
  return null;
}

/** Where a fragment-auth landing should be sent once handled. */
export function authFragmentDestination(action: AuthFragmentAction): string | null {
  if (action === "error") return "/login?error=auth_callback_failed";
  if (action === "session") return "/dashboard";
  return null;
}
