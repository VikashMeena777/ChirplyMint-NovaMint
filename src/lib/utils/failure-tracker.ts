import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

/**
 * Tracks consecutive DM send failures per Instagram account using DB.
 * After 3 consecutive failures, sends the user a notification + email.
 *
 * Usage:
 *   trackDMFailure(userId, igAccountId, igUsername) — call on DM send failure
 *   resetFailureCount(igAccountId)                  — call on DM send success
 */

const ALERT_THRESHOLD = 3;

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Track a DM send failure. After 3 consecutive failures, alert the user.
 * Uses the ig_accounts table's consecutive_failures column for persistence
 * across serverless cold starts.
 */
export async function trackDMFailure(
  userId: string,
  igAccountId: string,
  igUsername: string
): Promise<void> {
  const supabase = getAdminSupabase();

  // Increment failure counter in DB (atomic)
  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("consecutive_failures")
    .eq("id", igAccountId)
    .single();

  const current = ((account as Record<string, unknown>)?.consecutive_failures as number ?? 0) + 1;

  await supabase
    .from("instagram_accounts")
    .update({ consecutive_failures: current })
    .eq("id", igAccountId);

  if (current === ALERT_THRESHOLD) {
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
export async function resetFailureCount(igAccountId: string): Promise<void> {
  const supabase = getAdminSupabase();
  await supabase
    .from("instagram_accounts")
    .update({ consecutive_failures: 0 })
    .eq("id", igAccountId);
}
