"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function LeadsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Leads failed to load"
      description="Something went wrong loading your leads. Your data is safe."
    />
  );
}
