import {
  MessageCircle,
  Users,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyDMStats,
  getDailyLeadStats,
  getTopAutomations,
} from "@/lib/actions/analytics";
import { getPerAutomationStats } from "@/lib/actions/automation-stats";
import { getConversionFunnel } from "@/lib/actions/funnel";
import AnalyticsChartsClient from "@/components/dashboard/analytics-charts-client";

function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-6 rounded-lg bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-lg flex items-center justify-end px-2 transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        >
          <span className="text-[11px] font-bold text-white">{count}</span>
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dmsSent = 0;
  let leadsCount = 0;
  let automationCount = 0;
  const funnel = await getConversionFunnel();

  // Parallel fetch all analytics data for maximum speed
  const [
    dmsResult,
    leadsResult,
    autosResult,
    dailyDMs,
    dailyLeads,
    topAutomations,
    automationStats,
  ] = await Promise.all([
    user
      ? supabase
          .from("dm_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
    user
      ? supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
    user
      ? supabase
          .from("automations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active")
      : Promise.resolve({ count: 0 }),
    getDailyDMStats(7),
    getDailyLeadStats(7),
    getTopAutomations(5),
    getPerAutomationStats(),
  ]);

  dmsSent = (dmsResult as { count: number | null }).count ?? 0;
  leadsCount = (leadsResult as { count: number | null }).count ?? 0;
  automationCount = (autosResult as { count: number | null }).count ?? 0;

  const conversionRate =
    dmsSent > 0 ? ((leadsCount / dmsSent) * 100).toFixed(1) : "0";

  const stats = [
    {
      label: "Total DMs Sent",
      value: dmsSent,
      icon: MessageCircle,
      color: "oklch(0.52 0.19 162)",
    },
    {
      label: "Total Leads",
      value: leadsCount,
      icon: Users,
      color: "oklch(0.65 0.15 250)",
    },
    {
      label: "Active Automations",
      value: automationCount,
      icon: BarChart3,
      color: "oklch(0.7 0.18 60)",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: "oklch(0.6 0.2 330)",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your automation performance and growth.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-card border border-border p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: `color-mix(in oklch, ${stat.color}, transparent 88%)`,
                }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              {typeof stat.value === "number" && stat.value > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <AnalyticsChartsClient
        dmsSent={dmsSent}
        leadsCount={leadsCount}
        dailyDMs={dailyDMs}
        dailyLeads={dailyLeads}
        topAutomations={topAutomations}
        automationStats={automationStats}
      />

      {/* ── Conversion Funnel (unified pipeline) ── */}
      {funnel.overall.some((st) => st.count > 0) && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
            <h2 className="text-sm font-bold text-foreground">Conversion Funnel</h2>
            <span className="text-[11px] text-muted-foreground">last 30 days</span>
          </div>
          <div className="space-y-2">
            {funnel.overall.map((st: { label: string; count: number }, i: number) => (
              <FunnelBar
                key={st.label}
                label={st.label}
                count={st.count}
                max={funnel.overall[0]?.count || 1}
                color={`oklch(0.52 0.19 ${162 + i * 12})`}
              />
            ))}
          </div>
          {(funnel.overall[0]?.count ?? 0) > 0 && (funnel.overall[4]?.count ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              {Math.round((funnel.overall[4].count / funnel.overall[0].count) * 1000) / 10}% of delivered DMs turn into captured contacts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
