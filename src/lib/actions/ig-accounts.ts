"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────

export interface IGAccount {
  id: string;
  ig_user_id: string;
  ig_username: string;
  ig_name: string | null;
  ig_profile_pic: string | null;
  is_active: boolean;
  updated_at: string;
}

// ─── List all connected IG accounts ──────────────────────

export async function getIGAccounts(): Promise<{
  accounts: IGAccount[];
  limit: number;
  canAdd: boolean;
  plan: PlanKey;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { accounts: [], limit: 1, canAdd: false, plan: "free" };

  // Get user plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = ((profile as Record<string, string> | null)?.plan || "free") as PlanKey;
  const planConfig = PLANS[plan] || PLANS.free;

  // Get all active accounts
  const { data: accounts } = await supabase
    .from("instagram_accounts")
    .select("id, ig_user_id, ig_username, ig_name, ig_profile_pic, is_active, updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const activeAccounts = (accounts ?? []) as IGAccount[];

  return {
    accounts: activeAccounts,
    limit: planConfig.igAccountLimit,
    canAdd: activeAccounts.length < planConfig.igAccountLimit,
    plan,
  };
}

// ─── Disconnect a specific IG account ────────────────────

export async function disconnectIGAccount(accountId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify ownership
  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, ig_username")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (!account) return { success: false, error: "Account not found" };

  // Deactivate the account
  const { error: updateError } = await supabase
    .from("instagram_accounts")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (updateError) return { success: false, error: updateError.message };

  // Pause all automations tied to this account
  await supabase
    .from("automations")
    .update({ status: "paused" })
    .eq("instagram_account_id", accountId)
    .eq("user_id", user.id)
    .in("status", ["active"]);

  // Check if user has ANY remaining active accounts
  const { count } = await supabase
    .from("instagram_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  // If no accounts remain, update user_settings to disconnected
  if ((count ?? 0) === 0) {
    await supabase
      .from("user_settings")
      .update({
        instagram_connected: false,
        instagram_user_id: null,
        instagram_username: null,
        instagram_access_token: null,
        instagram_page_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  }

  logActivity(user.id, "instagram.account_disconnected", {
    account_id: accountId,
    username: (account as Record<string, string>).ig_username,
  }).catch(() => {});

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Get account count vs limit ──────────────────────────

export async function getIGAccountUsage(): Promise<{
  current: number;
  limit: number;
  canAdd: boolean;
  plan: PlanKey;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { current: 0, limit: 1, canAdd: false, plan: "free" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = ((profile as Record<string, string> | null)?.plan || "free") as PlanKey;
  const planConfig = PLANS[plan] || PLANS.free;

  const { count } = await supabase
    .from("instagram_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const current = count ?? 0;

  return {
    current,
    limit: planConfig.igAccountLimit,
    canAdd: current < planConfig.igAccountLimit,
    plan,
  };
}

// ─── Set primary (active) IG account ─────────────────────

export async function setActiveAccount(accountId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify the account exists and belongs to user
  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, ig_user_id, ig_username, ig_name, ig_profile_pic, access_token, page_id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!account) return { success: false, error: "Account not found or inactive" };

  const acct = account as Record<string, string | null>;

  // Sync user_settings with the selected primary account
  // (keeps legacy queries working — dashboard, onboarding, etc.)
  await supabase
    .from("user_settings")
    .update({
      instagram_connected: true,
      instagram_user_id: acct.ig_user_id,
      instagram_username: acct.ig_username,
      instagram_access_token: acct.access_token,
      instagram_page_id: acct.page_id,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  logActivity(user.id, "instagram.primary_account_set", {
    account_id: accountId,
    username: acct.ig_username,
  }).catch(() => {});

  revalidatePath("/dashboard/settings");
  return { success: true };
}

