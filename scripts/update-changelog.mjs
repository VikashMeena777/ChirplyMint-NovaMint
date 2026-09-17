#!/usr/bin/env node
/**
 * Auto-changelog for src/data/changelog.json.
 *
 * ── What this publishes ──────────────────────────────────────────────────
 * Only customer-facing text: what we added, what we fixed, what we improved.
 * Never internals (file or function names, database/API details, env vars),
 * never security specifics, never anything that tells a competitor or an
 * attacker where to look. The commit subject is NEVER published — only text
 * someone deliberately wrote for customers.
 *
 * ── How to write a round so it lands on the changelog ────────────────────
 * Add a "Changelog:" block to the commit body (keep it contiguous — the
 * block ends at the first blank line):
 *
 *   Round 73: weekly digest emails
 *
 *   Changelog [feature]: Weekly performance digests
 *   Digests arrive every Monday and summarise replies, leads and top posts.
 *   - Pick the day and time your digest is sent
 *   - Unsubscribe with one click
 *
 *   ...the rest of the commit body, ignored by the changelog...
 *
 *   line 1         "Changelog [tag]: <short title>"  — tag is optional
 *                  (feature | improvement | fix); it is guessed if omitted
 *   next line      the description (optional)
 *   "- ..." lines  the highlights (optional, max 5)
 *
 * A commit WITHOUT a "Changelog:" block publishes nothing. That default is
 * deliberate: commit bodies are written for developers and leak internals,
 * so the changelog only speaks when someone writes for customers.
 *
 * ── Guards ───────────────────────────────────────────────────────────────
 * 1. Secret scrubber — emails, URLs, env-var names, key-shaped strings,
 *    file names and paths are stripped from whatever is published.
 * 2. Internal-detail gate — any line that still reads like developer notes
 *    (identifiers, function signatures, framework/database vocabulary,
 *    version numbers, implementation units) is dropped, and if the title
 *    trips it the whole commit is skipped. Dropped text is logged.
 * 3. Security work is never described. Titles, descriptions or highlights
 *    that talk about vulnerabilities, hardening, exploits or permission
 *    handling drop the line or the entry rather than hinting at a problem.
 * 4. Batching — entries publish in batches of >= BATCH_THRESHOLD so single
 *    one-line rounds don't spam the public page.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/data/changelog.json";
const BATCH_THRESHOLD = 4;
const MAX_HIGHLIGHTS = 5;
const MAX_TITLE = 72;
const MAX_DESCRIPTION = 220;
const MAX_HIGHLIGHT = 150;
const TAGS = ["feature", "improvement", "fix"];

const data = JSON.parse(readFileSync(FILE, "utf8"));
const known = new Set(data.entries.map((e) => fingerprint(e.title)));

function fingerprint(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

/* ── 1. Secrets: never published, whatever a commit body contains ─────── */
const SECRETS = [
  /[\w.+-]+@[\w-]+\.[\w.]+/g, // emails
  /https?:\/\/\S+/gi, // URLs (may carry tokens)
  /\b[A-Za-z_][A-Za-z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)[A-Za-z0-9_]*\b\s*=?\s*\S*/gi,
  /\b(?:sk|pk|rk|cmk|ghp|gho|vcp)_[A-Za-z0-9_]+/gi, // key-shaped strings
  /\b[A-Z][A-Z0-9]{2,}(?:_[A-Z0-9]+)+\b/g, // ENV_VAR_NAMES
  /\b[\w-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|sql|css|yml|yaml|env|toml)\b/gi, // file names
  /(?:[A-Za-z]:)?\\[\w.-]/g, // Windows paths
  /(?:^|\s)\/[\w.-]+/g, // absolute routes like /dashboard
  /(?:^|\s)[\w.-]+\/[\w.-]+\/[\w.-]+/g, // multi-segment paths
  /`[^`]*`/g, // inline code
  /\$\{[^}]*\}/g, // template interpolations
];

/* ── 2. Developer notes: dropped, never published ─────────────────────── */
const INTERNALS = [
  /\w+\([^)]*\)/, // function calls / signatures
  /\b[a-z]+[A-Z][A-Za-z0-9]*\b/, // camelCase identifiers
  /\b[a-z0-9]+(?:_[a-z0-9]+)+\b/, // snake_case identifiers
  /\b(?:supabase|postgrest|vercel|next\.?js|react|tailwind|typescript|javascript|node|npm|pnpm|eslint|prettier|git|github|rls|rpc|jwt|oauth|regex|migration|endpoint|payload|schema|sql|postgres|query|table|column|row|stack trace|runtime|lint|typecheck|build|deploy|refactor|commit|branch|env var|env vars|environment variable|service role|unit test|e2e|cookie|cors|websocket|cdn|edge function|idempotenc\w*|async\w*|callback|hook|component|props|state|render|parse|serializ\w*|cache|debounce|throttl\w*)\b/i,
  /\bv?\d+\.\d+(?:\.\d+)?\b/, // version numbers
  /\b\d+\s*(?:px|rem|em|vh|vw|ms|kb|mb|gb)\b/i, // implementation units
];

/* ── 3. Security work: never described, never hinted at ───────────────── */
const SECURITY =
  /\b(?:securit\w*|vulnerab\w*|exploit\w*|harden\w*|hardening|cve[-\s]?\d|owasp|xss|csrf|ssrf|injection|inject\w*|privilege[sd]?|escalation|bypass\w*|leak\w*|brute[- ]?force|rate[- ]?limit\w*|sanitiz\w*|escap\w*|unauthori[sz]ed|csrf|tamper\w*|malicious|attacker|penetration|audit\w*)\b/i;

function tidy(text) {
  return String(text)
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—:,.]+|[\s\-–—:,]+$/g, "")
    .trim();
}

function scrub(text) {
  let out = String(text);
  for (const rx of SECRETS) out = out.replace(rx, " ");
  return tidy(out);
}

/**
 * Decides whether a line may appear on the public changelog.
 * Returns { text } when it may, otherwise { reason } explaining the drop.
 */
function gate(text, { limit } = {}) {
  const raw = tidy(text);
  if (!raw || raw.length < 4) return { reason: "empty" };
  if (limit && raw.length > limit) return { reason: "longer than a sentence" };
  if (!/\s/.test(raw)) return { reason: "not a sentence" };

  // If scrubbing changed the line, it carried something we never publish
  // (a link, an email, a key). Dropping the whole line beats publishing the
  // mangled remainder — "Contact or see" helps nobody.
  if (scrub(text) !== raw) return { reason: "contained a link, email or key" };

  if (INTERNALS.some((rx) => rx.test(raw))) return { reason: "developer-facing" };
  if (SECURITY.test(raw)) return { reason: "security-related" };
  return { text: raw };
}

/* ── Parsing the Changelog block out of a commit body ─────────────────── */
function parseBlock(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => /^\s*changelog\s*(?:\[[a-z]+\])?\s*:/i.test(l));
  if (start === -1) return null;

  const header = lines[start].match(/^\s*changelog\s*(?:\[([a-z]+)\])?\s*:\s*(.*)$/i);
  const title = (header?.[2] || "").trim();
  const askedTag = (header?.[1] || "").toLowerCase();

  let description = "";
  const highlights = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*$/.test(line)) break; // block ends at the first blank line
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) highlights.push(bullet[1]);
    else if (!description) description = line.trim();
  }
  return { title, askedTag, description, highlights };
}

/* ── Tag + icon heuristics (applied to published text only) ───────────── */
function guessTag(text) {
  if (/\b(?:fix|fixed|fixes|resolv\w*|repair\w*|restore\w*|correct\w*|bug|broken|wrong|no longer|again|now works|cut off|overlap\w*|missing|crash\w*)\b/i.test(text))
    return "fix";
  if (/\b(?:improv\w*|faster|smoother|cleaner|clearer|polish\w*|refresh\w*|better|redesign\w*|simplif\w*|easier|quieter)\b/i.test(text))
    return "improvement";
  return "feature";
}

const ICON_RULES = [
  [/inbox|messages?\b|\bdm\b|\bdms\b|repl\w+|conversation|comment/i, "MessageCircle"],
  [/email|digest|mail|newsletter/i, "Mail"],
  [/analytic|insight|report|stat|metric|dashboard|trend/i, "BarChart3"],
  [/link[- ]?in[- ]?bio|link page|\blinks?\b|\bbio\b/i, "Link2"],
  [/billing|plan|price|pricing|invoice|payment|subscri\w*|refund|upgrade|credit|top[- ]?up/i, "CreditCard"],
  [/team|role|member|invite|workspace|permission|multi[- ]?account|account/i, "Users"],
  [/ai|assistant|persona|automation|keyword|drip|flow|reply/i, "Bot"],
  [/speed|faster|slow|scroll|performance|refresh|mobile|app\b/i, "Zap"],
];

function pickIcon(text, tag) {
  for (const [rx, icon] of ICON_RULES) if (rx.test(text)) return icon;
  return tag === "fix" ? "Zap" : "Sparkles";
}

/* ── Which commits are still pending ──────────────────────────────────── */
function pendingCommits() {
  const base =
    data.lastCommit ||
    sh(`git log --oneline --grep="^chore(changelog)" -1 --format=%H || true`);
  const range = base ? `${base}..HEAD` : "HEAD~30..HEAD";
  const raw = sh(`git log ${range} --format="___C___%H%n%B" --no-merges`);
  return raw
    .split("___C___")
    .filter(Boolean)
    .map((chunk) => {
      const [hash, ...rest] = chunk.split("\n");
      const body = rest.join("\n").trim();
      return { hash: hash.trim(), subject: body.split("\n")[0] || "", body };
    })
    .filter((c) => c.body)
    .reverse(); // oldest first
}

/* ── Build entries ────────────────────────────────────────────────────── */
const today = new Date().toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const pending = [];
const skipped = [];

for (const c of pendingCommits()) {
  const block = parseBlock(c.body);
  if (!block) {
    skipped.push(`${c.hash.slice(0, 8)} — no "Changelog:" block (dev-only round)`);
    continue;
  }

  const titleCheck = gate(block.title, { limit: MAX_TITLE });
  if (!titleCheck.text) {
    skipped.push(`${c.hash.slice(0, 8)} — title ${titleCheck.reason}, entry not published`);
    continue;
  }
  const title = titleCheck.text;
  if (known.has(fingerprint(title))) {
    skipped.push(`${c.hash.slice(0, 8)} — already published`);
    continue;
  }

  const descriptionCheck = block.description
    ? gate(block.description, { limit: MAX_DESCRIPTION })
    : { reason: "not given" };
  const description = descriptionCheck.text || null;
  if (block.description && !description)
    skipped.push(`${c.hash.slice(0, 8)} — description ${descriptionCheck.reason}`);

  const highlights = [];
  for (const raw of block.highlights) {
    const check = gate(raw, { limit: MAX_HIGHLIGHT });
    if (check.text) highlights.push(check.text);
    else skipped.push(`${c.hash.slice(0, 8)} — dropped highlight (${check.reason}): "${raw.trim()}"`);
    if (highlights.length >= MAX_HIGHLIGHTS) break;
  }

  const haystack = [title, description, ...highlights].filter(Boolean).join(" ");
  const tag = TAGS.includes(block.askedTag) ? block.askedTag : guessTag(haystack);

  pending.push({
    date: today,
    version: null, // numbered on publish
    title,
    ...(description ? { description } : {}),
    tag,
    icon: pickIcon(haystack, tag),
    ...(highlights.length ? { highlights } : {}),
  });
  known.add(fingerprint(title));
}

/* ── The batching gate ────────────────────────────────────────────────── */
for (const s of skipped) console.log(`changelog: skipped ${s}`);

if (pending.length >= BATCH_THRESHOLD) {
  const numbers = data.entries
    .map((e) => parseInt(e.version, 10))
    .filter((n) => Number.isFinite(n));
  let next = numbers.length ? Math.max(...numbers) + 1 : 1;
  for (const entry of pending) entry.version = String(next++); // oldest first

  data.entries.unshift(...pending.slice().reverse()); // newest first on the page
  data.lastCommit = sh("git rev-parse HEAD");
  writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");

  console.log(`changelog: published a batch of ${pending.length} entries`);
  for (const e of pending) console.log(`changelog:   v${e.version} [${e.tag}] ${e.title}`);
} else if (pending.length > 0) {
  console.log(
    `changelog: holding ${pending.length}/${BATCH_THRESHOLD} rounds — publishing at ${BATCH_THRESHOLD}`
  );
} else {
  console.log("changelog: nothing to add");
}
