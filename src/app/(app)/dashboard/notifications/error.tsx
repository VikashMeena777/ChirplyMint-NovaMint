"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function NotificationsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Notifications failed to load"
      description="Something went wrong loading your notifications. Please try again."
    />
  );
}
