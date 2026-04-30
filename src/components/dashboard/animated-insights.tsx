"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Fade-in animation wrapper for analytics page sections.
 * Provides staggered reveal on mount.
 */
export function FadeInSection({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.5s ease, transform 0.5s ease`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Animated bar that grows from 0 to target width on mount.
 */
export function AnimatedBar({
  width,
  className,
  delay = 0,
}: {
  width: string;
  className: string;
  delay?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay + 200);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        width: mounted ? width : "0%",
        transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    />
  );
}
