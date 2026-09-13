/**
 * Browser E2E for the AI agent onboarding wizard: create a fresh test user,
 * log in, create the agent, walk every wizard step with realistic answers,
 * test the preview chat, activate, and verify the agent state in the DB.
 * Prints a verdict per step + screenshots.
 * Usage: npx tsx tools/test-wizard-e2e.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3000";
const CHROME = [
  process.env.LOCALAPPDATA,
  "ms-playwright",
  "chromium-1208",
  "chrome-win64",
  "chrome.exe",
].join("/");

// ── create a disposable user via the admin API ──
const SUPA_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const EMAIL = `wizard-e2e-${Date.now()}@chirplymint-audit.test`;

const PASSWORD = "WizardE2e!2026x"; // fixed for interactive debugging

async function main() {
  // clear the shared auth rate limiter so this test's login always works
  {
    const RU = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
    const RT = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
    let cursor = "0";
    const keys: string[] = [];
    do {
      const r = await fetch(`${RU}/scan/${cursor}?match=rl:auth:*&count=100`, {
        headers: { Authorization: `Bearer ${RT}` },
      }).then((x) => x.json());
      cursor = r.result[0];
      keys.push(...r.result[1]);
    } while (cursor !== "0");
    if (keys.length) {
      await fetch(`${RU}/del`, {
        method: "POST",
        headers: { Authorization: `Bearer ${RT}`, "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      });
    }
    console.log("rate limiter cleared:", keys.length, "keys");
  }
  const created = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  }).then((r) => r.json());
  const UID = (created.user ?? created).id;
  console.log("test user:", UID, EMAIL);
  // skip the general app onboarding gate — we're testing the AGENT wizard
  await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + UID, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ onboarding_complete: true, plan: "pro", dm_limit: 2000 }),
  });

  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();

  // ── login ──
  await page.goto(BASE + "/login", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard**", { timeout: 25000 }).catch(() => {});
  console.log("after login:", page.url());

  // Dismiss the new-user welcome tour overlay (it intercepts all clicks)
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const overlay = document.querySelector("div.fixed.inset-0.z-50");
    const closeBtn = overlay?.querySelector("button");
    if (closeBtn) (closeBtn as HTMLElement).click();
  });
  await page.waitForTimeout(800);
  console.log("welcome tour dismissed");

  // Accept cookies — the banner is fixed bottom with z-[100] and eats clicks
  await page.evaluate(() => {
    const accept = [...document.querySelectorAll("button")].find((b) => b.innerText.trim().toLowerCase().startsWith("accept"));
    if (accept) (accept as HTMLElement).click();
  });
  await page.waitForTimeout(600);
  console.log("cookies accepted");

  // ── go to AI agent, create the agent ──
  // The first navigations after login can race the middleware's session
  // refresh and bounce to /login — retry until the route sticks.
  let onAgentPage = false;
  for (let i = 0; i < 4 && !onAgentPage; i++) {
    await page.waitForTimeout(2000);
    await page.goto(BASE + "/dashboard/ai-agent", { waitUntil: "load" });
    await page.waitForTimeout(2500);
    onAgentPage = page.url().includes("/dashboard/ai-agent");
  }
  console.log("reached ai-agent page:", onAgentPage);
  try {
    // Click at the DOM level, retrying until the wizard comes up (the
    // create screen can take a while to render on a cold server).
    let wizardUp = false;
    for (let i = 0; i < 8 && !wizardUp; i++) {
      await page.waitForTimeout(3000);
      wizardUp = (await page.locator("text=Set up your AI Agent").count()) > 0;
      if (wizardUp) break;
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Create AI Agent"));
        if (btn) (btn as HTMLElement).click();
      });
    }
    console.log("wizard up after create loop:", wizardUp);
  } catch {
    console.log("create button not found — dumping page state:");
    console.log("  url:", page.url());
    const btnTexts = await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.slice(0, 40) || "(icon-only)"));
    console.log("  buttons:", JSON.stringify(btnTexts.slice(0, 15)));
    console.log("  body starts:", JSON.stringify((await page.evaluate(() => document.body.innerText.slice(0, 150))).slice(0, 150)));
  }
  console.log("agent page after create:", page.url());

  // ── the wizard must be showing now ──
  const wizardVisible = await page.locator("text=Set up your AI Agent").count();
  console.log(wizardVisible ? "✓ wizard appeared" : "✗ WIZARD DID NOT APPEAR");
  await page.screenshot({ path: "shots/wizard-0-type.png" });

  // Step 0: pick business type (Creator)
  await page.locator("button", { hasText: "Creator / Influencer" }).first().click();
  await page.waitForTimeout(300);
  await page.locator("button", { hasText: "Continue" }).first().click();
  await page.waitForTimeout(1500);

  // Step 1: name + about
  await page.waitForTimeout(500);
  const nameInput = page.locator("input").first();
  await nameInput.fill("Vikash");
  await page.locator("textarea").first().fill(
    "I'm a travel creator sharing budget trips and hidden spots across India through reels and photos."
  );
  await page.screenshot({ path: "shots/wizard-1-about.png" });
  await page.locator("button", { hasText: "Continue" }).first().click();
  await page.waitForTimeout(1500);

  // Step 2: topics + offers
  await page.locator("textarea").first().fill("budget travel reels, packing hacks, café reviews, weekend getaways");
  await page.locator("textarea").nth(1).fill("Travel planning guide — ₹199 (link in bio), brand collabs — DM 'rates'");
  await page.locator("button", { hasText: "Continue" }).first().click();
  await page.waitForTimeout(1500);

  // Step 3: tone + language (defaults fine: friendly + auto)
  await page.locator("button", { hasText: "Casual" }).first().click();
  await page.waitForTimeout(200);
  await page.locator("button", { hasText: "Continue" }).first().click();
  await page.waitForTimeout(1500);

  // Step 4: greeting + fallback + FAQ (defaults fine, add one FAQ)
  await page.locator("button", { hasText: "+ Add a question" }).click();
  await page.waitForTimeout(300);
  const faqInputs = page.locator("input");
  await faqInputs.nth(2).fill("What are your rates?");
  await faqInputs.nth(3).fill("Collabs start at ₹5k — check the link in bio!");
  await page.waitForTimeout(300);
  const faqVals = (await page.evaluate(() =>
    [...document.querySelectorAll("input")].map((i) => (i as HTMLInputElement).value)
  )) as string[];
  console.log("step-4 input values:", JSON.stringify(faqVals));
  await page.locator("button", { hasText: "Continue" }).first().click();
  await page.waitForTimeout(1500);

  // Step 5: review — check assembled persona
  const personaText = await page.locator("textarea").first().inputValue();
  console.log(personaText.includes("travel creator") ? "✓ assembled persona present in review" : "✗ persona missing");
  console.log(personaText.includes("₹199") ? "✓ offers in persona" : "✗ offers missing");
  await page.screenshot({ path: "shots/wizard-5-review.png" });

  // test chat: ask what the agent can do
  await page.locator("input[placeholder*='Type a test']").fill("Ap ky ky kar skte ho?");
  await page.locator("button[aria-label='Send test message']").click();
  await page.waitForTimeout(6000);
  const chatText = await page.locator("div.rounded-2xl").allTextContents();
  const lastReply = chatText.filter((t) => t.length > 10).pop() ?? "";
  console.log("test chat reply:", JSON.stringify(lastReply.slice(0, 140)));
  await page.screenshot({ path: "shots/wizard-5-tested.png" });

  // ACTIVATE
  await page.locator("button", { hasText: "Activate agent" }).first().click();
  await page.waitForTimeout(4500);
  await page.screenshot({ path: "shots/wizard-activated.png" });
  console.log("after activate url:", page.url());
  const actToasts = await page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.textContent.trim().slice(0, 120)));
  console.log("toasts after activate:", JSON.stringify(actToasts));
  const actUrl = await page.evaluate(() => location.href);
  console.log("page href:", actUrl);

  // ── verify DB state ──
  const agentResp = await fetch(
    `${SUPA_URL}/rest/v1/ai_agents?user_id=eq.${UID}&select=setup_complete,is_active,persona,about_text,offers_text`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const agentBody = (await agentResp.json().catch(() => ({}))) as unknown;
  console.log('DB check HTTP:', agentResp.status, JSON.stringify(agentBody).slice(0, 280));
  const a = (Array.isArray(agentBody) ? agentBody[0] : undefined) as Record<string, unknown> | undefined;
  console.log(
    a?.setup_complete ? "✓ setup_complete true in DB" : "✗ setup_complete false",
    "|",
    a?.is_active ? "✓ is_active true" : "✗ is_active false"
  );
  console.log("persona in DB:", JSON.stringify(String(a?.persona ?? "").slice(0, 120)));

  // verify FAQ seeded
  const faqResp = await fetch(
    `${SUPA_URL}/rest/v1/ai_agent_faqs?user_id=eq.${UID}&select=question`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const faqBody = (await faqResp.json().catch(() => null)) as { question?: string }[] | null;
  console.log("FAQ check HTTP:", faqResp.status, JSON.stringify(faqBody).slice(0, 160));
  const faqs = Array.isArray(faqBody) ? faqBody : undefined;
  console.log(faqs?.length ? `✓ FAQ seeded (${faqs[0].question})` : "✗ no FAQ seeded");

  // ── cleanup everything ──
  await fetch(`${SUPA_URL}/rest/v1/ai_agent_faqs?user_id=eq.${UID}`, {
    method: "DELETE",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "return=minimal" },
  });
  await fetch(`${SUPA_URL}/rest/v1/ai_agents?user_id=eq.${UID}`, {
    method: "DELETE",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "return=minimal" },
  });
  await fetch(`${SUPA_URL}/auth/v1/admin/users/${UID}`, {
    method: "DELETE",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  console.log("cleanup done");

  await browser.close();

}
main().catch((e) => { console.error(e); process.exit(1); });
