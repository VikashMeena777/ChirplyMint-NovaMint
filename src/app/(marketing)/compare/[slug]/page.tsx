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

const PILLARS = ["manychat-alternative"] as const;

export function generateStaticParams() {
  return PILLARS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pillar = getPillar(slug);
  if (!pillar) return {};

  return {
    title: pillar.title,
    description: pillar.description,
    alternates: { canonical: `/compare/${pillar.slug}` },
    openGraph: {
      title: pillar.title,
      description: pillar.description,
      type: "website",
      images: [{ url: "/api/og", width: 1200, height: 630, alt: pillar.title }],
    },
  };
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const pillar = getPillar(slug);
  if (!pillar || pillar.slug !== slug || !PILLARS.includes(slug as (typeof PILLARS)[number])) {
    notFound();
  }

  const url = `${SITE_URL}/compare/${pillar.slug}`;
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Compare",
        item: `${SITE_URL}/compare`,
      },
      { "@type": "ListItem", position: 2, name: pillar.h1 },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <PillarTemplate
        pillar={pillar}
        spokes={postsInCluster("manychat-alternatives")}
      />
    </>
  );
}
