/**
 * Homepage performance harness.
 * Measures: FPS during scroll, long tasks, layer/paint counts, CWV.
 * Usage: node perf-measure.mjs <url> <label>
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000/";
const label = process.argv[3] || "run";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--enable-gpu-rasterization", "--force-device-scale-factor=1"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Optional CPU throttling to represent a real mid-tier device rather than a
// fast desktop (THROTTLE=4 => 4x slower CPU, the standard mid-tier proxy).
const THROTTLE = Number(process.env.THROTTLE || 0);
if (THROTTLE > 1) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
}

// ── 1. Cold load metrics ──
const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
const loadMs = Date.now() - t0;

const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType("navigation")[0];
  return { domContentLoaded: n.domContentLoadedEventEnd, load: n.loadEventEnd, transfer: n.transferSize };
});

// Web vitals (LCP / CLS) + long tasks, collected over 4s of settle
const vitals = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const out = { lcp: 0, cls: 0, longTasks: [], totalBlocking: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) out.lcp = Math.max(out.lcp, e.startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          out.longTasks.push(Math.round(e.duration));
          out.totalBlocking += Math.max(0, e.duration - 50);
        }
      }).observe({ type: "longtask", buffered: true });
      setTimeout(() => resolve(out), 4000);
    })
);

// ── 2. Idle FPS (no interaction — pure animation cost) ──
async function measureFps(page, ms, during) {
  const handle = page.evaluate((ms) => {
    return new Promise((resolve) => {
      let frames = 0;
      const gaps = [];
      let last = performance.now();
      const start = last;
      function tick(now) {
        frames++;
        gaps.push(now - last);
        last = now;
        if (now - start < ms) requestAnimationFrame(tick);
        else {
          gaps.sort((a, b) => a - b);
          resolve({
            fps: +(frames / ((now - start) / 1000)).toFixed(1),
            medianGap: +gaps[Math.floor(gaps.length / 2)].toFixed(1),
            p95Gap: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1),
            worstGap: +gaps[gaps.length - 1].toFixed(1),
            jankFrames: gaps.filter((g) => g > 20).length,
            totalFrames: frames,
          });
        }
      }
      requestAnimationFrame(tick);
    });
  }, ms);
  if (during) await during();
  return handle;
}

const idleFps = await measureFps(page, 3000);

// ── 3. Scroll FPS (the thing the user feels as "laggy") ──
const scrollFps = await measureFps(page, 4000, async () => {
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(90);
  }
});

// ── 4. Compositing cost: count blur layers actually painted ──
const layers = await page.evaluate(() => {
  const all = [...document.querySelectorAll("*")];
  let filterBlur = 0,
    backdrop = 0,
    infinite = 0,
    willChange = 0;
  const blurs = [];
  for (const el of all) {
    const s = getComputedStyle(el);
    if (s.filter && s.filter.includes("blur")) {
      filterBlur++;
      const m = s.filter.match(/blur\(([\d.]+)px\)/);
      const r = el.getBoundingClientRect();
      if (m) blurs.push({ px: +m[1], w: Math.round(r.width), h: Math.round(r.height) });
    }
    if (s.backdropFilter && s.backdropFilter !== "none") backdrop++;
    if (s.animationIterationCount && s.animationIterationCount.includes("infinite")) infinite++;
    if (s.willChange && s.willChange !== "auto") willChange++;
  }
  // blur cost proxy: radius * area (what the GPU actually has to convolve)
  const blurCost = blurs.reduce((a, b) => a + (b.px * (b.w * b.h)) / 1e6, 0);
  return { filterBlur, backdrop, infinite, willChange, blurCost: Math.round(blurCost), blurs };
});

// ── 5. JS bundle weight ──
const js = await page.evaluate(() =>
  performance
    .getEntriesByType("resource")
    .filter((r) => r.name.endsWith(".js") || r.name.includes("/_next/static/chunks"))
    .reduce((a, r) => a + (r.encodedBodySize || r.transferSize || 0), 0)
);

const result = {
  label,
  url,
  loadMs,
  nav,
  lcp: Math.round(vitals.lcp),
  cls: +vitals.cls.toFixed(4),
  totalBlockingMs: Math.round(vitals.totalBlocking),
  longTaskCount: vitals.longTasks.length,
  longTasksOver100: vitals.longTasks.filter((d) => d > 100).length,
  idleFps,
  scrollFps,
  layers: { ...layers, blurs: layers.blurs.slice(0, 20) },
  jsBytes: Math.round(js / 1024) + " KB",
};

console.log(JSON.stringify(result, null, 2));
writeFileSync(`perf-${label}.json`, JSON.stringify(result, null, 2));
await browser.close();
