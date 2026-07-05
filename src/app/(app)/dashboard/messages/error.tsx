"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function MessagesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Messages failed to load"
      description="Something went wrong loading your messages. Please try again."
    />
  );
}
