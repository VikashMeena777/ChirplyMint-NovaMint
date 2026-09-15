import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: "/about" },
  description: "Learn about ChirplyMint and our mission to help creators automate Instagram growth.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold text-foreground mb-4">About ChirplyMint</h1>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        We&apos;re on a mission to help creators, coaches, and small businesses
        turn Instagram engagement into real revenue — automatically.
      </p>

      <div className="space-y-8 text-foreground leading-relaxed">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Our Story</h2>
          <p className="text-muted-foreground">
            ChirplyMint was born from a simple frustration: creators spend hours
            manually replying to comments with the same links, guides, and
            resources. We built ChirplyMint to automate that entire flow — so you
            can focus on creating, not typing.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">How It Works</h2>
          <p className="text-muted-foreground">
            When someone comments a specific keyword on your post, ChirplyMint
            instantly sends them a personalized DM with your content — a PDF, link,
            discount code, or AI-powered conversation. It&apos;s 100% built on the
            official Meta API, so your account stays safe.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Our Values</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center text-[oklch(0.52_0.19_162)] text-sm font-bold shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong className="text-foreground">Creator-first.</strong> Every feature is
                designed for people who create content, not just consume it.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center text-[oklch(0.52_0.19_162)] text-sm font-bold shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong className="text-foreground">Compliance always.</strong> We use official APIs
                only. No scraping, no shadow-ban risks.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[oklch(0.52_0.19_162/10%)] flex items-center justify-center text-[oklch(0.52_0.19_162)] text-sm font-bold shrink-0 mt-0.5">
                3
              </span>
              <span>
                <strong className="text-foreground">Simple by default.</strong> Anyone should be able
                to set up an automation in under 2 minutes.
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Built By</h2>
          <p className="text-muted-foreground">
            ChirplyMint is a product of{" "}
            <strong className="text-foreground">NovaMint Networks</strong>, based in India.
            We&apos;re a small, focused team passionate about automation and
            helping creators grow.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">The founder</h2>
          <div className="rounded-2xl border border-border bg-card/75 p-6">
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Vikash Meena</strong> is the
              founder of NovaMint Networks and builds ChirplyMint himself —
              every feature, every fix. He started it for a simple reason:
              Indian creators were paying dollar-priced tools (with conversion
              fees on top) for something that should cost rupees. ChirplyMint
              runs on Instagram&apos;s official API only, prices in INR from
              day one, and ships improvements weekly.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Don&apos;t take our word for it —{" "}
              <Link
                href="/changelog"
                className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
              >
                read the changelog
              </Link>{" "}
              to see exactly what shipped and when, or{" "}
              <Link
                href="/roadmap"
                className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
              >
                check the public roadmap
              </Link>{" "}
              for what&apos;s next.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
