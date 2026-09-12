/**
 * Find WHO invalidates style during scroll: trace with invalidation
 * tracking, which records the element + reason + JS stack for every
 * style/layout invalidation.
 * Usage: node tools/perf/perf-invalidation.mjs [url]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const URL = process.argv[2] || "http://127.0.0.1:3000/";

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(3500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.mouse.move(2, 2); // corner: remove hover as a variable

const collected = [];
const onCollected = (d) => collected.push(...d.value);
cdp.on("Tracing.dataCollected", onCollected);
const complete = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.start", {
  transferMode: "ReportEvents",
  categories:
    "devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking",
});

for (let i = 0; i < 30; i++) {
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(85);
}
await page.waitForTimeout(400);
await cdp.send("Tracing.end");
await complete;
cdp.off("Tracing.dataCollected", onCollected);

// Aggregate invalidation events
const inv = {};
const stacks = {};
for (const e of collected) {
  if (e.name !== "StyleRecalcInvalidationTracking" && e.name !== "LayoutInvalidationTracking") continue;
  const reason = e.args?.data?.reason || "?";
  const node = (e.args?.data?.nodeId || 0) > 0 ? "" : "";
  const key = `${e.name} reason=${reason}`;
  inv[key] = (inv[key] || 0) + 1;
  const st = e.args?.data?.stackTrace?.[0];
  if (st) {
    const fn = `${st.functionName || "(anon)"} @ ${(st.url || "").split("/").slice(-1)[0]}:${st.lineNumber}`;
    stacks[fn] = (stacks[fn] || 0) + 1;
  }
}

console.log("=== invalidation events by type/reason ===");
for (const [k, v] of Object.entries(inv).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`${String(v).padStart(5)}  ${k}`);
}
console.log("\n=== top JS causes (from stacks) ===");
for (const [k, v] of Object.entries(stacks).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`${String(v).padStart(5)}  ${k}`);
}
writeFileSync(
  "perf-invalidation.json",
  JSON.stringify({ inv, stacks }, null, 2)
);
await browser.close();
