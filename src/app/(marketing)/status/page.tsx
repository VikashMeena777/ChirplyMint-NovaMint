import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CheckCircle2, ArrowRight } from "lucide-react";
import PageHero from "@/components/marketing/page-hero";
import Reveal from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "System Status — ChirplyMint",
  description: "Live operational status of ChirplyMint services.",
};

const services = [
  { name: "Instagram webhooks", desc: "Comment + DM event intake", status: "Operational" },
  { name: "DM delivery", desc: "Outbound messaging pipeline", status: "Operational" },
  { name: "Dashboard & API", desc: "App, automations & public API", status: "Operational" },
  { name: "Cashfree payments", desc: "Checkout, webhooks & renewals", status: "Operational" },
  { name: "Resend email", desc: "Transactional + lifecycle mail", status: "Operational" },
];

export default function StatusPage() {
  return (
    <div className="pb-24">
      <PageHero
        kicker="System status"
        title={<>All systems <span className="text-gradient">operational.</span></>}
        subtitle="Live health of every ChirplyMint service. All times IST."
      >
        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
          <span className="relative flex w-2.5 h-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          All Systems Operational
        </span>
      </PageHero>
      <div className="max-w-3xl mx-auto px-6">
        <Reveal className="rounded-3xl card-elevated overflow-hidden divide-y divide-border">
          {services.map((s) => (
            <div key={s.name} className="flex items-center gap-4 p-5 hover:bg-mint/[0.03] transition-colors">
              <span className="w-10 h-10 rounded-2xl bg-mint/10 flex items-center justify-center shrink-0">
                <Activity className="w-4.5 h-4.5 text-mint" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[15px]">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> {s.status}
              </span>
            </div>
          ))}
        </Reveal>
        <Reveal delay={0.1} className="mt-8 text-center rounded-3xl bg-gradient-to-br from-mint/10 to-emerald/5 border border-mint/20 p-8">
          <p className="font-bold">Something looks off on your end?</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Automations pause gracefully on errors — check your dashboard or ping us.</p>
          <Link href="/contact" className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm hover:scale-[1.02] transition-transform">
            Report an issue <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
