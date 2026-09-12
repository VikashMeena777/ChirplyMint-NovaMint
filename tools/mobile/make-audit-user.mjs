/**
 * Creates a dedicated mobile-audit user via the Supabase Admin API, seeds
 * realistic (long/dense) data, and prints credentials for the audit script.
 * The audit cleanup deletes the user afterwards.
 * Usage: node tools/mobile/make-audit-user.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "Audit!" + Math.random().toString(36).slice(2, 10);
const EMAIL = `mobile-audit-${Date.now()}@chirplymint-audit.test`;

async function api(path, body, method = "POST") {
  const r = await fetch(`${URL}/auth/v1/admin${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} -> ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

const created = await api("/users", {
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: "Mobile Audit" },
});
const user = created.user ?? created;
console.log("created user:", user.id);
const email = EMAIL; // alias for the summary prints below
const password = PASSWORD;

// Sign in to get a session token for the audit script
const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json());

if (!login.access_token) {
  console.error("login failed:", JSON.stringify(login).slice(0, 200));
  process.exit(1);
}

// Seed realistic dense data: profile, leads with LONG usernames, automations,
// dm_logs, notifications — the kind of content that overflows on phones.
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" };
const uid = user.id;

const post = (table, rows) =>
  fetch(`${URL}/rest/v1/${table}`, { method: "POST", headers: H, body: JSON.stringify(rows) }).then(async (r) => {
    if (!r.ok) console.error(`seed ${table}: ${r.status}`, (await r.text()).slice(0, 150));
  });

await post("profiles", [{
  id: uid,
  email: EMAIL,
  full_name: "Mobile Audit User",
  ig_username: "audit.verylonginstagramusername_test",
  plan: "pro",
  dm_limit: 2000,
  trial_used: true,
}]);

await post("automations", [
  { user_id: uid, name: "Recipe PDF - very long automation name that should wrap on mobile", trigger_keyword: "recipe", is_active: true, dm_template: "Hey! Here is your recipe PDF download link: https://example.com/very/long/url/that/could/overflow/the/mobile/screen/entirely" },
  { user_id: uid, name: "Weight loss guide", trigger_keyword: "diet", is_active: true, dm_template: "Sending you the weight loss guide now!" },
  { user_id: uid, name: "Collab rates 2026 — pricing sheet for brands and long-term partnerships", trigger_keyword: "rate", is_active: false, dm_template: "Our rates: https://example.com/rates" },
]);

const leads = [];
for (let i = 1; i <= 12; i++) {
  leads.push({
    user_id: uid,
    ig_username: i % 3 === 0 ? `extremely.long.lead.username.number${i}` : `lead_${i}`,
    ig_user_id: `audit_${i}`,
    source: "comment",
    tags: i % 4 === 0 ? ["customer", "vip-buyer", "repeat"] : [],
    created_at: new Date(Date.now() - i * 3600e3).toISOString(),
  });
}
await post("leads", leads);

const dmLogs = [];
for (let i = 1; i <= 25; i++) {
  dmLogs.push({
    user_id: uid,
    lead_ig_username: i % 3 === 0 ? `extremely.long.lead.username.number${i}` : `lead_${i}`,
    trigger_keyword: "recipe",
    dm_sent: true,
    status: "sent",
    created_at: new Date(Date.now() - i * 3600e3).toISOString(),
  });
}
await post("dm_logs", dmLogs);

await post("notifications", [
  { user_id: uid, type: "success", title: "Automation triggered", body: "Recipe PDF automation sent a DM to @extremely.long.lead.username.number3 after they commented 'recipe' on your post", created_at: new Date().toISOString() },
  { user_id: uid, type: "info", title: "Welcome to ChirplyMint", body: "Connect your Instagram account to get started with DM automation.", created_at: new Date().toISOString() },
]);

console.log("AUDIT_EMAIL=" + email);
console.log("AUDIT_PASSWORD=" + PASSWORD);
console.log("AUDIT_TOKEN=" + login.access_token.slice(0, 12) + "...");
// write session for the audit script (local only, gitignored dir)
const fs = await import("node:fs");
fs.mkdirSync("shots/mobile", { recursive: true });
fs.writeFileSync(
  "tools/mobile/.audit-session.json",
  JSON.stringify({ email, password, access_token: login.access_token, refresh_token: login.refresh_token, user_id: uid }, null, 2)
);
console.log("session written to tools/mobile/.audit-session.json");
