import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog — Instagram DM Automation Guides",
  description:
    "Practical guides on Instagram DM automation, comment-to-DM funnels, and ManyChat alternatives for Indian creators, coaches and small businesses.",
  alternates: { canonical: "/blog" },
};

const CLUSTER_LABELS: Record<string, { label: string; href: string; blurb: string }> = {
  "comment-to-dm": {
    label: "Comment-to-DM Automation",
    href: "/use-cases/comment-to-dm-automation",
    blurb: "How keyword automations work, what DMs can deliver, and how to set them up.",
  },
  "manychat-alternatives": {
    label: "ManyChat Alternatives & Pricing",
    href: "/compare/manychat-alternative",
    blurb: "Honest comparisons with INR pricing for Indian creators.",
  },
};

export default function BlogIndexPage() {
  const clusters = Array.from(new Set(BLOG_POSTS.map((p) => p.cluster)));

  return (
    <div className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            Blog
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight text-foreground">
            Instagram DM automation, explained
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Practical guides for Indian creators, coaches and small
            businesses — written from building ChirplyMint, not from
            re-reading other blog posts.
          </p>
        </div>

        {clusters.map((cluster) => {
          const meta = CLUSTER_LABELS[cluster];
          const posts = BLOG_POSTS.filter((p) => p.cluster === cluster);
          return (
            <section key={cluster} className="mb-14">
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold font-heading tracking-tight text-foreground">
                  {meta.label}
                </h2>
                <Link
                  href={meta.href}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-mint hover:text-mint-dark dark:hover:text-mint-light"
                >
                  Start here: the full guide
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">{meta.blurb}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group rounded-3xl border border-border bg-card/75 p-7 transition-all hover:border-mint/45 hover:shadow-[inset_0_0_40px_-8px_oklch(0.62_0.19_162/32%)]"
                  >
                    <time className="text-xs text-muted-foreground" dateTime={post.publishedAt}>
                      {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                    <h3 className="mt-2 text-lg font-semibold font-heading tracking-tight text-foreground group-hover:text-mint-dark dark:group-hover:text-mint-light">
                      {post.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {post.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
