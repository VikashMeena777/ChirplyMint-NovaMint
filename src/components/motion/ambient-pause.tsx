"use client";

import { useEffect } from "react";

/**
 * AmbientPause — a zero-dependency visibility gate for ambient CSS loops.
 *
 * The homepage's drifting auroras, floating particles, and the marquee sit
 * behind backdrop-filter surfaces (badge, buttons, cards). While such a
 * surface is on screen, every transform tick behind it forces the backdrop
 * to be re-sampled — measured as the single biggest render cost on the page
 * (scroll fps ~doubled when both were removed under 4x CPU throttling).
 *
 * This observer pauses those ambient animations whenever they're not in the
 * viewport, so the cost is only paid where the effect is actually visible.
 * Purely presentational side effects; no state, no re-renders.
 */
export function AmbientPause() {
  useEffect(() => {
    const targets = document.querySelectorAll(
      ".animate-aurora-1, .animate-aurora-2, .animate-aurora-3, " +
        ".animate-float-1, .animate-float-2, .animate-float-3, " +
        ".animate-ping, .animate-shimmer, [class*='animate-[marquee']"
    );
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle("ambient-paused", !e.isIntersecting);
        }
      },
      // generous margin: the glow spreads far past the element box, so keep
      // it moving until it's well clear of the viewport
      { rootMargin: "360px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return null;
}
