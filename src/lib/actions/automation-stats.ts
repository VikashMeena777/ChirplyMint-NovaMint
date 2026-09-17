"use server";

import { createClient } from "@/lib/supabase/server";
import { getSelectedIgAccountId } from "@/lib/actions/account-context";
import { resolveWorkspaceScope } from "@/lib/workspace";

export interface AutomationStat {
  automationId: string;
  automationName: string;
  keyword: string;
  dmsSent: number;
  dmsFailed: number;
  leadsCapture: number;
  conversionRate: string;
}

/**
 * Get performance stats per automation: DMs sent, leads captured, conversion rate.
 */
export async function getPerAutomationStats(): Promise<AutomationStat[]> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return [];
  const { targetId, client: db } = scope;

  const accountId = await getSelectedIgAccountId(targetId);
  // Fetch all active/paused automations
  const { data: automations } = await db
    .from("automations")
    .select("id, name, keyword, status, trigger_type, created_at")
    .eq("user_id", targetId)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false });

  if (!automations || automations.length === 0) return [];

  const results: AutomationStat[] = [];

  for (const auto of automations) {
    const a = auto as Record<string, unknown>;
    const autoId = a.id as string;

    // Count DMs sent by this automation
    const { count: dmsSent } = await db
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
      .eq("automation_id", autoId)
      .eq("status", "sent");

    // Count DMs failed
    const { count: dmsFailed } = await db
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
      .eq("automation_id", autoId)
      .eq("status", "failed");

    // Count leads from this automation
    const { count: leadsCount } = await db
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
      .eq("automation_id", autoId);

    const sent = dmsSent ?? 0;
    const leads = leadsCount ?? 0;
    const conversionRate = sent > 0 ? ((leads / sent) * 100).toFixed(1) : "0";

    results.push({
      automationId: autoId,
      automationName: (a.name as string) || "Untitled",
      keyword: (a.keyword as string) || "",
      dmsSent: sent,
      dmsFailed: dmsFailed ?? 0,
      leadsCapture: leads,
      conversionRate,
    });
  }

  return results;
}
