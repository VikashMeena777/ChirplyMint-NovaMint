"use server";

/**
 * Legacy Instagram actions — delegates to ig-accounts.ts for multi-account support.
 * Kept for backward compatibility if any external callers remain.
 */

import { createClient } from "@/lib/supabase/server";
import { getIGAccounts, disconnectIGAccount, type IGAccount } from "./ig-accounts";

// ─── Get Instagram connection (multi-account aware) ──────

export async function getInstagramConnection(): Promise<{
  connected: boolean;
  username: string;
  tokenUpdatedAt: string | null;
  accounts: IGAccount[];
}> {
  const { accounts } = await getIGAccounts();

  if (accounts.length === 0) {
    return { connected: false, username: "", tokenUpdatedAt: null, accounts: [] };
  }

  // Return primary (first) account info for backward compat
  const primary = accounts[0];
  return {
    connected: true,
    username: primary.ig_username,
    tokenUpdatedAt: primary.updated_at,
    accounts,
  };
}

// ─── Disconnect Instagram (selective or all) ─────────────

export async function disconnectInstagram(
  accountId?: string
): Promise<{ success: boolean }> {
  // If specific account requested, disconnect just that one
  if (accountId) {
    const result = await disconnectIGAccount(accountId);
    return { success: result.success };
  }

  // Fallback: disconnect ALL accounts (legacy behavior)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  // Get all active accounts
  const { accounts } = await getIGAccounts();

  // Disconnect each one (this also pauses automations per-account)
  for (const account of accounts) {
    await disconnectIGAccount(account.id);
  }

  return { success: true };
}
