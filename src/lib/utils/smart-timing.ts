/**
 * Smart Send-Times (C10)
 *
 * Learns when each business's audience is most active (from dm_logs
 * timestamps of leads that actually engaged) and aligns outbound drip
 * scheduling to those windows. ChirplyMint's market is India, so all
 * hour bucketing happens in IST (UTC+5:30) regardless of server timezone.
 *
 * Usage:
 *   getSmartSendHours(supabase, userId)            — top active IST hours for a user
 *   nextSmartSendAt(hours)                         — ISO timestamp of the next active window
 *   alignToSmartSendWindow(minSendAtIso, hours)    — shift a scheduled time into an active window (capped)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { logError, logInfo } from "@/lib/utils/logger";

/** IST is UTC+5:30 — fixed offset, no DST. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Minimum inbound interactions before we trust the learned pattern. */
const MIN_SAMPLE_SIZE = 20;

/** How many peak hour-slots to learn. */
const TOP_HOURS = 4;

/** Never delay a drip step more than this far past its original schedule. */
const MAX_EXTRA_DELAY_HOURS = 8;

/**
 * Bucket inbound-activity timestamps into 24 IST hours and return the
 * TOP_HOURS slots with the highest counts (ties → earlier hour wins),
 * sorted ascending. Returns [] when there are fewer than MIN_SAMPLE_SIZE
 * rows — not enough signal, callers fall back to plain scheduling.
 */
export function computeActiveHours(rows: { created_at: string }[]): number[] {
  if (!rows || rows.length < MIN_SAMPLE_SIZE) return [];

  const counts = new Array<number>(24).fill(0);
  for (const row of rows) {
    const ts = new Date(row.created_at).getTime();
    if (Number.isNaN(ts)) continue;
    const istHour = new Date(ts + IST_OFFSET_MS).getUTCHours();
    counts[istHour]++;
  }

  const total = counts.reduce((sum, c) => sum + c, 0);
  if (total < MIN_SAMPLE_SIZE) return [];

  // Top N by count; ties break to the earlier hour.
  const hours = counts
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count || a.hour - b.hour)
    .slice(0, TOP_HOURS)
    .map((h) => h.hour)
    .sort((a, b) => a - b);

  return hours;
}

/**
 * Query the user's sent dm_logs (last 30 days, dm/comment triggers — i.e.
 * moments their leads actually engaged) and learn their active IST hours.
 * Runs on the admin (service-role) client passed in; returns [] on any
 * failure so scheduling never breaks.
 */
export async function getSmartSendHours(
  supabase: SupabaseClient,
  userId: string
): Promise<number[]> {
  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("dm_logs")
      .select("created_at, trigger_type")
      .eq("user_id", userId)
      .eq("status", "sent")
      .in("trigger_type", ["dm", "comment"])
      .gte("created_at", thirtyDaysAgo);

    if (error) throw error;

    return computeActiveHours((data || []) as { created_at: string }[]);
  } catch (err) {
    logError("Smart Timing", `Failed to compute active hours for user ${userId}`, err);
    return [];
  }
}

/**
 * Earliest timestamp >= fromMs whose IST hour falls inside `hours`.
 * A timestamp already sitting inside an active hour-slot counts as-is
 * (no shift), so "soonest future" never skips the current active hour.
 */
function earliestActiveOccurrence(hours: number[], fromMs: number): number | null {
  if (!hours || hours.length === 0) return null;

  const fromIst = new Date(fromMs + IST_OFFSET_MS);
  const fromHour = fromIst.getUTCHours();

  // Already inside an active window → keep the time as-is.
  if (hours.includes(fromHour)) return fromMs;

  let bestMs: number | null = null;
  for (const hour of hours) {
    // Days ahead: an earlier hour today has already passed → tomorrow.
    const daysAhead = hour < fromHour ? 1 : 0;

    const candidateMs =
      Date.UTC(
        fromIst.getUTCFullYear(),
        fromIst.getUTCMonth(),
        fromIst.getUTCDate() + daysAhead,
        hour,
        0,
        0,
        0
      ) - IST_OFFSET_MS;

    if (candidateMs >= fromMs && (bestMs === null || candidateMs < bestMs)) {
      bestMs = candidateMs;
    }
  }
  return bestMs;
}

/**
 * ISO timestamp of the NEXT occurrence of any of the given IST hours
 * (soonest future), or null when hours is empty.
 */
export function nextSmartSendAt(hours: number[]): string | null {
  const ts = earliestActiveOccurrence(hours, Date.now());
  return ts === null ? null : new Date(ts).toISOString();
}

/**
 * Align a scheduled send time to the user's active hours while keeping
 * `minSendAtIso` as the MINIMUM send time (delay_hours floor). Never
 * delays more than MAX_EXTRA_DELAY_HOURS past the original schedule.
 * Falls back to the input when hours are empty or already aligned.
 */
export function alignToSmartSendWindow(
  minSendAtIso: string,
  hours: number[]
): string {
  if (!hours || hours.length === 0) return minSendAtIso;

  const minMs = new Date(minSendAtIso).getTime();
  if (Number.isNaN(minMs)) return minSendAtIso;

  const alignedMs = earliestActiveOccurrence(hours, minMs);
  if (alignedMs === null || alignedMs <= minMs) return minSendAtIso;

  const capMs = minMs + MAX_EXTRA_DELAY_HOURS * 60 * 60 * 1000;
  return new Date(Math.min(alignedMs, capMs)).toISOString();
}

/** True when `iso` was shifted into an active window (used for logging/notes). */
export function isSmartTimingAligned(originalIso: string, alignedIso: string): boolean {
  return alignedIso !== originalIso;
}

/** Fire-and-forget helper: log a smart-timing alignment. */
export function logSmartTiming(context: string, from: string, to: string): void {
  logInfo("Smart Timing", `⏰ Aligned ${context} to active window`, { from, to });
}
