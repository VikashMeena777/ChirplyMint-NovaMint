"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function SettingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Settings failed to load"
      description="Something went wrong loading your settings. Please try again."
    />
  );
}
