/**
 * Diagnose the per-frame UpdateLayoutTree cost during scroll: dump each
 * style-recalc event with timestamp, duration, and — via the trace's
 * Flow/Initiator data — what preceded it. Also instruments cheap markers:
 * toggles :hover thrash by moving the mouse away mid-run for comparison.
 * Usage: node tools/perf/perf-recalc-diagnose.mjs [url]
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

async function tracedScroll(label, moveMouseAway) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  if (moveMouseAway) {
    // park the cursor in the top-left gutter where nothing hoverable lives
    await page.mouse.move(2, 2);
  } else {
    await page.mouse.move(720, 450); // dead center, over content
  }

  const collected = [];
  const onCollected = (d) => collected.push(...d.value);
  cdp.on("Tracing.dataCollected", onCollected);
  const complete = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
  await cdp.send("Tracing.start", {
    transferMode: "ReportEvents",
    categories: "devtools.timeline",
  });

  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(85);
  }
  await page.waitForTimeout(400);
  await cdp.send("Tracing.end");
  await complete;
  cdp.off("Tracing.dataCollected", onCollected);

  const events = collected;
  // frame count + recalc events
  const recalc = events
    .filter((e) => e.name === "UpdateLayoutTree" && e.ph === "X")
    .map((e) => ({ ts: e.ts, dur: Math.round((e.dur || 0) / 1000) }));
  const layerize = events
    .filter((e) => e.name === "Layerize" && e.ph === "X")
    .map((e) => ({ ts: e.ts, dur: Math.round((e.dur || 0) / 1000) }));
  const paint = events.filter((e) => e.name === "Paint" && e.ph === "X");
  const first = Math.min(...recalc.map((r) => r.ts), ...layerize.map((r) => r.ts));
  const totalRecalc = recalc.reduce((a, b) => a + b.dur, 0);
  const totalLayerize = layerize.reduce((a, b) => a + b.dur, 0);

  console.log(`\n=== ${label} ===`);
  console.log(
    `UpdateLayoutTree: ${recalc.length} events, ${totalRecalc}ms total  (max ${Math.max(0, ...recalc.map((r) => r.dur))}ms)`
  );
  console.log(
    `Layerize:         ${layerize.length} events, ${totalLayerize}ms total  (max ${Math.max(0, ...layerize.map((r) => r.dur))}ms)`
  );
  // distribution: how many are >10ms?
  console.log(`recalc events >10ms: ${recalc.filter((r) => r.dur > 10).length}, >30ms: ${recalc.filter((r) => r.dur > 30).length}`);
  if (recalc.length) {
    // print timeline of big ones (ts relative ms, dur)
    const big = recalc.filter((r) => r.dur > 15).slice(0, 15);
    for (const r of big) console.log(`   +${Math.round((r.ts - first) / 1000)}ms  ${r.dur}ms`);
  }
  return { recalc: recalc.length, totalRecalc, layerize: layerize.length, totalLayerize, paints: paint.length };
}

// Same scroll, cursor parked in the corner vs cursor over content
const corner = await tracedScroll("CURSOR IN CORNER (no hover)", true);
const center = await tracedScroll("CURSOR OVER CONTENT (hover flips)", false);

console.log("\n=== VERDICT ===");
console.log(
  `recalc total: corner ${corner.totalRecalc}ms vs center ${center.totalRecalc}ms  → hover thrash ${center.totalRecalc - corner.totalRecalc}ms`
);
writeFileSync("perf-recalc-diagnose.json", { corner, center }, null, 2);
await browser.close();
