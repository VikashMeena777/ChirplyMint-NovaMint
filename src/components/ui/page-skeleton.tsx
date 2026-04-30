"use client";

/**
 * Reusable skeleton loaders for dashboard pages.
 * Replaces raw <Loader2 animate-spin> with professional shimmer placeholders.
 */

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-muted/50" />
      </div>
      <div className="h-7 w-16 rounded-lg bg-muted/50 mb-2" />
      <div className="h-4 w-28 rounded bg-muted/40" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-sm animate-pulse">
      <div className="h-5 w-40 rounded bg-muted/50 mb-6" />
      <div className="flex items-end gap-2 h-48">
        {[40, 65, 30, 80, 55, 45, 70].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full rounded-t-lg bg-muted/40"
              style={{ height: `${h}%` }}
            />
            <div className="w-6 h-3 rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AutomationCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-5 w-36 rounded bg-muted/50" />
            <div className="h-5 w-14 rounded-full bg-muted/40" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-4 w-24 rounded bg-muted/40" />
            <div className="h-4 w-20 rounded bg-muted/30" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-muted/40" />
          <div className="w-9 h-9 rounded-lg bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-muted/50 shrink-0" />
      <div className="flex-1 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted/40"
            style={{ width: `${20 + i * 8}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-2 border-b border-border pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-muted/40" />
        ))}
      </div>
      <div className="rounded-2xl bg-card border border-border p-6 space-y-5">
        <div className="h-5 w-32 rounded bg-muted/50" />
        <div className="h-11 w-full max-w-md rounded-xl bg-muted/40" />
        <div className="h-5 w-24 rounded bg-muted/50" />
        <div className="h-11 w-full max-w-md rounded-xl bg-muted/40" />
        <div className="h-10 w-32 rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}

export function LeadsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-32 rounded-lg bg-muted/50 mb-2" />
        <div className="h-4 w-64 rounded bg-muted/40" />
      </div>
      {/* Search + Filter bar */}
      <div className="flex gap-3">
        <div className="flex-1 h-11 rounded-xl bg-muted/40" />
        <div className="w-32 h-11 rounded-xl bg-muted/40" />
        <div className="w-28 h-11 rounded-xl bg-muted/40" />
      </div>
      {/* Cards */}
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted/50" />
              <div className="h-3 w-48 rounded bg-muted/30" />
            </div>
            <div className="flex gap-2">
              <div className="w-16 h-6 rounded-full bg-muted/40" />
              <div className="w-8 h-8 rounded-lg bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-40 rounded-lg bg-muted/50 mb-2" />
        <div className="h-4 w-56 rounded bg-muted/40" />
      </div>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 rounded bg-muted/50" />
              <div className="h-3 w-64 rounded bg-muted/30" />
            </div>
            <div className="h-3 w-16 rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 rounded-lg bg-muted/50 mb-2" />
          <div className="h-4 w-48 rounded bg-muted/40" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-muted/40" />
      </div>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="w-9 h-9 rounded-full bg-muted/50 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted/50" />
              <div className="h-3 w-36 rounded bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BioSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-36 rounded-lg bg-muted/50 mb-2" />
        <div className="h-4 w-64 rounded bg-muted/40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
          <div className="h-5 w-28 rounded bg-muted/50" />
          <div className="h-11 w-full rounded-xl bg-muted/40" />
          <div className="h-20 w-full rounded-xl bg-muted/40" />
          <div className="h-5 w-20 rounded bg-muted/50" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-muted/40" />
              <div className="flex-1 h-10 rounded-lg bg-muted/40" />
              <div className="w-8 h-8 rounded bg-muted/30" />
            </div>
          ))}
        </div>
        {/* Preview */}
        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="w-20 h-20 rounded-full bg-muted/50 mx-auto mb-4" />
          <div className="h-5 w-32 rounded bg-muted/50 mx-auto mb-2" />
          <div className="h-3 w-48 rounded bg-muted/30 mx-auto mb-6" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full rounded-xl bg-muted/40 mb-3" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AIAgentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-36 rounded-lg bg-muted/50 mb-2" />
        <div className="h-4 w-72 rounded bg-muted/40" />
      </div>
      {/* Config card */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-muted/50" />
        <div className="h-24 w-full rounded-xl bg-muted/40" />
        <div className="h-5 w-28 rounded bg-muted/50" />
        <div className="h-11 w-full rounded-xl bg-muted/40" />
        <div className="h-5 w-20 rounded bg-muted/50" />
        <div className="h-24 w-full rounded-xl bg-muted/40" />
      </div>
      {/* FAQ section */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
        <div className="h-5 w-40 rounded bg-muted/50" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="flex-1 h-10 rounded-lg bg-muted/40" />
            <div className="flex-1 h-10 rounded-lg bg-muted/40" />
            <div className="w-8 h-8 rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InstagramTabSkeleton() {
  return (
    <div className="space-y-4 max-w-md animate-pulse">
      <div className="rounded-xl border border-border p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted/50" />
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted/50" />
            <div className="h-3 w-28 rounded bg-muted/30" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-muted/30" />
        <div className="h-10 w-32 rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}

export function PageSkeleton({ type = "dashboard" }: { type?: "dashboard" | "analytics" | "automations" | "settings" | "leads" | "messages" | "notifications" | "bio" | "ai-agent" }) {
  if (type === "dashboard") {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-7 w-48 rounded-lg bg-muted/50 mb-2" />
          <div className="h-4 w-72 rounded bg-muted/40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (type === "analytics") {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-32 rounded-lg bg-muted/50 mb-2" />
          <div className="h-4 w-64 rounded bg-muted/40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (type === "automations") {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-7 w-40 rounded-lg bg-muted/50 mb-2" />
          <div className="h-10 w-full rounded-xl bg-muted/40" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <AutomationCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (type === "leads") return <LeadsSkeleton />;
  if (type === "messages") return <MessagesSkeleton />;
  if (type === "notifications") return <NotificationsSkeleton />;
  if (type === "bio") return <BioSkeleton />;
  if (type === "ai-agent") return <AIAgentSkeleton />;

  return <SettingsSkeleton />;
}
