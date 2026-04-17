"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-border bg-card" />
    );
  }

  const next =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  const Icon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      onClick={() => setTheme(next)}
      className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      title={`Theme: ${theme} → ${next}`}
      aria-label={`Switch to ${next} theme`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
