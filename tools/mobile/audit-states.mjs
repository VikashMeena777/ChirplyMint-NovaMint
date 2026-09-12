/**
 * Interactive mobile states audit: onboarding, modals, mobile menu,
 * homepage scroll-through at multiple widths, PWA standalone, public bio.
 * Usage: node tools/mobile/audit-states.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

const sess = JSON.parse(readFileSync("tools/mobile/.audit-session.json", "utf8"));

const browser = await chromium.launch({ executablePath: CHROME });

async function newPage(width, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    ...opts,
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function overflowCheck(page, label) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = window.innerWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("*")) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right > vw + 1 || rect.left < -1) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} L${Math.round(rect.left)} R${Math.round(rect.right)}`);
        if (offenders.length >= 6) break;
      }
    }
    return { ox: doc.scrollWidth - doc.clientWidth, vw, offenders };
  });
  const flag = r.ox > 0 ? `⚠ ${r.ox}px` : "ok";
  console.log(`${label.padEnd(46)} ${flag}`);
  r.offenders.slice(0, 4).forEach((o) => console.log(`    ${o}`));
  return r;
}

async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  await page.locator('input[type="email"], input[name="email"]').first().fill(sess.email);
  await page.locator('input[type="password"]').first().fill(sess.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
}

// ── 1. Homepage scroll-through at 360 / 375 / 412 ──
for (const w of [360, 375, 412]) {
  const { ctx, page } = await newPage(w);
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2800);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((H - 740) * (i / steps));
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(450); // let whileInView fire + settle
    const r = await overflowCheck(page, `home@${w} y=${y}`);
    if (r.ox > 0) {
      await page.screenshot({ path: `shots/mobile/BUG-home-${w}-y${y}.png` });
      break; // first overflow per width is enough
    }
  }
  await ctx.close();
}

// ── 2. Mobile menu open (marketing) ──
{
  const { ctx, page } = await newPage(375);
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  const burger = page.locator('button[aria-label*="menu" i], button:has(svg)').filter({ hasText: /^$/ }).first();
  const menuBtn = page.locator("button").filter({ has: page.locator("svg") }).last();
  try {
    await (await burger.count() ? burger : menuBtn).click({ timeout: 4000 });
    await page.waitForTimeout(700);
    await overflowCheck(page, "marketing mobile menu OPEN");
    await page.screenshot({ path: "shots/mobile/state-menu-open.png" });
  } catch (e) {
    console.log("menu open: could not click burger:", e.message.slice(0, 60));
  }
  await ctx.close();
}

// ── 3. Authenticated interactive states ──
{
  const { ctx, page } = await newPage(375);
  await login(page);
  console.log("logged in:", page.url());

  // onboarding page (make a fresh state via URL — it redirects if complete)
  await page.goto(BASE + "/onboarding", { waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(1800);
  await overflowCheck(page, "onboarding page");
  await page.screenshot({ path: "shots/mobile/state-onboarding.png" });

  // automations page → open the create modal
  await page.goto(BASE + "/dashboard/automations", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), a:has-text("New")').first();
  try {
    await createBtn.click({ timeout: 4000 });
    await page.waitForTimeout(900);
    await overflowCheck(page, "automations CREATE MODAL open");
    await page.screenshot({ path: "shots/mobile/state-create-modal.png" });
  } catch (e) {
    console.log("create modal: no button/click failed:", e.message.slice(0, 60));
  }

  // leads page → open a lead detail if rows exist
  await page.goto(BASE + "/dashboard/leads", { waitUntil: "load" });
  await page.waitForTimeout(1800);
  const row = page.locator("tr, [role=row], a[href*='lead'], button").filter({ hasText: /lead_|extremely/ }).first();
  try {
    await row.click({ timeout: 4000 });
    await page.waitForTimeout(900);
    await overflowCheck(page, "leads ROW/DETAIL open");
    await page.screenshot({ path: "shots/mobile/state-lead-detail.png" });
  } catch (e) {
    console.log("lead detail: skip,", e.message.slice(0, 50));
  }

  // messages page interactions
  await page.goto(BASE + "/dashboard/messages", { waitUntil: "load" });
  await page.waitForTimeout(1800);
  await overflowCheck(page, "messages page (post-load)");
  await ctx.close();
}

// ── 4. PWA standalone emulation (installed app) ──
{
  const { ctx, page } = await newPage(390, {
    // emulate the installed PWA: standalone display + touch
    userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Mobile Safari/537.36",
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    // matchMedia('(display-mode: standalone)') should match
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) =>
      q.includes("standalone") ? { matches: true, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false } : orig(q);
  });
  await page.goto(BASE + "/dashboard", { waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(1000);
  // dashboard will bounce to login (no session in this context) — check login + home instead
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2200);
  await overflowCheck(page, "PWA-standalone homepage");
  await page.screenshot({ path: "shots/mobile/state-pwa-home.png" });
  await ctx.close();
}

// ── 5. Public bio page (user-generated content) ──
{
  const { ctx, page } = await newPage(375);
  await page.goto(BASE + "/u/audit.verylonginstagramusername_test", { waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(1500);
  const status = page.url();
  console.log("bio page url:", status);
  await overflowCheck(page, "public bio page");
  await page.screenshot({ path: "shots/mobile/state-bio-public.png" });
  await ctx.close();
}

await browser.close();
console.log("\ndone");
