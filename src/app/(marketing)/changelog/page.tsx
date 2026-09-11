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
  CreditCard,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import changelogData from "@/data/changelog.json";

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
  tag: string;
  icon: string;
  highlights: string[];
}

const ICONS: Record<string, React.ElementType> = {
  Sparkles, Shield, Mail, Bot, BarChart3, Zap, Link2, Users, CreditCard, MessageCircle,
};

const tagStyles: Record<string, { bg: string; text: string }> = {
  feature: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500" },
  improvement: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500" },
  fix: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500" },
  security: { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-500" },
};

export default function ChangelogPage() {
  const changelog = (changelogData as { entries: ChangelogEntry[] }).entries;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          Changelog
        </div>
        <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">
          What&apos;s new
        </h1>
        <p className="text-muted-foreground mt-3">
          Every improvement to ChirplyMint, newest first. Updated with every release.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />

        <div className="space-y-10">
          {changelog.map((entry) => {
            const Icon = ICONS[entry.icon] ?? Sparkles;
            const style = tagStyles[entry.tag] ?? tagStyles.improvement;
            return (
              <div key={entry.version + entry.date} className="relative pl-12">
                <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
                  <Icon className="h-4 w-4 text-[oklch(0.52_0.19_162)]" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">v{entry.version}</span>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                    {entry.tag}
                  </span>
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-foreground">{entry.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
                <ul className="mt-3 space-y-1.5">
                  {entry.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.52_0.19_162)]" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
