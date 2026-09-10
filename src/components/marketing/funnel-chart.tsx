"use client";

import { motion } from "motion/react";
import { CountUp } from "@/components/motion/kit";
import { SplitHeadline } from "@/components/motion/split-headline";
import { FadeIn } from "@/components/motion/kit";

/**
 * FunnelChart — animated data representation of the product's core promise:
 * comments → DMs delivered → taps → captured leads. Bars grow on scroll,
 * numbers count up, and each stage glows as it fills. Illustrative
 * proportions (clearly labelled), not fabricated customer data.
 */

const STAGES = [
  { label: "Comments matched", pct: 100, note: "keyword + typo tolerant" },
  { label: "DMs delivered", pct: 100, note: "instant, 24/7" },
  { label: "Window opened (tap)", pct: 72, note: "button card CTA" },
  { label: "Full stack consumed", pct: 58, note: "PDF · carousel · album" },
  { label: "Leads captured", pct: 41, note: "tagged + exportable" },
];

export function FunnelChart() {
  const max = STAGES[0].pct;

  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            The funnel
          </p>
          <SplitHeadline
            text="Watch comments become customers"
            className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-foreground"
          />
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-sm">
            Illustrative flow of a healthy keyword automation — every stage
            measured in your dashboard.
          </p>
        </FadeIn>

        <div className="rounded-3xl border border-border bg-card/50 p-6 md:p-10 backdrop-blur-sm">
          <div className="space-y-5">
            {STAGES.map((stage, i) => (
              <div key={stage.label} className="group grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{stage.label}</span>
                    <span className="hidden text-[11px] text-muted-foreground sm:block">
                      {stage.note}
                    </span>
                  </div>
                  <div className="relative h-9 w-full overflow-hidden rounded-xl bg-muted/40">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(stage.pct / max) * 100}%` }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 1, delay: i * 0.14, ease: [0.21, 0.47, 0.32, 0.98] }}
                      className="relative h-full overflow-hidden rounded-xl bg-gradient-to-r from-mint-dark via-mint to-mint-light"
                    >
                      {/* moving sheen inside each bar */}
                      <motion.span
                        aria-hidden
                        className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        animate={{ x: ["-100%", "500%"] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
                      />
                    </motion.div>
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-lg font-bold font-heading text-foreground">
                    <CountUp to={stage.pct} suffix="%" duration={1.4} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              Conversion tracked per automation — delivered → seen → lead → contact
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-mint-light">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
              </span>
              Live in dashboard
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
