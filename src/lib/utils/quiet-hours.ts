/**
 * Quiet hours — no non-critical emails between 10 PM and 8 AM IST.
 * ChirplyMint's market is India, so the window is evaluated in IST
 * regardless of the server's timezone.
 */

const QUIET_START_HOUR = 22; // 10 PM
const QUIET_END_HOUR = 8;    // 8 AM

/** Current time in IST as { hour, minute } (24h). */
export function nowIST(): { hour: number; minute: number } {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return { hour: ist.getUTCHours(), minute: ist.getUTCMinutes() };
}

/** True when the current IST time falls inside the 22:00–08:00 quiet window. */
export function isQuietHoursIST(): boolean {
  const { hour } = nowIST();
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/**
 * Should a (non-critical) email be sent right now for this user?
 * Respects the user's quiet_hours preference (default: ON).
 * Critical email (payment, security, failure alerts) should not call this.
 */
export function shouldSendNonCriticalEmail(prefs: Record<string, boolean> | null | undefined): boolean {
  if (prefs?.quiet_hours === false) return true; // user opted out of quiet hours
  return !isQuietHoursIST();
}
