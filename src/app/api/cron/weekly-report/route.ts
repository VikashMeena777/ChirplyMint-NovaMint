import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateWeeklyInsight } from "@/lib/ai/nvidia-nim";
import { sendEmail } from "@/lib/email/send";
import { getWeeklyReportEmailHtml } from "@/lib/email/templates/weekly-report";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();

    // Get all users who have weekly_report enabled
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, notification_preferences");

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ status: "ok", processed: 0 });
    }

    let processed = 0;

    for (const profile of profiles) {
      const prefs = (profile.notification_preferences as Record<string, boolean>) ?? {};
      if (prefs.weekly_report === false) continue;

      const userId = profile.id as string;
      const userName = (profile.full_name as string) || "there";
      const userEmail = profile.email as string;
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // DMs sent this week
      const { count: dmsSent } = await supabase
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("sent_at", weekAgo.toISOString());

      // DMs sent previous week (for comparison)
      const { count: prevDmsSent } = await supabase
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("sent_at", twoWeeksAgo.toISOString())
        .lt("sent_at", weekAgo.toISOString());

      // Leads captured this week
      const { count: leadsCapured } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("captured_at", weekAgo.toISOString());

      // Top automation
      const { data: topAuto } = await supabase
        .from("automations")
        .select("name")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);

      const dms = dmsSent ?? 0;
      const leads = leadsCapured ?? 0;
      const convRate = dms > 0 ? ((leads / dms) * 100).toFixed(1) : "0";
      const topAutomationName = topAuto?.[0]?.name ?? null;

      // Generate AI insight
      const insight = await generateWeeklyInsight({
        dmsSent: dms,
        leadsCapured: leads,
        topAutomation: topAutomationName,
        conversionRate: convRate,
        previousDmsSent: prevDmsSent ?? 0,
      });

      // Create in-app notification
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "weekly_report",
        title: "📊 Your Weekly Report",
        body: insight,
        metadata: {
          dms_sent: dms,
          leads_captured: leads,
          conversion_rate: convRate,
          period_start: weekAgo.toISOString(),
          period_end: now.toISOString(),
        },
      });

      // Send email report (fire-and-forget, non-blocking)
      if (userEmail && prefs.email_notifications !== false) {
        const emailHtml = getWeeklyReportEmailHtml({
          name: userName,
          dmsSent: dms,
          leadsCapured: leads,
          conversionRate: convRate,
          topAutomation: topAutomationName,
          insight,
          periodStart: weekAgo.toLocaleDateString("en-IN"),
          periodEnd: now.toLocaleDateString("en-IN"),
        });

        sendEmail({
          to: userEmail,
          subject: `📊 Your ChirplyMint Weekly Report — ${dms} DMs sent`,
          html: emailHtml,
        }).catch((err) =>
          console.error(`[Weekly Report] Email failed for ${userId}:`, err)
        );
      }

      processed++;
    }

    return NextResponse.json({
      status: "ok",
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Weekly Report Cron] Error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

