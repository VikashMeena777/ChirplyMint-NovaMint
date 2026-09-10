"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, ImageIcon, Heart, BadgeCheck, UserPlus } from "lucide-react";

/**
 * LiveDemoCard — animated Instagram DM phone mockup playing the product
 * story on loop:
 *   comment notification → typing → window-opener DM with button →
 *   PDF + carousel stack → lead captured → gentle fade → restart.
 *
 * The conversation only ACCUMULATES (anchored to the bottom like a real
 * chat) — nothing jumps in or out mid-story; the whole thread fades
 * together at the loop boundary. Pure CSS/motion, no video.
 */

const TIMELINE = [
  { ms: 2000 }, // 0: comment notification slides in
  { ms: 1300 }, // 1: typing dots
  { ms: 2200 }, // 2: opener DM
  { ms: 1900 }, // 3: PDF
  { ms: 1900 }, // 4: carousel
  { ms: 2400 }, // 5: lead captured chip
  { ms: 1600 }, // 6: hold, then fade + restart
];

const bubbleAnim = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring" as const, stiffness: 380, damping: 26 },
};

export function LiveDemoCard() {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setStep((s) => {
        if (s === TIMELINE.length - 1) {
          setRun((r) => r + 1); // fade out + restart
          return 0;
        }
        return s + 1;
      });
    }, TIMELINE[step].ms);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="relative mx-auto w-full max-w-[350px]">
      {/* Ambient glow behind the phone */}
      <div aria-hidden className="absolute -inset-10 rounded-[3.5rem] bg-mint/10 blur-3xl" />

      {/* Phone frame */}
      <div className="relative rounded-[2.8rem] border border-border bg-neutral-950 p-2 shadow-[0_40px_90px_-28px_oklch(0_0_0/75%)]">
        <div className="relative overflow-hidden rounded-[2.2rem] bg-background">
          {/* Status bar + notch */}
          <div className="relative flex items-center justify-between px-6 pt-3 pb-1">
            <span className="text-[10px] font-medium text-foreground/80">9:41</span>
            <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-neutral-950" />
            <span className="text-[10px] font-medium text-foreground/80">5G</span>
          </div>

          {/* IG chat header */}
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-mint to-emerald p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                  <span className="text-[10px] font-bold font-heading text-mint">CM</span>
                </div>
              </div>
              <BadgeCheck className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-background fill-sky-500 text-background" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">chirplymint.demo</p>
              <p className="text-[10px] text-muted-foreground">Active now</p>
            </div>
          </div>

          {/* Conversation — grows upward like a real chat */}
          <div className="relative flex h-[420px] flex-col justify-end gap-2.5 overflow-hidden px-3.5 py-4">
            {/* Comment notification pinned at top */}
            <AnimatePresence>
              <motion.div
                key="notif"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-3.5 top-4 z-10"
              >
                <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/90 px-3.5 py-2.5 shadow-lg backdrop-blur-xl">
                  <Heart className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground">@fitness_fan</span> commented:{" "}
                    <span className="font-semibold text-mint">SEND</span>
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Bubbles — keyed by run so the whole thread fades out together on restart */}
            <AnimatePresence mode="wait">
              <motion.div
                key={run}
                exit={{ opacity: 0, transition: { duration: 0.5 } }}
                className="flex flex-col justify-end gap-2.5"
              >
                {/* typing → opener */}
                {step === 1 && (
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

                {step >= 2 && (
                  <motion.div {...bubbleAnim} className="ml-auto w-fit max-w-[85%]">
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

                {step >= 3 && (
                  <motion.div {...bubbleAnim} className="ml-auto w-fit max-w-[85%]">
                    <div className="rounded-2xl rounded-br-md border border-mint/30 bg-mint/10 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                          <FileText className="h-4 w-4 text-rose-400" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-foreground">7-Day Shred Guide.pdf</p>
                          <p className="text-[9px] text-muted-foreground">2.4 MB · tap to read</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step >= 4 && (
                  <motion.div {...bubbleAnim} className="ml-auto w-fit max-w-[85%]">
                    <div className="rounded-2xl rounded-br-md border border-mint/30 bg-mint/10 p-2.5">
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          "from-violet-400/70 to-fuchsia-500/70",
                          "from-sky-400/70 to-cyan-500/70",
                          "from-amber-400/70 to-orange-500/70",
                        ].map((g, i) => (
                          <div key={i} className={`flex h-14 items-center justify-center rounded-lg bg-gradient-to-br ${g}`}>
                            <ImageIcon className="h-4 w-4 text-white/80" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step >= 5 && (
                  <motion.div {...bubbleAnim} className="mx-auto w-fit">
                    <div className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3.5 py-1.5">
                      <UserPlus className="h-3 w-3 text-mint" />
                      <p className="text-[10px] font-medium text-foreground">
                        Lead captured · tagged <span className="text-mint">#interested</span>
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input bar */}
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
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute -right-4 top-20 hidden rounded-2xl border border-mint/25 bg-card/85 px-3.5 py-2 shadow-xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Automated</span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">0 human touches</p>
      </motion.div>
    </div>
  );
}
