/**
 * Causal measurement: count browser-internal Paint/Raster/Composite events
 * during a scripted scroll, FIX ON vs FIX OFF (neutralized CSS), alternating.
 * Event COUNTS are independent of machine load, unlike fps.
 * Usage: node tools/perf/perf-event-count.mjs [url]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const URL = process.argv[2] || "http://127.0.0.1:3000/";
const ROUNDS = Number(process.env.ROUNDS || 3);
const THROTTLE = Number(process.env.THROTTLE || 4);

const NEUTRALIZED = `
html.ambient-scrolling .animate-aurora-1,
html.ambient-scrolling .animate-aurora-2,
html.ambient-scrolling .animate-aurora-3,
html.ambient-scrolling .animate-float-1,
html.ambient-scrolling .animate-float-2,
html.ambient-scrolling .animate-float-3,
html.ambient-scrolling .animate-ping,
html.ambient-scrolling .animate-shimmer,
html.ambient-scrolling [class*="animate-[marquee"] { animation-play-state: running !important; }
.aurora-layered { will-change: auto !important; }
`;

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--enable-gpu-rasterization"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

async function loadPage(neutralize) {
  await page.goto(URL, { waitUntil: "load" });
  if (neutralize) {
    await page.evaluate((css) => {
      const el = document.createElement("style");
      el.textContent = css;
      document.head.appendChild(el);
    }, NEUTRALIZED);
  }
  await page.waitForTimeout(3500);
}

async function tracedScroll() {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);

  const collected = [];
  const dataCollected = (d) => collected.push(...d.value);
  cdp.on("Tracing.dataCollected", dataCollected);
  const complete = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
  await cdp.send("Tracing.start", {
    transferMode: "ReportEvents",
    categories: "devtools.timeline",
    options: "sampling-frequency=10000",
  });
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(85);
  }
  await page.waitForTimeout(400);
  await cdp.send("Tracing.end");
  await complete;
  cdp.off("Tracing.dataCollected", dataCollected);

  const events = collected;
  const counts = {};
  let rasterMs = 0,
    paintMs = 0;
  let firstTs = Infinity,
    lastTs = 0;
  for (const e of events) {
    if (e.ph !== "X" && e.ph !== "R") continue;
    const n = e.name;
    if (/Paint|Raster|Layerize|PrePaint|UpdateLayer|CompositeLayers/.test(n)) {
      counts[n] = (counts[n] || 0) + 1;
      if (/Raster/.test(n)) rasterMs += (e.dur || 0) / 1000;
      if (/Paint/.test(n)) paintMs += (e.dur || 0) / 1000;
    }
    if (e.ts) {
      firstTs = Math.min(firstTs, e.ts);
      lastTs = Math.max(lastTs, e.ts + (e.dur || 0));
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  // top offenders by duration, for diagnostics
  const dur = {};
  for (const e of events) {
    if (e.ph !== "X") continue;
    if (/Paint|Raster|Layerize|CompositeLayers|Layout|UpdateLayoutTree|ParseHtml/.test(e.name)) {
      dur[e.name] = (dur[e.name] || 0) + (e.dur || 0) / 1000;
    }
  }
  return { counts, total, rasterMs: Math.round(rasterMs), paintMs: Math.round(paintMs), dur };
}

const acc = { fix: [], off: [] };
for (let r = 0; r < ROUNDS; r++) {
  for (const variant of ["fix", "off"]) {
    await loadPage(variant === "off");
    const m = await tracedScroll();
    acc[variant].push(m);
    console.log(
      `r${r + 1} ${variant === "fix" ? "FIX ON " : "FIX OFF"} events: ${String(m.total).padStart(5)}  paint ${String(m.paintMs).padStart(5)}ms`
    );
    if (process.env.DUMP) {
      const top = Object.entries(m.dur).sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [n, d] of top) console.log(`      ${String(Math.round(d)).padStart(6)}ms  ${n}`);
    }
  }
}

function med(a, f) {
  const v = a.map(f).sort((x, y) => x - y);
  return v[Math.floor(v.length / 2)];
}
const offTotal = med(acc.off, (m) => m.total);
const onTotal = med(acc.fix, (m) => m.total);
const offRaster = med(acc.off, (m) => m.rasterMs);
const onRaster = med(acc.fix, (m) => m.rasterMs);
console.log("\n=== MEDIANS: rendering events during identical scripted scroll ===");
console.log(`total render events:  FIX OFF ${offTotal}  ->  FIX ON ${onTotal}   (${(((onTotal - offTotal) / offTotal) * 100).toFixed(1)}%)`);
console.log(`raster time (ms):     FIX OFF ${offRaster}  ->  FIX ON ${onRaster}   (${(((onRaster - offRaster) / Math.max(1, offRaster)) * 100).toFixed(1)}%)`);
writeFileSync("perf-event-count.json", JSON.stringify(acc, null, 2));
await browser.close();
