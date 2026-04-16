"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

export async function getAutomations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  return { data: data ?? [], error: error?.message };
}

export async function createAutomation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if user has an instagram account connected
  const { data: igAccounts } = await supabase
    .from("instagram_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  if (!igAccounts || igAccounts.length === 0) {
    return { error: "Please connect an Instagram account first in Settings." };
  }

  const { error } = await supabase.from("automations").insert({
    user_id: user.id,
    instagram_account_id: igAccounts[0].id,
    name: formData.get("name") as string,
    keyword: formData.get("keyword") as string,
    dm_template: formData.get("dm_template") as string,
    post_url: (formData.get("post_url") as string) || null,
    ai_enabled: formData.get("ai_enabled") === "true",
  });

  if (error) return { error: error.message };

  logActivity(user.id, "automation.created", {
    name: formData.get("name"),
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}

export async function toggleAutomation(id: string, newStatus: "active" | "paused") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("automations")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, `automation.${newStatus}`, { automation_id: id }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}

export async function deleteAutomation(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("automations")
    .update({ status: "deleted" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "automation.deleted", { automation_id: id }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}
