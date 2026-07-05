"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Reusable route-level error boundary.
 * Drop into any dashboard/{route}/error.tsx.
 */
export default function RouteErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description = "An error occurred loading this page. Your data is safe.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60 mb-4 font-mono">
          Error: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[oklch(0.52_0.19_162)] text-white text-sm font-medium hover:bg-[oklch(0.48_0.19_162)] transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}
