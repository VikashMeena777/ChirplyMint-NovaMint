"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";

export interface ABVariant {
  id: string;
  automation_id: string;
  variant_name: string;
  dm_template: string;
  template_type: string;
  template_title: string | null;
  template_subtitle: string | null;
  template_image_url: string | null;
  template_buttons: unknown[];
  sends: number;
  replies: number;
  link_clicks: number;
  is_winner: boolean;
  status: string;
  created_at: string;
}

/**
 * Get all A/B test variants for an automation
 */
export async function getABVariants(automationId: string): Promise<ABVariant[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("ab_test_variants")
    .select("*")
    .eq("automation_id", automationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data as unknown as ABVariant[]) || [];
}

/**
 * Create an A/B test variant for an automation
 */
export async function createABVariant(
  automationId: string,
  variant: {
    variant_name: string;
    dm_template: string;
    template_type?: string;
    template_title?: string;
    template_subtitle?: string;
    template_image_url?: string;
    template_buttons?: unknown[];
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Max 3 variants per automation
  const { count } = await supabase
    .from("ab_test_variants")
    .select("*", { count: "exact", head: true })
    .eq("automation_id", automationId)
    .eq("user_id", user.id);

  if ((count ?? 0) >= 3) {
    return { success: false, error: "Maximum 3 variants allowed per automation" };
  }

  const { error } = await supabase.from("ab_test_variants").insert({
    automation_id: automationId,
    user_id: user.id,
    variant_name: variant.variant_name,
    dm_template: variant.dm_template,
    template_type: variant.template_type || "text",
    template_title: variant.template_title || null,
    template_subtitle: variant.template_subtitle || null,
    template_image_url: variant.template_image_url || null,
    template_buttons: variant.template_buttons || [],
  });

  if (error) return { success: false, error: error.message };

  logActivity(user.id, "ab_test.variant_created", {
    automation_id: automationId,
    variant_name: variant.variant_name,
  }).catch(() => {});

  return { success: true };
}

/**
 * Delete an A/B variant
 */
export async function deleteABVariant(
  variantId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("ab_test_variants")
    .delete()
    .eq("id", variantId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  logActivity(user.id, "ab_test.variant_deleted", {
    variant_id: variantId,
  }).catch(() => {});

  return { success: true };
}

/**
 * Declare a winner variant
 */
export async function declareABWinner(
  automationId: string,
  winnerVariantId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Reset all variants
  await supabase
    .from("ab_test_variants")
    .update({ is_winner: false, status: "completed" })
    .eq("automation_id", automationId)
    .eq("user_id", user.id);

  // Set the winner
  const { error } = await supabase
    .from("ab_test_variants")
    .update({ is_winner: true, status: "winner" })
    .eq("id", winnerVariantId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  // Get the winner variant's template and apply to the automation
  const { data: winner } = await supabase
    .from("ab_test_variants")
    .select("dm_template, template_type, template_title, template_subtitle, template_image_url, template_buttons")
    .eq("id", winnerVariantId)
    .single();

  if (winner) {
    await supabase
      .from("automations")
      .update({
        dm_template: (winner as Record<string, unknown>).dm_template,
        template_type: (winner as Record<string, unknown>).template_type,
        template_title: (winner as Record<string, unknown>).template_title,
        template_subtitle: (winner as Record<string, unknown>).template_subtitle,
        template_image_url: (winner as Record<string, unknown>).template_image_url,
        template_buttons: (winner as Record<string, unknown>).template_buttons,
      })
      .eq("id", automationId)
      .eq("user_id", user.id);
  }

  logActivity(user.id, "ab_test.winner_declared", {
    automation_id: automationId,
    winner_variant_id: winnerVariantId,
  }).catch(() => {});

  return { success: true };
}

/**
 * Pick a random variant for sending (used by webhook handler).
 * Returns the variant's template data or null if no AB test is active.
 */
export async function pickABVariant(automationId: string): Promise<ABVariant | null> {
  const supabase = await createClient();

  const { data: variants } = await supabase
    .from("ab_test_variants")
    .select("*")
    .eq("automation_id", automationId)
    .eq("status", "running");

  if (!variants || variants.length === 0) return null;

  // Random selection
  const picked = variants[Math.floor(Math.random() * variants.length)];

  // Increment sends counter (fire-and-forget)
  supabase
    .from("ab_test_variants")
    .update({ sends: ((picked as Record<string, unknown>).sends as number || 0) + 1 })
    .eq("id", (picked as Record<string, unknown>).id)
    .then(() => {});

  return picked as unknown as ABVariant;
}
