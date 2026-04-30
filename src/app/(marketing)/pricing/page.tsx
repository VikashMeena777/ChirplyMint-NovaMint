import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Zap, Crown, Building2, Clock } from "lucide-react";

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
    href: "/signup",
    featured: false,
    features: [
      { text: "50 DMs / month", included: true },
      { text: "1 Automation", included: true },
      { text: "2 Drip Steps", included: true },
      { text: "1 Instagram Account", included: true },
      { text: "Comment Auto-Reply", included: true },
      { text: "Story Reply Triggers", included: true },
      { text: "Text & Button DM Templates", included: true },
      { text: "Follow-Check (Followers Only)", included: true },
      { text: "Link-in-Bio (5 links)", included: true },
      { text: "Basic Analytics", included: true },
      { text: "Community Support", included: true },
      { text: "AI Smart Replies", included: false },
      { text: "Lead Capture & Export", included: false },
      { text: "A/B Testing", included: false },
    ],
  },
  {
    name: "Pro",
    icon: Crown,
    price: "₹499",
    period: "/month",
    description: "For creators who mean business",
    cta: "Upgrade to Pro",
    href: "/signup",
    featured: true,
    features: [
      { text: "2,000 DMs / month", included: true },
      { text: "10 Automations", included: true },
      { text: "5 Drip Steps", included: true },
      { text: "3 Instagram Accounts", included: true },
      { text: "Everything in Starter", included: true },
      { text: "AI Smart Replies", included: true },
      { text: "AI FAQ Knowledge Base", included: true },
      { text: "Postback Flow Builder", included: true },
      { text: "A/B Testing", included: true },
      { text: "Lead Capture & Tagging", included: true },
      { text: "Lead Export (CSV)", included: true },
      { text: "Follow-Check (Configurable)", included: true },
      { text: "Link-in-Bio (Unlimited)", included: true },
      { text: "Advanced Analytics & Insights", included: true },
      { text: "Priority Email Support", included: true },
    ],
  },
  {
    name: "Business",
    icon: Building2,
    price: "₹1,499",
    period: "/month",
    description: "For teams and agencies",
    cta: "Upgrade to Business",
    href: "/signup",
    featured: false,
    features: [
      { text: "Unlimited DMs", included: true },
      { text: "Unlimited Automations", included: true },
      { text: "10 Drip Steps", included: true },
      { text: "10 Instagram Accounts", included: true },
      { text: "Everything in Pro", included: true },
      { text: "Advanced AI (Longer Context)", included: true },
      { text: "Multi-Step DM Funnels", included: true },
      { text: "Full Analytics & Export", included: true },
      { text: "Dedicated Support (WhatsApp)", included: true },
    ],
    comingSoon: [
      "Multi IG Account Connect",
      "Team Members",
      "API Access",
      "Custom Branding / White-Label",
      "Webhook Lead Export",
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

                {/* Coming Soon features */}
                {"comingSoon" in plan && (plan as typeof plans[2]).comingSoon?.map((f) => (
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
