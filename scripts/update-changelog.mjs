#!/usr/bin/env node
/**
 * Auto-changelog: converts "Round N: <title>" commit subjects on main into
 * entries in src/data/changelog.json.
 *
 * Entry shape: the commit subject's title + sanitized bullet lines from the
 * body. Sanitizer strips anything that looks sensitive (emails, URLs with
 * tokens, env var names, key-like strings, file paths, backticked code).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/data/changelog.json";

// Commits since the last changelog-bot commit (or last 50 as a start)
function commitsSince() {
  const last = execSync(
    `git log --oneline --grep="^chore(changelog)" -1 --format=%H || true`
  )
    .toString()
    .trim();
  const range = last ? `${last}..HEAD` : "HEAD~30..HEAD";
  const raw = execSync(
    `git log ${range} --format="___COMMIT___%H%n%B" --no-merges`
  )
    .toString();
  return raw
    .split("___COMMIT___")
    .filter(Boolean)
    .map((c) => {
      const [hash, ...rest] = c.split("\n");
      return { hash: hash.trim(), body: rest.join("\n").trim() };
    })
    .filter((c) => c.body)
    .reverse(); // oldest first
}

const SENSITIVE = [
  /[\w.+-]+@[\w-]+\.[\w.]+/gi, // emails
  /https?:\/\/[^\s]+/g, // URLs (may carry tokens)
  /\b[A-Za-z_][A-Za-z0-9_]*(API_KEY|SECRET|TOKEN|PASSWORD)[A-Za-z0-9_]*\s*=?\s*\S*/gi,
  /\b(sk|pk|rk|cmk|ghp|gho|vcp)_[A-Za-z0-9_]+/gi, // key-shaped strings
  /\/(home|Users)\/\S+/g, // file paths
  /`[^`]*`/g, // inline code
  /\$\{[^}]*\}/g, // template interpolations
];

function sanitize(text) {
  let out = text;
  for (const rx of SENSITIVE) out = out.replace(rx, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

const data = JSON.parse(readFileSync(FILE, "utf8"));
const known = new Set(
  data.entries.map((e) => e.title.toLowerCase())
);

let added = 0;
for (const c of commitsSince()) {
  const lines = c.body.split("\n");
  const subject = sanitize(lines[0] || "");
  const m = subject.match(/^Round\s+\d+:\s*(.+)$/i) || subject.match(/^(feat|fix|improve)[^:]*:\s*(.+)$/i);
  if (!m) continue;
  const title = (m[1] || m[2]).slice(0, 90);
  if (known.has(title.toLowerCase())) continue;

  // highlights: bullet lines from the body, sanitized, max 6
  const highlights = lines
    .slice(1)
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => sanitize(l.replace(/^\s*[-*]\s+/, "")))
    .filter((l) => l.length > 8)
    .slice(0, 6);

  const tag = /security|password|auth|csrf|inject|hardened|xss/i.test(c.body)
    ? "security"
    : /fix|bug|broken|crash|error/i.test(c.body)
      ? "fix"
      : /improve|polish|refactor|perf/i.test(c.body)
        ? "improvement"
        : "feature";

  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  data.entries.unshift({
    date,
    version: "auto",
    title,
    description: highlights[0] || title,
    tag,
    icon: tag === "security" ? "Shield" : tag === "fix" ? "Zap" : "Sparkles",
    highlights: highlights.length ? highlights : [title],
  });
  known.add(title.toLowerCase());
  added++;
}

if (added > 0) {
  writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`changelog: +${added} entries`);
} else {
  console.log("changelog: nothing to add");
}
