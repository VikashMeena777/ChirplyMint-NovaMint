import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Bot, Users, TrendingUp } from "lucide-react";
import { PILLAR_PAGES, BLOG_POSTS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Use Cases — Who Comment-to-DM Automation Is For",
  description:
    "How Indian creators, coaches, course sellers and small businesses use ChirplyMint's comment-to-DM automation to deliver lead magnets and capture leads automatically.",
  alternates: { canonical: "/use-cases" },
};

const audiences = [
  {
    icon: MessageCircle,
    title: "Creators",
    desc: "Comment 'GUIDE' gets the link — every post becomes an automatic DM funnel without you opening the app.",
  },
  {
    icon: Bot,
    title: "Coaches & course sellers",
    desc: "Deliver PDFs, discount codes and enrolment links the second someone comments — and capture them as tagged leads.",
  },
  {
    icon: Users,
    title: "Small businesses",
    desc: "Answer 'PRICE' or 'MENU' around the clock with instant DMs, and export every interested customer to CSV.",
  },
  {
    icon: TrendingUp,
    title: "Agencies & teams",
    desc: "Run client accounts side by side with multi-account support and a shared team workspace on Business.",
  },
];

export default function UseCasesPage() {
  const pillar = PILLAR_PAGES.find((p) => p.slug === "comment-to-dm-automation");
  const guides = BLOG_POSTS.filter((p) => p.cluster === "comment-to-dm");

  return (
    <div className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            Use cases
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight text-foreground">
            One keyword. Every comment becomes a DM.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            The same mechanism — comment a keyword, get the promised thing in
            your DMs — across every kind of Instagram audience.
          </p>
        </div>

        {pillar && (
          <Link
            href={`/use-cases/${pillar.slug}`}
            className="group mb-12 block rounded-3xl border border-mint/40 bg-gradient-to-b from-mint/10 to-card p-8 md:p-10 transition-all hover:border-mint/70 hover:shadow-[inset_0_0_48px_-6px_oklch(0.62_0.19_162/45%)]"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-mint-dark dark:text-mint-light mb-3">
              Start here
            </p>
            <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
              {pillar.h1}
            </h2>
            <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground">
              {pillar.definition}
            </p>
            <span className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-mint">
              Read the full guide
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        )}

        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="rounded-3xl border border-border bg-card/75 p-7"
            >
              <a.icon className="w-6 h-6 text-mint mb-4" />
              <h3 className="text-lg font-semibold font-heading tracking-tight text-foreground">
                {a.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {a.desc}
              </p>
            </div>
          ))}
        </div>

        {guides.length > 0 && (
          <section>
            <h2 className="mb-5 text-2xl font-bold font-heading tracking-tight text-foreground">
              Step-by-step guides
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
