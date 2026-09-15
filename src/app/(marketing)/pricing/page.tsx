import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Zap, Crown, Building2, Clock } from "lucide-react";
import { getPlanDisplayData } from "@/lib/utils/plan-limits";

export const metadata: Metadata = {
  title: "Pricing",
  alternates: { canonical: "/pricing" },
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

        {/* INR vs USD pricing context — the India wedge */}
        <section className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold font-heading tracking-tight text-foreground text-center">
            Priced in rupees, not converted dollars
          </h2>
          <p className="mt-3 text-sm text-muted-foreground text-center leading-relaxed">
            Most DM-automation tools bill in USD — with conversion fees and no
            Indian invoicing. Checked September 2026.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Tool</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Entry paid plan</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Currency</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60 odd:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">ManyChat</td>
                  <td className="px-4 py-3 text-muted-foreground">From ~$15/mo (≈ ₹1,300+) + contact tiers</td>
                  <td className="px-4 py-3 text-muted-foreground">USD only</td>
                </tr>
                <tr className="border-b border-border/60 odd:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">ChirplyMint Pro</td>
                  <td className="px-4 py-3 text-muted-foreground">₹499/mo — 2,000 DMs included</td>
                  <td className="px-4 py-3 text-muted-foreground">INR (UPI / cards)</td>
                </tr>
                <tr className="odd:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">ChirplyMint Business</td>
                  <td className="px-4 py-3 text-muted-foreground">₹1,499/mo — unlimited DMs</td>
                  <td className="px-4 py-3 text-muted-foreground">INR (UPI / cards)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground text-center">
            See the full honest comparison —{" "}
            <Link
              href="/compare/manychat-alternative"
              className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
            >
              ChirplyMint vs ManyChat
            </Link>{" "}
            (including where ManyChat wins).
          </p>
        </section>

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
