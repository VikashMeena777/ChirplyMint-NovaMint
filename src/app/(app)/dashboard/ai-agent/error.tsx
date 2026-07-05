"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function AIAgentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="AI Agent failed to load"
      description="Something went wrong loading your AI Agent settings. Please try again."
    />
  );
}
