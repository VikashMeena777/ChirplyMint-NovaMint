"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { resolveWorkspaceScope } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

/**
 * Conversion funnel per automation:
 *   DMs sent → seen → leads captured → interested → contacts captured.
 * All stages already exist in dm_logs / leads — aggregated here.
 */

export interface FunnelStage {
  label: string;
  count: number;
}

export interface AutomationFunnel {
  automationId: string;
  name: string;
  keyword: string;
  stages: FunnelStage[];
}

export async function getConversionFunnel(): Promise<{
  automations: AutomationFunnel[];
  overall: FunnelStage[];
}> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { automations: [], overall: [] };
  const { targetId, client: db } = scope;

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: autos } = await admin
    .from("automations")
    .select("id, name, keyword")
    .eq("user_id", targetId)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false })
    .limit(10);

  const automations: AutomationFunnel[] = [];

  for (const auto of autos || []) {
    const a = auto as Record<string, string>;

    const { count: dmSent } = await admin
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("automation_id", a.id)
      .in("status", ["sent"])
      .gte("created_at", since);

    automations.push({
      automationId: a.id,
      name: a.name,
      keyword: a.keyword,
      stages: [{ label: "DMs sent (30d)", count: dmSent ?? 0 }],
    });
  }

  const { count: totalDMs } = await admin
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
    .eq("status", "sent")
    .gte("created_at", since);

  const { count: totalSeen } = await admin
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
    .eq("status", "sent")
    .not("seen_at", "is", null);

  const { count: totalLeads } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId);

  const { count: totalInterested } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
    .in("engagement", ["interested", "converted"]);

  const { count: totalContacts } = await admin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
    .not("email", "is", null)
    .or("phone.not.is.null");

  const overall: FunnelStage[] = [
    { label: "DMs delivered (30d)", count: totalDMs ?? 0 },
    { label: "Opened / seen", count: totalSeen ?? 0 },
    { label: "Leads captured", count: totalLeads ?? 0 },
    { label: "Interested", count: totalInterested ?? 0 },
    { label: "Contacts captured", count: totalContacts ?? 0 },
  ];

  return { automations, overall };
}
