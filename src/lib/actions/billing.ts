"use server";

import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/utils/plan-limits";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

/**
 * Revenue mechanics: 7-day free trial (once), annual plan, DM top-up packs,
 * invoices for download, downgrade-save survey.
 */

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TRIAL_DAYS = 7;

/** Start the one-time 7-day Pro trial. */
const TRIAL_MAX_ACCOUNT_AGE_DAYS = 30;

export interface TrialEligibility {
  eligible: boolean;
  reason: string;
}

/**
 * Strict trial eligibility — ALL must hold:
 *   1. trial_used is false (one trial per account, forever)
 *   2. the account has NEVER made a paid purchase (upgraded-then-
 *      canceled users don't get a second taste)
 *   3. the account is genuinely new (created within 30 days)
 *   4. an Instagram professional account is connected
 */
export async function getTrialEligibility(): Promise<TrialEligibility> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { eligible: false, reason: "Not authenticated" };

  const admin = getAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan, trial_used, created_at")
    .eq("id", user.id)
    .single();
  const p = profile as Record<string, unknown> | null;

  if (p?.plan === "pro" || p?.plan === "business") {
    return { eligible: false, reason: "You're already on a paid plan." };
  }
  if (p?.trial_used === true) {
    return { eligible: false, reason: "already_used" };
  }

  const { count: paidOrders } = await admin
    .from("payment_orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "paid");
  if ((paidOrders ?? 0) > 0) {
    return { eligible: false, reason: "paid_before" };
  }

  const createdAt = p?.created_at ? new Date(p.created_at as string).getTime() : 0;
  const ageDays = createdAt ? Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000)) : 999;
  if (ageDays > TRIAL_MAX_ACCOUNT_AGE_DAYS) {
    return { eligible: false, reason: "not_new" };
  }

  const { count: igCount } = await admin
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);
  if ((igCount ?? 0) === 0) {
    return { eligible: false, reason: "connect_instagram" };
  }

  return { eligible: true, reason: "" };
}

export async function startFreeTrial(): Promise<{ error?: string }> {
  // Every rule lives in ONE place — the action re-runs the full
  // eligibility check so the client state can never grant a trial the
  // rules forbid.
  const eligibility = await getTrialEligibility();
  if (!eligibility.eligible) {
    const friendly: Record<string, string> = {
      already_used: "You've already used your free trial.",
      paid_before: "Free trials are for new accounts only — you've been on a paid plan before.",
      not_new: "Free trials are for new accounts (created within the last 30 days).",
      connect_instagram: "Connect your Instagram account first (Settings → Instagram), then start the trial.",
    };
    return { error: friendly[eligibility.reason] || eligibility.reason };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();
  const p = profile as Record<string, unknown> | null;

  const ends = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await admin
    .from("profiles")
    .update({
      plan: "pro",
      plan_expires_at: ends.toISOString(),
      trial_used: true,
      trial_ends_at: ends.toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "trial.started", { days: TRIAL_DAYS }).catch(() => {});
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return {};
}

/** Record a downgrade-save survey answer (exit interview). */
export async function saveDowngradeSurvey(
  reason: string,
  feedback: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();
  await admin.from("activity_log").insert({
    user_id: user.id,
    action: "billing.downgrade_survey",
    metadata: { reason, feedback: feedback.slice(0, 500) },
  });

  return {};
}

/** List the user's invoices. */
export interface InvoiceRow {
  id: string;
  order_id: string;
  invoice_number?: string;
  amount: number;
  currency: string;
  plan: string;
  description: string | null;
  paid_at: string;
}

export async function getInvoices(): Promise<InvoiceRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("invoices")
    .select("id, order_id, invoice_number, amount, currency, plan, description, paid_at")
    .eq("user_id", user.id)
    .order("paid_at", { ascending: false });

  return (data as unknown as InvoiceRow[]) ?? [];
}

export interface SubscriptionStatusRow {
  status: string;
  plan: string;
  currentPeriodEnd: string | null;
}

/** Current subscription state for the billing UI (banner + buttons). */
export async function getSubscriptionStatus(): Promise<SubscriptionStatusRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getAdmin();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status, plan, current_period_end")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = sub as Record<string, string> | null;
  if (!row) return null;
  return {
    status: row.status,
    plan: row.plan,
    currentPeriodEnd: row.current_period_end ?? null,
  };
}

