import Link from "next/link";
import { Send, Check, ChevronDown, ArrowRight } from "lucide-react";
import type { PillarPage } from "@/lib/content/types";
import type { BlogPost } from "@/lib/content/types";
import { Blocks } from "@/components/blog/blocks";

/**
 * Pillar page template — renders the flagship use-case and comparison
 * pages from structured data. Server component; FAQs use native
 * <details> so they're crawlable with zero JavaScript.
 */
export function PillarTemplate({
  pillar,
  spokes,
}: {
  pillar: PillarPage;
  spokes: BlogPost[];
}) {
  return (
    <div className="relative">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 md:py-24 px-6">
        {/* Living aurora backdrop (matches homepage language) */}
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="aurora au-emerald animate-aurora-1 -top-[366px] left-[calc(8%-238px)] h-[956px] w-[956px] [--au-p:18] dark:[--au-p:9]" />
          <div className="aurora au-mint left-1/2 -top-[204px] h-[688px] w-[1128px] -translate-x-1/2 [--au-p:15.29] dark:[--au-p:6.12]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/12 px-4 py-1.5 text-xs font-semibold tracking-wide text-mint-dark dark:text-mint-light">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-mint" />
            </span>
            {pillar.updatedLabel}
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl font-bold font-heading tracking-tight text-foreground leading-[1.05]">
            {pillar.h1}
          </h1>

          {/* Definition block — 40-60 words, positioned for featured snippets */}
          <div className="mt-8 rounded-2xl border border-mint/25 bg-mint/5 p-6">
            <p className="text-base md:text-lg leading-relaxed text-foreground">
              {pillar.definition}
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-mint px-8 py-4 text-base font-semibold text-white glow-mint"
            >
              <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              Start free — 50 DMs/mo
            </Link>
            <Link
              href="/pricing"
              className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-card/80 px-8 py-4 text-base font-semibold text-foreground transition-colors hover:border-mint/40 hover:bg-mint/5"
            >
              See INR pricing
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Body sections ── */}
      <section className="py-4 md:py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-14">
          {pillar.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="mb-4 text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
                {section.h2}
              </h2>
              {section.body.map((para, i) => (
                <p
                  key={i}
                  className="mb-4 text-base leading-[1.75] text-muted-foreground"
                >
                  {para}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 mb-6 space-y-2.5 pl-1">
                  {section.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-base leading-[1.7] text-muted-foreground"
                    >
                      <Check className="mt-1 w-4 h-4 shrink-0 text-mint" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* ── Comparison table (compare pillar only) ── */}
          {pillar.compareTable && (
            <section id="comparison" className="scroll-mt-24">
              <h2 className="mb-4 text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
                Feature comparison
              </h2>
              <p className="mb-6 text-base leading-[1.75] text-muted-foreground">
                {pillar.updatedLabel}. We&apos;ve kept this honest — ManyChat
                wins some rows, we win others. Pick what fits your work.
              </p>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {pillar.compareTable.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left font-semibold text-foreground"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pillar.compareTable.rows.map((row, j) => (
                      <tr
                        key={j}
                        className="border-b border-border/60 last:border-0 odd:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.feature}
                        </td>
                        <td className="px-4 py-3 leading-relaxed text-muted-foreground bg-mint/5">
                          {row.chirplymint}
                        </td>
                        <td className="px-4 py-3 leading-relaxed text-muted-foreground">
                          {row.manychat}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── FAQs (visible text; native details = zero-JS crawlable) ── */}
          <section id="faq" className="scroll-mt-24">
            <h2 className="mb-6 text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {pillar.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl border border-border bg-card/75 overflow-hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-left list-none [&::-webkit-details-marker]:hidden hover:bg-muted/10 transition-colors">
                    <span className="text-sm font-semibold text-foreground">
                      {faq.q}
                    </span>
                    <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 -mt-1 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* ── Spoke articles (pillar ↔ spoke reciprocal cluster links) ── */}
          {spokes.length > 0 && (
            <section id="guides" className="scroll-mt-24">
              <h2 className="mb-6 text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
                Deep-dive guides
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {spokes.map((post) => (
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
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 md:py-20 px-6">
        <div className="relative max-w-4xl mx-auto overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-950 to-neutral-800 dark:from-card dark:to-neutral-900 p-10 text-white border border-border">
          <div className="aurora au-mint left-1/2 -top-[204px] h-[688px] w-[1128px] -translate-x-1/2 [--au-p:15.29] dark:[--au-p:6.12]" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold font-heading tracking-tight">
              Set up your first keyword automation in minutes
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70">
              Free forever plan · No credit card · Official Meta API. Your next
              commenter becomes your next customer.
            </p>
            <Link
              href="/signup"
              className="group mt-6 inline-flex items-center gap-2.5 rounded-2xl bg-gradient-mint px-8 py-3.5 text-base font-semibold text-white glow-mint"
            >
              <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              Get started — it&apos;s free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Re-export so route pages can render content blocks if needed without a
// second import path.
export { Blocks };
