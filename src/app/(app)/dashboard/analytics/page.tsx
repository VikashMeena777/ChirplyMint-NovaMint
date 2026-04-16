import {
  MessageCircle,
  Users,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

  const stats = [
    {
      label: "Total DMs Sent",
      value: dmsSent,
      icon: MessageCircle,
      change: "+0%",
      color: "oklch(0.52 0.19 162)",
    },
    {
      label: "Total Leads",
      value: leadsCount,
      icon: Users,
      change: "+0%",
      color: "oklch(0.65 0.15 250)",
    },
    {
      label: "Active Automations",
      value: automationCount,
      icon: BarChart3,
      change: "",
      color: "oklch(0.7 0.18 60)",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      change: "",
      color: "oklch(0.6 0.2 330)",
    },
  ];

  // Build last 7-day placeholder chart
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en", { weekday: "short" });
  });

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
            className="rounded-2xl bg-white border border-border p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color} / 10%`.replace(" / ", "/") }}
              >
                <stat.icon
                  className="w-5 h-5"
                  style={{ color: stat.color }}
                />
              </div>
              {stat.change && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-2xl bg-white border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          DMs Sent (Last 7 Days)
        </h2>
        <div className="flex items-end gap-2 h-48">
          {days.map((day, i) => {
            const height = Math.max(8, Math.random() * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[oklch(0.52_0.19_162)] to-[oklch(0.52_0.19_162/60%)] transition-all"
                  style={{ height: `${dmsSent > 0 ? height : 8}%` }}
                />
                <span className="text-xs text-muted-foreground">{day}</span>
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

      {/* Top Automations placeholder */}
      <div className="rounded-2xl bg-white border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Top Performing Automations
        </h2>
        {automationCount === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No automations yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first automation to see performance data.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Performance data will appear once automations start sending DMs.
          </p>
        )}
      </div>
    </div>
  );
}
