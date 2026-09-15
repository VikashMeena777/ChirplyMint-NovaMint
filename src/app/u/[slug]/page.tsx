import { getPublicBioPage } from "@/lib/actions/bio";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BioPageClient from "./bio-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import { profilePageSchema } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await getPublicBioPage(slug);
  if (!page) return { title: "Not Found" };

  return {
    title: page.display_name || page.slug,
    description: page.bio || `Check out ${page.display_name || page.slug}'s links`,
    alternates: { canonical: `/u/${page.slug}` },
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

  return (
    <>
      <JsonLd
        data={profilePageSchema({
          slug: page.slug,
          displayName: page.display_name || null,
          bio: page.bio || null,
          // Real uploaded avatars only — never a placeholder (Google rule).
          avatarUrl: page.show_avatar ? page.avatar_url : null,
          createdAt: page.created_at || null,
          updatedAt: page.updated_at || null,
          linkUrls: links.map((l) => l.url),
        })}
      />
      <BioPageClient page={page} links={links} />
    </>
  );
}
