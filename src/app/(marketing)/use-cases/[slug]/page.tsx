import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPillar, postsInCluster } from "@/lib/content";
import { PillarTemplate } from "@/components/marketing/pillar-template";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

// Slugs outside generateStaticParams get a real 404 status at the routing
// layer (default behavior renders them on-demand as a soft 404 with HTTP 200).
export const dynamicParams = false;

// Only use-case pillars live under /use-cases — the comparison pillar
// ("manychat-alternative") is served from /compare/[slug].
const PILLAR_SLUGS = ["comment-to-dm-automation"] as const;

const CLUSTERS: Record<string, "comment-to-dm" | "manychat-alternatives"> = {
  "comment-to-dm-automation": "comment-to-dm",
};

export function generateStaticParams() {
  return PILLAR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pillar = getPillar(slug);
  if (!pillar) return {};

  return {
    title: pillar.title,
    description: pillar.description,
    alternates: { canonical: `/use-cases/${pillar.slug}` },
    openGraph: {
      title: pillar.title,
      description: pillar.description,
      type: "website",
      images: [{ url: "/api/og", width: 1200, height: 630, alt: pillar.title }],
    },
  };
}

export default async function PillarPage({ params }: Props) {
  const { slug } = await params;
  const pillar = getPillar(slug);
  const config = CLUSTERS[slug];
  if (!pillar || !config || pillar.slug !== slug) notFound();

  const url = `${SITE_URL}/use-cases/${pillar.slug}`;
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Use Cases",
        item: `${SITE_URL}/use-cases`,
      },
      { "@type": "ListItem", position: 2, name: pillar.h1 },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <PillarTemplate pillar={pillar} spokes={postsInCluster(config)} />
    </>
  );
}
