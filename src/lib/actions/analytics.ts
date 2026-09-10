"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext, getWorkspaceAdminClient } from "@/lib/workspace";

export async function getDailyDMStats(days = 7) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Shared workspace: members read the owner's analytics.
  const ws = await getWorkspaceContext();
  const targetId = ws?.workspaceUserId ?? user.id;
  const dbClient = targetId !== user.id ? getWorkspaceAdminClient() : supabase;

  const results: { day: string; label: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { count } = await dbClient
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetId)
      .gte("sent_at", start.toISOString())
      .lt("sent_at", end.toISOString());

    results.push({
      day: start.toISOString(),
      label: start.toLocaleDateString("en", { weekday: "short" }),
      count: count ?? 0,
    });
  }

  return results;
}

export async function getDailyLeadStats(days = 7) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Shared workspace: members read the owner's analytics.
  const ws = await getWorkspaceContext();
  const targetId = ws?.workspaceUserId ?? user.id;
  const dbClient = targetId !== user.id ? getWorkspaceAdminClient() : supabase;

  const results: { day: string; label: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { count } = await dbClient
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetId)
      .gte("captured_at", start.toISOString())
      .lt("captured_at", end.toISOString());

    results.push({
      day: start.toISOString(),
      label: start.toLocaleDateString("en", { weekday: "short" }),
      count: count ?? 0,
    });
  }

  return results;
}

export async function getTopAutomations(limit = 3) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Shared workspace: members read the owner's analytics.
  const ws = await getWorkspaceContext();
  const targetId = ws?.workspaceUserId ?? user.id;
  const dbClient = targetId !== user.id ? getWorkspaceAdminClient() : supabase;

  // Get active automations with their DM counts
  const { data: automations } = await dbClient
      .from("automations")
    .select("id, name, keyword, status")
    .eq("user_id", targetId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!automations || automations.length === 0) return [];

  const results: { name: string; keyword: string; dmCount: number; status: string }[] = [];

  for (const auto of automations) {
    const { count } = await dbClient
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("automation_id", auto.id);

    results.push({
      name: auto.name as string,
      keyword: auto.keyword as string,
      dmCount: count ?? 0,
      status: auto.status as string,
    });
  }

  // Sort by DM count descending
  results.sort((a, b) => b.dmCount - a.dmCount);
  return results.slice(0, limit);
}
