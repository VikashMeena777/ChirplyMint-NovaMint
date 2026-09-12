/**
 * CPU-profile the SCROLL specifically — find what burns frames while
 * scrolling (the thing the user feels).
 * Usage: node perf-profile-scroll.mjs [url]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const URL = process.argv[2] || "http://127.0.0.1:3000/";
const THROTTLE = Number(process.env.THROTTLE || 4);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(4500);

await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");

// Continuous scroll for 5s (wheel events keep Lenis busy)
const scrolling = (async () => {
  for (let i = 0; i < 50; i++) {
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(90);
  }
})();
await page.waitForTimeout(5000);
await scrolling;
const { profile } = await cdp.send("Profiler.stop");

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.samples.length;
for (const id of profile.samples) {
  const n = byId.get(id);
  if (!n) continue;
  const cf = n.callFrame;
  const name = cf.functionName || "(anonymous)";
  const key = `${name} @ ${(cf.url || "").split("/").slice(-1)[0]}:${cf.lineNumber}`;
  self.set(key, (self.get(key) || 0) + 1);
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28);
console.log(`samples over 5s of scrolling: ${total}`);
console.log("=== SCROLL main-thread self time ===");
for (const [k, v] of rows) {
  console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${String(v).padStart(5)} samp  ${k}`);
}
writeFileSync("perf-cpu-scroll.json", JSON.stringify(rows, null, 2));
await browser.close();
