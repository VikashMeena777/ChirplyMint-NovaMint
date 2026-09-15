import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BLOG_POSTS, getPost } from "@/lib/content";
import { Blocks } from "@/components/blog/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, ORG_ID, WEBSITE_ID } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

// Slugs outside generateStaticParams get a real 404 status at the routing
// layer (default behavior renders them on-demand as a soft 404 with HTTP 200).
export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: "/api/og", width: 1200, height: 630, alt: post.title }],
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    url,
    mainEntityOfPage: url,
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: "en-IN",
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
      // Founder bio lives on /about — a page that uniquely identifies them.
      url: `${SITE_URL}/about`,
    },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    image: `${SITE_URL}/api/og`,
  };

  // Blog > Article — the only truthful ≥2-item trail on the site.
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      { "@type": "ListItem", position: 2, name: post.title },
    ],
  };

  return (
    <article className="py-20 px-6">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb (visible mirror of the schema) */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="truncate text-foreground/80">{post.title}</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold font-heading tracking-tight text-foreground leading-[1.1]">
            {post.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              By <span className="font-medium text-foreground">{post.author.name}</span>
              <span className="text-muted-foreground/70"> · {post.author.role}</span>
            </span>
            <span aria-hidden>·</span>
            <time dateTime={post.updatedAt}>
              Updated{" "}
              {new Date(post.updatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>
        </header>

        <Blocks blocks={post.blocks} />

        {/* Cluster link-up: spoke → pillar (reciprocal of the pillar's list) */}
        <footer className="mt-16 rounded-3xl border border-border bg-card/75 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-mint mb-3">
            Keep reading
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This guide is part of our step-by-step coverage.{" "}
            <Link
              href="/blog"
              className="font-medium text-foreground underline decoration-mint/40 underline-offset-4 hover:decoration-mint"
            >
              Browse all guides
            </Link>{" "}
            or jump to the full{" "}
            <Link
              href="/pricing"
              className="font-medium text-foreground underline decoration-mint/40 underline-offset-4 hover:decoration-mint"
            >
              INR pricing
            </Link>
            .
          </p>
        </footer>
      </div>
    </article>
  );
}
