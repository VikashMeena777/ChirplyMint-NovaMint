"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function BioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Bio Link page failed to load"
      description="Something went wrong loading your Bio Link editor. Your published page is not affected."
    />
  );
}
