import type { Metadata } from "next";

// The page itself is a client component (form state); this layout is the
// server boundary that carries its metadata.
export const metadata: Metadata = {
  title: "Contact Support",
  description:
    "Questions about ChirplyMint, your plan, or Instagram automation? Send us a message — we reply fast.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
