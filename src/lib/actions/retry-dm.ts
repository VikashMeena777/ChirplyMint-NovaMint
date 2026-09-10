"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/utils/activity-logger";
import { canSendDM } from "@/lib/utils/plan-limits";
import type { PlanKey } from "@/lib/utils/plan-limits";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Retry a failed DM by re-sending it via Instagram API.
 * Validates plan limits before attempting retry.
 */
export async function retryFailedDM(dmLogId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Fetch the failed DM log
  const { data: dmLog, error: fetchError } = await supabase
    .from("dm_logs")
    .select("*")
    .eq("id", dmLogId)
    .eq("user_id", user.id)
    .eq("status", "failed")
    .single();

  if (fetchError || !dmLog) {
    return { success: false, error: "DM not found or not in failed state" };
  }

  const dm = dmLog as Record<string, unknown>;

  // C1: if a previous attempt actually stored a Meta message id, don't resend
  if (dm.meta_message_id) {
    return { success: false, error: "Already delivered (Meta message recorded). Refresh to see it." };
  }

  // Check plan limits before retrying (honours purchased dm_limit top-ups)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, dm_count_this_month, dm_limit, dm_topup_balance")
    .eq("id", user.id)
    .single();

  const plan = ((profile as Record<string, unknown>)?.plan as PlanKey) || "free";
  const dmCount = ((profile as Record<string, unknown>)?.dm_count_this_month as number) || 0;
  const storedLimit = (profile as Record<string, unknown> | null)?.dm_limit as number | null;
  const topupBalance = (profile as Record<string, unknown> | null)?.dm_topup_balance as number | null;
  const limitCheck = canSendDM(plan, dmCount, storedLimit, topupBalance);

  if (!limitCheck.allowed) {
    return {
      success: false,
      error: `DM limit reached (${dmCount}/${limitCheck.limit}). Upgrade your plan to retry.`,
    };
  }

  // Get the Instagram account's access token
  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("access_token, ig_user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!igAccount) {
    return { success: false, error: "No active Instagram account found. Reconnect in Settings." };
  }

  const acc = igAccount as Record<string, string>;
  const recipientIgId = dm.recipient_ig_id as string;
  const messageText = dm.message_text as string;

  if (!recipientIgId || !messageText) {
    return { success: false, error: "Missing recipient or message data" };
  }

  try {
    // Send via Instagram Graph API
    const res = await fetch(
      `https://graph.instagram.com/v26.0/${acc.ig_user_id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientIgId },
          message: { text: messageText },
          access_token: acc.access_token,
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      // Update with new error info
      await supabase.from("dm_logs").update({
        error_message: data.error.message || "API error on retry",
        updated_at: new Date().toISOString(),
      }).eq("id", dmLogId);

      return { success: false, error: data.error.message || "Instagram API error" };
    }

    // Success — update DM log (store Meta id for duplicate protection)
    await supabase.from("dm_logs").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
      ...(data.message_id ? { meta_message_id: data.message_id } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", dmLogId);

    // Increment DM count atomically via RPC (C2 — no read-then-write race)
    const admin = getAdminSupabase();
    const { error: incrErr } = await admin.rpc("increment_field", {
      table_name: "profiles",
      field_name: "dm_count_this_month",
      row_id: user.id,
    });
    if (incrErr) console.error("[Retry DM] increment failed:", incrErr.message);

    logActivity(user.id, "dm.retry_success", {
      dm_log_id: dmLogId,
      recipient: dm.recipient_username,
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    console.error("[Retry DM] Error:", err);
    return { success: false, error: "Failed to send DM. Try again later." };
  }
}
