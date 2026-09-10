"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Reveal from "@/components/motion/reveal";

/**
 * Shared premium hero for marketing subpages: aurora backdrop,
 * kicker pill, big title, subtitle. Optional trailing content (search, CTAs).
 */
export default function PageHero({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pb-14 md:pb-20">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 dot-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[320px] bg-mint/15 blur-[120px] rounded-full" />
      <div className="relative max-w-4xl mx-auto px-6 text-center pt-10 md:pt-14">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-mint/10 border border-mint/20 text-mint-dark dark:text-mint-light text-xs font-bold uppercase tracking-[0.14em]"
        >
          {kicker}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl md:text-6xl font-bold tracking-[-0.02em] mt-5 text-balance"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="text-base md:text-lg text-muted-foreground mt-5 max-w-2xl mx-auto leading-relaxed text-balance"
          >
            {subtitle}
          </motion.p>
        )}
        {children && <Reveal delay={0.2} className="mt-8">{children}</Reveal>}
      </div>
    </section>
  );
}
