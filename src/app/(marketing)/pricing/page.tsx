import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Zap, Crown, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — ChirplyMint",
  description:
    "Simple, transparent pricing for Instagram DM automation. Start free, scale as you grow.",
};

const plans = [
  {
    name: "Starter",
    icon: Zap,
    price: "Free",
    period: "",
    description: "Perfect for testing the waters",
    cta: "Get Started Free",
    featured: false,
    features: [
      { text: "1 active automation", included: true },
      { text: "50 DMs / month", included: true },
      { text: "Basic analytics", included: true },
      { text: "Lead capture", included: true },
      { text: "AI Smart Replies", included: false },
      { text: "Weekly reports", included: false },
      { text: "Priority support", included: false },
      { text: "Custom branding", included: false },
    ],
  },
  {
    name: "Pro",
    icon: Crown,
    price: "₹999",
    period: "/month",
    description: "For creators who mean business",
    cta: "Start Pro Trial",
    featured: true,
    features: [
      { text: "Unlimited automations", included: true },
      { text: "2,000 DMs / month", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Lead capture + CSV export", included: true },
      { text: "AI Smart Replies", included: true },
      { text: "Weekly performance reports", included: true },
      { text: "Priority support", included: true },
      { text: "Custom branding", included: false },
    ],
  },
  {
    name: "Business",
    icon: Building2,
    price: "₹2,999",
    period: "/month",
    description: "For teams and agencies",
    cta: "Contact Sales",
    featured: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "10,000 DMs / month", included: true },
      { text: "Multi-account support", included: true },
      { text: "API access", included: true },
      { text: "AI Smart Replies", included: true },
      { text: "Custom AI training", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom branding & white-label", included: true },
    ],
  },
];

export default function PricingPage() {
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
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg ${
                plan.featured
                  ? "border-[oklch(0.52_0.19_162)] bg-card shadow-xl scale-[1.02] ring-2 ring-[oklch(0.52_0.19_162/20%)]"
                  : "border-border bg-card shadow-sm"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[oklch(0.52_0.19_162)] text-white text-xs font-bold">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.featured
                      ? "bg-[oklch(0.52_0.19_162)] text-white"
                      : "bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)]"
                  }`}
                >
                  <plan.icon className="w-5 h-5" />
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
                  plan.featured
                    ? "bg-[oklch(0.52_0.19_162)] text-white hover:bg-[oklch(0.48_0.19_162)] shadow-md"
                    : "border border-border text-foreground hover:bg-muted/30"
                }`}
              >
                {plan.cta}
              </Link>

              <div className="mt-6 pt-6 border-t border-border space-y-3">
                {plan.features.map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    {f.included ? (
                      <Check className="w-4 h-4 text-[oklch(0.52_0.19_162)] shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        f.included ? "text-foreground" : "text-muted-foreground/60"
                      }`}
                    >
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
