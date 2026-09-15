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
    <div className="pt-8 pb-24 px-6 md:pt-12 md:pb-32">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 md:mb-16">
          <p className="eyebrow mb-5 text-primary">Simple Pricing</p>
          <h1 className="text-section font-bold font-heading text-foreground">
            Start free, scale when ready
          </h1>
          <p className="text-[15px] leading-[1.7] text-muted-foreground mt-5 max-w-xl mx-auto">
            No hidden fees. No contracts. Cancel anytime.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {plans.map((plan) => {
            const Icon = iconMap[plan.name] || Zap;
            return (
              <div
                key={plan.name}
                className={`relative rounded-lg border p-6 transition-all duration-300 hover:shadow-lg ${
                  plan.highlight
                    ? "border-[oklch(0.52_0.19_162)] bg-card shadow-xl scale-[1.02] ring-2 ring-[oklch(0.52_0.19_162/20%)]"
                    : "border-border bg-card shadow-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[oklch(0.52_0.19_162)] text-white font-mono text-[10px] font-medium uppercase tracking-[0.08em]">
                    MOST POPULAR
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlight
                        ? "bg-[oklch(0.52_0.19_162)] text-white"
                        : "bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold font-heading tracking-tight text-foreground">{plan.name}</h2>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold font-heading tracking-tight text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-base text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <Link
                  href="/signup"
                  className={`block w-full text-center py-3 rounded-lg font-semibold text-[15px] transition-all duration-200 ${
                    plan.highlight
                      ? "bg-[oklch(0.52_0.19_162)] text-white hover:bg-[oklch(0.48_0.19_162)] shadow-md"
                      : "border border-border text-foreground hover:bg-muted/30"
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="mt-6 pt-6 border-t border-border space-y-2.5">
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

        {/* Pending Meta approval */}
        <div className="mt-12 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">Coming after Meta approval</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These features are built and ready, but need additional Instagram
            permissions that are currently under Meta App Review:{" "}
            <span className="text-foreground font-medium">
              Auto-like ❤️ reactions
            </span>{" "}
            and{" "}
            <span className="text-foreground font-medium">
              Drip Sequences
            </span>{" "}
            (scheduled follow-up DMs). They&apos;ll light up in your dashboard
            the moment Meta approves them — no action needed from you.
          </p>
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
