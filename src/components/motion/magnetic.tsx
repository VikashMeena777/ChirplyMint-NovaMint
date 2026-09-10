"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";

/**
 * Magnetic hover wrapper — the child drifts toward the cursor and springs
 * back on leave. Desktop pointers only; touch renders it plain.
 */
export default function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "translate(0px, 0px)";
    window.setTimeout(() => {
      if (ref.current) ref.current.style.transition = "";
    }, 500);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="inline-block"
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.div>
  );
}
