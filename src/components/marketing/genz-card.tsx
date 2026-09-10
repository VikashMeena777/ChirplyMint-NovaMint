"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, Heart, Sparkles } from "lucide-react";

/**
 * GenZCard — replaces the old oversized bento hero card.
 * Rotating headline ("comments in, X out"), floating keyword chips with
 * spring hover physics, and playful Gen-Z microcopy. Compact 2x1.
 */

const OUT_WORDS = [
  { word: "customers", emoji: "💸" },
  { word: "sales", emoji: "📈" },
  { word: "leads", emoji: "🧲" },
  { word: "fans", emoji: "🫶" },
];

const CHIPS = [
  { text: "SEND", top: "12%", left: "6%", rot: -6, delay: 0 },
  { text: "LINK?", top: "4%", left: "42%", rot: 4, delay: 0.4 },
  { text: "PRICE", top: "38%", left: "76%", rot: -3, delay: 0.8 },
  { text: "INFO", top: "62%", left: "8%", rot: 5, delay: 0.2 },
  { text: "ME pls 🥺", top: "70%", left: "60%", rot: -4, delay: 0.6 },
];

export function GenZCard() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % OUT_WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  const current = OUT_WORDS[idx];

  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card/60 p-8 backdrop-blur-sm transition-colors hover:border-mint/30">
      {/* soft radial glow */}
      <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-mint/10 blur-3xl" />

      {/* floating keyword chips (the comments your audience actually leaves) */}
      {CHIPS.map((chip) => (
        <motion.span
          key={chip.text}
          className="absolute hidden cursor-default rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm sm:inline-flex"
          style={{ top: chip.top, left: chip.left }}
          initial={{ opacity: 0, y: 14, rotate: chip.rot }}
          animate={{ opacity: 1, y: [0, -5, 0], rotate: chip.rot }}
          transition={{
            opacity: { delay: chip.delay + 0.4, duration: 0.5 },
            y: { duration: 4 + chip.delay, repeat: Infinity, ease: "easeInOut" },
          }}
          whileHover={{
            scale: 1.15,
            rotate: 0,
            color: "oklch(0.62 0.19 162)",
            borderColor: "oklch(0.62 0.19 162/40%)",
            transition: { type: "spring", stiffness: 400, damping: 12 },
          }}
        >
          {chip.text}
        </motion.span>
      ))}

      <div className="relative flex h-full flex-col justify-end">
        <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <MessageCircle className="h-3 w-3" />
          comment section = sales team
        </div>

        <h3 className="text-3xl font-bold font-heading tracking-tight text-foreground md:text-4xl">
          comments in.
          <br />
          <span className="relative inline-block h-[1.2em] overflow-hidden align-bottom">
            <AnimatePresence mode="wait">
              <motion.span
                key={current.word}
                className="inline-block bg-gradient-to-r from-mint-light via-mint to-emerald bg-clip-text text-transparent"
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                exit={{ y: "-105%" }}
                transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                {current.word} {current.emoji}
              </motion.span>
            </AnimatePresence>
          </span>{" "}
          out.
        </h3>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Someone types one word on your reel — ChirplyMint handles the whole
          funnel. PDFs, links, follow-ups, lead tags. You quite literally do
          nothing.
        </p>

        <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-muted-foreground/70">
          <Heart className="h-3 w-3 fill-rose-500/70 text-rose-500/70" />
          <span>literally zero manual DMs</span>
          <Sparkles className="h-3 w-3 text-mint/70" />
          <span>set it up in 3 minutes</span>
        </div>
      </div>
    </div>
  );
}
