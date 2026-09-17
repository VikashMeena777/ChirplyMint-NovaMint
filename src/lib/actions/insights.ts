"use server";

import { canAccessABTesting } from "@/lib/utils/plan-limits";
import { getSelectedIgAccountId } from "@/lib/actions/account-context";
import { resolveWorkspaceScope } from "@/lib/workspace";
import { getUserPlan } from "@/lib/actions/dashboard";
import { createClient } from "@/lib/supabase/server";

export interface InsightData {
  // Engagement leaderboard
  topEngagers: { username: string; dmCount: number; lastActive: string }[];
  // Peak hours heatmap (0-23)
  peakHours: { hour: number; count: number }[];
  // Top trigger keywords
  topKeywords: { keyword: string; count: number; conversionRate: number }[];
  // Source breakdown
  sourceBreakdown: { source: string; count: number; percentage: number }[];
  // Summary stats
  totalDMs: number;
  totalLeads: number;
  avgResponseTime: string;
  bestDay: string;
  // Daily trend (30 days)
  dailyTrend: { date: string; dms: number; leads: number }[];
}

/**
 * Get audience insights for the logged-in user
 */
function emptyInsightsForStarter(): InsightData {
  return {
    topEngagers: [],
    peakHours: [],
    topKeywords: [],
    sourceBreakdown: [],
    totalDMs: 0,
    totalLeads: 0,
    avgResponseTime: "—",
    bestDay: "—",
    dailyTrend: [],
  };
}

export async function getAudienceInsights(): Promise<InsightData> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return emptyInsightsForStarter();
  const { targetId, client: db } = scope;

  const accountId = await getSelectedIgAccountId(targetId);
  // Insights is a Pro+ feature — return the empty dataset for Starter.
  // (canAccessABTesting is the same pro+ rule; reusing it keeps the helper
  // set small. The UI shows the upgrade gate.)
  const plan = await getUserPlan();
  if (!canAccessABTesting(plan)) return emptyInsightsForStarter();

  const empty: InsightData = {
    topEngagers: [],
    peakHours: [],
    topKeywords: [],
    sourceBreakdown: [],
    totalDMs: 0,
    totalLeads: 0,
    avgResponseTime: "N/A",
    bestDay: "N/A",
    dailyTrend: [],
  };


  // ── Total DMs ──
  const { count: totalDMs } = await db
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
    .eq("status", "sent");

  // ── Total Leads ──
  const { count: totalLeads } = await db
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId);

  // ── Top Engagers (users who received the most DMs) ──
  const { data: dmLogs } = await db
    .from("dm_logs")
    .select("recipient_username, sent_at")
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(500);

  const engagerMap = new Map<string, { count: number; lastActive: string }>();
  for (const log of dmLogs || []) {
    const username = (log.recipient_username as string) || "unknown";
    const existing = engagerMap.get(username);
    if (existing) {
      existing.count++;
    } else {
      engagerMap.set(username, {
        count: 1,
        lastActive: log.sent_at as string,
      });
    }
  }

  const topEngagers = Array.from(engagerMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([username, data]) => ({
      username,
      dmCount: data.count,
      lastActive: data.lastActive,
    }));

  // ── Peak Hours ──
  const hourCounts = new Array(24).fill(0);
  for (const log of dmLogs || []) {
    const hour = new Date(log.sent_at as string).getHours();
    hourCounts[hour]++;
  }
  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

  // ── Top Keywords ──
  const { data: automations } = await db
    .from("automations")
    .select("id, keyword, dms_sent, leads_captured")
    .eq("user_id", targetId)
    .not("keyword", "is", null);

  const topKeywords = (automations || [])
    .filter((a) => a.keyword)
    .map((a) => ({
      keyword: a.keyword as string,
      count: (a.dms_sent as number) || 0,
      conversionRate:
        (a.dms_sent as number) > 0
          ? Math.round(((a.leads_captured as number) / (a.dms_sent as number)) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Source Breakdown ──
  const { data: leads } = await db
    .from("leads")
    .select("source")
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId);

  const sourceMap = new Map<string, number>();
  for (const lead of leads || []) {
    const source = (lead.source as string) || "unknown";
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  }
  const totalLeadCount = totalLeads ?? 0;
  const sourceBreakdown = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalLeadCount > 0 ? Math.round((count / totalLeadCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Best Day ──
  const dayCounts = new Map<string, number>();
  for (const log of dmLogs || []) {
    const dayName = new Date(log.sent_at as string).toLocaleDateString("en", { weekday: "long" });
    dayCounts.set(dayName, (dayCounts.get(dayName) || 0) + 1);
  }
  let bestDay = "N/A";
  let maxDayCount = 0;
  for (const [day, count] of dayCounts) {
    if (count > maxDayCount) {
      maxDayCount = count;
      bestDay = day;
    }
  }

  // ── 30-Day Trend ──
  const dailyTrend: { date: string; dms: number; leads: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const { count: dayDMs } = await db
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
      .eq("status", "sent")
      .gte("sent_at", start.toISOString())
      .lt("sent_at", end.toISOString());

    const { count: dayLeads } = await db
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
      .gte("captured_at", start.toISOString())
      .lt("captured_at", end.toISOString());

    dailyTrend.push({
      date: start.toLocaleDateString("en", { month: "short", day: "numeric" }),
      dms: dayDMs ?? 0,
      leads: dayLeads ?? 0,
    });
  }

  return {
    topEngagers,
    peakHours,
    topKeywords,
    sourceBreakdown,
    totalDMs: totalDMs ?? 0,
    totalLeads: totalLeadCount,
    avgResponseTime: "< 3s",
    bestDay,
    dailyTrend,
  };
}
