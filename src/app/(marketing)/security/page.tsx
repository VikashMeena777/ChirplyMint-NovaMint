import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Security — ChirplyMint",
  description:
    "How ChirplyMint protects your account and data: row-level security, hashed API keys, webhook signature verification, and more.",
};

const measures = [
  {
    title: "Row-Level Security on every table",
    description:
      "Database access is scoped per workspace at the database level, with least-privilege column grants. No client can read another workspace's rows.",
  },
  {
    title: "Hashed API keys",
    description:
      "Public API keys are stored as SHA-256 hashes and shown to you exactly once at creation. We can never display a key again — only revoke and reissue.",
  },
  {
    title: "Webhook signature verification",
    description:
      "Every inbound webhook is verified with HMAC signatures — Meta for Instagram events, Cashfree for payment events. Invalid signatures are rejected fail-closed.",
  },
  {
    title: "CSRF-protected OAuth",
    description:
      "Instagram connect flows use the official Meta OAuth with a state parameter to prevent cross-site request forgery and authorization injection.",
  },
  {
    title: "Rate limiting on all API routes",
    description:
      "Every API endpoint is rate-limited to protect the platform and your account from abuse and runaway automations.",
  },
  {
    title: "Encrypted secrets",
    description:
      "All credentials and tokens are stored as encrypted environment variables on Vercel — never in the codebase or the client bundle.",
  },
  {
    title: "One-click data deletion",
    description:
      "You can delete your account and all associated data from Settings at any time, meeting Meta's data-deletion requirements.",
  },
  {
    title: "Service-role isolation",
    description:
      "Admin-level database keys live exclusively on the server. The browser client never touches them — it only ever talks to row-level-secured endpoints.",
  },
];

export default function SecurityPage() {
  return (
    <div className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-sm font-medium mb-4">
            <ShieldCheck className="w-4 h-4" />
            Security
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Security at ChirplyMint
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
            The concrete measures we take to protect your account, your
            audience, and your data. No hand-waving — just what&apos;s actually
            implemented.
          </p>
        </div>

        {/* Measures grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {measures.map((measure) => (
            <div
              key={measure.title}
              className="rounded-2xl border border-border bg-card shadow-sm p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {measure.title}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {measure.description}
              </p>
            </div>
          ))}
        </div>

        {/* Reporting note */}
        <div className="mt-16 rounded-2xl border border-border bg-card shadow-sm p-6 text-center">
          <h2 className="text-base font-bold text-foreground mb-2">
            Report a vulnerability
          </h2>
          <p className="text-sm text-muted-foreground">
            Found something we should know about? Email{" "}
            <a
              href="mailto:security@novamintnetworks.in"
              className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
            >
              security@novamintnetworks.in
            </a>{" "}
            and we&apos;ll take it seriously.
          </p>
        </div>
      </div>
    </div>
  );
}
