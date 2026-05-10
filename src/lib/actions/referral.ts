"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getOrCreateReferralCode(): Promise<{
  code: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { code: null, error: "Not authenticated" };

  // Check if already has a code
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  if ((profile as Record<string, unknown>)?.referral_code) {
    return { code: (profile as Record<string, unknown>).referral_code as string, error: null };
  }

  // Generate unique code
  let code = generateCode();
  let attempts = 0;
  const admin = getAdminSupabase();

  while (attempts < 5) {
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .single();

    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const { error } = await admin
    .from("profiles")
    .update({ referral_code: code })
    .eq("id", user.id);

  if (error) return { code: null, error: error.message };
  return { code, error: null };
}

/**
 * Apply a referral code during signup.
 * The REFERRER (invitor) gets the reward, not the new user.
 */
export async function applyReferralCode(code: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const admin = getAdminSupabase();
  const userEmail = user.email || "";

  // Find the referrer
  const { data: referrer } = await admin
    .from("profiles")
    .select("id, referral_count, plan, plan_expires_at")
    .eq("referral_code", code.toUpperCase().trim())
    .single();

  if (!referrer) return { success: false, error: "Invalid referral code" };

  const referrerId = (referrer as Record<string, unknown>).id as string;

  // Can't refer yourself
  if (referrerId === user.id) {
    return { success: false, error: "You can't use your own referral code" };
  }

  // Check if already referred (profile-level check)
  const { data: myProfile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", user.id)
    .single();

  if ((myProfile as Record<string, unknown>)?.referred_by) {
    return { success: false, error: "You've already used a referral code" };
  }

  // Anti-abuse: check referral_log by email (survives account deletion)
  if (userEmail) {
    const { data: existingLog } = await admin
      .from("referral_log")
      .select("id")
      .eq("referred_email", userEmail.toLowerCase())
      .limit(1)
      .single();

    if (existingLog) {
      return { success: false, error: "This email has already been used for a referral" };
    }
  }

  // Mark the new user as referred
  await admin
    .from("profiles")
    .update({ referred_by: referrerId })
    .eq("id", user.id);

  // Log the referral permanently (anti-abuse)
  await admin.from("referral_log").insert({
    referrer_id: referrerId,
    referred_email: userEmail.toLowerCase(),
    referred_user_id: user.id,
    reward_days: 14,
  });

  // Increment referrer's count
  const currentCount = ((referrer as Record<string, unknown>).referral_count as number) || 0;
  await admin
    .from("profiles")
    .update({ referral_count: currentCount + 1 })
    .eq("id", referrerId);

  // Award referrer: 14 days of Pro
  const currentPlan = (referrer as Record<string, unknown>).plan as string;
  const currentExpiry = (referrer as Record<string, unknown>).plan_expires_at as string | null;

  // Calculate new expiry: extend from current expiry or from now
  const baseDate = currentExpiry && new Date(currentExpiry) > new Date()
    ? new Date(currentExpiry)
    : new Date();
  const newExpiry = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  // If referrer is on free plan, upgrade to pro. If already pro/business, just extend expiry.
  const updates: Record<string, unknown> = {
    plan_expires_at: newExpiry.toISOString(),
  };
  if (currentPlan === "free") {
    updates.plan = "pro";
  }

  await admin.from("profiles").update(updates).eq("id", referrerId);

  logActivity(referrerId, "referral.reward_granted", {
    referred_user: user.id,
    days_added: 14,
    new_expiry: newExpiry.toISOString(),
  }).catch(() => {});

  logActivity(user.id, "referral.code_applied", {
    referrer_id: referrerId,
    code,
  }).catch(() => {});

  return { success: true, error: null };
}

export async function getReferralStats(): Promise<{
  code: string | null;
  count: number;
  planExpiresAt: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { code: null, count: 0, planExpiresAt: null, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, referral_count, plan_expires_at")
    .eq("id", user.id)
    .single();

  const p = profile as Record<string, unknown>;
  return {
    code: (p?.referral_code as string) || null,
    count: (p?.referral_count as number) || 0,
    planExpiresAt: (p?.plan_expires_at as string) || null,
    error: null,
  };
}
