/**
 * Does this account have a password we can ask the person to re-enter?
 *
 * This is the single source of truth for the password gate on destructive
 * actions (deleting the account). It is deliberately computed on the server
 * from the session's own identities — never from anything the client sends,
 * and never from a magic value a client could pass to skip the check.
 *
 * The UI reads the same value (exposed as `hasPassword` on the dashboard
 * profile) so the field it renders and the check the server performs can
 * never disagree. They used to: `authProvider` prefers "google" when an
 * account has both providers, so an email+Google account saw no password
 * field while the server still required one.
 *
 * Supabase quirks encoded here (checked against the live project):
 *   - app_metadata.providers is usually right, but some accounts created
 *     through the admin API have `providers: ["email"]` with no identity row,
 *     so both signals are consulted and either one counts.
 *   - Google-only accounts report `providers: ["google"]` and no email
 *     identity, so they are never asked for a password they don't have.
 */
export function userHasPassword(user: {
  identities?: { provider?: string }[] | null;
  app_metadata?: { providers?: string[] } | null;
}): boolean {
  const providers = user.app_metadata?.providers ?? [];
  const identities = user.identities ?? [];
  return providers.includes("email") || identities.some((i) => i.provider === "email");
}
