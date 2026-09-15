/**
 * Blog + pillar content types.
 *
 * Content lives as structured data (not MDX) so:
 *  - the article template renders it with the site's design system,
 *  - metadata + BlogPosting schema generate from the same source,
 *  - and nothing can drift between what's visible and what's marked up.
 *
 * Blocks render in order; every field the renderer needs is typed here.
 */

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | {
      type: "list";
      ordered?: boolean;
      items: string[];
    }
  | { type: "quote"; text: string; cite?: string }
  | {
      type: "table";
      caption?: string;
      columns: string[];
      rows: string[][];
    }
  | { type: "cta" };

export interface BlogAuthor {
  name: string;
  role: string;
}

export interface BlogPost {
  slug: string;
  /** Bare title — the root layout template appends " — ChirplyMint". */
  title: string;
  /** Meta description, 120–155 chars, front-loaded value. */
  description: string;
  /** Primary target keyword (internal reference + internal-link anchors). */
  keyword: string;
  cluster: "comment-to-dm" | "manychat-alternatives";
  /** Pillar page href this article links up to (reciprocal cluster link). */
  pillarHref: string;
  publishedAt: string; // ISO 8601 with +05:30
  updatedAt: string; // ISO 8601 with +05:30
  author: BlogAuthor;
  blocks: ContentBlock[];
}

export interface PillarSection {
  id: string;
  h2: string;
  body: string[];
  bullets?: string[];
}

export interface CompareRow {
  feature: string;
  chirplymint: string;
  manychat: string;
}

export interface PillarPage {
  slug: string;
  /** Bare page H1 (template appends suffix for <title>). */
  h1: string;
  title: string; // <title> tag content (bare, template adds suffix)
  description: string;
  keyword: string;
  updatedLabel: string; // e.g. "Pricing checked September 2026"
  publishedAt: string;
  updatedAt: string;
  /** 40–60 word definition block under the hero (snippet bait). */
  definition: string;
  sections: PillarSection[];
  /** For the compare pillar only — honest feature table. */
  compareTable?: { columns: string[]; rows: CompareRow[] };
  faqs: { q: string; a: string }[];
}
