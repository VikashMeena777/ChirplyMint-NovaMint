"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get performance stats per automation: DMs sent, leads captured, conversion rate.
 */
export async function getPerAutomationStats(): Promise<Record<string, unknown>[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch all active/paused automations
  const { data: automations } = await supabase
    .from("automations")
    .select("id, name, keyword, status, trigger_type, created_at")
    .eq("user_id", user.id)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false });

  if (!automations || automations.length === 0) return [];

  const results: Record<string, unknown>[] = [];

  for (const auto of automations) {
    const a = auto as Record<string, unknown>;
    const autoId = a.id as string;

    // Count DMs sent by this automation
    const { count: dmsSent } = await supabase
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("automation_id", autoId)
      .eq("status", "sent");

    // Count DMs failed
    const { count: dmsFailed } = await supabase
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("automation_id", autoId)
      .eq("status", "failed");

    // Count leads from this automation
    const { count: leadsCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source_automation_id", autoId);

    const sent = dmsSent ?? 0;
    const leads = leadsCount ?? 0;
    const conversionRate = sent > 0 ? ((leads / sent) * 100).toFixed(1) : "0";

    results.push({
      id: autoId,
      name: a.name,
      keyword: a.keyword,
      status: a.status,
      trigger_type: a.trigger_type,
      dms_sent: sent,
      dms_failed: dmsFailed ?? 0,
      leads_captured: leads,
      conversion_rate: conversionRate,
      created_at: a.created_at,
    });
  }

  return results;
}
