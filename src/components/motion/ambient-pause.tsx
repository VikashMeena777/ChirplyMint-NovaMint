"use client";

import { useEffect } from "react";

/**
 * AmbientPause — gating for the page's ambient CSS animation loops.
 *
 * Three rules, all implemented with plain class toggles (no state, no
 * re-renders, nothing reactive):
 *
 * 1. OFF-SCREEN → pause. Aurora glows, particles, the marquee and the
 *    pings only run while they're actually near the viewport.
 *
 * 2. DURING SCROLL → pause. The drift loops are 22–32 seconds long, so
 *    freezing them for a few hundred milliseconds while the user scrolls
 *    is imperceptible — but it removes the page's single most expensive
 *    interaction (moving content behind backdrop-filter surfaces forces
 *    them to be re-sampled every frame) exactly during the frames that
 *    must be smooth.
 *
 * 3. AFTER FIRST PAINT → promote the drifting blobs to compositor
 *    layers. A ~990px gradient whose transform animates without a layer
 *    repaints every frame; with a layer it paints once and only the
 *    transform updates. The layer is deliberately NOT requested in CSS
 *    (a standing will-change allocates ~22MB of backing stores during
 *    load and measurably delays LCP) — it's added here once the page has
 *    settled.
 */
export function AmbientPause() {
  useEffect(() => {
    const AMBIENT_SELECTOR =
      ".animate-aurora-1, .animate-aurora-2, .animate-aurora-3, " +
      ".animate-float-1, .animate-float-2, .animate-float-3, " +
      ".animate-ping, .animate-shimmer, [class*='animate-[marquee'], " +
      ".demo-dot, .demo-float, .demo-ripple";

    // ── 1. off-screen pause ──
    const targets = document.querySelectorAll(AMBIENT_SELECTOR);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle("ambient-paused", !e.isIntersecting);
        }
      },
      // generous margin: the glow spreads far past the element box
      { rootMargin: "360px" }
    );
    targets.forEach((t) => io.observe(t));

    // ── 2. during-scroll pause ──
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      document.documentElement.classList.add("ambient-scrolling");
      if (settleTimer) clearTimeout(settleTimer);
      // Lenis keeps emitting scroll events while the lerp settles, so the
      // class naturally stays on until scrolling has really stopped.
      settleTimer = setTimeout(() => {
        document.documentElement.classList.remove("ambient-scrolling");
      }, 220);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── 3. post-paint layer promotion for the drifting blobs ──
    let promoteCancelled = false;
    const cancelPromote = (() => {
      const promote = () => {
        if (promoteCancelled) return;
        document
          .querySelectorAll(
            ".aurora.animate-aurora-1, .aurora.animate-aurora-2, .aurora.animate-aurora-3"
          )
          .forEach((el) => el.classList.add("aurora-layered"));
      };
      if (typeof requestIdleCallback === "function") {
        const id = requestIdleCallback(promote, { timeout: 2200 });
        return () => cancelIdleCallback(id);
      }
      const id = setTimeout(promote, 1400);
      return () => clearTimeout(id);
    })();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (settleTimer) clearTimeout(settleTimer);
      promoteCancelled = true;
      cancelPromote();
    };
  }, []);

  return null;
}
