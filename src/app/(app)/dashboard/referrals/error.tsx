"use client";
import RouteErrorBoundary from "@/components/ui/route-error-boundary";

export default function ReferralsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="Referrals failed to load"
      description="Something went wrong loading your referral program. Please try again."
    />
  );
}
