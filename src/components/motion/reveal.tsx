"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type RevealProps = {
  children: ReactNode;
  /** pixels travelled on entrance */
  y?: number;
  delay?: number;
  className?: string;
  /** once = fire and stay; false replays every enter */
  once?: boolean;
};

/**
 * Scroll-triggered entrance wrapper. Respects reduced motion by rendering
 * content statically (no hidden-until-scroll traps for anyone).
 */
export default function Reveal({ children, y = 36, delay = 0, className, once = true }: RevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(root.current, {
        y,
        autoAlpha: 0,
        duration: 0.9,
        delay,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 88%", once },
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
