"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { CountUp, FadeIn } from "@/components/motion/kit";
import { SplitHeadline } from "@/components/motion/split-headline";
import { Send, MousePointerClick, UserPlus } from "lucide-react";

/**
 * FunnelRings — premium radial funnel: three concentric gradient rings
 * (DMs delivered → taps → leads captured) that draw themselves on scroll,
 * with a count-up in the center and an interactive legend (hover a row,
 * its ring brightens). Apple-activity-rings energy, honest illustrative
 * numbers, clearly labelled.
 */

const RINGS = [
  {
    label: "DMs delivered",
    value: 220,
    pct: 1,
    r: 118,
    icon: Send,
    stroke: "url(#fr-outer)",
    note: "every comment matched",
  },
  {
    label: "Taps received",
    value: 158,
    pct: 0.72,
    r: 96,
    icon: MousePointerClick,
    stroke: "url(#fr-middle)",
    note: "button card CTA",
  },
  {
    label: "Leads captured",
    value: 90,
    pct: 0.41,
    r: 74,
    icon: UserPlus,
    stroke: "url(#fr-inner)",
    note: "tagged + exportable",
  },
];

const SIZE = 280;

export function FunnelRings() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            The funnel, alive
          </p>
          <SplitHeadline
            text="Rings that fill while you sleep"
            className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-foreground"
          />
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
            Illustrative week of one keyword automation — hover the legend to
            explore each stage. Your real rings live in the dashboard.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div
            ref={ref}
            className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-8 md:p-10"
          >
            <div className="flex flex-col items-center gap-10 md:flex-row md:gap-14">
              {/* ── the rings ── */}
              <div className="relative shrink-0">
                <motion.svg
                  width={SIZE}
                  height={SIZE}
                  viewBox={`0 0 ${SIZE} ${SIZE}`}
                  className="drop-shadow-[0_0_24px_oklch(0.62_0.19_162/20%)]"
                  initial={{ rotate: -24, opacity: 0, scale: 0.9 }}
                  animate={inView ? { rotate: 0, opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
                >
                  <defs>
                    <linearGradient id="fr-outer" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.15 162)" />
                      <stop offset="100%" stopColor="oklch(0.55 0.19 158)" />
                    </linearGradient>
                    <linearGradient id="fr-middle" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.11 175)" />
                      <stop offset="100%" stopColor="oklch(0.62 0.12 190)" />
                    </linearGradient>
                    <linearGradient id="fr-inner" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.14 275)" />
                      <stop offset="100%" stopColor="oklch(0.58 0.18 300)" />
                    </linearGradient>
                  </defs>

                  {RINGS.map((ring, i) => {
                    const C = 2 * Math.PI * ring.r;
                    const cx = SIZE / 2;
                    const active = hovered === null || hovered === i;
                    return (
                      <g key={ring.label}>
                        {/* track */}
                        <circle
                          cx={cx}
                          cy={cx}
                          r={ring.r}
                          fill="none"
                          strokeWidth={hovered === i ? 15 : 11}
                          className="stroke-muted/40"
                          style={{ transition: "stroke-width 0.25s" }}
                        />
                        {/* progress */}
                        <motion.circle
                          cx={cx}
                          cy={cx}
                          r={ring.r}
                          fill="none"
                          stroke={ring.stroke}
                          strokeLinecap="round"
                          strokeWidth={hovered === i ? 15 : 11}
                          strokeDasharray={C}
                          initial={{ strokeDashoffset: C }}
                          animate={inView ? { strokeDashoffset: C * (1 - ring.pct) } : {}}
                          transition={{ duration: 1.4, delay: 0.3 + i * 0.25, ease: [0.65, 0, 0.35, 1] }}
                          style={{
                            transition: "stroke-width 0.25s",
                            opacity: active ? 1 : 0.25,
                            rotate: -90,
                            transformOrigin: "center",
                          }}
                        />
                      </g>
                    );
                  })}
                </motion.svg>

                {/* center count-up */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold font-heading tracking-tight text-foreground">
                    <CountUp to={220} duration={1.8} />
                  </span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    DMs this week
                  </span>
                </div>
              </div>

              {/* ── interactive legend ── */}
              <div className="w-full flex-1 space-y-3">
                {RINGS.map((ring, i) => (
                  <motion.button
                    key={ring.label}
                    type="button"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                      hovered === i
                        ? "border-mint/35 bg-mint/8 shadow-sm"
                        : "border-border bg-card/60 hover:border-mint/25"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background:
                          i === 0
                            ? "oklch(0.62 0.19 162/12%)"
                            : i === 1
                              ? "oklch(0.7 0.11 180/12%)"
                              : "oklch(0.6 0.15 280/12%)",
                      }}
                    >
                      <ring.icon className={`h-4.5 w-4.5 ${i === 0 ? "text-mint" : i === 1 ? "text-teal-500" : "text-violet-500"}`} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{ring.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{ring.note}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-xl font-bold font-heading text-foreground">
                        <CountUp to={ring.value} duration={1.6} />
                      </span>
                      <span className="block text-[10px] font-semibold text-muted-foreground">
                        {Math.round(ring.pct * 100)}% of DMs
                      </span>
                    </span>
                  </motion.button>
                ))}

                <p className="pt-1 text-center text-[11px] text-muted-foreground md:text-left">
                  Every stage tracked per automation — delivered → tapped → captured
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
