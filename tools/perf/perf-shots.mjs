/**
 * Visual regression: capture the homepage at several scroll depths in both
 * themes. Run before and after optimizing; compare pixel-by-pixel.
 * Usage: node perf-shots.mjs <url> <label>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000/";
const label = process.argv[3] || "run";
const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

mkdirSync(`shots/${label}`, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
    reducedMotion: "reduce", // freeze animations so shots are deterministic
  });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(3500); // let entrance animations settle
  // Freeze every running animation so shots are phase-deterministic
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try { a.pause(); a.currentTime = 0; } catch {}
    });
  });
  await page.waitForTimeout(200);

  // Force the theme class in case the toggle reads localStorage late
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
  await page.waitForTimeout(400);

  const depths = [0, 900, 1800, 2700, 3600, 4500, 5400];
  for (const y of depths) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `shots/${label}/${theme}-${y}.png` });
  }
  console.log(`${theme}: ${depths.length} shots`);
  await ctx.close();
}

await browser.close();
console.log(`shots/${label} written`);
