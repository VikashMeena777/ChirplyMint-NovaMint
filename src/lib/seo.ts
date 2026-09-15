/**
 * Site-wide SEO constants + reusable schema.org builders.
 *
 * One source of truth for the canonical site URL (matches sitemap.ts /
 * robots.ts env pattern) so JSON-LD, metadata and sitemap can never drift.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"
).replace(/\/$/, "");

export const SITE_NAME = "ChirplyMint";
export const ORG_NAME = "NovaMint Networks";

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const SOCIAL_PROFILES = [
  "https://x.com/chirplymint",
  "https://instagram.com/ig.chirplymint",
];

/**
 * Sitewide entity graph: Organization (logo, sameAs — entity understanding)
 * + WebSite (name/alternateName — controls the site name Google shows above
 * every result; matters because we live on a subdomain).
 *
 * Rendered once from the root layout so it appears on every page; Google's
 * guidance is homepage-only is sufficient, but sitewide is explicitly
 * permitted and guarantees the homepage never misses it.
 */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: ORG_NAME,
        alternateName: "NovaMint",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/logo.png`,
        description:
          "NovaMint Networks builds ChirplyMint — an Instagram DM and comment automation platform for creators, coaches and small businesses in India.",
        sameAs: SOCIAL_PROFILES,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        alternateName: ["Chirply Mint", `ChirplyMint by ${ORG_NAME}`],
        publisher: { "@id": ORG_ID },
        inLanguage: "en-IN",
      },
    ],
  };
}

/**
 * Homepage app markup — the one rich result a SaaS can still earn (2026):
 * app details incl. price shown in Google results. The free plan makes the
 * documented truthful offer price 0; paid tiers live in the offer text.
 *
 * No aggregateRating on purpose: Google requires ratings to be genuine,
 * visible-on-page, collected from our own users. Add it only after an
 * in-product rating flow exists (see seo-research report 2, §3.3).
 */
export function softwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    description:
      "Instagram DM and comment automation for creators, coaches and small businesses. Comment a keyword on your Instagram post and ChirplyMint automatically sends a DM with links, PDFs or AI-persona replies. Includes link-in-bio pages, lead capture and tagging.",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "INR",
      description:
        "Free plan: 50 automated DMs per month. Paid Pro (₹499/mo) and Business (₹1,499/mo) plans in INR with annual variants.",
    },
    publisher: { "@id": ORG_ID },
  };
}

/**
 * /u/[slug] public bio pages → ProfilePage (single creator affiliated with
 * the platform). Rules from Google's ProfilePage docs: only a REAL
 * user-uploaded avatar (never a placeholder), only user-declared external
 * links in sameAs, no fabricated stats. Views are tracked but don't map to
 * a schema interaction type, so interactionStatistic is omitted rather
 * than mislabeled.
 */
export function profilePageSchema(profile: {
  slug: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  linkUrls: string[];
}) {
  const pageUrl = `${SITE_URL}/u/${profile.slug}`;
  const person: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${pageUrl}#person`,
    name: profile.displayName || profile.slug,
    alternateName: `@${profile.slug}`,
    url: pageUrl,
  };
  if (profile.avatarUrl) person.image = profile.avatarUrl;
  if (profile.bio) person.description = profile.bio;
  if (profile.linkUrls.length > 0) person.sameAs = profile.linkUrls;

  const page: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${pageUrl}#profilepage`,
    url: pageUrl,
    mainEntity: person,
  };
  if (profile.createdAt) page.dateCreated = profile.createdAt;
  if (profile.updatedAt) page.dateModified = profile.updatedAt;

  return page;
}
