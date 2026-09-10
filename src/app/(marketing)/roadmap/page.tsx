import type { Metadata } from "next";
import Link from "next/link";
import { AtSign, MousePointerClick, MessageCircle, CheckCircle2, Hammer, Lightbulb, ArrowRight } from "lucide-react";
import PageHero from "@/components/marketing/page-hero";
import Reveal from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Public Roadmap — ChirplyMint",
  description: "What's shipped, what we're building, and what we're considering for ChirplyMint.",
};

interface RoadmapItem {
  title: string;
  description?: string;
}

const shipped: RoadmapItem[] = [
  { title: "Message Stacks", description: "Send any combination of DMs — text, images, links, and more in one flow." },
  { title: "AI Agent", description: "Trained on your persona and FAQs, answering DMs for you." },
  { title: "Drip sequences", description: "Multi-step follow-ups delivered over time." },
  { title: "A/B testing with auto-winner", description: "Test message variants and let the better one win automatically." },
  { title: "Quick replies with email/phone capture", description: "Collect contact details right inside the DM conversation." },
  { title: "Real inbox with manual takeover", description: "Step in and reply yourself whenever you want." },
  { title: "Comment moderation", description: "Hide or delete spam and negative comments automatically." },
  { title: "Conversion funnel analytics", description: "See how comments turn into DMs and leads." },
  { title: "Team seats", description: "Invite teammates into your workspace." },
  { title: "Public API", description: "Automate and integrate ChirplyMint with your own stack." },
  { title: "Instagram insights", description: "Follower and engagement data pulled into your dashboard." },
];

const inProgress: RoadmapItem[] = [
  { title: "Human Agent permission approval", description: "Awaiting Meta review to enable human-agent messaging windows." },
  { title: "Auto-like comments", description: "Awaiting Meta review before this can ship." },
];

const considering: RoadmapItem[] = [
  { title: "White-label domains", description: "Host automations on your own branded domain." },
  { title: "Team analytics", description: "Per-member performance reporting for teams." },
  { title: "Ad integrations", description: "Trigger automations from Meta ad activity." },
];

const howItWorks = [
  { step: "1", icon: AtSign, title: "Connect Instagram", description: "Link your Instagram Business account in one click through the official Meta API. No password needed." },
  { step: "2", icon: MousePointerClick, title: "Pick a keyword", description: "Choose the comment keyword that triggers your automation on any post or reel." },
  { step: "3", icon: MessageCircle, title: "Auto-DM your leads", description: "Everyone who comments gets your message in DMs instantly — while you watch leads roll in." },
];

function Column({ label, icon: Icon, tint, items }: { label: string; icon: typeof CheckCircle2; tint: string; items: RoadmapItem[] }) {
  return (
    <div className="rounded-3xl card-elevated p-6 flex flex-col">
      <div className="flex items-center gap-2.5 mb-1">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tint}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
        <h2 className="font-bold">{label}</h2>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{items.length}</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border/70 bg-muted/30 p-4 hover:border-mint/30 hover:bg-mint/[0.04] transition-colors">
            <p className="text-sm font-bold leading-snug">{item.title}</p>
            {item.description && <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <div className="pb-24">
      <PageHero
        kicker="Public roadmap"
        title={<>Building <span className="text-gradient">in the open.</span></>}
        subtitle="What's shipped, what's cooking, and what we're dreaming about. Your votes shape what ships next."
      />
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-5 items-start">
          <Reveal><Column label="Shipped ✅" icon={CheckCircle2} tint="bg-emerald-500/15 text-emerald-500" items={shipped} /></Reveal>
          <Reveal delay={0.08}><Column label="In progress 🚧" icon={Hammer} tint="bg-amber-500/15 text-amber-500" items={inProgress} /></Reveal>
          <Reveal delay={0.16}><Column label="Considering 💡" icon={Lightbulb} tint="bg-sky-500/15 text-sky-500" items={considering} /></Reveal>
        </div>

        <Reveal className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">New here? Start in 3 steps</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {howItWorks.map((s) => (
              <div key={s.step} className="p-6 rounded-3xl card-elevated card-lift text-center">
                <span className="w-11 h-11 rounded-2xl bg-gradient-mint text-white font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-mint/25">{s.step}</span>
                <s.icon className="w-5 h-5 text-mint mx-auto mb-2" />
                <h3 className="font-bold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-12 text-center rounded-3xl bg-gradient-to-br from-mint/10 to-emerald/5 border border-mint/20 p-8">
          <p className="font-bold text-lg">Want something that&apos;s not on the list?</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Tell us — the most-requested ideas ship first.</p>
          <Link href="/contact" className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm hover:scale-[1.02] transition-transform">
            Request a feature <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
