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
import AnalyticsChartsClient from "@/components/dashboard/analytics-charts-client";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dmsSent = 0;
  let leadsCount = 0;
  let automationCount = 0;

  if (user) {
    const { count: dms } = await supabase
      .from("dm_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    dmsSent = dms ?? 0;

    const { count: leads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    leadsCount = leads ?? 0;

    const { count: autos } = await supabase
      .from("automations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    automationCount = autos ?? 0;
  }

  const conversionRate =
    dmsSent > 0 ? ((leadsCount / dmsSent) * 100).toFixed(1) : "0";

  const dailyDMs = await getDailyDMStats(7);
  const dailyLeads = await getDailyLeadStats(7);
  const topAutomations = await getTopAutomations(5);
  const automationStats = await getPerAutomationStats();

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
    </div>
  );
}
