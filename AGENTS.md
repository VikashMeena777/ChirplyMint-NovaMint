<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Public changelog

`src/data/changelog.json` is rendered at /changelog and is public. Entries
describe what changed for the person using ChirplyMint — never how it was
built and never anything about security work.

When you finish a round, write the changelog block in the commit body:

```
Round 73: weekly digest emails

Changelog: Weekly performance digests
Digests arrive every Monday and summarise replies, leads and top posts.
- Pick the day and time your digest is sent
- Unsubscribe with one click

...rest of the body, ignored by the changelog...
```

- Line 1 — `Changelog [tag]: <short title>`. Tag is optional
  (`feature` | `improvement` | `fix`) and guessed when omitted.
- Next line — one plain sentence describing the change (optional).
- `- ` lines — customer-visible highlights (optional, max 5).
- The block ends at the first blank line. A round with no block publishes
  nothing, so a dev-only round can be left out on purpose.

Never write file names, function names, table or column names, framework
names, env var names, version numbers, ticket ids, agent/tool names, counts
of findings, or anything about vulnerabilities, hardening or permissions —
such lines are dropped automatically and a security-sounding title skips the
whole entry. Prefer "what the customer can now do" over "what changed in the
code". `scripts/update-changelog.mjs` holds the full rules; don't bypass them
by hand-editing the JSON with developer text.
