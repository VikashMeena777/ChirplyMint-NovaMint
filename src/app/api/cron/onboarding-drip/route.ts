import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { getWelcomeOnboardingHtml } from "@/lib/email/templates/onboarding-day1";
import { getConnectInstagramHtml } from "@/lib/email/templates/onboarding-day3";
import { getFirstAutomationHtml } from "@/lib/email/templates/onboarding-day7";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Onboarding Drip Email Cron
 * Runs daily at 10:00 AM IST via cron-job.org.
 *
 * Sends 3 onboarding emails over 7 days:
 * - Step 0 → Day 1: Welcome + getting started
 * - Step 1 → Day 3: Connect Instagram (skipped if already connected)
 * - Step 2 → Day 7: Create first automation (skipped if already has one)
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

    // Find users who need the next onboarding email
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, full_name, onboarding_email_step, onboarding_email_next_at")
      .lt("onboarding_email_next_at", nowIso)
      .lt("onboarding_email_step", 3)
      .limit(50);

    if (error) {
      console.error("[Drip] Query error:", error);
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ status: "ok", sent: 0, timestamp: nowIso });
    }

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      const u = user as Record<string, unknown>;
      const userId = u.id as string;
      const name = (u.full_name as string) || "there";
      const step = (u.onboarding_email_step as number) || 0;

      // Get user email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) {
        skipped++;
        continue;
      }

      let subject = "";
      let html = "";
      let shouldSkip = false;

      if (step === 0) {
        // Step 0: Welcome email (always send)
        subject = "Welcome to ChirplyMint! 🚀 Here's how to get started";
        html = getWelcomeOnboardingHtml(name);
      } else if (step === 1) {
        // Step 1: Connect Instagram — skip if already connected
        const { data: igAccount } = await supabase
          .from("instagram_accounts")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (igAccount) {
          shouldSkip = true;
        } else {
          subject = "Don't forget to connect your Instagram 📱";
          html = getConnectInstagramHtml(name);
        }
      } else if (step === 2) {
        // Step 2: Create automation — skip if already has one
        const { count } = await supabase
          .from("automations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (count && count > 0) {
          shouldSkip = true;
        } else {
          subject = "Ready to automate your DMs? ⚡";
          html = getFirstAutomationHtml(name);
        }
      }

      // Calculate next step timing
      const nextStep = step + 1;
      let nextAt: Date | null = null;

      if (nextStep === 1) {
        // Next email in 2 days
        nextAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      } else if (nextStep === 2) {
        // Next email in 4 days
        nextAt = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
      }
      // nextStep === 3 means sequence complete, no more emails

      // Send email if not skipped
      if (!shouldSkip && html) {
        try {
          await sendEmail({ to: email, subject, html });
          sent++;
          console.log(`[Drip] ✉️ Sent step ${step} to ${email}`);
        } catch (emailErr) {
          console.error(`[Drip] Failed to send step ${step} to ${email}:`, emailErr);
        }
      } else if (shouldSkip) {
        skipped++;
        console.log(`[Drip] ⏭️ Skipped step ${step} for ${email} (action already done)`);
      }

      // Advance to next step regardless
      await supabase.from("profiles").update({
        onboarding_email_step: nextStep,
        onboarding_email_next_at: nextAt?.toISOString() || null,
      }).eq("id", userId);
    }

    console.log(`[Drip] Done: ${sent} sent, ${skipped} skipped`);

    return NextResponse.json({
      status: "ok",
      total: users.length,
      sent,
      skipped,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error("[Drip] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
