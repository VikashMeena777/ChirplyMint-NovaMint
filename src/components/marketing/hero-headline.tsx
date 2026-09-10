"use client";

import { motion } from "motion/react";

/**
 * HeroHeadline — word-level premium entrance + hover.
 * Each word rises from behind a mask with blur; on hover a word lifts
 * and glows mint. The accent word carries the gradient + a hand-drawn
 * underline that draws itself in.
 */

const WORDS = ["Turn", "every", "comment"];
const ACCENT = "customer";
const TAIL = "into a";

export function HeroHeadline() {
  let delay = 0;
  const next = () => (delay += 0.09);

  const wordClass =
    "inline-block cursor-default transition-[color,text-shadow] duration-300 hover:text-mint hover:[text-shadow:0_0_30px_oklch(0.62_0.19_162/45%)]";

  return (
    <h1 className="text-[2.9rem] sm:text-6xl lg:text-7xl font-bold font-heading tracking-tight leading-[1.05] text-foreground">
      {/* line 1 */}
      <span className="block overflow-hidden pb-1">
        {WORDS.map((w) => (
          <motion.span
            key={w}
            className={wordClass + " mr-[0.25em]"}
            initial={{ y: "110%", opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ delay: next(), duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
            whileHover={{ y: -5, transition: { type: "spring", stiffness: 400, damping: 15 } }}
          >
            {w}
          </motion.span>
        ))}
      </span>
      {/* line 2 */}
      <span className="block overflow-hidden pb-2">
        <motion.span
          className="inline-block mr-[0.25em]"
          initial={{ y: "110%", opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: next(), duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          {TAIL}
        </motion.span>
        <motion.span
          className="relative inline-block cursor-default"
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: next(), duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          whileHover={{ scale: 1.04, transition: { type: "spring", stiffness: 350, damping: 14 } }}
        >
          <span className="bg-gradient-to-r from-mint-dark via-mint to-emerald bg-clip-text text-transparent">
            {ACCENT}
          </span>
          {/* hand-drawn underline that draws itself */}
          <svg
            aria-hidden
            className="absolute -bottom-2 left-0 w-full"
            viewBox="0 0 120 8"
            fill="none"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M2 6 C 25 2, 60 1.5, 118 4"
              stroke="oklch(0.62 0.19 162)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: delay + 0.35, duration: 0.6, ease: "easeOut" }}
            />
          </svg>
        </motion.span>
      </span>
    </h1>
  );
}
