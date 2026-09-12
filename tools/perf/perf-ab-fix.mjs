/**
 * A/B the scroll-pause + post-load-layer fixes specifically: same build,
 * one run with the fixes neutralized via injected CSS, alternating.
 * Usage: THROTTLE=4 node perf-ab-fix.mjs [url]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const URL = process.argv[2] || "http://127.0.0.1:3000/";
const THROTTLE = Number(process.env.THROTTLE || 4);
const ROUNDS = Number(process.env.ROUNDS || 3);

// Neutralizes ONLY the two new fixes: scroll-pausing disabled, layer
// promotion removed. Everything else stays identical.
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
  await page.waitForTimeout(3500); // settle + layer promotion
}

async function fps(ms) {
  return page.evaluate((ms) => {
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
            p95: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1),
            jank: gaps.filter((g) => g > 20).length,
            worst: +gaps[gaps.length - 1].toFixed(1),
          });
        }
      }
      requestAnimationFrame(tick);
    });
  }, ms);
}

async function measure() {
  const idle = await fps(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  const scrollPromise = fps(3200);
  const wheeling = (async () => {
    for (let i = 0; i < 32; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(85);
    }
  })();
  const scroll = await scrollPromise;
  await wheeling;
  return { idle, scroll };
}

const acc = { fix: [], off: [] };
for (let r = 0; r < ROUNDS; r++) {
  for (const variant of ["fix", "off"]) {
    await loadPage(variant === "off");
    const m = await measure();
    acc[variant].push(m);
    console.log(
      `r${r + 1} ${variant === "fix" ? "FIX ON " : "FIX OFF"} idle ${String(m.idle.fps).padStart(5)}fps p95 ${String(m.idle.p95).padStart(6)}ms  |  scroll ${String(m.scroll.fps).padStart(5)}fps p95 ${String(m.scroll.p95).padStart(6)}ms worst ${String(m.scroll.worst).padStart(6)} jank ${m.scroll.jank}`
    );
  }
}

function med(a, f) {
  const v = a.map(f).sort((x, y) => x - y);
  return v[Math.floor(v.length / 2)];
}
console.log("\n=== MEDIANS (alternating, same build) ===");
for (const k of ["idle", "scroll"]) {
  const off = med(acc.off, (m) => m[k].fps);
  const on = med(acc.fix, (m) => m[k].fps);
  const offP = med(acc.off, (m) => m[k].p95);
  const onP = med(acc.fix, (m) => m[k].p95);
  console.log(
    `${k}:  FIX OFF ${off}fps/p95 ${offP}ms  ->  FIX ON ${on}fps/p95 ${onP}ms   (fps ${(((on - off) / off) * 100).toFixed(1)}%, p95 ${(((onP - offP) / offP) * 100).toFixed(1)}%)`
  );
}
const offW = med(acc.off, (m) => m.scroll.worst);
const onW = med(acc.fix, (m) => m.scroll.worst);
console.log(`scroll worst frame:  OFF ${offW}ms -> ON ${onW}ms (${(((onW - offW) / offW) * 100).toFixed(1)}%)`);
writeFileSync("perf-ab-fix.json", JSON.stringify(acc, null, 2));
await browser.close();
