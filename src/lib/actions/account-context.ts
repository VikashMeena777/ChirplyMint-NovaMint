"use server";

import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  IG_ACCOUNT_COOKIE,
  pickSelectedAccount,
  type IgAccountOption,
} from "@/lib/ig-account-context";

/**
 * Which connected Instagram account the dashboard is currently "inside".
 *
 * Per-account isolation: account-scoped surfaces (AI agent, AI inbox, leads,
 * messages, analytics, link-in-bio) read this. The choice lives in a cookie —
 * no URL changes — and is always validated against the user's own active
 * accounts, so a forged value falls back to the default (oldest account).
 */

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function listAccounts(userId: string): Promise<IgAccountOption[]> {
  const { data } = await admin()
    .from("instagram_accounts")
    .select("id, ig_username, ig_profile_pic")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data ?? []) as IgAccountOption[];
}

/** Session-resolving variant for client components (no argument needed). */
export async function getIgAccountContext(): Promise<{
  accounts: IgAccountOption[];
  selectedId: string | null;
  selected: IgAccountOption | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { accounts: [], selectedId: null, selected: null };

  const accounts = await listAccounts(user.id);
  const jar = await cookies();
  const selected = pickSelectedAccount(accounts, jar.get(IG_ACCOUNT_COOKIE)?.value);
  return { accounts, selectedId: selected?.id ?? null, selected };
}

/** Server-side variant for other actions (workspace-aware caller passes targetId). */
export async function getSelectedIgAccountId(userId: string): Promise<string | null> {
  const accounts = await listAccounts(userId);
  const jar = await cookies();
  return pickSelectedAccount(accounts, jar.get(IG_ACCOUNT_COOKIE)?.value)?.id ?? null;
}

/** Remember the choice. Unknown/foreign ids are ignored, never stored. */
export async function setSelectedIgAccount(accountId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const accounts = await listAccounts(user.id);
  if (!accounts.some((a) => a.id === accountId)) return { ok: false };

  const jar = await cookies();
  jar.set(IG_ACCOUNT_COOKIE, accountId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true };
}
