import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — ChirplyMint",
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
      </div>
    </div>
  );
}
