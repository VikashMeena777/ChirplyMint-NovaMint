import Link from "next/link";
import { Send, Check } from "lucide-react";
import type { ContentBlock } from "@/lib/content/types";

/**
 * Renders structured content blocks with the site's design language.
 * Server component (no hooks) so article HTML + markup are fully static.
 */
export function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={i}
                className="mt-14 mb-4 text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground scroll-mt-24"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                className="mt-10 mb-3 text-xl font-semibold font-heading tracking-tight text-foreground"
              >
                {block.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="mb-5 text-base leading-[1.75] text-muted-foreground">
                {block.text}
              </p>
            );
          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag key={i} className="mb-6 space-y-2.5 pl-1 list-none">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-base leading-[1.7] text-muted-foreground">
                    {block.ordered ? (
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-mint/15 text-xs font-bold text-mint-dark dark:text-mint-light">
                        {j + 1}
                      </span>
                    ) : (
                      <Check className="mt-1 w-4 h-4 shrink-0 text-mint" />
                    )}
                    <span>{item}</span>
                  </li>
                ))}
              </ListTag>
            );
          }
          case "quote":
            return (
              <blockquote
                key={i}
                className="my-8 rounded-2xl border border-mint/25 bg-mint/5 p-6"
              >
                <p className="text-base leading-relaxed text-foreground italic">
                  “{block.text}”
                </p>
                {block.cite && (
                  <cite className="mt-2 block text-sm not-italic text-muted-foreground">
                    — {block.cite}
                  </cite>
                )}
              </blockquote>
            );
          case "table":
            return (
              <figure key={i} className="my-8">
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {block.columns.map((col) => (
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
                      {block.rows.map((row, j) => (
                        <tr
                          key={j}
                          className="border-b border-border/60 last:border-0 odd:bg-muted/20"
                        >
                          {row.map((cell, k) => (
                            <td
                              key={k}
                              className={`px-4 py-3 leading-relaxed ${
                                k === 0
                                  ? "font-medium text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {block.caption && (
                  <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          case "cta":
            return (
              <div
                key={i}
                className="relative my-12 overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-950 to-neutral-800 dark:from-card dark:to-neutral-900 p-8 md:p-10 text-white border border-border"
              >
                <div className="aurora au-mint left-1/2 -top-[204px] h-[688px] w-[1128px] -translate-x-1/2 [--au-p:15.29] dark:[--au-p:6.12]" />
                <div className="relative">
                  <h3 className="text-2xl md:text-3xl font-bold font-heading tracking-tight">
                    Try comment-to-DM automation free
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70">
                    50 automated DMs a month, one automation, your own
                    link-in-bio page — free forever, no card needed. Upgrade to
                    Pro (₹499/mo) when the DMs start turning into customers.
                  </p>
                  <Link
                    href="/signup"
                    className="group mt-6 inline-flex items-center gap-2.5 rounded-2xl bg-gradient-mint px-7 py-3.5 text-base font-semibold text-white glow-mint"
                  >
                    <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    Start free — no card
                  </Link>
                </div>
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
