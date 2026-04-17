import {
  MessageCircle,
  Users,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  Bot,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyDMStats,
  getDailyLeadStats,
  getTopAutomations,
} from "@/lib/actions/analytics";

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

  // Fetch real chart data
  const dailyDMs = await getDailyDMStats(7);
  const dailyLeads = await getDailyLeadStats(7);
  const topAutomations = await getTopAutomations(5);

  const maxDM = Math.max(...dailyDMs.map((d) => d.count), 1);
  const maxLead = Math.max(...dailyLeads.map((d) => d.count), 1);

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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DMs Chart */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            DMs Sent (Last 7 Days)
          </h2>
          <div className="flex items-end gap-2 h-48">
            {dailyDMs.map((day, i) => {
              const height =
                dmsSent > 0
                  ? Math.max(8, (day.count / maxDM) * 100)
                  : 8;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[oklch(0.52_0.19_162)] to-[oklch(0.52_0.19_162/60%)] transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          {dmsSent === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              No data yet — start sending DMs to see your trends here.
            </p>
          )}
        </div>

        {/* Leads Chart */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Leads Captured (Last 7 Days)
          </h2>
          <div className="flex items-end gap-2 h-48">
            {dailyLeads.map((day, i) => {
              const height =
                leadsCount > 0
                  ? Math.max(8, (day.count / maxLead) * 100)
                  : 8;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[oklch(0.65_0.15_250)] to-[oklch(0.65_0.15_250/60%)] transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          {leadsCount === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              No leads captured yet — they&apos;ll appear once automations run.
            </p>
          )}
        </div>
      </div>

      {/* Top Performing Automations */}
      <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Top Performing Automations
        </h2>
        {topAutomations.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No automations yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first automation to see performance data.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topAutomations.map((auto, i) => {
              const barWidth =
                topAutomations[0].dmCount > 0
                  ? Math.max(5, (auto.dmCount / topAutomations[0].dmCount) * 100)
                  : 5;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[oklch(0.52_0.19_162)]">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {auto.name}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            auto.status === "active"
                              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {auto.status}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {auto.dmCount} DMs
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Zap className="w-3 h-3 inline mr-0.5" />
                      Keyword: &ldquo;{auto.keyword}&rdquo;
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
