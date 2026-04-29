"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Rocket,
} from "lucide-react";
import { SetupStatus } from "@/lib/actions/setup";
import { dismissSetupChecklist } from "@/lib/actions/setup";

interface SetupChecklistProps {
  initialStatus: SetupStatus;
}

export function SetupChecklist({ initialStatus }: SetupChecklistProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Don't render if dismissed or all complete
  useEffect(() => {
    if (status.dismissed || status.allComplete) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [status.dismissed, status.allComplete]);

  if (!isVisible) return null;

  const progress = (status.completedCount / status.totalCount) * 100;

  async function handleDismiss() {
    setIsDismissing(true);
    const result = await dismissSetupChecklist();
    if (result.success) {
      setStatus((prev) => ({ ...prev, dismissed: true }));
    }
    setIsDismissing(false);
  }

  return (
    <div
      className={`rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-500 ${
        status.dismissed || status.allComplete
          ? "opacity-0 scale-95 max-h-0"
          : "opacity-100 scale-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Get Started with ChirplyMint
            </h3>
            <p className="text-xs text-muted-foreground">
              {status.completedCount}/{status.totalCount} steps completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={isExpanded ? "Collapse checklist" : "Expand checklist"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isDismissing}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            aria-label="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 pb-3">
        <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.65_0.18_155)] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-1">
          {status.steps.map((step, index) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                step.completed
                  ? "bg-[oklch(0.52_0.19_162/5%)]"
                  : "hover:bg-muted/30"
              }`}
            >
              {/* Step Icon */}
              <div className="shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />
                ) : (
                  <div className="relative">
                    <Circle className="w-5 h-5 text-muted-foreground/40" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.completed
                      ? "text-[oklch(0.52_0.19_162)] line-through decoration-[oklch(0.52_0.19_162/40%)]"
                      : "text-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
