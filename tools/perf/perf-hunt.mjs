/**
 * Find where the render budget actually goes: A/B several hypotheses in ONE
 * session by toggling CSS, alternating so machine load can't skew it.
 * Usage: THROTTLE=4 node perf-hunt.mjs [url]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");
const URL = process.argv[2] || "http://127.0.0.1:3000/";
const THROTTLE = Number(process.env.THROTTLE || 4);
const ROUNDS = Number(process.env.ROUNDS || 2);

// Each hypothesis is a CSS patch that REMOVES one suspected cost.
const VARIANTS = {
  "as-is": ``,
  "no-backdrop": `* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }`,
  "no-infinite-css": `.animate-aurora-1,.animate-aurora-2,.animate-aurora-3,
     .animate-float-1,.animate-float-2,.animate-float-3,
     .animate-ping,.animate-pulse,.animate-shimmer,
     [class*="marquee"] { animation: none !important; }`,
  "no-aurora-at-all": `.aurora { display: none !important; }`,
  "no-transitions": `* { transition: none !important; }`,
  "backdrop+infinite": `* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
     .animate-aurora-1,.animate-aurora-2,.animate-aurora-3,
     .animate-float-1,.animate-float-2,.animate-float-3,
     .animate-ping,.animate-pulse,.animate-shimmer,
     [class*="marquee"] { animation: none !important; }`,
};

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (THROTTLE > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(4500);

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
          });
        }
      }
      requestAnimationFrame(tick);
    });
  }, ms);
  if (scroll) {
    for (let i = 0; i < 26; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(90);
    }
  }
  return h;
}

async function apply(css) {
  await page.evaluate((css) => {
    let el = document.getElementById("__hunt");
    if (!el) {
      el = document.createElement("style");
      el.id = "__hunt";
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, css);
  await page.waitForTimeout(1200);
}

const acc = {};
for (const k of Object.keys(VARIANTS)) acc[k] = { idle: [], scroll: [] };

for (let r = 0; r < ROUNDS; r++) {
  for (const [name, css] of Object.entries(VARIANTS)) {
    await apply(css);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const idle = await fps(2200, false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const scroll = await fps(2600, true);
    acc[name].idle.push(idle);
    acc[name].scroll.push(scroll);
    console.log(
      `r${r + 1} ${name.padEnd(18)} idle ${String(idle.fps).padStart(5)}fps p95 ${String(idle.p95).padStart(6)}  |  scroll ${String(scroll.fps).padStart(5)}fps p95 ${String(scroll.p95).padStart(6)} jank ${scroll.jank}`
    );
  }
}

function med(a, f) {
  const v = a.map(f).sort((x, y) => x - y);
  return v[Math.floor(v.length / 2)];
}
console.log("\n=== MEDIANS vs as-is (higher fps / lower p95 = that thing was costing us) ===");
const baseIdle = med(acc["as-is"].idle, (d) => d.fps);
const baseScrollP95 = med(acc["as-is"].scroll, (d) => d.p95);
const baseScroll = med(acc["as-is"].scroll, (d) => d.fps);
for (const name of Object.keys(VARIANTS)) {
  const i = med(acc[name].idle, (d) => d.fps);
  const s = med(acc[name].scroll, (d) => d.fps);
  const sp = med(acc[name].scroll, (d) => d.p95);
  console.log(
    `${name.padEnd(18)} idle ${String(i).padStart(5)}fps (${(((i - baseIdle) / baseIdle) * 100).toFixed(0).padStart(4)}%)   ` +
      `scroll ${String(s).padStart(5)}fps (${(((s - baseScroll) / baseScroll) * 100).toFixed(0).padStart(4)}%)   ` +
      `scroll p95 ${String(sp).padStart(6)}ms (${(((sp - baseScrollP95) / baseScrollP95) * 100).toFixed(0).padStart(4)}%)`
  );
}
writeFileSync("perf-hunt.json", JSON.stringify(acc, null, 2));
await browser.close();
