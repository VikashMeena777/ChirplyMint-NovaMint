"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
        style={{
          background: "oklch(0.6 0.2 30 / 10%)",
        }}
      >
        <AlertTriangle
          className="w-8 h-8"
          style={{ color: "oklch(0.6 0.2 30)" }}
        />
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-[oklch(0.65_0.02_260)] mb-1 max-w-md">
        An unexpected error occurred while loading this page.
        Please try again or return to the dashboard.
      </p>
      {error.digest && (
        <p className="text-xs text-[oklch(0.45_0.02_260)] mb-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: "oklch(0.52 0.19 162)",
            color: "white",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: "oklch(0.25 0.02 260)",
            color: "oklch(0.75 0.02 260)",
            border: "1px solid oklch(0.3 0.02 260)",
          }}
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
