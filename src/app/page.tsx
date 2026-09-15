import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { softwareAppSchema } from "@/lib/seo";
import Home from "@/components/marketing/home";

export const metadata: Metadata = {
  title: {
    absolute: "ChirplyMint — Automate Instagram DMs & Comments",
  },
  alternates: { canonical: "/" },
};

export default function Page() {
  return (
    <>
      {/* App rich-result markup (the one rich result a SaaS can earn in
          Google 2026: name + price + category in the result). */}
      <JsonLd data={softwareAppSchema()} />
      <Home />
    </>
  );
}
