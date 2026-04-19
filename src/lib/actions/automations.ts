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

  // Parse form data
  const name = formData.get("name") as string;
  const keyword = formData.get("keyword") as string;
  const dmTemplate = formData.get("dm_template") as string;
  const scopeType = (formData.get("scope_type") as string) || "account";
  const contentType = (formData.get("content_type") as string) || "all";
  const mediaId = (formData.get("media_id") as string) || null;
  const postUrl = (formData.get("post_url") as string) || null;
  const aiEnabled = formData.get("ai_enabled") === "true";
  const aiPersona = (formData.get("ai_persona") as string) || null;
  const commentReplyEnabled = formData.get("comment_reply_enabled") === "true";
  const commentReplyTemplate =
    (formData.get("comment_reply_template") as string) || null;

  // Validate required fields
  if (!name?.trim()) return { error: "Automation name is required" };
  if (!keyword?.trim()) return { error: "At least one keyword is required" };
  if (!dmTemplate?.trim()) return { error: "DM message template is required" };

  const { error } = await supabase.from("automations").insert({
    user_id: user.id,
    instagram_account_id: igAccounts[0].id,
    name: name.trim(),
    keyword: keyword.trim().toLowerCase(),
    dm_template: dmTemplate.trim(),
    scope_type: scopeType,
    content_type: contentType,
    media_id: mediaId,
    post_url: postUrl,
    ai_enabled: aiEnabled,
    ai_persona: aiPersona,
    comment_reply_enabled: commentReplyEnabled,
    comment_reply_template: commentReplyTemplate,
  });

  if (error) return { error: error.message };

  logActivity(user.id, "automation.created", {
    name,
    keyword,
    scope_type: scopeType,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}

export async function toggleAutomation(
  id: string,
  newStatus: "active" | "paused"
) {
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

  logActivity(user.id, `automation.${newStatus}`, {
    automation_id: id,
  }).catch(() => {});

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

  logActivity(user.id, "automation.deleted", { automation_id: id }).catch(
    () => {}
  );

  revalidatePath("/dashboard/automations");
  return { success: true };
}
