import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { FAQ_CATEGORIES } from "@/lib/help-faqs";

// The page itself is a client component (accordion state); this layout is
// the server boundary that carries its metadata + FAQPage markup.
export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Answers about ChirplyMint: connecting Instagram, trigger keywords, AI Smart Replies, plans and pricing in INR, and data security.",
  alternates: { canonical: "/help" },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Generated from the same module the page renders — markup can never
  // drift from the visible answers (a Google structured-data rule).
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_CATEGORIES.flatMap((c) =>
      c.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      }))
    ),
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      {children}
    </>
  );
}
