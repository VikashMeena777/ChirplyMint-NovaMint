"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/**
 * IntroOverlay — one-time opening animation for the landing page.
 * Logo mark scales in with a ring pulse, wordmark fades up, then the
 * whole curtain wipes upward revealing the hero. Plays ONCE per
 * browser session (sessionStorage) so repeat visits stay instant.
 */
export function IntroOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // SSR guard + once-per-session
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("cm_intro_played")) return;
    sessionStorage.setItem("cm_intro_played", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="relative flex flex-col items-center gap-5">
            {/* pulsing rings */}
            <motion.span
              aria-hidden
              className="absolute h-20 w-20 rounded-full border border-mint/40"
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{ scale: [0.6, 1.6], opacity: [0.8, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-mint text-2xl font-bold text-white shadow-[0_0_50px_-8px_oklch(0.62_0.19_162/60%)]"
              initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              ✨
            </motion.div>
            <motion.div
              className="overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <motion.p
                className="text-2xl font-bold font-heading tracking-tight text-foreground"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                Chirply<span className="text-mint">Mint</span>
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
