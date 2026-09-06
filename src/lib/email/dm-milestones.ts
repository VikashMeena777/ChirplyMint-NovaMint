/**
 * DM Milestone Emails & Lifetime Count
 *
 * Called AFTER every dm_logs insert + DM count increment (fire-and-forget).
 * Maintains lifetime_dm_count and sends one-time milestone emails:
 *   1st DM → 50 → 100 → 500 → 1000
 *
 * Respects quiet hours (22:00–08:00 IST): if inside the window, the flag is
 * NOT set and the milestone re-triggers on the next DM after 8 AM.
 * Never blocks the DM pipeline.
 */

import { SupabaseClient, createClient as createAdminClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { getFirstDmSentHtml } from "@/lib/email/templates/first-dm-sent";
import { getMilestone100DmsHtml } from "@/lib/email/templates/milestone-100-dms";
import { logInfo, logError } from "@/lib/utils/logger";
import { shouldSendNonCriticalEmail } from "@/lib/utils/quiet-hours";

interface Milestone {
  flagColumn: string;
  atCount: number;
  title: (name: string, count: number) => string;
  html: (ctx: {
    name: string;
    totalDms: number;
    totalLeads: number;
    conversionRate: string;
    recipientUsername: string;
    automationName: string;
  }) => string;
}

const MILESTONES: Milestone[] = [
  {
    flagColumn: "first_dm_email_sent",
    atCount: 1,
    title: () => "🚀 Your First DM Just Went Out!",
    html: (ctx) => getFirstDmSentHtml({ name: ctx.name, recipientUsername: ctx.recipientUsername, automationName: ctx.automationName }),
  },
  {
    flagColumn: "milestone_50_email_sent",
    atCount: 50,
    title: (_n, c) => `⚡ Milestone: ${c} DMs Sent!`,
    html: (ctx) => getMilestone100DmsHtml({ name: ctx.name, totalDms: ctx.totalDms, totalLeads: ctx.totalLeads, conversionRate: ctx.conversionRate }),
  },
  {
    flagColumn: "milestone_100_email_sent",
    atCount: 100,
    title: (_n, c) => `🏆 Milestone: ${c} DMs Sent!`,
    html: (ctx) => getMilestone100DmsHtml({ name: ctx.name, totalDms: ctx.totalDms, totalLeads: ctx.totalLeads, conversionRate: ctx.conversionRate }),
  },
  {
    flagColumn: "milestone_500_email_sent",
    atCount: 500,
    title: (_n, c) => `🔥 Milestone: ${c} DMs Sent!`,
    html: (ctx) => getMilestone100DmsHtml({ name: ctx.name, totalDms: ctx.totalDms, totalLeads: ctx.totalLeads, conversionRate: ctx.conversionRate }),
  },
  {
    flagColumn: "milestone_1000_email_sent",
    atCount: 1000,
    title: (_n, c) => `👑 Milestone: ${c} DMs Sent! You're in the top tier.`,
    html: (ctx) => getMilestone100DmsHtml({ name: ctx.name, totalDms: ctx.totalDms, totalLeads: ctx.totalLeads, conversionRate: ctx.conversionRate }),
  },
];

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
      .select(
        "full_name, notification_preferences, first_dm_email_sent, milestone_50_email_sent, milestone_100_email_sent, milestone_500_email_sent, milestone_1000_email_sent, lifetime_dm_count"
      )
      .eq("id", userId)
      .single();

    if (!profile) return;

    const p = profile as Record<string, unknown>;
    const currentLifetime = (p.lifetime_dm_count as number) || 0;
    const newLifetime = currentLifetime + 1;

    // Increment lifetime count + last active
    await supabase
      .from("profiles")
      .update({
        lifetime_dm_count: newLifetime,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Get user email — need admin client for auth.admin
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) return;

    const userName = (p.full_name as string) || "there";
    const prefs = (p.notification_preferences as Record<string, boolean>) ?? {};

    // Quiet hours: defer non-critical email (flag not set → retried on a
    // later DM after 8 AM IST).
    if (!shouldSendNonCriticalEmail(prefs)) {
      logInfo("Milestone", `⏸️ Deferred — quiet hours (lifetime=${newLifetime})`, { userId });
      return;
    }

    // Get lead stats once for milestone emails
    let totalLeads = 0;
    const loadLeads = async () => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    };

    for (const milestone of MILESTONES) {
      if (p[milestone.flagColumn] || newLifetime < milestone.atCount) continue;

      // All milestones before this one count as "reached" — only the newest
      // milestone whose threshold was just crossed sends. Send at most ONE
      // milestone email per DM to avoid stacking.
      totalLeads = totalLeads || (await loadLeads());
      const convRate = newLifetime > 0 ? ((totalLeads / newLifetime) * 100).toFixed(1) : "0";

      await sendEmail({
        to: email,
        subject: milestone.title(userName, milestone.atCount),
        html: milestone.html({
          name: userName,
          totalDms: milestone.atCount === 1 ? newLifetime : milestone.atCount,
          totalLeads,
          conversionRate: convRate,
          recipientUsername,
          automationName,
        }),
      });
      await supabase
        .from("profiles")
        .update({ [milestone.flagColumn]: true })
        .eq("id", userId);
      logInfo("Milestone", `🎉 ${milestone.atCount}-DM milestone email sent`, { userId });

      // In-app notification for every milestone
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "milestone",
        title: milestone.atCount === 1 ? "🚀 First DM sent!" : `🏆 ${milestone.atCount} DMs sent!`,
        body:
          milestone.atCount === 1
            ? `Your automation just sent its first DM to @${recipientUsername}. This is the start of something big.`
            : `You've now sent ${milestone.atCount} DMs with ${totalLeads} leads captured. Keep it going!`,
        metadata: { milestone: milestone.atCount, lifetime_dm_count: newLifetime },
      });

      break; // one milestone email per DM
    }
  } catch (err) {
    // Never crash the DM pipeline for email failures
    logError("DM Milestone", "Error", err);
  }
}
