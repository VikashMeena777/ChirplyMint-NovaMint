import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "System Status — ChirplyMint",
  description:
    "Current operational status of ChirplyMint services: webhooks, DM delivery, dashboard, payments, and email.",
};

const systems = [
  {
    name: "Webhook pipeline",
    detail: "Comment and message events from Meta",
  },
  {
    name: "DM delivery",
    detail: "Automated direct messages",
  },
  {
    name: "Dashboard & API",
    detail: "Web app and public API",
  },
  {
    name: "Payments (Cashfree)",
    detail: "Subscriptions and checkout",
  },
  {
    name: "Email (Resend)",
    detail: "Transactional and notification emails",
  },
];

export default function StatusPage() {
  return (
    <div className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-sm font-medium mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(0.52_0.19_162)] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[oklch(0.52_0.19_162)]"></span>
            </span>
            All Systems Operational
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            System Status
          </h1>
          <p className="text-lg text-muted-foreground mt-4">
            Live status of every service that powers ChirplyMint.
          </p>
        </div>

        {/* Status list */}
        <div className="rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">
          {systems.map((system) => (
            <div
              key={system.name}
              className="flex items-center justify-between gap-4 px-6 py-5"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {system.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {system.detail}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[oklch(0.52_0.19_162)]" />
                <span className="text-sm font-medium text-[oklch(0.52_0.19_162)]">
                  Operational
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-sm text-muted-foreground text-center mt-8">
          All times IST. Incidents are posted here within minutes.
        </p>
      </div>
    </div>
  );
}
