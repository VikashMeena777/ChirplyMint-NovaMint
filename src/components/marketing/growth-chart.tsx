"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { CountUp, FadeIn } from "@/components/motion/kit";
import { SplitHeadline } from "@/components/motion/split-headline";

/**
 * GrowthChart — premium animated data visualization replacing the old bar
 * funnel: an SVG revenue-style line that DRAWS itself upward, gradient area
 * fill, glowing live endpoint, hoverable data points with tooltips, and
 * count-up stat chips. Illustrative and labelled as such.
 */

const DATA = [
  { label: "Mon", dm: 12 },
  { label: "Tue", dm: 19 },
  { label: "Wed", dm: 16 },
  { label: "Thu", dm: 27 },
  { label: "Fri", dm: 38 },
  { label: "Sat", dm: 47 },
  { label: "Sun", dm: 61 },
];

const W = 720;
const H = 300;
const PAD = { t: 24, r: 20, b: 36, l: 44 };
const MAX = 70;

const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (DATA.length - 1);
const y = (v: number) => PAD.t + (1 - v / MAX) * (H - PAD.t - PAD.b);

const linePath = DATA.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.dm)}`).join(" ");
const areaPath = `${linePath} L ${x(DATA.length - 1)} ${H - PAD.b} L ${x(0)} ${H - PAD.b} Z`;

export function GrowthChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            Growth mode
          </p>
          <SplitHeadline
            text="It compounds while you sleep"
            className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-foreground"
          />
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
            Illustrative week of a keyword automation — DMs delivered day over day.
            Your real numbers live in the dashboard.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div
            ref={ref}
            className="relative overflow-hidden rounded-3xl border border-border bg-card/50 p-6 backdrop-blur-sm md:p-8"
          >
            {/* stat chips */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-4 py-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-mint-light">
                  <CountUp to={220} duration={2} /> DMs this week
                </span>
              </div>
              <div className="rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <CountUp to={31} prefix="+" duration={1.8} />% vs last week
              </div>
              <div className="rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <CountUp to={9} duration={1.5} /> leads captured
              </div>
            </div>

            {/* chart */}
            <div className="relative">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="DM growth chart">
                <defs>
                  <linearGradient id="gc-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="oklch(0.48 0.17 162)" />
                    <stop offset="60%" stopColor="oklch(0.62 0.19 162)" />
                    <stop offset="100%" stopColor="oklch(0.72 0.15 172)" />
                  </linearGradient>
                  <linearGradient id="gc-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.19 162 / 25%)" />
                    <stop offset="100%" stopColor="oklch(0.62 0.19 162 / 0%)" />
                  </linearGradient>
                </defs>

                {/* grid lines */}
                {[0, 1, 2, 3].map((g) => {
                  const gy = PAD.t + (g * (H - PAD.t - PAD.b)) / 3;
                  return (
                    <motion.line
                      key={g}
                      x1={PAD.l}
                      x2={W - PAD.r}
                      y1={gy}
                      y2={gy}
                      stroke="currentColor"
                      className="text-border"
                      strokeDasharray="3 6"
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : {}}
                      transition={{ delay: 0.2 + g * 0.08, duration: 0.5 }}
                    />
                  );
                })}

                {/* area fill */}
                <motion.path
                  d={areaPath}
                  fill="url(#gc-area)"
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ delay: 1.1, duration: 0.9 }}
                />

                {/* the line that draws itself */}
                <motion.path
                  d={linePath}
                  fill="none"
                  stroke="url(#gc-line)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={inView ? { pathLength: 1 } : {}}
                  transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
                />

                {/* data points */}
                {DATA.map((d, i) => (
                  <motion.g
                    key={d.label}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.3 + i * 0.18, type: "spring", stiffness: 380, damping: 20 }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className="cursor-pointer"
                  >
                    <circle cx={x(i)} cy={y(d.dm)} r={hovered === i ? 7 : 4.5} className="fill-background stroke-[oklch(0.62_0.19_162)]" strokeWidth="2.5" style={{ transition: "r 0.2s" }} />
                    {hovered === i && (
                      <g>
                        <rect x={x(i) - 34} y={y(d.dm) - 40} width="68" height="26" rx="8" className="fill-card stroke-border" strokeWidth="1" />
                        <text x={x(i)} y={y(d.dm) - 23} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                          {d.dm} DMs
                        </text>
                      </g>
                    )}
                    <text x={x(i)} y={H - 12} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                      {d.label}
                    </text>
                  </motion.g>
                ))}

                {/* glowing endpoint */}
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ delay: 1.8 }}
                >
                  <circle cx={x(DATA.length - 1)} cy={y(DATA[DATA.length - 1].dm)} r="12" className="fill-[oklch(0.62_0.19_162/15%)]">
                    <animate attributeName="r" values="8;16;8" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                </motion.g>
              </svg>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Hover the points — every metric is tracked per automation</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-mint-light">
                Live in dashboard
              </span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
