import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { PLANS } from "@/lib/utils/plan-limits";

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
