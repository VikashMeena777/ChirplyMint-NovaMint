import type { Metadata } from "next";
import {
  Sparkles,
  Shield,
  Mail,
  Bot,
  BarChart3,
  Zap,
  Link2,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog — ChirplyMint",
  description:
    "See what's new in ChirplyMint. Feature updates, improvements, and bug fixes.",
};

interface ChangelogEntry {
  date: string;
  version: string;
  title: string;
  description: string;
  tag: "feature" | "improvement" | "fix" | "security";
  icon: React.ElementType;
  highlights: string[];
}

const tagStyles: Record<string, { bg: string; text: string }> = {
  feature: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-500",
  },
  improvement: {
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-500",
  },
  fix: {
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-500",
  },
  security: {
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-500",
  },
};

const changelog: ChangelogEntry[] = [
  {
    date: "May 10, 2026",
    version: "2.8",
    title: "Enhanced Account Security & Theme Toggle",
    description:
      "Smarter account deletion flow based on your login method, plus a new dark/light/system theme switcher right in the sidebar.",
    tag: "security",
    icon: Shield,
    highlights: [
      "Google OAuth users see a clear confirmation dialog — no fake password prompt",
      "Email/password users must verify their actual password to delete",
      "New Sun/Moon/Monitor theme toggle in the sidebar",
      "Upgrade CTA now links to the Pricing page for better conversion",
    ],
  },
  {
    date: "May 5, 2026",
    version: "2.7",
    title: "Automated Engagement Email System",
    description:
      "7 professional branded email templates triggered by user actions and milestones. Plus a daily cron for inactive nudges and win-back campaigns.",
    tag: "feature",
    icon: Mail,
    highlights: [
      "Instagram Connected, First DM, and 100 DM Milestone celebration emails",
      "Plan Upgraded & Approaching Limit transactional emails",
      "Daily cron sends Inactive Nudge (7-day) and Win-Back (30-day) emails",
      "Smart cooldown prevents email fatigue — max 1 engagement email per 7 days",
    ],
  },
  {
    date: "Apr 26, 2026",
    version: "2.6",
    title: "Multi-Account Instagram Support",
    description:
      "Connect and manage multiple Instagram accounts from a single ChirplyMint dashboard. Switch between accounts seamlessly.",
    tag: "feature",
    icon: Users,
    highlights: [
      "Connect unlimited IG accounts (plan-dependent limits)",
      "Per-account automation targeting",
      "Account switcher in the dashboard",
      "Individual token refresh per account",
    ],
  },
  {
    date: "Apr 15, 2026",
    version: "2.5",
    title: "AI Agent & Smart Inbox",
    description:
      "AI-powered conversational agent that handles DMs intelligently with context awareness and customizable personality.",
    tag: "feature",
    icon: Bot,
    highlights: [
      "Custom AI personality configuration",
      "Context-aware DM responses using your business info",
      "AI Inbox to review and manage AI conversations",
      "Smart handoff to human when confidence is low",
    ],
  },
  {
    date: "Apr 5, 2026",
    version: "2.4",
    title: "Drip Sequences & Postback Flows",
    description:
      "Multi-step automated DM sequences with delays, conditions, and postback button flows for interactive conversations.",
    tag: "feature",
    icon: Zap,
    highlights: [
      "Create multi-step drip sequences with custom delays",
      "Postback button flows for interactive DM experiences",
      "A/B testing on automation messages",
      "Per-sequence analytics and conversion tracking",
    ],
  },
  {
    date: "Mar 25, 2026",
    version: "2.3",
    title: "Link-in-Bio Builder",
    description:
      "Beautiful, customizable link-in-bio pages with analytics. No external tools needed.",
    tag: "feature",
    icon: Link2,
    highlights: [
      "Drag-and-drop link ordering",
      "Custom themes, colors, and avatar",
      "Click analytics per link",
      "SEO-optimized public profile pages",
    ],
  },
  {
    date: "Mar 15, 2026",
    version: "2.2",
    title: "Advanced Analytics Dashboard",
    description:
      "Deep insights into your automation performance with charts, trends, and per-automation breakdowns.",
    tag: "improvement",
    icon: BarChart3,
    highlights: [
      "Daily DM send volume and lead capture charts",
      "Per-automation performance comparison",
      "Conversion rate tracking",
      "Weekly email reports with key metrics",
    ],
  },
  {
    date: "Mar 1, 2026",
    version: "2.1",
    title: "Lead Capture & CRM",
    description:
      "Automatically capture leads from DM conversations. Tag, filter, export, and manage your pipeline.",
    tag: "feature",
    icon: Users,
    highlights: [
      "Auto-capture leads from comment triggers",
      "Tagging system (Hot, Warm, Cold, VIP, Customer)",
      "CSV export and webhook integrations",
      "Bulk operations for lead management",
    ],
  },
  {
    date: "Feb 15, 2026",
    version: "2.0",
    title: "ChirplyMint Launch 🚀",
    description:
      "The initial public launch of ChirplyMint — automate Instagram DMs from comment keywords with AI-powered responses.",
    tag: "feature",
    icon: Sparkles,
    highlights: [
      "Comment keyword trigger → auto DM",
      "AI-powered message generation",
      "Real-time DM delivery tracking",
      "Free, Pro, and Business plans",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(0.52_0.19_162/10%)] border border-[oklch(0.52_0.19_162/20%)] text-sm font-medium text-[oklch(0.52_0.19_162)] mb-4">
          <Sparkles className="w-4 h-4" />
          What&apos;s New
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Changelog
        </h1>
        <p className="text-lg text-muted-foreground mt-3 max-w-lg mx-auto">
          Every feature, improvement, and fix we ship. Stay up to date with
          what&apos;s happening at ChirplyMint.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-10">
          {changelog.map((entry, i) => {
            const style = tagStyles[entry.tag];
            return (
              <div key={i} className="relative pl-14">
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-10 h-10 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center z-10">
                  <entry.icon className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
                </div>

                {/* Content */}
                <div className="rounded-2xl bg-card border border-border shadow-sm p-6 hover:shadow-md transition-shadow">
                  {/* Meta */}
                  <div className="flex items-center gap-3 mb-3">
                    <time className="text-xs font-medium text-muted-foreground">
                      {entry.date}
                    </time>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      v{entry.version}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${style.bg} ${style.text}`}
                    >
                      {entry.tag}
                    </span>
                  </div>

                  {/* Title + Description */}
                  <h2 className="text-lg font-semibold text-foreground mb-1.5">
                    {entry.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {entry.description}
                  </p>

                  {/* Highlights */}
                  <ul className="space-y-2">
                    {entry.highlights.map((h, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-foreground/80"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.52_0.19_162)] mt-1.5 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-[oklch(0.52_0.19_162/8%)] to-[oklch(0.45_0.2_158/5%)] border border-[oklch(0.52_0.19_162/15%)] p-8">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Ready to automate your Instagram DMs?
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            Join thousands of creators and businesses using ChirplyMint.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-lg shadow-[oklch(0.52_0.19_162/20%)] hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
