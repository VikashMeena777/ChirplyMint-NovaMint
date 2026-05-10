import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { getInactiveNudgeHtml } from "@/lib/email/templates/inactive-nudge";
import { getWinBackHtml } from "@/lib/email/templates/win-back";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Engagement Emails Cron
 * Runs daily at 4:00 AM UTC (9:30 AM IST) via GitHub Actions.
 *
 * Sends:
 * 1. Inactive Nudge (7 days) — max once per 30 days
 * 2. Win-Back (30 days) — max once per 60 days
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date();
    const nowIso = now.toISOString();

    // 7 days ago threshold
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 30 days ago threshold
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Cooldown thresholds (prevent email spam)
    const nudgeCooldown = new Date(now);
    nudgeCooldown.setDate(nudgeCooldown.getDate() - 30); // 1 nudge per 30 days

    const winBackCooldown = new Date(now);
    winBackCooldown.setDate(winBackCooldown.getDate() - 60); // 1 win-back per 60 days

    // Get all users with engagement preferences
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, notification_preferences, last_active_at, last_engagement_email_at, created_at");

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ status: "ok", nudges: 0, winbacks: 0, timestamp: nowIso });
    }

    let nudgesSent = 0;
    let winbacksSent = 0;

    for (const raw of profiles) {
      const p = raw as Record<string, unknown>;
      const userId = p.id as string;
      const prefs = (p.notification_preferences as Record<string, boolean>) ?? {};

      // Skip if user has opted out of engagement emails
      if (prefs.product_updates === false) continue;

      const lastActive = p.last_active_at ? new Date(p.last_active_at as string) : new Date(p.created_at as string);
      const lastEngagementEmail = p.last_engagement_email_at ? new Date(p.last_engagement_email_at as string) : null;
      const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      // Get user email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;
      if (!userEmail) continue;

      const userName = (p.full_name as string) || "there";

      // ── Win-Back (30+ days inactive) ──
      if (daysSinceActive >= 30) {
        // Check cooldown
        if (lastEngagementEmail && lastEngagementEmail > winBackCooldown) continue;

        await sendEmail({
          to: userEmail,
          subject: "🔙 We miss you at ChirplyMint!",
          html: getWinBackHtml({
            name: userName,
            daysSinceActive,
          }),
        });

        await supabase
          .from("profiles")
          .update({ last_engagement_email_at: nowIso })
          .eq("id", userId);

        // In-app notification
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "info",
          title: "🔙 We Miss You!",
          body: "It's been a while since you've been on ChirplyMint. Come check out what's new!",
          metadata: { days_inactive: daysSinceActive },
        });

        winbacksSent++;
        console.log(`[Engagement] 🔙 Win-back sent to ${userId} (${daysSinceActive} days inactive)`);
        continue; // Don't also send a nudge
      }

      // ── Inactive Nudge (7–29 days inactive) ──
      if (daysSinceActive >= 7 && daysSinceActive < 30) {
        // Check cooldown
        if (lastEngagementEmail && lastEngagementEmail > nudgeCooldown) continue;

        // Get stats for the email
        const { count: totalLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        const { count: activeAutomations } = await supabase
          .from("automations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active");

        await sendEmail({
          to: userEmail,
          subject: "💤 Your automations miss you!",
          html: getInactiveNudgeHtml({
            name: userName,
            daysSinceActive,
            totalLeads: totalLeads ?? 0,
            activeAutomations: activeAutomations ?? 0,
          }),
        });

        await supabase
          .from("profiles")
          .update({ last_engagement_email_at: nowIso })
          .eq("id", userId);

        // In-app notification
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "info",
          title: "💤 We Miss You!",
          body: `It's been ${daysSinceActive} days since your last activity. Your automations are waiting!`,
          metadata: { days_inactive: daysSinceActive },
        });

        nudgesSent++;
        console.log(`[Engagement] 💤 Nudge sent to ${userId} (${daysSinceActive} days inactive)`);
      }
    }

    console.log(`[Engagement] Done: ${nudgesSent} nudges, ${winbacksSent} win-backs`);

    return NextResponse.json({
      status: "ok",
      nudges: nudgesSent,
      winbacks: winbacksSent,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error("[Engagement Cron] Error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
