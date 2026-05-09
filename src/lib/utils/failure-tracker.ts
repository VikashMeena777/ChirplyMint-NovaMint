import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

/**
 * Tracks consecutive DM send failures per Instagram account.
 * After 3 consecutive failures, sends the user a notification + email.
 *
 * Usage:
 *   trackDMFailure(userId, igAccountId, igUsername) — call on DM send failure
 *   resetFailureCount(igAccountId)                  — call on DM send success
 */

// In-memory counter (resets on cold start, but sufficient for hot function)
const failureCounts = new Map<string, number>();
const ALERT_THRESHOLD = 3;

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Track a DM send failure. After 3 consecutive failures, alert the user.
 */
export async function trackDMFailure(
  userId: string,
  igAccountId: string,
  igUsername: string
): Promise<void> {
  const current = (failureCounts.get(igAccountId) ?? 0) + 1;
  failureCounts.set(igAccountId, current);

  if (current === ALERT_THRESHOLD) {
    const supabase = getAdminSupabase();

    // Check if we already sent a DM failure alert in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: existingAlerts } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "warning")
      .ilike("title", "%DMs are failing%")
      .gte("created_at", oneDayAgo);

    if ((existingAlerts ?? 0) > 0) return; // Already alerted recently

    // In-app notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "warning",
      title: "⚠️ Your Instagram DMs are failing",
      body: `${ALERT_THRESHOLD} consecutive DMs to @${igUsername} have failed. Your token may have expired. Please reconnect in Settings.`,
      metadata: { ig_account_id: igAccountId, failure_count: current },
    });

    // Email alert
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email;
    if (userEmail) {
      sendEmail({
        to: userEmail,
        subject: "⚠️ Your ChirplyMint DMs are failing",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #16a34a;">ChirplyMint</h2>
            <p>${ALERT_THRESHOLD} consecutive DMs have failed for your account <strong>@${igUsername}</strong>.</p>
            <p>This usually means your Instagram token has expired. Please reconnect your account to resume sending DMs.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"}/dashboard/settings" 
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">
              Reconnect Instagram
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">ChirplyMint — Instagram DM Automation</p>
          </div>
        `,
      }).catch(() => {});
    }

    console.log(`[Failure Tracker] 🚨 Alert sent for @${igUsername} (${current} consecutive failures)`);
  }
}

/**
 * Reset failure counter on successful DM send.
 */
export function resetFailureCount(igAccountId: string): void {
  failureCounts.delete(igAccountId);
}
