"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "motion/react";
import { FileText, ImageIcon, Heart, MessageCircle, BadgeCheck } from "lucide-react";

/**
 * LiveDemoCard — an animated Instagram DM phone mockup that plays the
 * actual product story on loop:
 *   comment arrives → typing → window-opener DM with button → tap →
 *   full stack (PDF + carousel) → lead captured.
 *
 * Pure CSS/motion (no video) so it's crisp at every size and weighs
 * nothing. This replaces the old glass stats card in the hero.
 */

type Phase = "comment" | "typing" | "opener" | "stack" | "captured";

const bubble = {
  initial: { opacity: 0, y: 14, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { type: "spring" as const, stiffness: 380, damping: 28 },
} satisfies HTMLMotionProps<"div">;


const SEQUENCE: { phase: Phase; ms: number }[] = [
  { phase: "comment", ms: 2600 },
  { phase: "typing", ms: 1400 },
  { phase: "opener", ms: 2600 },
  { phase: "stack", ms: 3400 },
  { phase: "captured", ms: 2600 },
];



export function LiveDemoCard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % SEQUENCE.length), SEQUENCE[step].ms);
    return () => clearTimeout(t);
  }, [step]);

  const phase = SEQUENCE[step].phase;
  const show = (p: Phase) => {
    const order: Phase[] = SEQUENCE.map((s) => s.phase);
    const cur = order.indexOf(phase);
    const mine = order.indexOf(p);
    return mine !== -1 && mine <= cur;
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* Ambient glow behind the phone */}
      <div aria-hidden className="absolute -inset-8 rounded-[3rem] bg-mint/10 blur-3xl" />

      {/* Phone frame */}
      <div className="relative rounded-[2.6rem] border border-border bg-neutral-950 p-2.5 shadow-[0_32px_80px_-24px_oklch(0_0_0/70%)]">
        <div className="overflow-hidden rounded-[2rem] bg-background">
          {/* Notch */}
          <div className="relative flex items-center justify-center pt-2.5 pb-1">
            <div className="h-5 w-24 rounded-full bg-neutral-950" />
          </div>

          {/* IG header */}
          <div className="flex items-center gap-3 border-b border-border/70 px-4 pb-3">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-mint to-emerald p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                  <span className="text-xs font-bold font-heading text-mint">CM</span>
                </div>
              </div>
              <BadgeCheck className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-background fill-sky-500 text-background" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">chirplymint.demo</p>
              <p className="text-[10px] text-muted-foreground">Active now</p>
            </div>
          </div>

          {/* Conversation */}
          <div className="flex h-[380px] flex-col justify-end gap-2.5 overflow-hidden px-3.5 py-4">
            <AnimatePresence>
              {/* Phase 1: the comment (outside app, shown as a notification chip) */}
              {show("comment") && (
                <motion.div key="comment" {...bubble} className="mx-auto w-full max-w-[95%]">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/80 px-3.5 py-2.5 backdrop-blur-sm">
                    <Heart className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" />
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">@fitness_fan</span> commented:{" "}
                      <span className="font-semibold text-mint">SEND</span>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Phase 2: typing indicator */}
              {phase === "typing" && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-fit rounded-2xl rounded-bl-md bg-muted px-4 py-3"
                >
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Phase 3: window-opener DM with button */}
              {show("opener") && phase !== "captured" && (
                <motion.div key="opener" {...bubble} className="ml-auto w-fit max-w-[85%]">
                  <div className="rounded-2xl rounded-br-md bg-gradient-mint px-4 py-3 text-[12px] leading-relaxed text-white shadow-lg">
                    <p>Here&apos;s the 7-day shred guide 📩</p>
                    <div className="mt-2 flex">
                      <span className="rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm">
                        Send it to me
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-right text-[9px] text-muted-foreground">Delivered · instant</p>
                </motion.div>
              )}

              {/* Phase 4: the full stack lands */}
              {show("stack") && phase !== "captured" && (
                <motion.div key="stack" className="ml-auto flex w-fit max-w-[85%] flex-col gap-2">
                  <motion.div {...bubble} className="rounded-2xl rounded-br-md border border-mint/30 bg-mint/10 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15">
                        <FileText className="h-4 w-4 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-foreground">7-Day Shred Guide.pdf</p>
                        <p className="text-[9px] text-muted-foreground">2.4 MB · tap to read</p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div {...bubble} className="rounded-2xl rounded-br-md border border-mint/30 bg-mint/10 p-2.5">
                    <div className="grid grid-cols-3 gap-1">
                      {["from-violet-400/70 to-fuchsia-500/70", "from-sky-400/70 to-cyan-500/70", "from-amber-400/70 to-orange-500/70"].map(
                        (g, i) => (
                          <div key={i} className={`flex h-14 items-center justify-center rounded-lg bg-gradient-to-br ${g}`}>
                            <ImageIcon className="h-4 w-4 text-white/80" />
                          </div>
                        )
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Phase 5: lead captured */}
              {phase === "captured" && (
                <motion.div
                  key="captured"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className="mx-auto flex flex-col items-center gap-2 py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.1 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-mint/15 ring-2 ring-mint/40"
                  >
                    <MessageCircle className="h-6 w-6 text-mint" />
                  </motion.div>
                  <p className="text-sm font-semibold text-foreground">Lead captured</p>
                  <p className="text-[11px] text-muted-foreground">
                    @fitness_fan · tagged <span className="text-mint font-medium">#interested</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fake input bar */}
          <div className="border-t border-border/70 px-3.5 py-2.5">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2">
              <span className="text-[11px] text-muted-foreground">Message…</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating "automated" badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="absolute -right-3 top-14 rounded-2xl border border-mint/25 bg-card/85 px-3.5 py-2 shadow-xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Automated
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">0 human touches</p>
      </motion.div>
    </div>
  );
}
