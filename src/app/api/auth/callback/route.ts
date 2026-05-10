import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { PLANS } from "@/lib/utils/plan-limits";
import { sendEmail } from "@/lib/email/send";
import { getWelcomeOnboardingHtml } from "@/lib/email/templates/onboarding-day1";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check for pending referral code from Google signup
      const cookieStore = await cookies();
      const pendingRef = cookieStore.get("pending_referral")?.value;

      if (pendingRef) {
        const refCode = decodeURIComponent(pendingRef).toUpperCase().trim();

        // Clear the cookie immediately
        cookieStore.set("pending_referral", "", {
          path: "/",
          maxAge: 0,
        });

        // Apply referral in background (don't block redirect)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          applyReferral(refCode, user.id).catch((err) => {
            console.error("[Referral] Failed to apply on Google signup:", err);
          });
        }
      }

      // Send welcome email immediately for new signups
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        sendWelcomeIfNew(authUser.id, authUser.email || "", authUser.user_metadata?.full_name || authUser.user_metadata?.name || "").catch((err) => {
          console.error("[Onboarding] Failed to send welcome email:", err);
        });
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

/**
 * Apply referral code server-side.
 * Same logic as the referral action, but runs in the API route context.
 */
async function applyReferral(code: string, newUserId: string) {
  const admin = getAdminSupabase();

  // Find referrer
  const { data: referrer } = await admin
    .from("profiles")
    .select("id, referral_count, plan, plan_expires_at")
    .eq("referral_code", code)
    .single();

  if (!referrer) return;

  const referrerId = (referrer as Record<string, unknown>).id as string;

  // Can't refer yourself
  if (referrerId === newUserId) return;

  // Check if already referred
  const { data: myProfile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", newUserId)
    .single();

  if ((myProfile as Record<string, unknown>)?.referred_by) return;

  // Mark new user as referred
  await admin
    .from("profiles")
    .update({ referred_by: referrerId })
    .eq("id", newUserId);

  // Increment referrer count
  const currentCount = ((referrer as Record<string, unknown>).referral_count as number) || 0;
  await admin
    .from("profiles")
    .update({ referral_count: currentCount + 1 })
    .eq("id", referrerId);

  // Award referrer 14 days Pro
  const currentPlan = (referrer as Record<string, unknown>).plan as string;
  const currentExpiry = (referrer as Record<string, unknown>).plan_expires_at as string | null;

  const baseDate = currentExpiry && new Date(currentExpiry) > new Date()
    ? new Date(currentExpiry)
    : new Date();
  const newExpiry = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  const updates: Record<string, unknown> = {
    plan_expires_at: newExpiry.toISOString(),
  };
  if (currentPlan === "free") {
    updates.plan = "pro";
    updates.dm_limit = PLANS.pro?.dmLimit ?? 1000;
  }

  await admin.from("profiles").update(updates).eq("id", referrerId);

  console.log(`[Referral] ✅ Applied: ${newUserId} referred by ${referrerId}, +14d Pro until ${newExpiry.toISOString()}`);
}

/**
 * Send welcome email immediately on first login/signup.
 * Checks onboarding_email_step — only sends if at step 0.
 * Advances to step 1 so the cron doesn't re-send.
 */
async function sendWelcomeIfNew(userId: string, email: string, name: string) {
  if (!email) return;

  const admin = getAdminSupabase();

  // Check current onboarding step
  const { data: profile } = await admin
    .from("profiles")
    .select("onboarding_email_step")
    .eq("id", userId)
    .single();

  const step = (profile as Record<string, unknown>)?.onboarding_email_step as number;
  if (step !== 0) return; // Already past welcome email

  // Send welcome email
  const displayName = name || "there";
  await sendEmail({
    to: email,
    subject: "Welcome to ChirplyMint! 🚀 Here's how to get started",
    html: getWelcomeOnboardingHtml(displayName),
  });

  // Advance to step 1, schedule next email in 2 days
  const nextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  await admin.from("profiles").update({
    onboarding_email_step: 1,
    onboarding_email_next_at: nextAt.toISOString(),
  }).eq("id", userId);

  console.log(`[Onboarding] ✉️ Welcome email sent to ${email}, next step at ${nextAt.toISOString()}`);
}
