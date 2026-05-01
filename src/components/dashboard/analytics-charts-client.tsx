"use client";

import dynamic from "next/dynamic";
import {
  MessageCircle,
  Users,
  Bot,
  BarChart3,
  Zap,
} from "lucide-react";

// Lazy-load heavy recharts components
const AnalyticsAreaChart = dynamic(
  () =>
    import("@/components/dashboard/analytics-charts").then(
      (m) => m.AnalyticsAreaChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full rounded-lg bg-muted/30 animate-pulse" />
    ),
  }
);

interface ChartDataPoint {
  label: string;
  count: number;
}

interface TopAutomation {
  name: string;
  keyword: string;
  dmCount: number;
  status: string;
}

interface AnalyticsChartsClientProps {
  dmsSent: number;
  leadsCount: number;
  dailyDMs: ChartDataPoint[];
  dailyLeads: ChartDataPoint[];
  topAutomations: TopAutomation[];
}

export default function AnalyticsChartsClient({
  dmsSent,
  leadsCount,
  dailyDMs,
  dailyLeads,
  topAutomations,
}: AnalyticsChartsClientProps) {
  return (
    <>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DMs Chart */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              DMs Sent (Last 7 Days)
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.52_0.19_162)]" />
              DMs
            </div>
          </div>
          {dmsSent === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No DMs sent yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start sending DMs to see your trends here.
              </p>
            </div>
          ) : (
            <AnalyticsAreaChart
              data={dailyDMs}
              color="oklch(0.52 0.19 162)"
              gradientId="dmGradient"
            />
          )}
        </div>

        {/* Leads Chart */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Leads Captured (Last 7 Days)
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.65_0.15_250)]" />
              Leads
            </div>
          </div>
          {leadsCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.65_0.15_250/10%)] flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-[oklch(0.65_0.15_250)]" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No leads captured yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                They&apos;ll appear once automations run.
              </p>
            </div>
          ) : (
            <AnalyticsAreaChart
              data={dailyLeads}
              color="oklch(0.65 0.15 250)"
              gradientId="leadsGradient"
            />
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
                        className="h-full rounded-full bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] transition-all duration-700"
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
    </>
  );
}
