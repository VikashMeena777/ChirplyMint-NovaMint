import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Longest-match wins: /api/og (the OG-image endpoint) stays
        // crawlable for Meta's link-preview crawler even though the rest
        // of /api is blocked. /dashboard has no trailing slash so it also
        // blocks the bare /dashboard URL (robots rules are prefix matches).
        allow: ["/", "/api/og"],
        disallow: ["/dashboard", "/api/", "/auth/", "/invite"],
      },
      {
        // Explicit AI-crawler policy: a freemium marketing site wants to be
        // discovered. OAI-SearchBot gates ChatGPT-search eligibility;
        // Google-Extended only controls Gemini training, NOT AI Overviews.
        userAgent: [
          "OAI-SearchBot",
          "PerplexityBot",
          "GPTBot",
          "ClaudeBot",
          "Google-Extended",
        ],
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
