/**
 * JsonLd — renders a schema.org JSON-LD block.
 *
 * Usable from server AND client components (no hooks, no server-only APIs):
 * client pages are still server-side rendered, so the script tag lands in
 * the initial HTML either way — crawlers never need JS to see it.
 *
 * `<` is escaped per the official Next.js JSON-LD guide (XSS hardening —
 * user-generated strings must never be able to close the script tag).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
