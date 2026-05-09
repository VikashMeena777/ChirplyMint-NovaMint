"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { canCreateAutomation, type PlanKey } from "@/lib/utils/plan-limits";
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

  // ── PLAN LIMIT CHECK: Automation count ──
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const userPlan = ((profile?.plan as string) || "free") as PlanKey;

  const { count: activeAutomationCount } = await supabase
    .from("automations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["active", "paused"]);

  const automationCheck = canCreateAutomation(userPlan, activeAutomationCount ?? 0);
  if (!automationCheck.allowed) {
    return {
      error: `You've reached your plan limit of ${automationCheck.limit} automation(s). Upgrade your plan to create more.`,
    };
  }

  // Check if user has an instagram account connected
  const { data: igAccounts } = await supabase
    .from("instagram_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!igAccounts || igAccounts.length === 0) {
    return { error: "Please connect an Instagram account first in Settings." };
  }

  // Determine which account to use — explicit selection or fallback to first
  const selectedAccountId = (formData.get("instagram_account_id") as string) || null;
  let targetAccountId = (igAccounts[0] as Record<string, string>).id;

  if (selectedAccountId) {
    // Validate that the selected account belongs to this user
    const validAccount = igAccounts.find(
      (a: Record<string, string>) => a.id === selectedAccountId
    );
    if (validAccount) {
      targetAccountId = selectedAccountId;
    }
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

  // New fields: Follow-for-DM toggle
  const requireFollow = formData.get("require_follow") === "true";

  // New fields: Button template
  const templateType = (formData.get("template_type") as string) || "text";
  const templateTitle = (formData.get("template_title") as string) || null;
  const templateSubtitle = (formData.get("template_subtitle") as string) || null;
  const templateImageUrl = (formData.get("template_image_url") as string) || null;
  const templateButtonsRaw = formData.get("template_buttons") as string;
  let templateButtons: unknown[] = [];
  try {
    if (templateButtonsRaw) templateButtons = JSON.parse(templateButtonsRaw);
  } catch {
    // Ignore parse errors — use empty array
  }

  // New field: Trigger type (comment_trigger, story_reply, both)
  const triggerType = (formData.get("trigger_type") as string) || "comment_trigger";

  // Validate required fields
  if (!name?.trim()) return { error: "Automation name is required" };
  if (!keyword?.trim()) return { error: "At least one keyword is required" };
  if (!dmTemplate?.trim() && templateType === "text")
    return { error: "DM message template is required" };
  if (templateType === "button" && !templateTitle?.trim())
    return { error: "Template title is required for button templates" };

  // ── DUPLICATE KEYWORD CHECK ──
  // Prevent two automations from triggering on the same keyword for the same IG account
  const keywordsToCheck = keyword.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean);
  const { data: existingAutomations } = await supabase
    .from("automations")
    .select("id, name, keyword")
    .eq("user_id", user.id)
    .eq("instagram_account_id", targetAccountId)
    .in("status", ["active", "paused"]);

  if (existingAutomations) {
    for (const existing of existingAutomations) {
      const e = existing as Record<string, string>;
      const existingKeywords = (e.keyword || "").split(",").map((k: string) => k.trim().toLowerCase());
      const duplicates = keywordsToCheck.filter((k: string) => existingKeywords.includes(k));
      if (duplicates.length > 0) {
        return {
          error: `The keyword "${duplicates[0]}" is already used by automation "${e.name}". Each keyword must be unique per Instagram account.`,
        };
      }
    }
  }

  const { data: inserted, error } = await supabase.from("automations").insert({
    user_id: user.id,
    instagram_account_id: targetAccountId,
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
    require_follow: requireFollow,
    template_type: templateType,
    template_title: templateTitle,
    template_subtitle: templateSubtitle,
    template_image_url: templateImageUrl,
    template_buttons: templateButtons,
    trigger_type: triggerType,
  }).select("id").single();

  if (error) return { error: error.message };

  logActivity(user.id, "automation.created", {
    name,
    keyword,
    scope_type: scopeType,
    require_follow: requireFollow,
    template_type: templateType,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true, id: (inserted as Record<string, string>)?.id };
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
