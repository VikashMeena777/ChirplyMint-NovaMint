"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

/**
 * Client component that wraps dashboard stat cards with staggered fade-in animations
 * and animated number counters. Also handles ∞ display for unlimited DM plans.
 */

interface StatItem {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: string;
  bgColor: string;
}

export function AnimatedStatGrid({ stats }: { stats: StatItem[] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md hover:border-[oklch(0.52_0.19_162/20%)] transition-all duration-300"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms, box-shadow 0.2s ease, border-color 0.2s ease`,
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: stat.bgColor }}
            >
              {stat.icon}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-foreground">
              {typeof stat.value === "number" ? (
                <AnimatedCounter value={stat.value} />
              ) : (
                stat.value
              )}
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnimatedPlanCard({
  plan,
  dmsSent,
  dmLimit,
}: {
  plan: string;
  dmsSent: number;
  dmLimit: number;
}) {
  const isUnlimited = dmLimit === -1;
  const progressPercent = isUnlimited
    ? Math.min((dmsSent / 5000) * 100, 100) // visual cap for unlimited
    : Math.min((dmsSent / dmLimit) * 100, 100);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] p-6 text-white flex flex-col justify-between relative overflow-hidden">
      {/* Subtle glow orb */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium opacity-90">
            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
          </span>
        </div>
        <p className="text-lg font-bold">
          <AnimatedCounter value={dmsSent} className="tabular-nums" /> /{" "}
          {isUnlimited ? "∞" : dmLimit.toLocaleString()} DMs
        </p>
        <p className="text-sm opacity-80 mt-1">used this month</p>
        {/* Progress bar */}
        <div className="mt-3 w-full h-2 rounded-full bg-card/20">
          <div
            className="h-full rounded-full bg-card transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function AnimatedQuickActions({
  actions,
}: {
  actions: { label: string; href: string; description: string; icon: ReactNode }[];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {actions.map((action, i) => (
        <a
          key={action.label}
          href={action.href}
          className="group flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border hover:border-[oklch(0.52_0.19_162/40%)] hover:shadow-md transition-all"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms, box-shadow 0.2s ease, border-color 0.2s ease`,
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center group-hover:bg-[oklch(0.52_0.19_162/15%)] transition-colors">
            {action.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{action.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {action.description}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}
