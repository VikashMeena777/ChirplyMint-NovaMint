import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEffectiveDMLimit, isUnlimitedDM, type PlanKey } from "@/lib/utils/plan-limits";
import { sendEmail } from "@/lib/email/send";
import { getApproachingLimitHtml } from "@/lib/email/templates/approaching-limit";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Plan Limit Warning Cron
 * Runs hourly via cron-job.org.
 *
 * Checks all users' DM usage against their plan limit.
 * Sends warnings at 80% and 100% thresholds (max 1 per threshold per month).
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date();
    const nowIso = now.toISOString();

    // Fetch all users with their DM counts and limits (dm_limit includes top-ups)
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, plan, dm_count_this_month, dm_limit, last_limit_warning_at, notification_preferences")
      .gt("dm_count_this_month", 0);

    if (error) {
      console.error("[Limit Check] Fetch error:", error);
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ status: "ok", warnings_sent: 0, timestamp: nowIso });
    }

    let warningsSent = 0;

    for (const raw of profiles) {
      const p = raw as Record<string, unknown>;
      const userId = p.id as string;
      const plan = (p.plan as PlanKey) || "free";
      const dmCount = (p.dm_count_this_month as number) || 0;
      const limit = getEffectiveDMLimit(plan, p.dm_limit as number | null);
      // Unlimited plans never need warnings
      if (isUnlimitedDM(limit)) continue;
      const prefs = (p.notification_preferences as Record<string, boolean>) ?? {};
      // Marketing warnings must respect the global opt-out.
      if (prefs.product_updates === false) continue;

      // Determine which threshold they've crossed
      const pct = limit > 0 ? (dmCount / limit) * 100 : 0;
      let threshold: "80" | "100" | null = null;

      if (pct >= 100) {
        threshold = "100";
      } else if (pct >= 80) {
        threshold = "80";
      }

      if (!threshold) continue;

      // Per-threshold monthly guard: the old single-timestamp check blocked
      // 100% after an 80% warning. Check notifications for this exact
      // threshold this calendar month instead.
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: alreadyWarned } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStart)
        .contains("metadata", { threshold });
      if ((alreadyWarned ?? 0) > 0) continue;

      // Send warning notification
      const isMax = threshold === "100";
      await supabase.from("notifications").insert({
        user_id: userId,
        type: isMax ? "warning" : "info",
        title: isMax ? "🚫 DM Limit Reached!" : "⚠️ Approaching DM Limit",
        body: isMax
          ? `You've used all ${limit} DMs for this month. Upgrade your plan to continue sending.`
          : `You've used ${dmCount}/${limit} DMs (${Math.round(pct)}%). Upgrade to avoid hitting the limit.`,
        metadata: { threshold, dm_count: dmCount, dm_limit: limit },
      });

      // Send email first — only stamp last_limit_warning_at on success so a
      // failed send retries next hour instead of suppressing all month.
      let emailOk = false;
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;
      if (userEmail) {
        try {
          if (isMax) {
            const result = await sendEmail({
              to: userEmail,
              subject: "You've hit your ChirplyMint DM limit",
              userId,
              category: "marketing",
              html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #16a34a;">ChirplyMint</h2>
                <p>You've sent <strong>${limit}/${limit}</strong> DMs this month and hit your plan limit.</p>
                <p>Your automations will stop sending DMs until your limit resets. Upgrade now for more DMs.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"}/dashboard/settings" 
                   style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">
                  Upgrade Plan
                </a>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">ChirplyMint — Instagram DM Automation</p>
              </div>
            `,
            });
            emailOk = result.success;
            if (!result.success) console.error(`[Limit Check] Email failed for ${userId}:`, result.error);
          } else {
            const { data: prof80 } = await supabase.from("profiles").select("full_name, plan").eq("id", userId).single();
            const result80 = await sendEmail({
              to: userEmail,
              subject: `⚠️ You've used ${Math.round(pct)}% of your DM limit`,
              userId,
              category: "marketing",
              html: getApproachingLimitHtml({
                name: (prof80 as Record<string, unknown>)?.full_name as string || "there",
                used: dmCount,
                limit,
                plan: (prof80 as Record<string, unknown>)?.plan as string || "Starter",
              }),
            });
            emailOk = result80.success;
            if (!result80.success) console.error(`[Limit Check] Email failed for ${userId}:`, result80.error);
          }
        } catch (emailErr) {
          console.error(`[Limit Check] Email threw for ${userId}:`, emailErr);
        }
      } else {
        // No email to send — in-app alone counts as warned.
        emailOk = true;
      }

      if (!emailOk) continue;

      // Update last warning timestamp (kept for backwards-compat dashboards)
      await supabase.from("profiles").update({
        last_limit_warning_at: nowIso,
      }).eq("id", userId);

      warningsSent++;
      console.log(`[Limit Check] Warned ${userId}: ${threshold}% (${dmCount}/${limit})`);

    }

    console.log(`[Limit Check] Done: ${warningsSent} warnings sent`);
    return NextResponse.json({
      status: "ok",
      total_checked: profiles.length,
      warnings_sent: warningsSent,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error("[Limit Check] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
