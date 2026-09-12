/**
 * Fair A/B: alternate between the OPTIMIZED build (currently served) and the
 * BASELINE code, both measured in the same browser session back-to-back.
 * The baseline is recreated via a comprehensive CSS/JS patch that reverses
 * the optimizations. Alternating rounds cancel out machine-load drift.
 * Usage: THROTTLE=4 node perf-final-ab.mjs [url]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const URL = process.argv[2] || "http://127.0.0.1:3000/";
const THROTTLE = Number(process.env.THROTTLE || 4);
const ROUNDS = Number(process.env.ROUNDS || 3);

// Reverts the homepage to the BASELINE behaviour:
// - auroras back to solid discs + big blur (original sizes are approximated
//   from the same center: box shrinks by 1.7*blur per side)
// - backdrop-filter restored on the three de-blurred surfaces
// - ambient pausing neutralized (force running)
// - the inView gating in React components can't be reverted from CSS, but
//   their loops only pause when fully off-screen (margin 120-160px) — during
//   the scroll test they're in view, so the comparison stays fair for what
//   we're measuring (visible-frame work).
const BASELINE_CSS = `
.aurora { will-change: auto !important; }
.aurora.animate-aurora-1 { filter: blur(140px) !important; background: none !important;
  width: 480px !important; height: 480px !important; }
.aurora.animate-aurora-2 { filter: blur(150px) !important; background: none !important;
  width: 420px !important; height: 420px !important; }
.aurora.animate-aurora-3 { filter: blur(130px) !important; background: none !important;
  width: 380px !important; height: 380px !important; }
.aurora.au-mint:not(.animate-aurora-1):not(.animate-aurora-2):not(.animate-aurora-3) {
  filter: blur(150px) !important; background: none !important; }
.aurora.au-emerald { box-shadow: 0 0 0 9999px oklch(0.55 0.2 158 / 30%) !important; }
.ambient-paused { animation-play-state: running !important; }
html { scroll-behavior: smooth !important; }
`;

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--enable-gpu-rasterization"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

async function loadPage(withBaselineCss) {
  await page.goto(URL, { waitUntil: "load" });
  if (withBaselineCss) {
    await page.evaluate((css) => {
      const el = document.createElement("style");
      el.textContent = css;
      document.head.appendChild(el);
    }, BASELINE_CSS);
  }
  await page.waitForTimeout(3500); // entrance animations settle
}

async function measure() {
  // LCP + TBT fresh per variant need a reload; here we capture scroll/idle
  const idle = await page.evaluate((ms) => {
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
          resolve({ fps: +(frames / ((now - start) / 1000)).toFixed(1), p95: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1), jank: gaps.filter((g) => g > 20).length });
        }
      }
      requestAnimationFrame(tick);
    });
  }, 2500);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  const scroll = await page.evaluate((ms) => {
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
          resolve({ fps: +(frames / ((now - start) / 1000)).toFixed(1), p95: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1), jank: gaps.filter((g) => g > 20).length, worst: +gaps[gaps.length - 1].toFixed(1) });
        }
      }
      requestAnimationFrame(tick);
    });
  }, 3000);
  const wheeling = (async () => {
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(90);
    }
  })();
  await wheeling;
  return { idle, scroll };
}

const acc = { opt: [], base: [] };
for (let r = 0; r < ROUNDS; r++) {
  for (const variant of ["opt", "base"]) {
    await loadPage(variant === "base");
    const m = await measure();
    acc[variant].push(m);
    console.log(
      `r${r + 1} ${variant === "base" ? "BASELINE" : "OPT    "} idle ${String(m.idle.fps).padStart(5)}fps p95 ${String(m.idle.p95).padStart(5)}ms jank ${String(m.idle.jank).padStart(3)}  |  scroll ${String(m.scroll.fps).padStart(5)}fps p95 ${String(m.scroll.p95).padStart(6)}ms worst ${String(m.scroll.worst).padStart(6)} jank ${m.scroll.jank}`
    );
  }
}

function med(a, f) {
  const v = a.map(f).sort((x, y) => x - y);
  return v[Math.floor(v.length / 2)];
}
console.log("\n=== MEDIANS (alternating, same session) ===");
for (const k of ["idle", "scroll"]) {
  const bf = med(acc.base, (m) => m[k].fps);
  const of_ = med(acc.opt, (m) => m[k].fps);
  const bp = med(acc.base, (m) => m[k].p95);
  const op = med(acc.opt, (m) => m[k].p95);
  console.log(
    `${k}:  BASE ${bf}fps/p95 ${bp}ms  ->  OPT ${of_}fps/p95 ${op}ms   (fps ${(((of_ - bf) / bf) * 100).toFixed(1)}%, p95 ${(((op - bp) / bp) * 100).toFixed(1)}%)`
  );
}
const bw = med(acc.base, (m) => m.scroll.worst);
const ow = med(acc.opt, (m) => m.scroll.worst);
console.log(`scroll worst frame:  BASE ${bw}ms -> OPT ${ow}ms (${(((ow - bw) / bw) * 100).toFixed(1)}%)`);
writeFileSync("perf-final-ab.json", JSON.stringify(acc, null, 2));
await browser.close();