/** Cancel the paid plan at period end (survey first). */
export async function cancelPlanAtPeriodEnd(
  reason: string,
  feedback: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();

  // Record the survey
  await admin.from("activity_log").insert({
    user_id: user.id,
    action: "billing.downgrade_survey",
    metadata: { reason, feedback: feedback.slice(0, 500) },
  });

  // Mark subscription canceled — features stay until current_period_end,
  // then the subscription-check cron downgrades to free (no grace nags —
  // the user already decided).
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("status", ["active", "grace_period"]);

  if (error) return { error: error.message };

  await admin.from("notifications").insert({
    user_id: user.id,
    type: "info",
    title: "Plan canceled",
    body: "Your plan stays active until the end of the paid period, then moves to the free Starter plan. You can re-subscribe anytime.",
  });

  revalidatePath("/dashboard/settings");
  return {};
}

/** Re-activate a canceled subscription (before period end). */
export async function resumePlan(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

/**
 * Cancel NOW: paid features end immediately, account moves to Starter.
 * Purchased top-up DMs are preserved. The subscription row is marked
 * 'expired' so the daily cron never processes it again (no grace emails).
 */
export async function cancelImmediately(
  reason: string,
  feedback: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();

  await admin.from("activity_log").insert({
    user_id: user.id,
    action: "billing.cancel_immediate",
    metadata: { reason, feedback: feedback.slice(0, 500) },
  });

  // Preserve purchased top-ups on the free plan's limit
  const { data: prof } = await admin
    .from("profiles")
    .select("plan, dm_topup_balance")
    .eq("id", user.id)
    .single();
  const p = prof as Record<string, number> | null;
  const balance = (p?.dm_topup_balance as number) ?? 0;

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      plan: "free",
      dm_limit: PLANS.free.dmLimit + balance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profErr) return { error: profErr.message };

  const { error: subErr } = await admin
    .from("subscriptions")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("status", ["active", "grace_period", "canceled"]);
  if (subErr) return { error: subErr.message };

  await admin.from("notifications").insert({
    user_id: user.id,
    type: "info",
    title: "Plan canceled",
    body: "You're now on the free Starter plan. Your purchased top-up DMs are kept. Come back anytime!",
  });

  revalidatePath("/dashboard/settings/billing");
  return {};
}

/**
 * Downgrade Business → Pro, effective immediately. The paid period end
 * is kept; DM entitlement becomes Pro (2000) + purchased top-ups.
 */
export async function downgradeToPro(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();

  const { data: prof } = await admin
    .from("profiles")
    .select("plan, dm_topup_balance")
    .eq("id", user.id)
    .single();
  const p = prof as Record<string, string | number> | null;
  if (p?.plan !== "business") {
    return { error: "Only Business plans can switch to Pro." };
  }
  const balance = (p?.dm_topup_balance as number) ?? 0;

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      plan: "pro",
      dm_limit: PLANS.pro.dmLimit + balance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profErr) return { error: profErr.message };

  await admin
    .from("subscriptions")
    .update({ plan: "pro", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("status", ["active", "grace_period"]);

  await admin.from("notifications").insert({
    user_id: user.id,
    type: "info",
    title: "Switched to Pro",
    body: "You're now on Pro — 2,000 DMs a month plus your top-ups. Your paid period end date is unchanged.",
  });

  revalidatePath("/dashboard/settings/billing");
  return {};
}
