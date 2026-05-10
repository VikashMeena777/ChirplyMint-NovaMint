/**
 * DM Milestone Email Checker
 *
 * Call this AFTER every dm_logs insert + DM count increment.
 * Checks and sends milestone emails (first DM, 100 DMs).
 * Also increments lifetime_dm_count.
 *
 * Fire-and-forget — never blocks the DM pipeline.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { getFirstDmSentHtml } from "@/lib/email/templates/first-dm-sent";
import { getMilestone100DmsHtml } from "@/lib/email/templates/milestone-100-dms";

export async function checkDmMilestones(
  supabase: SupabaseClient,
  userId: string,
  recipientUsername: string,
  automationName: string
): Promise<void> {
  try {
    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, first_dm_email_sent, milestone_100_email_sent, lifetime_dm_count")
      .eq("id", userId)
      .single();

    if (!profile) return;

    const p = profile as Record<string, unknown>;
    const currentLifetime = (p.lifetime_dm_count as number) || 0;
    const newLifetime = currentLifetime + 1;

    // Increment lifetime count
    await supabase
      .from("profiles")
      .update({
        lifetime_dm_count: newLifetime,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) return;

    const userName = (p.full_name as string) || "there";

    // ── First DM milestone ──
    if (!p.first_dm_email_sent && newLifetime === 1) {
      await sendEmail({
        to: email,
        subject: "🚀 Your First DM Just Went Out!",
        html: getFirstDmSentHtml({
          name: userName,
          recipientUsername,
          automationName,
        }),
      });
      await supabase
        .from("profiles")
        .update({ first_dm_email_sent: true })
        .eq("id", userId);
      console.log(`[Milestone] 🚀 First DM email sent to ${userId}`);
    }

    // ── 100 DMs milestone ──
    if (!p.milestone_100_email_sent && newLifetime >= 100) {
      // Get stats for the email
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const leads = totalLeads ?? 0;
      const convRate = newLifetime > 0 ? ((leads / newLifetime) * 100).toFixed(1) : "0";

      await sendEmail({
        to: email,
        subject: "🏆 Milestone: 100 DMs Sent!",
        html: getMilestone100DmsHtml({
          name: userName,
          totalDms: newLifetime,
          totalLeads: leads,
          conversionRate: convRate,
        }),
      });
      await supabase
        .from("profiles")
        .update({ milestone_100_email_sent: true })
        .eq("id", userId);
      console.log(`[Milestone] 🏆 100 DMs email sent to ${userId}`);
    }
  } catch (err) {
    // Never crash the DM pipeline for email failures
    console.error("[DM Milestone] Error:", err);
  }
}
