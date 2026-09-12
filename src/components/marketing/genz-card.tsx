"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { MessageCircle, Heart, Sparkles, CheckCircle2 } from "lucide-react";

/**
 * GenZCard — comments in, customers out.
 * Layout: text content on the left, a dedicated chip-playground on the
 * right (chips live ONLY in that zone — never over the text), with a
 * "DM sent" confirmation chip anchoring the story. Rotating word gets a
 * tall mask so emojis/descenders never clip.
 */

const OUT_WORDS = [
  { word: "customers", emoji: "💸" },
  { word: "sales", emoji: "📈" },
  { word: "leads", emoji: "🧲" },
  { word: "fans", emoji: "🫶" },
];

const CHIPS = [
  { text: "SEND", top: "6%", left: "4%", rot: -6, delay: 0 },
  { text: "LINK?", top: "32%", left: "52%", rot: 4, delay: 0.4 },
  { text: "PRICE", top: "58%", left: "8%", rot: -3, delay: 0.8 },
  { text: "INFO", top: "84%", left: "48%", rot: 5, delay: 0.2 },
  { text: "ME pls 🥺", top: "6%", left: "60%", rot: -4, delay: 0.6 },
  { text: "drop it 🙏", top: "58%", left: "62%", rot: 3, delay: 1 },
];

export function GenZCard() {
  const [idx, setIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // The card lives ~2 viewports down; only spend frames on it while it's
  // actually on screen (the word cycle and the chip float both stop when
  // scrolled away instead of running for the whole session).
  const inView = useInView(cardRef, { margin: "120px" });

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % OUT_WORDS.length), 2200);
    return () => clearInterval(t);
  }, [inView]);

  const current = OUT_WORDS[idx];

  return (
    <div ref={cardRef} className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card/60 p-8 backdrop-blur-sm transition-colors hover:border-mint/30">
      {/* soft radial glow */}
      <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-mint/10 blur-3xl" />

      <div className="relative flex h-full flex-col gap-6 sm:flex-row sm:gap-8">
        {/* ── left: the message ── */}
        <div className="flex flex-1 flex-col justify-end">
          <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            comment section = sales team
          </div>

          <h3 className="text-3xl font-bold font-heading tracking-tight text-foreground md:text-4xl">
            comments in.
            <br />
            {/* grid-stack swap: no overflow-hidden anywhere, so the emoji
                and descenders can NEVER be clipped */}
            <span className="inline-grid align-bottom">
              <AnimatePresence mode="wait">
                <motion.span
                  key={current.word}
                  className="col-start-1 row-start-1 inline-block whitespace-nowrap pb-0.5"
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.21, 0.47, 0.32, 0.98] }}
                >
                  {/* gradient on the WORD only — the emoji needs its own
                      colors, bg-clip-text would paint it solid green */}
                  <span className="bg-gradient-to-r from-mint-light via-mint to-emerald bg-clip-text text-transparent">
                    {current.word}
                  </span>{" "}
                  <span aria-hidden>{current.emoji}</span>
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

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-muted-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3 w-3 fill-rose-500/70 text-rose-500/70" />
              literally zero manual DMs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-mint/70" />
              set it up in 3 minutes
            </span>
          </div>
        </div>

        {/* ── right: the chip playground (chips never leave this zone) ── */}
        <div className="relative hidden w-[38%] min-w-[190px] sm:block">
          {CHIPS.map((chip) => (
            <motion.span
              key={chip.text}
              className="absolute cursor-default rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm"
              style={{ top: chip.top, left: chip.left }}
              initial={{ opacity: 0, y: 14, rotate: chip.rot }}
              animate={{ opacity: 1, y: inView ? [0, -5, 0] : 0, rotate: chip.rot }}
              transition={{
                opacity: { delay: chip.delay + 0.4, duration: 0.5 },
                y: inView
                  ? { duration: 4 + chip.delay, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.3 },
              }}
              whileHover={{
                scale: 1.18,
                rotate: 0,
                color: "oklch(0.52 0.19 162)",
                borderColor: "oklch(0.52 0.19 162/45%)",
                transition: { type: "spring", stiffness: 400, damping: 12 },
              }}
            >
              {chip.text}
            </motion.span>
          ))}

          {/* the payoff — DM sent confirmation anchoring the corner */}
          <motion.div
            className="absolute bottom-0 right-0 flex items-center gap-1.5 rounded-xl border border-mint/25 bg-mint/10 px-3 py-2 text-[11px] font-semibold text-mint-dark dark:text-mint-light"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, type: "spring", stiffness: 320, damping: 18 }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            DM sent · 0.4s
          </motion.div>
        </div>

        {/* mobile: chips inline (no absolute chaos on small screens) */}
        <div className="flex flex-wrap gap-2 sm:hidden">
          {["SEND", "LINK?", "PRICE", "ME pls 🥺"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
