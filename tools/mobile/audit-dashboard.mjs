/**
 * Mobile audit of the AUTHENTICATED dashboard: logs in as the audit user via
 * the UI form, then walks every dashboard route at 375px measuring overflow,
 * clipped text, and tiny tap targets. Screenshots every page.
 * Usage: node tools/mobile/audit-dashboard.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

const { email, password } = JSON.parse(readFileSync("tools/mobile/.audit-session.json", "utf8"));

const ROUTES = [
  "/dashboard",
  "/dashboard/analytics",
  "/dashboard/automations",
  "/dashboard/messages",
  "/dashboard/leads",
  "/dashboard/leads/export",
  "/dashboard/ai-agent",
  "/dashboard/ai-agent/conversations",
  "/dashboard/bio",
  "/dashboard/insights",
  "/dashboard/referrals",
  "/dashboard/notifications",
  "/dashboard/settings/account",
  "/dashboard/settings/instagram",
  "/dashboard/settings/billing",
  "/dashboard/settings/notifications",
  "/dashboard/settings/team",
];

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  viewport: { width: 375, height: 740 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

// ── login through the real form ──
await page.goto(BASE + "/login", { waitUntil: "load" });
await page.waitForTimeout(1500);
const emailInput = page.locator('input[type="email"], input[name="email"]').first();
const passInput = page.locator('input[type="password"], input[name="password"]').first();
await emailInput.fill(email);
await passInput.fill(password);
await page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first().click();
await page.waitForURL(/dashboard|onboarding/, { timeout: 30000 }).catch(() => {});
console.log("after login URL:", page.url());
if (!page.url().includes("dashboard")) {
  // maybe onboarding gate
  console.log("NOTE: landed on", page.url());
}
await page.waitForTimeout(2500);

const results = [];

async function auditRoute(route) {
  try {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2200);

    const audit = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth - doc.clientWidth;
      const vw = window.innerWidth;
      const offenders = [];
      for (const el of document.querySelectorAll("*")) {
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 80),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
          if (offenders.length >= 10) break;
        }
      }

      // horizontally-scrollable containers that trap content (tables etc.)
      const scrollers = [];
      for (const el of document.querySelectorAll("*")) {
        const s = getComputedStyle(el);
        if ((s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 4) {
          scrollers.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), inner: el.scrollWidth, outer: el.clientWidth });
          if (scrollers.length >= 5) break;
        }
      }

      // clipped single-line text
      let clipped = 0;
      const clippedSamples = [];
      for (const el of document.querySelectorAll("td,th,p,span,h1,h2,h3,a,button,div")) {
        if (el.children.length > 2) continue;
        if (el.scrollWidth > el.clientWidth + 3 && el.clientWidth > 0) {
          clipped++;
          if (clippedSamples.length < 4) clippedSamples.push(String(el.textContent).trim().slice(0, 40));
        }
        if (clipped > 80) break;
      }

      // tap targets smaller than 40px (touch guideline ~44-48px)
      let tinyTargets = 0;
      for (const el of document.querySelectorAll("button, a[role], a")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.width < 36 || r.height < 32)) tinyTargets++;
        if (tinyTargets > 30) break;
      }

      return { overflowX, offenders, scrollers, clipped, clippedSamples, tinyTargets };
    });

    const shot = `shots/mobile/dash-${route.split("/").pop() || "root"}.png`;
    await page.screenshot({ path: shot, fullPage: false });
    // also a full-page shot for the worst offenders
    if (audit.overflowX > 0) {
      await page.screenshot({ path: shot.replace(".png", "-full.png"), fullPage: true });
    }

    results.push({ route, ...audit });
    const flag = audit.overflowX > 0 ? `⚠ OVERFLOW ${audit.overflowX}px` : "ok";
    console.log(
      `${route.padEnd(38)} ${flag.padEnd(18)} clipped:${String(audit.clipped).padStart(3)} scrollers:${audit.scrollers.length} tinyTargets:${audit.tinyTargets}`
    );
    for (const o of audit.offenders.slice(0, 4)) {
      console.log(`    ${o.tag}.${o.cls.slice(0, 55)} left:${o.left} right:${o.right}`);
    }
    for (const sc of audit.scrollers.slice(0, 3)) {
      console.log(`    (scrollable) ${sc.tag}.${sc.cls.slice(0, 45)} inner:${sc.inner} > outer:${sc.outer}`);
    }
    if (audit.clippedSamples.length) console.log(`    clipped: ${audit.clippedSamples.join(" | ").slice(0, 120)}`);
  } catch (e) {
    console.log(`${route.padEnd(38)} ERROR: ${e.message.slice(0, 70)}`);
    results.push({ route, error: e.message });
  }
}

for (const r of ROUTES) await auditRoute(r);

// ── interactive states: mobile menu, modals ──
await page.goto(BASE + "/dashboard", { waitUntil: "load" });
await page.waitForTimeout(1500);

console.log("\n--- bottom nav tap check ---");
const navInfo = await page.evaluate(() => {
  const nav = document.querySelector("nav") || document.querySelector("[class*='bottom']");
  if (!nav) return { found: false };
  const r = nav.getBoundingClientRect();
  return { found: true, w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), vh: window.innerHeight };
});
console.log(JSON.stringify(navInfo));

import { writeFileSync } from "node:fs";
writeFileSync("mobile-audit-dashboard.json", JSON.stringify(results, null, 2));
console.log("\nreport: mobile-audit-dashboard.json");
await browser.close();
