import {
  BarChart3,
  Clock,
  Crown,
  Hash,
  PieChart,
  TrendingUp,
  Users,
  Zap,
  MessageCircle,
  CalendarDays,
} from "lucide-react";
import { getAudienceInsights } from "@/lib/actions/insights";
import { FadeInSection, AnimatedBar } from "@/components/dashboard/animated-insights";
import InsightsTrendChart from "@/components/dashboard/insights-trend-chart";

export default async function InsightsPage() {
  const insights = await getAudienceInsights();
  const maxHourCount = Math.max(...insights.peakHours.map((h) => h.count), 1);

  const hourLabels = [
    "12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a",
    "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[oklch(0.52_0.19_162)]" />
          Audience Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deep analytics about your audience, engagement patterns, and performance.
        </p>
      </div>

      {/* Summary Stats Cards */}
      <FadeInSection delay={100} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total DMs Sent",
            value: insights.totalDMs.toLocaleString(),
            icon: MessageCircle,
            color: "oklch(0.52 0.19 162)",
          },
          {
            label: "Total Leads",
            value: insights.totalLeads.toLocaleString(),
            icon: Users,
            color: "oklch(0.65 0.15 250)",
          },
          {
            label: "Avg Response Time",
            value: insights.avgResponseTime,
            icon: Clock,
            color: "oklch(0.7 0.18 60)",
          },
          {
            label: "Best Day",
            value: insights.bestDay,
            icon: CalendarDays,
            color: "oklch(0.6 0.2 330)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-card border border-border p-5 shadow-sm"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{
                backgroundColor: `color-mix(in oklch, ${stat.color}, transparent 88%)`,
              }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </FadeInSection>

      {/* Grid: Peak Hours + Top Keywords */}
      <FadeInSection delay={300} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Heatmap */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Peak Activity Hours
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            When your audience is most active (based on DM timestamps)
          </p>

          {insights.totalDMs === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No data yet — start sending DMs to see peak hours.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-1">
              {insights.peakHours.map((h) => {
                const intensity = maxHourCount > 0 ? h.count / maxHourCount : 0;
                const bg =
                  intensity === 0
                    ? "bg-muted/30"
                    : intensity < 0.25
                      ? "bg-emerald-100 dark:bg-emerald-950/30"
                      : intensity < 0.5
                        ? "bg-emerald-300 dark:bg-emerald-800/50"
                        : intensity < 0.75
                          ? "bg-emerald-500 dark:bg-emerald-600"
                          : "bg-emerald-700 dark:bg-emerald-500";

                return (
                  <div key={h.hour} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-full aspect-square rounded-md ${bg} transition-colors`}
                      title={`${hourLabels[h.hour]}: ${h.count} DMs`}
                    />
                    {h.hour % 3 === 0 && (
                      <span className="text-[9px] text-muted-foreground">
                        {hourLabels[h.hour]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Keywords */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <Hash className="w-5 h-5 text-purple-500" />
            Top Trigger Keywords
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Keywords that drive the most engagement
          </p>

          {insights.topKeywords.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No keyword data yet — create automations with keywords.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.topKeywords.map((kw, i) => {
                const maxKW = insights.topKeywords[0]?.count || 1;
                const barWidth = Math.max(5, (kw.count / maxKW) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          &ldquo;{kw.keyword}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {kw.conversionRate}% conv.
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {kw.count}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted/50">
                      <AnimatedBar
                          width={`${barWidth}%`}
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500"
                          delay={i * 80}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FadeInSection>

      {/* Engagement Leaderboard */}
      <FadeInSection delay={500} className="rounded-2xl bg-card border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Top Engagers
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Users who interact with your automations the most
        </p>

        {insights.topEngagers.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No engagers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Data will appear after DMs are sent.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.topEngagers.map((engager, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    i === 0
                      ? "bg-amber-100 dark:bg-amber-950/40"
                      : i === 1
                        ? "bg-gray-200 dark:bg-gray-800"
                        : i === 2
                          ? "bg-orange-100 dark:bg-orange-950/40"
                          : "bg-muted"
                  }`}
                >
                  {i < 3 ? (
                    <Crown
                      className={`w-4 h-4 ${
                        i === 0
                          ? "text-amber-500"
                          : i === 1
                            ? "text-gray-500"
                            : "text-orange-500"
                      }`}
                    />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    @{engager.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {engager.dmCount} interactions
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(engager.lastActive).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </FadeInSection>

      {/* Source Breakdown + 30-Day Trend */}
      <FadeInSection delay={700} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Breakdown */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" />
            Lead Sources
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Where your leads come from
          </p>

          {insights.sourceBreakdown.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No lead data yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.sourceBreakdown.map((src, i) => {
                const colors = [
                  "bg-emerald-500",
                  "bg-blue-500",
                  "bg-purple-500",
                  "bg-amber-500",
                  "bg-pink-500",
                ];
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${colors[i % colors.length]} shrink-0`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">
                          {src.source}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {src.count} ({src.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted/50 mt-1">
                        <AnimatedBar
                          width={`${src.percentage}%`}
                          className={`h-full rounded-full ${colors[i % colors.length]}`}
                          delay={i * 100}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 30-Day Trend */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            30-Day Growth Trend
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            DMs sent and leads captured over the last 30 days
          </p>

          {insights.totalDMs === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No data yet — your growth chart will appear here.
              </p>
            </div>
          ) : (
            <InsightsTrendChart data={insights.dailyTrend} />
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[oklch(0.52_0.19_162)]" />
              <span className="text-xs text-muted-foreground">DMs Sent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[oklch(0.65_0.15_250)]" />
              <span className="text-xs text-muted-foreground">Leads Captured</span>
            </div>
          </div>
        </div>
      </FadeInSection>
    </div>
  );
}
