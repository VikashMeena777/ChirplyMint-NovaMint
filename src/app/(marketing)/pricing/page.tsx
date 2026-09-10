"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X, Zap, Crown, Building2, Clock, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { getPlanDisplayData } from "@/lib/utils/plan-limits";
import PageHero from "@/components/marketing/page-hero";
import Reveal from "@/components/motion/reveal";
import Magnetic from "@/components/motion/magnetic";

const iconMap: Record<string, typeof Zap> = {
  Starter: Zap,
  Pro: Crown,
  Business: Building2,
};

const assurances = [
  { icon: ShieldCheck, title: "7-day Pro trial", desc: "Full power, zero risk." },
  { icon: Clock, title: "Cancel anytime", desc: "One click. No lock-in." },
  { icon: Sparkles, title: "UPI + cards", desc: "Secure Cashfree checkout." },
];

export default function PricingPage() {
  const plans = getPlanDisplayData();

  return (
    <div className="pb-24">
      <PageHero
        kicker="Simple pricing"
        title={<>Start free. <span className="text-gradient">Scale when you blow up.</span></>}
        subtitle="No hidden fees. No contracts. Cancel anytime — keep everything till period end."
      />

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6 items-stretch -mt-4">
          {plans.map((plan, i) => {
            const Icon = iconMap[plan.name] || Zap;
            return (
              <Reveal key={plan.name} delay={i * 0.08} className="h-full">
                <div className={`relative h-full p-8 rounded-3xl flex flex-col ${
                  plan.highlight ? "card-highlight glow-mint md:scale-[1.04] z-10" : "card-elevated card-lift"
                }`}>
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-mint text-xs font-bold text-white tracking-wide shadow-lg whitespace-nowrap">
                      ⚡ Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      plan.highlight ? "bg-gradient-mint text-white shadow-lg shadow-mint/25" : "bg-mint/10 text-mint"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold leading-none">{plan.name}</h2>
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-6">
                    <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                  <Magnetic strength={0.12}>
                    <Link
                      href="/signup"
                      className={`w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                        plan.highlight
                          ? "bg-gradient-mint text-white btn-shine glow-mint hover:scale-[1.02]"
                          : "border border-border hover:border-mint/40 hover:bg-mint/5"
                      }`}
                    >
                      {plan.cta} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Magnetic>
                  <div className="mt-7 pt-6 border-t border-border space-y-3">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-mint/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-mint" strokeWidth={3} />
                        </span>
                        <span className="text-sm text-foreground/90">{f}</span>
                      </div>
                    ))}
                    {plan.excluded.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <X className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground/60">{f}</span>
                      </div>
                    ))}
                    {plan.comingSoon.map((f: string) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground/60">{f}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">Soon</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Assurances */}
        <div className="grid sm:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto">
          {assurances.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.07}>
              <div className="flex items-center gap-3 p-4 rounded-2xl card-elevated">
                <span className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center shrink-0">
                  <a.icon className="w-5 h-5 text-mint" />
                </span>
                <div>
                  <p className="text-sm font-bold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Compare teaser */}
        <Reveal className="mt-16 max-w-3xl mx-auto text-center rounded-3xl bg-gradient-to-br from-mint/10 to-emerald/5 border border-mint/20 p-8 md:p-10">
          <h3 className="text-2xl font-bold">Annual plans save 2 months</h3>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Pay for 10 months, get 12. Switch to annual anytime from Settings → Billing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <Link href="/signup" className="px-6 py-3 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm hover:scale-[1.02] transition-transform">
              Start free trial
            </Link>
            <Link href="/help" className="px-6 py-3 rounded-xl glass text-sm font-semibold hover:border-mint/40 transition-colors">
              Talk to support
            </Link>
          </div>
        </Reveal>

        {/* FAQ teaser */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-14"
        >
          <p className="text-muted-foreground text-sm">
            Still deciding? <Link href="/help" className="text-mint-dark dark:text-mint-light font-semibold hover:underline">Read the FAQ</Link>
            {" "}or <Link href="/contact" className="text-mint-dark dark:text-mint-light font-semibold hover:underline">ask us anything</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
