import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PILLAR_PAGES, BLOG_POSTS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Compare — Honest Alternatives & Pricing in INR",
  description:
    "ChirplyMint vs the alternatives for Instagram DM automation: honest feature comparisons, INR pricing for Indian creators, and when a bigger tool is the better choice.",
  alternates: { canonical: "/compare" },
};

const points = [
  "Priced in INR from day one — ₹499/mo Pro, not $15+ in USD",
  "Official Meta API only — nothing that risks your account",
  "AI agent trained on YOUR persona and FAQs, included in Pro",
  "Free forever plan: 50 DMs/month, no card",
];

export default function ComparePage() {
  const pillar = PILLAR_PAGES.find((p) => p.slug === "manychat-alternative");
  const guides = BLOG_POSTS.filter((p) => p.cluster === "manychat-alternatives");

  return (
    <div className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            Compare
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight text-foreground">
            Honest comparisons, INR pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            We&apos;re the India-first option — so our comparisons say plainly
            where the bigger tools win, and where ₹499 in rupees beats $15 in
            dollars.
          </p>
        </div>

        <ul className="mb-12 grid gap-3 sm:grid-cols-2">
          {points.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card/75 p-5 text-sm leading-relaxed text-muted-foreground"
            >
              <Check className="mt-0.5 w-4 h-4 shrink-0 text-mint" />
              {p}
            </li>
          ))}
        </ul>

        {pillar && (
          <Link
            href={`/compare/${pillar.slug}`}
            className="group mb-12 block rounded-3xl border border-mint/40 bg-gradient-to-b from-mint/10 to-card p-8 md:p-10 transition-all hover:border-mint/70 hover:shadow-[inset_0_0_48px_-6px_oklch(0.62_0.19_162/45%)]"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-mint-dark dark:text-mint-light mb-3">
              {pillar.updatedLabel}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
              {pillar.h1}
            </h2>
            <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground">
              {pillar.definition}
            </p>
            <span className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-mint">
              See the full comparison
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        )}

        {guides.length > 0 && (
          <section>
            <h2 className="mb-5 text-2xl font-bold font-heading tracking-tight text-foreground">
              Pricing deep-dives
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {guides.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-2xl border border-border bg-card/75 p-6 transition-all hover:border-mint/45"
                >
                  <h3 className="text-base font-semibold font-heading tracking-tight text-foreground group-hover:text-mint-dark dark:group-hover:text-mint-light">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
