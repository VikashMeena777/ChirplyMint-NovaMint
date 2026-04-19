"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

export interface PostbackFlow {
  id: string;
  user_id: string;
  automation_id: string;
  payload: string;
  label: string;
  response_type: "text" | "button";
  response_text: string | null;
  response_template_title: string | null;
  response_template_subtitle: string | null;
  response_template_image_url: string | null;
  response_template_buttons: {
    type: "web_url";
    title: string;
    url?: string;
  }[];
  lead_tag: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Get all postback flows for an automation.
 */
export async function getPostbackFlows(automationId: string): Promise<{
  data: PostbackFlow[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("postback_flows")
    .select("*")
    .eq("automation_id", automationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return { data: (data as PostbackFlow[]) ?? [], error: error?.message };
}

/**
 * Save postback flows for an automation (bulk upsert).
 * Deletes existing flows and inserts the new set.
 */
export async function savePostbackFlows(
  automationId: string,
  flows: Omit<PostbackFlow, "id" | "user_id" | "automation_id" | "is_active" | "created_at">[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the automation belongs to this user
  const { data: automation } = await supabase
    .from("automations")
    .select("id")
    .eq("id", automationId)
    .eq("user_id", user.id)
    .single();

  if (!automation) return { error: "Automation not found" };

  // Validate flows
  for (const flow of flows) {
    if (!flow.payload?.trim()) return { error: "Each flow needs a payload identifier" };
    if (!flow.label?.trim()) return { error: "Each flow needs a label" };
    if (flow.response_type === "text" && !flow.response_text?.trim()) {
      return { error: `Flow "${flow.label}" needs response text` };
    }
    if (flow.response_type === "button" && !flow.response_template_title?.trim()) {
      return { error: `Flow "${flow.label}" needs a template title` };
    }
  }

  // Check for duplicate payloads
  const payloads = flows.map((f) => f.payload.trim().toLowerCase());
  const uniquePayloads = new Set(payloads);
  if (uniquePayloads.size !== payloads.length) {
    return { error: "Each flow must have a unique payload identifier" };
  }

  // Delete existing flows for this automation
  await supabase
    .from("postback_flows")
    .delete()
    .eq("automation_id", automationId)
    .eq("user_id", user.id);

  // Insert new flows
  if (flows.length > 0) {
    const rows = flows.map((flow) => ({
      user_id: user.id,
      automation_id: automationId,
      payload: flow.payload.trim().toLowerCase(),
      label: flow.label.trim(),
      response_type: flow.response_type,
      response_text: flow.response_text,
      response_template_title: flow.response_template_title,
      response_template_subtitle: flow.response_template_subtitle,
      response_template_image_url: flow.response_template_image_url,
      response_template_buttons: flow.response_template_buttons || [],
      lead_tag: flow.lead_tag?.trim() || null,
    }));

    const { error } = await supabase.from("postback_flows").insert(rows);
    if (error) return { error: error.message };
  }

  logActivity(user.id, "postback_flows.saved", {
    automation_id: automationId,
    flow_count: flows.length,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}

/**
 * Delete all postback flows for an automation.
 */
export async function deletePostbackFlows(
  automationId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("postback_flows")
    .delete()
    .eq("automation_id", automationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/automations");
  return { success: true };
}
