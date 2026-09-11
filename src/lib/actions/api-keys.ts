"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

/**
 * D8: Public API keys (Business plan). The raw key is returned ONCE at
 * creation; only a sha256 hash + 12-char prefix are stored. Keys
 * authenticate the read-only /api/v1/* endpoints.
 */

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
}

export async function getApiKeys(): Promise<ApiKeyRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, revoked, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as unknown as ApiKeyRow[]) ?? [];
}

export async function createApiKey(
  name: string
): Promise<{ key?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Business plan only
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  if ((profile as Record<string, string> | null)?.plan !== "business") {
    return { error: "API keys are available on the Business plan" };
  }

  const raw = `cmk_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(raw).digest("hex");
  const keyPrefix = raw.slice(0, 12);

  const admin = getAdmin();
  const { error } = await admin.from("api_keys").insert({
    user_id: user.id,
    name: name.trim().slice(0, 40) || "API key",
    key_prefix: keyPrefix,
    key_hash: keyHash,
  });

  if (error) return { error: error.message };

  logActivity(user.id, "api_key.created", { name }).catch(() => {});
  revalidatePath("/dashboard/settings");
  return { key: raw };
}

export async function revokeApiKey(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  logActivity(user.id, "api_key.revoked", { key_id: id }).catch(() => {});
  revalidatePath("/dashboard/settings");
  return {};
}

/**
 * Permanently delete a REVOKED key row (Stripe/GitHub pattern: revoke first,
 * delete removes the clutter). Active keys must be revoked before deletion.
 */
export async function deleteApiKey(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = getAdmin();

  // Only allow deleting keys you own AND that are already revoked
  const { data: key } = await admin
    .from("api_keys")
    .select("id, revoked")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const k = key as { revoked: boolean } | null;
  if (!k) return { error: "Key not found" };
  if (!k.revoked) return { error: "Revoke the key first — then delete it." };

  const { error } = await admin.from("api_keys").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  return {};
}
