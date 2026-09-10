import type { Metadata } from "next";
import { ShieldCheck, Database, KeyRound, FileCheck, Ban, Gauge, Lock, Trash2, Mail } from "lucide-react";
import PageHero from "@/components/marketing/page-hero";
import Reveal from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Security — ChirplyMint",
  description: "How ChirplyMint protects your Instagram account, tokens, and customer data.",
};

const measures = [
  { icon: Database, title: "Row-level security", desc: "Every database row is locked to its owner. Users can only ever read their own leads, DMs, and settings — enforced by Postgres itself, not app code." },
  { icon: KeyRound, title: "Hashed API keys", desc: "API keys are stored as hashes. Even we can't see your secret — only its prefix for identification." },
  { icon: FileCheck, title: "Signed webhooks", desc: "Every Cashfree, Resend, and Meta webhook signature is verified with HMAC before a single row changes. Forged events are rejected." },
  { icon: Ban, title: "CSRF + abuse guards", desc: "State-changing routes carry origin checks and rate limits. Retry queues back off exponentially instead of hammering." },
  { icon: Gauge, title: "Rate limiting", desc: "Per-user DM and API limits with Redis-backed governors. One viral spike can't burn your account or ours." },
  { icon: Lock, title: "Encrypted secrets", desc: "OAuth tokens and credentials live encrypted at rest. Service-role access never reaches the browser." },
  { icon: Trash2, title: "Real deletion", desc: "Delete a lead, a message thread, or your whole account — associated data is permanently removed, not soft-hidden." },
  { icon: ShieldCheck, title: "Official APIs only", desc: "Instagram via Meta's reviewed Messaging API. No scraping, no password storage, no grey-area automation that risks bans." },
];

export default function SecurityPage() {
  return (
    <div className="pb-24">
      <PageHero
        kicker="Security"
        title={<>Paranoid so <span className="text-gradient">you don't have to be.</span></>}
        subtitle="Your Instagram account is your business. Here's every layer standing between it and the bad guys."
      />
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 gap-5">
          {measures.map((m, i) => (
            <Reveal key={m.title} delay={(i % 2) * 0.07}>
              <div className="group h-full p-6 md:p-7 rounded-3xl card-elevated card-lift flex gap-4">
                <span className="w-12 h-12 rounded-2xl bg-mint/10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <m.icon className="w-5.5 h-5.5 text-mint" />
                </span>
                <div>
                  <h3 className="font-bold mb-1.5">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 rounded-3xl glass p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-gradient-mint flex items-center justify-center shrink-0 shadow-lg shadow-mint/25">
            <Mail className="w-5 h-5 text-white" />
          </span>
          <div className="flex-1">
            <h3 className="font-bold">Found a vulnerability?</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Email <b className="text-foreground">security@novamintnetworks.in</b> — we respond within 48 hours and credit responsible reporters.</p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
