/**
 * Mobile UI audit: loads each public route at phone widths, measures real
 * horizontal overflow, names the offending elements, and screenshots.
 * Usage: node tools/mobile/audit-public.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

const WIDTHS = [375, 390, 320]; // iPhone SE-ish, iPhone 14, small Android
const ROUTES = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/help",
  "/about",
  "/contact",
  "/changelog",
  "/privacy",
  "/terms",
  "/roadmap",
  "/status",
  "/security",
];

mkdirSync("shots/mobile", { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

const report = [];

for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      width === 390
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
  });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(2500); // entrance animations settle

      const audit = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflowX = doc.scrollWidth - doc.clientWidth;
        const bodyOverflowX = document.body.scrollWidth - document.body.clientWidth;

        // find every element that extends past the viewport
        const offenders = [];
        const vw = window.innerWidth;
        for (const el of document.querySelectorAll("*")) {
          const s = getComputedStyle(el);
          if (s.display === "none" || s.visibility === "hidden" || s.position === "fixed") continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (r.right > vw + 1 || r.left < -1) {
            // skip elements inside an overflow-hidden/clipped ancestor that
            // contains them (they don't cause page scroll)
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className).slice(0, 90),
              left: Math.round(r.left),
              right: Math.round(r.right),
              w: Math.round(r.width),
            });
            if (offenders.length >= 12) break;
          }
        }

        // also check for text that clips its own box
        let clippedText = 0;
        for (const el of document.querySelectorAll("h1,h2,h3,p,span,a,button,td,th,div")) {
          if (el.children.length > 0) continue;
          if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) clippedText++;
          if (clippedText > 50) break;
        }

        return { overflowX, bodyOverflowX, vw, offenders, clippedText };
      });

      const shot = `shots/mobile/${width}-${route === "/" ? "home" : route.slice(1)}.png`;
      await page.screenshot({ path: shot });

      report.push({ width, route, ...audit });
      const flag = audit.overflowX > 0 ? `⚠ OVERFLOW ${audit.overflowX}px` : "ok";
      console.log(
        `${String(width).padStart(4)} ${route.padEnd(12)} ${flag.padEnd(20)} clippedText:${audit.clippedText}`
      );
      if (audit.overflowX > 0) {
        for (const o of audit.offenders.slice(0, 5)) {
          console.log(`        ${o.tag}.${o.cls.slice(0, 60)}  left:${o.left} right:${o.right} w:${o.w}`);
        }
      }
    } catch (e) {
      console.log(`${String(width).padStart(4)} ${route.padEnd(12)} LOAD ERROR: ${e.message.slice(0, 60)}`);
      report.push({ width, route, error: e.message });
    }
  }
  await ctx.close();
}

writeFileSync("mobile-audit-public.json", JSON.stringify(report, null, 2));
console.log("\nreport: mobile-audit-public.json | shots: shots/mobile/");
await browser.close();
