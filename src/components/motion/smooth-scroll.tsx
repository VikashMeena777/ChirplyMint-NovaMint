"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ReactLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";

/**
 * Premium inertia scrolling for MARKETING pages only (the dashboard keeps
 * native scroll — data-dense UIs want snappy, not smooth).
 *
 * Exactly one rAF loop: GSAP's ticker drives Lenis. Touch stays native;
 * prefers-reduced-motion disables smoothing automatically.
 *
 * ScrollTrigger is deliberately NOT registered here — nothing in the app
 * creates a ScrollTrigger instance (scroll-in animations use Motion's
 * whileInView / useInView), so registering it only bought us a
 * ScrollTrigger.update() call on every single scroll tick for nothing.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenisRef.current?.lenis?.destroy();
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: 0.1, anchors: { offset: -72 } }}
    >
      {children}
    </ReactLenis>
  );
}
