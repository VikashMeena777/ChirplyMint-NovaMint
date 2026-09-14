"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle } from "react";

import { cn } from "@/lib/utils";

/**
 * XLogo — the official X (formerly Twitter) mark.
 *
 * The bird-era lucide-animated icon drew with strokes; the X brand mark is
 * a filled glyph, so the hover animation is a springy pop-and-tilt instead
 * of a stroke draw. Same controlled-component API as the other footer
 * icons (startAnimation / stopAnimation via ref).
 */

export interface XLogoHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface XLogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const XLogo = forwardRef<XLogoHandle, XLogoProps>(
  ({ size = 18, className, ...props }, ref) => {
    const controls = useAnimation();

    useImperativeHandle(ref, () => ({
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    }));

    const setHover = useCallback(
      (hovered: boolean) => {
        if (hovered) controls.start("animate");
        else controls.start("normal");
      },
      [controls]
    );

    return (
      <div
        className={cn("flex items-center justify-center", className)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        {...props}
      >
        <motion.svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          role="img"
          aria-hidden="true"
          initial="normal"
          animate={controls}
          variants={{
            normal: { scale: 1, rotate: 0 },
            animate: {
              scale: 1.18,
              rotate: -8,
              transition: { type: "spring", stiffness: 380, damping: 18 },
            },
          }}
        >
          {/* Official X logo path (brand.x.com) */}
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </motion.svg>
      </div>
    );
  }
);

XLogo.displayName = "XLogo";

export { XLogo };
