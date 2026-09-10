"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  ImageIcon,
  Heart,
  BadgeCheck,
  UserPlus,
  ChevronLeft,
  Phone,
  Video,
  Camera,
  Mic,
  PlusSquare,
  Search,
} from "lucide-react";

/**
 * LiveDemoCard — a realistic iPhone 15 Pro-style mockup running an
 * Instagram DM conversation that plays the product story on loop:
 *   comment notification → typing → opener DM with button →
 *   PDF + carousel stack → lead captured → gentle fade → restart.
 *
 * Realism details: titanium frame, dynamic island, side buttons, screen
 * glare, true IG DM colors (sent = IG blue gradient), and a slow idle
 * float. The chat only accumulates; the thread fades together at the
 * loop boundary.
 */

const TIMELINE = [
  { ms: 2000 }, // 0: comment notification
  { ms: 1300 }, // 1: typing dots
  { ms: 2200 }, // 2: opener DM
  { ms: 1900 }, // 3: PDF
  { ms: 1900 }, // 4: carousel
  { ms: 2400 }, // 5: lead captured chip
  { ms: 1600 }, // 6: hold → fade + restart
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
          setRun((r) => r + 1);
          return 0;
        }
        return s + 1;
      });
    }, TIMELINE[step].ms);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="relative mx-auto w-full max-w-[330px]">
      {/* ambient glow */}
      <div aria-hidden className="absolute -inset-12 rounded-[4rem] bg-mint/10 blur-3xl" />

      {/* idle float wrapper */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
        style={{ perspective: 1200 }}
      >
        {/* subtle 3D tilt for dimension */}
        <motion.div
          style={{ transformStyle: "preserve-3d", rotateY: -7, rotateX: 3 }}
          className="relative"
        >
          {/* side buttons (titanium) */}
          <div aria-hidden className="absolute -left-[3px] top-[120px] h-10 w-[3px] rounded-l-sm bg-gradient-to-b from-zinc-500 via-zinc-700 to-zinc-500" />
          <div aria-hidden className="absolute -left-[3px] top-[180px] h-14 w-[3px] rounded-l-sm bg-gradient-to-b from-zinc-500 via-zinc-700 to-zinc-500" />
          <div aria-hidden className="absolute -left-[3px] top-[248px] h-14 w-[3px] rounded-l-sm bg-gradient-to-b from-zinc-500 via-zinc-700 to-zinc-500" />
          <div aria-hidden className="absolute -right-[3px] top-[190px] h-20 w-[3px] rounded-r-sm bg-gradient-to-b from-zinc-500 via-zinc-700 to-zinc-500" />

          {/* titanium frame */}
          <div className="relative rounded-[3.2rem] bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-600 p-[3px] shadow-[0_50px_100px_-30px_oklch(0_0_0/85%),0_0_0_1px_oklch(1_0_0/8%)]">
            <div className="rounded-[3rem] bg-neutral-950 p-[10px]">
              {/* screen */}
              <div className="relative overflow-hidden rounded-[2.4rem] bg-white dark:bg-neutral-900">
                {/* dynamic island */}
                <div className="absolute left-1/2 top-2 z-30 h-[26px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
                {/* screen glare */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-20 opacity-[0.07]"
                  style={{
                    background:
                      "linear-gradient(115deg, transparent 20%, white 38%, white 42%, transparent 60%)",
                  }}
                />

                {/* status bar */}
                <div className="flex items-center justify-between px-7 pt-3 text-[11px] font-semibold text-neutral-900 dark:text-white">
                  <span>9:41</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-3 rounded-[2px] border border-current" />
                    <span className="inline-block h-2 w-4 rounded-[2px] bg-current opacity-80" />
                  </span>
                </div>

                {/* IG DM header */}
                <div className="flex items-center gap-3 px-4 pb-2.5 pt-3">
                  <ChevronLeft className="h-5 w-5 shrink-0 text-neutral-900 dark:text-white" />
                  <div className="relative shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-mint to-emerald p-[2px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-neutral-900">
                        <span className="text-[9px] font-bold font-heading text-mint">CM</span>
                      </div>
                    </div>
                    <BadgeCheck className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white fill-sky-500 text-white dark:bg-neutral-900" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-white">chirplymint.demo</p>
                    <p className="text-[10px] text-neutral-400">active now</p>
                  </div>
                  <Phone className="h-4 w-4 text-neutral-900 dark:text-white" />
                  <Video className="h-4 w-4 text-neutral-900 dark:text-white" />
                </div>

                {/* conversation — accumulates like a real chat */}
                <div className="relative flex h-[430px] flex-col justify-end gap-2 overflow-hidden bg-neutral-50/60 px-3 py-3 dark:bg-neutral-950/60">
                  {/* comment notification */}
                  <AnimatePresence>
                    <motion.div
                      key="notif"
                      initial={{ opacity: 0, y: -18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-x-3 top-3 z-10"
                    >
                      <div className="flex items-center gap-2 rounded-2xl border border-neutral-200/70 bg-white/90 px-3 py-2.5 shadow-lg backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/90">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/15">
                          <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                        </div>
                        <p className="text-[11px] leading-snug text-neutral-600 dark:text-neutral-300">
                          <span className="font-semibold text-neutral-900 dark:text-white">@fitness_fan</span> commented:{" "}
                          <span className="font-semibold text-mint">SEND</span>
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={run}
                      exit={{ opacity: 0, transition: { duration: 0.5 } }}
                      className="flex flex-col justify-end gap-2"
                    >
                      {step === 1 && (
                        <motion.div
                          key="typing"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="ml-auto w-fit rounded-2xl rounded-br-md bg-neutral-200 px-3.5 py-2.5 dark:bg-neutral-800"
                        >
                          <div className="flex gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-neutral-500 dark:bg-neutral-400"
                                animate={{ y: [0, -3, 0] }}
                                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {step >= 2 && (
                        <motion.div {...bubbleAnim} className="ml-auto w-fit max-w-[85%]">
                          {/* IG sent bubble: their signature blue gradient */}
                          <div className="rounded-[20px] rounded-br-md bg-gradient-to-br from-[#5B51D8] via-[#833AB4] to-[#C13584] px-3.5 py-2.5 text-[12px] leading-relaxed text-white shadow-md">
                            <p>Here&apos;s the 7-day shred guide 📩</p>
                            <div className="mt-1.5 flex">
                              <span className="rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-semibold">Send it to me</span>
                            </div>
                          </div>
                          <p className="mt-1 pr-1 text-right text-[9px] text-neutral-400">Delivered</p>
                        </motion.div>
                      )}

                      {step >= 3 && (
                        <motion.div {...bubbleAnim} className="ml-auto w-fit max-w-[85%]">
                          <div className="rounded-[20px] rounded-br-md bg-neutral-200 px-3 py-2.5 dark:bg-neutral-800">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/15">
                                <FileText className="h-4 w-4 text-rose-500" />
                              </div>
                              <div>
                                <p className="text-[12px] font-semibold text-neutral-900 dark:text-white">7-Day Shred Guide.pdf</p>
                                <p className="text-[9px] text-neutral-400">2.4 MB</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {step >= 4 && (
                        <motion.div {...bubbleAnim} className="ml-auto w-fit max-w-[85%]">
                          <div className="rounded-[20px] rounded-br-md bg-neutral-200 p-2 dark:bg-neutral-800">
                            <div className="grid grid-cols-3 gap-1">
                              {["from-violet-400 to-fuchsia-500", "from-sky-400 to-cyan-500", "from-amber-400 to-orange-500"].map((g, i) => (
                                <div key={i} className={`flex h-14 items-center justify-center rounded-lg bg-gradient-to-br ${g}`}>
                                  <ImageIcon className="h-4 w-4 text-white/85" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {step >= 5 && (
                        <motion.div {...bubbleAnim} className="mx-auto w-fit">
                          <div className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5">
                            <UserPlus className="h-3 w-3 text-mint" />
                            <p className="text-[10px] font-medium text-neutral-700 dark:text-neutral-200">
                              Lead captured · <span className="text-mint">#interested</span>
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* IG input bar */}
                <div className="flex items-center gap-2.5 border-t border-neutral-100 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <Camera className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                  </div>
                  <div className="flex flex-1 items-center justify-between rounded-full border border-neutral-200 px-3.5 py-1.5 dark:border-neutral-700">
                    <span className="text-[11px] text-neutral-400">Message…</span>
                    <Mic className="h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <PlusSquare className="h-4.5 w-4.5 shrink-0 text-neutral-600 dark:text-neutral-300" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* status chips under the phone — flow layout, never overlaps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-card/80 px-3.5 py-1.5 shadow-sm backdrop-blur-xl">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Automated · 0 human touches
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[11px] text-muted-foreground">
          <Search className="h-3 w-3" />
          runs on your account, every comment, 24/7
        </span>
      </motion.div>
    </div>
  );
}
