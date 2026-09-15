"use client";

import { motion } from "motion/react";

/**
 * HeroHeadline — word-level premium entrance + hover.
 * Each word rises from behind a mask with blur; on hover a word lifts
 * and turns mint. The accent word carries the solid accent colour and a
 * hand-drawn underline that draws itself in.
 *
 * The display scale (clamp 3rem→5.5rem, -0.04em tracking, 0.98 leading)
 * comes from the `text-display` token in globals.css. The line-height is
 * near-solid, so each mask span carries em-based bottom padding so glyph
 * descenders and the underline stay visible inside the overflow clip.
 */

const WORDS = ["Turn", "every", "comment"];
const ACCENT = "customer";
const TAIL = "into a";

export function HeroHeadline() {
  let delay = 0;
  const next = () => (delay += 0.09);

  const wordClass =
    "inline-block cursor-default transition-colors duration-300 hover:text-primary";

  return (
    <h1 className="text-display font-bold font-heading text-foreground">
      {/* line 1 — padding keeps the "y" descender inside the 0.98 mask;
          negative margin restores the tight inter-line rhythm */}
      <span className="block overflow-hidden pb-[0.16em] -mb-[0.1em]">
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
      {/* line 2 — room for the hand-drawn underline that hangs below */}
      <span className="block overflow-hidden pb-[0.18em]">
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
          <span className="text-primary">{ACCENT}</span>
          {/* hand-drawn underline that draws itself */}
          <svg
            aria-hidden
            className="absolute -bottom-[0.1em] left-0 w-full"
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
