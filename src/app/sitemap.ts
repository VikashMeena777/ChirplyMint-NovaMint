import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";
import { BLOG_POSTS, PILLAR_PAGES } from "@/lib/content";

/**
 * lastModified dates must reflect real content changes (Google discounts
 * build-time stamps). Static routes use their actual content-update dates;
 * blog/pillar dates come from the content modules; bio pages use the DB
 * row's updated_at. priority/changefreq are omitted — Google ignores them.
 */

const STATIC_ROUTES: { path: string; lastModified: string }[] = [
  { path: "", lastModified: "2026-09-15" },
  { path: "/pricing", lastModified: "2026-09-15" },
  { path: "/use-cases", lastModified: "2026-09-15" },
  { path: "/compare", lastModified: "2026-09-15" },
  { path: "/blog", lastModified: "2026-09-15" },
  { path: "/about", lastModified: "2026-09-15" },
  { path: "/help", lastModified: "2026-09-15" },
  { path: "/contact", lastModified: "2026-09-15" },
  { path: "/login", lastModified: "2026-09-15" },
  { path: "/signup", lastModified: "2026-09-15" },
  { path: "/roadmap", lastModified: "2026-09-14" },
  { path: "/data-policy", lastModified: "2026-09-14" },
  { path: "/terms", lastModified: "2026-09-14" },
  { path: "/changelog", lastModified: "2026-09-11" },
  { path: "/status", lastModified: "2026-09-10" },
  { path: "/security", lastModified: "2026-09-10" },
  { path: "/privacy", lastModified: "2026-09-15" },
];

/** Published, content-bearing public bio pages with their real updated_at. */
async function publishedBioPages(): Promise<MetadataRoute.Sitemap> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await admin
      .from("bio_pages")
      .select("slug, updated_at")
      .eq("is_published", true)
      .neq("slug", "")
      .limit(5000);
    return (data ?? []).map((p) => ({
      url: `${SITE_URL}/u/${p.slug}`,
      lastModified: new Date(p.updated_at),
    }));
  } catch {
    // Sitemap must never fail because of a DB hiccup.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: new Date(r.lastModified),
  }));

  const pillarEntries: MetadataRoute.Sitemap = PILLAR_PAGES.map((p) => ({
    url: `${SITE_URL}${
      p.slug === "manychat-alternative" ? "/compare" : "/use-cases"
    }/${p.slug}`,
    lastModified: new Date(p.updatedAt),
  }));

  const articleEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
  }));

  return [
    ...staticEntries,
    ...pillarEntries,
    ...articleEntries,
    ...(await publishedBioPages()),
  ];
}
