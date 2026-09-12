/**
 * Back-to-back A/B of the aurora technique in ONE browser session, so
 * machine load can't skew the comparison. Measures the optimized page as-is
 * (gradients), then injects CSS restoring the original blur implementation
 * and measures again, alternating several times.
 * Usage: THROTTLE=4 node perf-ab.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const URL = process.argv[2] || "http://127.0.0.1:3000/";
const THROTTLE = Number(process.env.THROTTLE || 4);
const ROUNDS = Number(process.env.ROUNDS || 3);

// Restores the ORIGINAL implementation: solid disc + big filter:blur, at the
// original sizes/positions. Overrides the .aurora gradient entirely.
const BLUR_CSS = `
.aurora { background: none !important; filter: blur(140px) !important; }
.aurora.animate-aurora-1 { width:480px!important; height:480px!important; }
.aurora.animate-aurora-2 { width:420px!important; height:420px!important; filter: blur(150px)!important; }
.aurora.animate-aurora-3 { width:380px!important; height:380px!important; filter: blur(130px)!important; }
.aurora.au-emerald  { background: oklch(0.55 0.2 158 / 30%) !important; }
.aurora.au-teal     { background: oklch(0.777 0.152 182 / 25%) !important; }
.aurora.au-teal-d   { background: oklch(0.704 0.14 182 / 12%) !important; }
.aurora.au-indigo   { background: oklch(0.673 0.182 277 / 20%) !important; }
.aurora.au-indigo-d { background: oklch(0.585 0.233 277 / 10%) !important; }
.aurora.au-mint     { background: oklch(0.62 0.19 162 / 20%) !important; }
`;

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--enable-gpu-rasterization"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(4000); // past entrance animations

async function fps(ms, scroll) {
  const h = page.evaluate((ms) => {
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
            frames,
          });
        }
      }
      requestAnimationFrame(tick);
    });
  }, ms);
  if (scroll) {
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(90);
    }
  }
  return h;
}

async function setVariant(useBlur) {
  await page.evaluate(
    ([useBlur, css]) => {
      let el = document.getElementById("__ab");
      if (useBlur) {
        if (!el) {
          el = document.createElement("style");
          el.id = "__ab";
          document.head.appendChild(el);
        }
        el.textContent = css;
      } else if (el) {
        el.remove();
      }
    },
    [useBlur, BLUR_CSS]
  );
  await page.waitForTimeout(1200); // let it re-raster and settle
}

const results = { blur: [], gradient: [] };

for (let r = 0; r < ROUNDS; r++) {
  for (const variant of ["gradient", "blur"]) {
    await setVariant(variant === "blur");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);

    const idle = await fps(2500, false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const scroll = await fps(3000, true);

    // measured blur load actually in effect
    const cost = await page.evaluate(() => {
      let n = 0,
        c = 0;
      for (const el of document.querySelectorAll(".aurora")) {
        const s = getComputedStyle(el);
        const m = s.filter.match(/blur\(([\d.]+)px\)/);
        const rect = el.getBoundingClientRect();
        if (m && rect.width) {
          n++;
          c += (+m[1] * rect.width * rect.height) / 1e6;
        }
      }
      return { blurLayers: n, cost: Math.round(c) };
    });

    results[variant].push({ idle, scroll, ...cost });
    console.log(
      `round ${r + 1} ${variant.padEnd(8)} idle ${String(idle.fps).padStart(5)}fps (p95 ${String(idle.p95).padStart(5)}ms, jank ${idle.jank})  ` +
        `scroll ${String(scroll.fps).padStart(5)}fps (p95 ${String(scroll.p95).padStart(5)}ms, jank ${scroll.jank})  blurLayers ${cost.blurLayers} cost ${cost.cost}`
    );
  }
}

function med(arr, f) {
  const v = arr.map(f).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}
console.log("\n=== MEDIANS (same session, alternating) ===");
for (const k of ["idle", "scroll"]) {
  const bf = med(results.blur, (r) => r[k].fps);
  const gf = med(results.gradient, (r) => r[k].fps);
  const bp = med(results.blur, (r) => r[k].p95);
  const gp = med(results.gradient, (r) => r[k].p95);
  const bj = med(results.blur, (r) => r[k].jank);
  const gj = med(results.gradient, (r) => r[k].jank);
  console.log(
    `${k}:  blur ${bf}fps/p95 ${bp}ms/jank ${bj}   ->   gradient ${gf}fps/p95 ${gp}ms/jank ${gj}   ` +
      `fps ${(((gf - bf) / bf) * 100).toFixed(1)}%  p95 ${(((gp - bp) / bp) * 100).toFixed(1)}%`
  );
}
writeFileSync("perf-ab.json", JSON.stringify(results, null, 2));
await browser.close();
