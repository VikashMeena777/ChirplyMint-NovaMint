import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/utils/plan-limits";
import { sendEmail } from "@/lib/email/send";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const GRACE_PERIOD_DAYS = 3;

/**
 * Daily Subscription Check Cron
 * Runs daily at midnight via cron-job.org.
 *
 * Handles three scenarios for paid users:
 * 1. RENEWAL: User's period ended + they paid again → reset DM count, set new period
 * 2. GRACE PERIOD: Period ended < 3 days ago → warn user, keep features active
 * 3. HARD DOWNGRADE: Period ended > 3 days ago → downgrade to free plan
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

    // Fetch all active/grace subscriptions whose period has ended
    const { data: expiredSubs, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan, status, current_period_end")
      .in("status", ["active", "grace_period"])
      .lt("current_period_end", nowIso);

    if (fetchError) {
      console.error("[Sub Check] Fetch error:", fetchError);
      return NextResponse.json({ status: "error", error: fetchError.message }, { status: 500 });
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      console.log("[Sub Check] No expired subscriptions found.");
      return NextResponse.json({ status: "ok", processed: 0, timestamp: nowIso });
    }

    let renewed = 0;
    let graced = 0;
    let downgraded = 0;

    for (const sub of expiredSubs) {
      const s = sub as Record<string, unknown>;
      const userId = s.user_id as string;
      const periodEnd = new Date(s.current_period_end as string);
      const daysSinceExpiry = Math.floor((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));

      // Check if user has paid again (new payment_order with status = 'paid' after period_end)
      const { data: newPayment } = await supabase
        .from("payment_orders")
        .select("id, plan, created_at")
        .eq("user_id", userId)
        .eq("status", "paid")
        .gt("created_at", (s.current_period_end as string))
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (newPayment) {
        // ── SCENARIO 1: RENEWAL ──
        const renewPlan = (newPayment as Record<string, string>).plan;
        const newPeriodStart = nowIso;
        const newPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Reset DM count + update plan
        await supabase.from("profiles").update({
          plan: renewPlan,
          dm_count_this_month: 0,
          dm_count_reset_at: nowIso,
          dm_limit: PLANS[renewPlan as keyof typeof PLANS]?.dmLimit ?? PLANS.free.dmLimit,
          updated_at: nowIso,
        }).eq("id", userId);

        // Update subscription period
        await supabase.from("subscriptions").update({
          plan: renewPlan,
          status: "active",
          current_period_start: newPeriodStart,
          current_period_end: newPeriodEnd,
          updated_at: nowIso,
        }).eq("user_id", userId);

        // Notification
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment_success",
          title: "🎉 Plan Renewed!",
          body: `Your ${PLANS[renewPlan as keyof typeof PLANS]?.name || "Pro"} plan has been renewed. DM count has been reset.`,
          metadata: { plan: renewPlan },
        });

        renewed++;
        console.log(`[Sub Check] ✅ Renewed: ${userId} → ${renewPlan}`);

      } else if (daysSinceExpiry <= GRACE_PERIOD_DAYS) {
        // ── SCENARIO 2: GRACE PERIOD — Daily countdown emails ──
        const daysLeft = GRACE_PERIOD_DAYS - daysSinceExpiry;

        // Set grace_period status (only on first day, idempotent on subsequent)
        if ((s.status as string) !== "grace_period") {
          await supabase.from("subscriptions").update({
            status: "grace_period",
            updated_at: nowIso,
          }).eq("user_id", userId);
        }

        // Get user info for email
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();

        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email;
        const userName = (profile as Record<string, string>)?.full_name || "there";

        // Daily in-app notification with countdown
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "warning",
          title: daysLeft === 0
            ? "🚨 Last Day — Plan Expires Today!"
            : `⚠️ ${daysLeft} Day${daysLeft > 1 ? "s" : ""} Left — Plan Expiring`,
          body: daysLeft === 0
            ? "Today is your last day. Your plan will be downgraded tomorrow if you don't renew."
            : `Your plan expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Renew now to keep your features.`,
          metadata: { days_left: daysLeft },
        });

        // Daily countdown email
        if (userEmail) {
          const urgencyColor = daysLeft <= 1 ? "#dc2626" : "#f59e0b";
          sendEmail({
            to: userEmail,
            subject: daysLeft === 0
              ? "🚨 LAST DAY — Your ChirplyMint plan expires today"
              : `⚠️ ${daysLeft} day${daysLeft > 1 ? "s" : ""} left — Your ChirplyMint plan is expiring`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #16a34a;">ChirplyMint</h2>
                <p>Hey ${userName},</p>
                <div style="background: ${urgencyColor}11; border-left: 4px solid ${urgencyColor}; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
                  <strong style="color: ${urgencyColor};">${daysLeft === 0 ? "⏰ Final Warning" : `⚠️ ${daysLeft} Day${daysLeft > 1 ? "s" : ""} Remaining`}</strong>
                  <p style="margin: 4px 0 0 0;">Your subscription has expired. ${daysLeft === 0 ? "Your account will be downgraded to the free plan tomorrow." : `You have <strong>${daysLeft} day${daysLeft > 1 ? "s" : ""}</strong> left before your account is downgraded.`}</p>
                </div>
                <p>Renew now to keep your DM limits, AI agent, and all Pro features.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"}/dashboard/settings" 
                   style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">
                  Renew Now
                </a>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">ChirplyMint — Instagram DM Automation</p>
              </div>
            `,
          }).catch(() => {});
        }

        graced++;
        console.log(`[Sub Check] ⏳ Grace: ${userId} — ${daysLeft} day(s) left`);

      } else {
        // ── SCENARIO 3: HARD DOWNGRADE — One-time only ──
        // IMPORTANT: Set status to 'expired' FIRST so if the cron fires again
        // before the loop finishes, this user won't be picked up again.
        await supabase.from("subscriptions").update({
          status: "expired",
          updated_at: nowIso,
        }).eq("user_id", userId);

        await supabase.from("profiles").update({
          plan: "free",
          dm_limit: PLANS.free.dmLimit,
          updated_at: nowIso,
        }).eq("id", userId);

        // In-app notification (one-time — status is already 'expired' so cron won't pick it up again)
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "warning",
          title: "📉 Plan Downgraded",
          body: "Your subscription has expired and your account has been downgraded to the Starter plan. Upgrade anytime to restore your features.",
          metadata: { previous_plan: s.plan },
        });

        // One-time downgrade email
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email;
        if (userEmail) {
          sendEmail({
            to: userEmail,
            subject: "Your ChirplyMint plan has been downgraded",
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #16a34a;">ChirplyMint</h2>
                <p>Your subscription grace period has ended and your account has been moved to the free Starter plan.</p>
                <p>Your DM limit is now ${PLANS.free.dmLimit}/month. Upgrade anytime to get back your Pro features.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"}/dashboard/settings" 
                   style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">
                  Upgrade Now
                </a>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">ChirplyMint — Instagram DM Automation</p>
              </div>
            `,
          }).catch(() => {});
        }

        downgraded++;
        console.log(`[Sub Check] 📉 Downgraded: ${userId} → free (expired ${daysSinceExpiry} days ago)`);
      }
    }

    console.log(`[Sub Check] Done: ${renewed} renewed, ${graced} grace, ${downgraded} downgraded`);

    // ── REFERRAL PRO EXPIRY CHECK ──
    // Downgrade users whose referral-granted Pro has expired
    const { data: expiredReferrals } = await supabase
      .from("profiles")
      .select("id, plan, plan_expires_at")
      .not("plan_expires_at", "is", null)
      .lt("plan_expires_at", nowIso)
      .neq("plan", "free");

    let referralDowngraded = 0;
    for (const profile of (expiredReferrals || [])) {
      const p = profile as Record<string, unknown>;
      // Only downgrade if they don't have an active paid subscription
      const { data: activeSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", p.id)
        .in("status", ["active", "grace_period"])
        .single();

      if (!activeSub) {
        await supabase.from("profiles").update({
          plan: "free",
          dm_limit: PLANS.free.dmLimit,
          plan_expires_at: null,
          updated_at: nowIso,
        }).eq("id", p.id);

        await supabase.from("notifications").insert({
          user_id: p.id,
          type: "info",
          title: "Referral Pro Trial Ended",
          body: "Your referral Pro trial has expired. Refer more friends for more Pro days, or upgrade to a paid plan!",
          metadata: {},
        });

        referralDowngraded++;
        console.log(`[Sub Check] 🎁→📉 Referral Pro expired: ${p.id}`);
      }
    }

    console.log(`[Sub Check] Referral expirations: ${referralDowngraded} downgraded`);

    return NextResponse.json({
      status: "ok",
      total: expiredSubs.length,
      renewed,
      graced,
      downgraded,
      referralDowngraded,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error("[Sub Check] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
