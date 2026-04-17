import {
  Bot,
  MessageCircle,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardStats();

  const stats = [
    {
      label: "Active Automations",
      value: data?.stats.activeAutomations ?? 0,
      icon: Bot,
      color: "oklch(0.52 0.19 162)",
      bgColor: "oklch(0.52 0.19 162 / 10%)",
    },
    {
      label: "DMs Sent This Month",
      value: data?.stats.dmsSentThisMonth ?? 0,
      icon: MessageCircle,
      color: "oklch(0.65 0.15 250)",
      bgColor: "oklch(0.65 0.15 250 / 10%)",
    },
    {
      label: "Total Leads",
      value: data?.stats.totalLeads ?? 0,
      icon: Users,
      color: "oklch(0.7 0.18 60)",
      bgColor: "oklch(0.7 0.18 60 / 10%)",
    },
    {
      label: "Conversion Rate",
      value:
        data && data.stats.dmsSentThisMonth > 0
          ? `${Math.round((data.stats.totalLeads / data.stats.dmsSentThisMonth) * 100)}%`
          : "—",
      icon: TrendingUp,
      color: "oklch(0.6 0.2 330)",
      bgColor: "oklch(0.6 0.2 330 / 10%)",
    },
  ];

  const quickActions = [
    {
      label: "New Automation",
      href: "/dashboard/automations",
      icon: Plus,
      description: "Set up keyword triggers & auto DMs",
    },
    {
      label: "View Messages",
      href: "/dashboard/messages",
      icon: MessageCircle,
      description: "See recent DM conversations",
    },
    {
      label: "Connect Instagram",
      href: "/dashboard/settings",
      icon: Zap,
      description: "Link your IG account",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{data?.user.name ? `, ${data.user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your automations.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions + Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border hover:border-[oklch(0.52_0.19_162/40%)] hover:shadow-md transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center group-hover:bg-[oklch(0.52_0.19_162/15%)] transition-colors">
                  <action.icon className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Plan Card */}
        <div className="rounded-2xl bg-gradient-to-br from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] p-6 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">
                {(data?.user.plan ?? "free").charAt(0).toUpperCase() +
                  (data?.user.plan ?? "free").slice(1)}{" "}
                Plan
              </span>
            </div>
            <p className="text-lg font-bold">
              {data?.stats.dmsSentThisMonth ?? 0} / {data?.user.dmLimit ?? 100} DMs
            </p>
            <p className="text-sm opacity-80 mt-1">used this month</p>
            {/* Progress bar */}
            <div className="mt-3 w-full h-2 rounded-full bg-card/20">
              <div
                className="h-full rounded-full bg-card transition-all"
                style={{
                  width: `${Math.min(
                    ((data?.stats.dmsSentThisMonth ?? 0) /
                      (data?.user.dmLimit ?? 100)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
          {data?.user.plan === "free" && (
            <Link
              href="/dashboard/settings"
              className="mt-4 flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all"
            >
              Upgrade to Pro <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
        <div className="rounded-2xl bg-card border border-border shadow-sm divide-y divide-border">
          {(data?.recentActivity ?? []).length > 0 ? (
            (data?.recentActivity ?? []).map(
              (activity: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="w-8 h-8 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.action as string}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at as string).toLocaleString()}
                    </p>
                  </div>
                </div>
              )
            )
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start by creating your first automation!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
