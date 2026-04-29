import { getPublicBioPage } from "@/lib/actions/bio";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BioPageClient from "./bio-page-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await getPublicBioPage(slug);
  if (!page) return { title: "Not Found" };

  return {
    title: `${page.display_name || page.slug} | ChirplyMint`,
    description: page.bio || `Check out ${page.display_name || page.slug}'s links`,
    openGraph: {
      title: `${page.display_name || page.slug}`,
      description: page.bio || `Check out ${page.display_name || page.slug}'s links`,
      type: "profile",
    },
  };
}

export default async function PublicBioPage({ params }: Props) {
  const { slug } = await params;
  const { page, links } = await getPublicBioPage(slug);

  if (!page) notFound();

  return <BioPageClient page={page} links={links} />;
}
