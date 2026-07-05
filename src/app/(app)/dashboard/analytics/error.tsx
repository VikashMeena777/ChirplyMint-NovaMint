"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function AnalyticsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Analytics failed to load"
      description="Something went wrong loading your analytics. Please try again."
    />
  );
}
