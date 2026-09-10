import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Zap, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { InstagramIcon } from "@/components/marketing/brand-icons";
import PageHero from "@/components/marketing/page-hero";
import Reveal from "@/components/motion/reveal";
import Magnetic from "@/components/motion/magnetic";

export const metadata: Metadata = {
  title: "About — ChirplyMint",
  description: "Why ChirplyMint exists: turning Instagram comments into customers for creators and businesses.",
};

const values = [
  { icon: Zap, title: "Speed is a feature", desc: "A lead answered in seconds beats a perfect reply in hours. We obsess over milliseconds." },
  { icon: ShieldCheck, title: "Trust before tricks", desc: "Official APIs only. We'd rather ship slower than risk your account — ever." },
  { icon: Users, title: "Creators first", desc: "Built for the one-person business, priced for it too. Free plans that are actually useful." },
  { icon: Heart, title: "Humans in the loop", desc: "Automation should hand off gracefully, never trap. Pause, take over, resume — anytime." },
];

export default function AboutPage() {
  return (
    <div className="pb-24">
      <PageHero
        kicker="Our story"
        title={<>Comments are <span className="text-gradient">the new storefront.</span></>}
        subtitle="Every viral reel buries its gold — thousands of “price?”, “link?”, “how?” comments nobody can answer by hand. ChirplyMint answers all of them, instantly, in your voice."
      />
      <div className="max-w-3xl mx-auto px-6">
        <Reveal className="rounded-3xl card-elevated p-8 md:p-10 -mt-2">
          <p className="text-lg leading-relaxed text-foreground/90">
            ChirplyMint started with a simple observation: creators were losing sales in their own comment
            sections. A reel blows up overnight, 2,000 people ask for the link, and by morning the moment
            has passed. Manual replies don&apos;t scale — so most of that intent just… evaporates.
          </p>
          <p className="text-lg leading-relaxed text-foreground/90 mt-4">
            We built the tool we wished existed: connect Instagram, pick a keyword, and every matching
            comment gets a personal DM in under a second — links, guides, bookings, answers. Then we added
            AI that sounds like you, lead capture that files itself, and analytics that show exactly what
            converted. All on Meta&apos;s official API, so accounts stay 100% safe.
          </p>
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
            <span className="w-10 h-10 rounded-full bg-gradient-mint flex items-center justify-center text-white font-bold">N</span>
            <div>
              <p className="text-sm font-bold">Built by NovaMint Networks</p>
              <p className="text-xs text-muted-foreground">Made with 💚 in India</p>
            </div>
            <a href="https://instagram.com/chirplymint" target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-mint-dark dark:text-mint-light hover:underline">
              <InstagramIcon className="w-4 h-4" /> @chirplymint
            </a>
          </div>
        </Reveal>

        <div className="mt-14">
          <Reveal className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">What we optimize for</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06}>
                <div className="h-full p-6 rounded-3xl card-elevated card-lift">
                  <span className="w-11 h-11 rounded-2xl bg-mint/10 flex items-center justify-center mb-4">
                    <v.icon className="w-5 h-5 text-mint" />
                  </span>
                  <h3 className="font-bold mb-1.5">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-14 text-center rounded-3xl bg-gradient-to-br from-mint/10 to-emerald/5 border border-mint/20 p-8 md:p-10">
          <h3 className="text-2xl font-bold">Come build the future of DMs with us</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Free forever plan. Live in 2 minutes.</p>
          <Magnetic>
            <Link href="/signup" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-mint text-white font-semibold btn-shine glow-mint hover:scale-[1.02] transition-transform">
              Start free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Magnetic>
        </Reveal>
      </div>
    </div>
  );
}
