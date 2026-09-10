import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHero from "./page-hero";
import type { ReactNode } from "react";

/**
 * Premium shell for legal/prose pages. Copy inside stays untouched —
 * typography is elevated via .legal-sections CSS in globals.css.
 */
export default function LegalArticle({
  kicker,
  title,
  date,
  children,
}: {
  kicker: string;
  title: string;
  date: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-24">
      <PageHero kicker={kicker} title={title} subtitle={`Last updated: ${date}`} />
      <div className="max-w-3xl mx-auto px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-mint transition-colors mb-8 -mt-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="legal-sections space-y-5">{children}</div>
      </div>
    </div>
  );
}
