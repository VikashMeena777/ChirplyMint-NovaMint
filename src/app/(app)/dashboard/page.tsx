import {
  Bot,
  MessageCircle,
  Users,
  TrendingUp,
  ArrowRight,
  Zap,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { getSetupStatus } from "@/lib/actions/setup";
import { getRateLimitStatus } from "@/lib/actions/instagram-api";
import { SetupChecklist } from "@/components/setup-checklist";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import {
  AnimatedStatGrid,
  AnimatedPlanCard,
  AnimatedQuickActions,
} from "@/components/dashboard/animated-widgets";

export default async function DashboardPage() {
  const [data, setupStatus, rateLimit] = await Promise.all([
    getDashboardStats(),
    getSetupStatus(),
    getRateLimitStatus(),
  ]);

  const stats = [
    {
      label: "Active Automations",
      value: data?.stats.activeAutomations ?? 0,
      icon: <Bot className="w-5 h-5" style={{ color: "oklch(0.52 0.19 162)" }} />,
      color: "oklch(0.52 0.19 162)",
      bgColor: "oklch(0.52 0.19 162 / 10%)",
    },
    {
      label: "DMs Sent This Month",
      value: data?.stats.dmsSentThisMonth ?? 0,
      icon: <MessageCircle className="w-5 h-5" style={{ color: "oklch(0.65 0.15 250)" }} />,
      color: "oklch(0.65 0.15 250)",
      bgColor: "oklch(0.65 0.15 250 / 10%)",
    },
    {
      label: "Total Leads",
      value: data?.stats.totalLeads ?? 0,
      icon: <Users className="w-5 h-5" style={{ color: "oklch(0.7 0.18 60)" }} />,
      color: "oklch(0.7 0.18 60)",
      bgColor: "oklch(0.7 0.18 60 / 10%)",
    },
    {
      label: "Conversion Rate",
      value:
        data && data.stats.dmsSentThisMonth > 0
          ? `${Math.round((data.stats.totalLeads / data.stats.dmsSentThisMonth) * 100)}%`
          : "—",
      icon: <TrendingUp className="w-5 h-5" style={{ color: "oklch(0.6 0.2 330)" }} />,
      color: "oklch(0.6 0.2 330)",
      bgColor: "oklch(0.6 0.2 330 / 10%)",
    },
  ];

  const quickActions = [
    {
      label: "New Automation",
      href: "/dashboard/automations",
      icon: <Plus className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />,
      description: "Set up keyword triggers & auto DMs",
    },
    {
      label: "View Messages",
      href: "/dashboard/messages",
      icon: <MessageCircle className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />,
      description: "See recent DM conversations",
    },
    {
      label: "Connect Instagram",
      href: "/dashboard/settings",
      icon: <Zap className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />,
      description: "Link your IG account",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{data?.user.name ? `, ${data.user.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your automations.
          </p>
        </div>
        {/* API rate-limit gauge (BUC usage) — hidden until a reading exists */}
        {rateLimit.callCount !== null && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              rateLimit.level === "critical"
                ? "border-red-500/30 bg-red-500/10 text-red-600"
                : rateLimit.level === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {rateLimit.level === "critical"
              ? "API usage critical — sending may pause"
              : rateLimit.level === "warning"
              ? "API usage 80%+"
              : "API healthy"}
          </span>
        )}
      </div>

      {/* Setup Checklist */}
      {setupStatus && !setupStatus.dismissed && !setupStatus.allComplete && (
        <SetupChecklist initialStatus={setupStatus} />
      )}

            {/* Onboarding checklist (aha-moment driver) */}
      <OnboardingChecklist
        igConnected={setupStatus?.steps.some((st) => st.id === "connect_instagram" && st.completed) ?? false}
        hasAutomation={(data?.stats.activeAutomations ?? 0) > 0}
        hasDMs={(data?.stats.dmsSentThisMonth ?? 0) > 0 || (data?.stats.totalLeads ?? 0) > 0}
        hasLeads={(data?.stats.totalLeads ?? 0) > 0}
      />

      {/* Animated Stats Grid */}
      <AnimatedStatGrid stats={stats} />

      {/* Quick Actions + Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <AnimatedQuickActions actions={quickActions} />
        </div>

        {/* Plan Card */}
        <div className="flex flex-col gap-3">
          <AnimatedPlanCard
            plan={data?.user.plan ?? "free"}
            dmsSent={data?.stats.dmsSentThisMonth ?? 0}
            dmLimit={data?.user.dmLimit ?? 100}
          />
          {data?.user.plan === "free" && (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[oklch(0.52_0.19_162)] hover:gap-2.5 transition-all py-2"
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
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
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
