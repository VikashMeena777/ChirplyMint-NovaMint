"use server";

import { createClient } from "@/lib/supabase/server";
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
export async function startFreeTrial(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan, plan_expires_at, trial_used, email")
    .eq("id", user.id)
    .single();
  const p = profile as Record<string, unknown> | null;

  if (p?.trial_used === true) {
    return { error: "You've already used your free trial." };
  }
  if (p?.plan === "pro" || p?.plan === "business") {
    // Already on a paid plan — extend instead of granting
    return { error: "You're already on a paid plan." };
  }

  // Abuse guard: a connected Instagram account is required. Throwaway
  // emails don't have IG professional accounts, so this stops the
  // "new email = new trial" loop without demanding a card.
  const { count: igCount } = await admin
    .from("instagram_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);
  if ((igCount ?? 0) === 0) {
    return { error: "Connect your Instagram account first (Settings → Instagram), then start the trial." };
  }

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
  // then the subscription-check cron downgrades to free.
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

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
