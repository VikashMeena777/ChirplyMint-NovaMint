/**
 * Content registry — every blog article and pillar page, imported here so
 * the blog routes, sitemap, and internal-link modules share one list.
 */
import type { BlogPost, PillarPage } from "./types";

import articleAutoDm from "./articles/how-to-automatically-send-dm-when-someone-comments-on-instagram";
import articlePdfDm from "./articles/how-to-send-pdf-in-instagram-dm-automatically";
import articleManychatIndia from "./articles/manychat-pricing-in-india";
import articleManychatFree from "./articles/manychat-free-plan-limits";

import pillarCommentToDm from "./pillars/comment-to-dm-automation";
import pillarManychatAlt from "./pillars/manychat-alternative";

export const BLOG_POSTS: BlogPost[] = [
  articleAutoDm,
  articlePdfDm,
  articleManychatIndia,
  articleManychatFree,
];

export const PILLAR_PAGES: PillarPage[] = [pillarCommentToDm, pillarManychatAlt];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getPillar(slug: string): PillarPage | undefined {
  return PILLAR_PAGES.find((p) => p.slug === slug);
}

/** Articles belonging to a cluster, for pillar ↔ spoke reciprocal links. */
export function postsInCluster(cluster: BlogPost["cluster"]): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.cluster === cluster);
}
