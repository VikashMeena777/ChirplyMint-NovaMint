"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function AutomationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Automations failed to load"
      description="Something went wrong loading your automations. Your running automations are not affected."
    />
  );
}
