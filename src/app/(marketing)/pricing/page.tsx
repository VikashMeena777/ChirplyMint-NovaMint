import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Zap, Crown, Building2, Clock } from "lucide-react";
import { getPlanDisplayData } from "@/lib/utils/plan-limits";

export const metadata: Metadata = {
  title: "Pricing — ChirplyMint",
  description:
    "Simple, transparent pricing for Instagram DM automation. Start free, scale as you grow.",
};

const iconMap: Record<string, typeof Zap> = {
  Starter: Zap,
  Pro: Crown,
  Business: Building2,
};

export default function PricingPage() {
  const plans = getPlanDisplayData();

  return (
    <div className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Simple Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Start free, scale when ready
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
            No hidden fees. No contracts. Cancel anytime.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const Icon = iconMap[plan.name] || Zap;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg ${
                  plan.highlight
                    ? "border-[oklch(0.52_0.19_162)] bg-card shadow-xl scale-[1.02] ring-2 ring-[oklch(0.52_0.19_162/20%)]"
                    : "border-border bg-card shadow-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[oklch(0.52_0.19_162)] text-white text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlight
                        ? "bg-[oklch(0.52_0.19_162)] text-white"
                        : "bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-base text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <Link
                  href="/signup"
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? "bg-[oklch(0.52_0.19_162)] text-white hover:bg-[oklch(0.48_0.19_162)] shadow-md"
                      : "border border-border text-foreground hover:bg-muted/30"
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  {/* Included features */}
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-[oklch(0.52_0.19_162)] shrink-0" />
                      <span className="text-sm text-foreground">{f}</span>
                    </div>
                  ))}

                  {/* Excluded features */}
                  {plan.excluded.map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      <span className="text-sm text-muted-foreground/60">{f}</span>
                    </div>
                  ))}

                  {/* Coming Soon features */}
                  {plan.comingSoon.map((f: string) => (
                    <div key={f} className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-amber-500/60 shrink-0" />
                      <span className="text-sm text-muted-foreground/60">{f}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium leading-none">
                        Soon
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Teaser */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Have questions?{" "}
            <Link
              href="/help"
              className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
            >
              Check our FAQ
            </Link>{" "}
            or{" "}
            <Link
              href="/contact"
              className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
            >
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
