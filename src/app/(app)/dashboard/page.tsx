import {
  Bot,
  MessageCircle,
  Users,
  TrendingUp,
  ArrowRight,
  Zap,
  Plus,
  Send,
  UserPlus,
  Sparkles,
  Settings2,
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
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-mint/[0.08] via-transparent to-emerald/[0.06] pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-mint/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-mint mb-1.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Welcome back{data?.user.name ? `, ${data.user.name.split(" ")[0]}` : ""}{" "}
              <span className="text-gradient">👋</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-mint" />
              Here&apos;s what&apos;s happening with your automations.
            </p>
          </div>
          {/* API rate-limit gauge (BUC usage) — hidden until a reading exists */}
          {rateLimit.callCount !== null && (
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                rateLimit.level === "critical"
                  ? "border-red-500/30 bg-red-500/10 text-red-600"
                  : rateLimit.level === "warning"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              }`}
            >
              <span className="relative flex w-1.5 h-1.5">
                {rateLimit.level !== "ok" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                )}
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
              </span>
              {rateLimit.level === "critical"
                ? "API usage critical — sending may pause"
                : rateLimit.level === "warning"
                ? "API usage 80%+"
                : "API healthy"}
            </span>
          )}
        </div>
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <Link href="/dashboard/messages" className="group inline-flex items-center gap-1 text-xs font-semibold text-mint-dark dark:text-mint-light hover:underline">
            View messages <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="rounded-2xl bg-card border border-border shadow-sm divide-y divide-border overflow-hidden">
          {(data?.recentActivity ?? []).length > 0 ? (
            (data?.recentActivity ?? []).map(
              (activity: Record<string, unknown>, i: number) => {
                const action = (activity.action as string) || "";
                const Icon = action.startsWith("dm.") ? Send : action.startsWith("lead") ? UserPlus : action.includes("automation") ? Bot : action.includes("instagram") ? Settings2 : Zap;
                return (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-mint/[0.03] transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-mint" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at as string).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              }
            )
          ) : (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-mint flex items-center justify-center mx-auto mb-4 shadow-lg shadow-mint/25">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-foreground">Quiet… for now</p>
              <p className="text-xs text-muted-foreground mt-1 mb-5">
                Create your first automation and watch this feed come alive.
              </p>
              <Link
                href="/dashboard/automations"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm hover:scale-[1.02] transition-transform"
              >
                <Plus className="w-4 h-4" /> Create automation
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
