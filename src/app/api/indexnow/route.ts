import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo";
import { BLOG_POSTS, PILLAR_PAGES } from "@/lib/content";

/**
 * IndexNow ping endpoint — notifies Bing/Copilot, Yandex, Seznam, Naver,
 * Wayback Machine of changed URLs (Google does not participate).
 *
 * Trigger after meaningful content changes:
 *   curl -X POST https://chirplymint.novamintnetworks.in/api/indexnow \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"<INDEXNOW_SECRET>"}'
 * Optionally pass {"urls": ["https://…/path", …]} to ping specific pages.
 */

const STATIC_PATHS = [
  "/",
  "/pricing",
  "/use-cases",
  "/compare",
  "/blog",
  "/about",
  "/help",
  "/contact",
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (
    !process.env.INDEXNOW_SECRET ||
    body.secret !== process.env.INDEXNOW_SECRET
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "INDEXNOW_KEY not configured" },
      { status: 500 }
    );
  }

  const urlList: string[] =
    Array.isArray(body.urls) && body.urls.length > 0
      ? body.urls
      : [
          ...STATIC_PATHS,
          ...PILLAR_PAGES.map((p) =>
            p.slug === "manychat-alternative"
              ? `/compare/${p.slug}`
              : `/use-cases/${p.slug}`
          ),
          ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
        ].map((path) => `${SITE_URL}${path}`);

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key,
      keyLocation: `${SITE_URL}/${key}.txt`,
      urlList,
    }),
  });

  return NextResponse.json(
    { indexnowStatus: res.status, submitted: urlList.length },
    { status: res.ok || res.status === 202 ? 200 : 502 }
  );
}
