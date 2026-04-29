"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface FeedItem {
  id: string;
  detail: string;
  timeAgo: string;
}

interface LiveActivityFeedProps {
  initialItems?: FeedItem[];
}

/**
 * Live Activity Feed — floating toast-style feed on the landing page.
 * Shows anonymized, real user activity from dm_logs as social proof.
 * Cycles through items every 4 seconds with a slide-in animation.
 */
export function LiveActivityFeed({ initialItems = [] }: LiveActivityFeedProps) {
  const [items] = useState<FeedItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const cycleNext = useCallback(() => {
    if (items.length <= 1) return;
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setIsVisible(true);
    }, 400);
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0) return;
    const interval = setInterval(cycleNext, 4000);
    return () => clearInterval(interval);
  }, [items.length, cycleNext]);

  if (items.length === 0) return null;

  const current = items[currentIndex];

  return (
    <div className="fixed bottom-6 left-6 z-40 max-w-xs">
      <AnimatePresence mode="wait">
        {isVisible && current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-lg shadow-black/5"
          >
            {/* Pulse dot */}
            <div className="relative mt-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-60" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">
                {current.detail}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {current.timeAgo}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity counter badge */}
      {items.length > 1 && (
        <div className="mt-2 flex items-center justify-center">
          <div className="flex gap-1">
            {items.slice(0, Math.min(5, items.length)).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex % Math.min(5, items.length)
                    ? "bg-[oklch(0.52_0.19_162)]"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
