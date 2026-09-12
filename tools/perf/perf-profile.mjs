/**
 * Derive EXACT gradient stops from the real blurred rendering.
 * Renders each blurred blob on a white and a black backdrop, samples the
 * alpha profile along a radius, and emits radial-gradient stops that
 * reproduce that measured curve.
 * Usage: node perf-profile.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

// name, css size, blur radius, colour (the literal used in the markup)
const CASES = [
  { name: "aurora-1-light", size: 480, blur: 140, color: "oklch(0.55 0.2 158 / 30%)" },
  { name: "aurora-1-dark", size: 480, blur: 140, color: "oklch(0.55 0.2 158 / 14%)" },
  { name: "aurora-2-light", size: 420, blur: 150, color: "oklch(0.777 0.152 182 / 25%)" },
  { name: "aurora-3-light", size: 380, blur: 130, color: "oklch(0.673 0.182 277 / 20%)" },
  { name: "beam-light", size: 0, blur: 120, w: 720, h: 280, color: "oklch(0.62 0.19 162 / 20%)" },
];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1600, height: 1600 } });

const out = [];

for (const c of CASES) {
  const w = c.w || c.size;
  const h = c.h || c.size;
  const box = Math.max(w, h) + 2 * c.blur;
  const CANVAS = box + 200;

  // Render the blurred original over TRANSPARENT so we can read true alpha
  await page.setContent(`<body style="margin:0;width:${CANVAS}px;height:${CANVAS}px">
    <div id="t" style="position:absolute;left:${(CANVAS - w) / 2}px;top:${(CANVAS - h) / 2}px;
      width:${w}px;height:${h}px;border-radius:9999px;
      background:${c.color};filter:blur(${c.blur}px)"></div></body>`);
  await page.waitForTimeout 
    ? await page.waitForTimeout(220)
    : null;

  // Composite the blurred element over white and over black; from the two
  // results we can solve for the true per-pixel alpha AND colour:
  //   over_white = C*a + 255*(1-a)   →  over_black = C*a
  //   a = 1 - (over_white - over_black)/255
  const shots = {};
  for (const bg of ["#000", "#fff"]) {
    await page.evaluate((bg) => (document.body.style.background = bg), bg);
    await page.waitForTimeout(150);
    shots[bg] = (await page.screenshot()).toString("base64");
  }

  const profile = await page.evaluate(
    async ([blackB64, whiteB64, CANVAS, halfW, halfH]) => {
      async function load(b64) {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = img.width;
        cv.height = img.height;
        const cx = cv.getContext("2d");
        cx.drawImage(img, 0, 0);
        return cx.getImageData(0, 0, cv.width, cv.height);
      }
      const B = await load(blackB64);
      const W = await load(whiteB64);
      const cx0 = Math.round(CANVAS / 2);
      const cy0 = Math.round(CANVAS / 2);

      // Sample along the +x axis (and +y for the ellipse case) at 40 steps
      const steps = 40;
      const reach = Math.round(CANVAS / 2) - 2;
      const samples = [];
      for (let s = 0; s <= steps; s++) {
        const dist = Math.round((s / steps) * reach);
        const i = ((cy0 * B.width) + (cx0 + dist)) * 4;
        // alpha from the white/black pair
        const aR = 1 - (W.data[i] - B.data[i]) / 255;
        const aG = 1 - (W.data[i + 1] - B.data[i + 1]) / 255;
        const aB = 1 - (W.data[i + 2] - B.data[i + 2]) / 255;
        const a = Math.max(0, (aR + aG + aB) / 3);
        samples.push({ dist, alpha: +a.toFixed(5) });
      }
      const peak = samples[0].alpha;
      // where does it effectively vanish?
      const last = samples.filter((s) => s.alpha > 0.002).pop();
      return { peak: +peak.toFixed(5), reachPx: last ? last.dist : 0, samples };
    },
    [shots["#000"], shots["#fff"], CANVAS, w / 2, h / 2]
  );

  // Emit gradient stops as a fraction of the measured reach, normalised to peak
  const reach = profile.reachPx || box / 2;
  const stops = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1].map((f) => {
    const target = Math.round(f * reach);
    // nearest sample
    let best = profile.samples[0];
    for (const s of profile.samples) if (Math.abs(s.dist - target) < Math.abs(best.dist - target)) best = s;
    return { at: +(f * 100).toFixed(1), alphaPct: +(best.alpha * 100).toFixed(2) };
  });

  out.push({
    name: c.name,
    cssSize: [w, h],
    blur: c.blur,
    boxNeeded: Math.round(reach * 2),
    peakAlpha: profile.peak,
    reachPx: profile.reachPx,
    stops,
  });

  console.log(`\n${c.name}: css ${w}x${h}, blur ${c.blur}`);
  console.log(`  measured peak alpha: ${(profile.peak * 100).toFixed(2)}%  (source colour alpha was in the markup)`);
  console.log(`  measured reach: ${profile.reachPx}px  → gradient box should be ${Math.round(reach * 2)}px`);
  console.log(`  stops: ${stops.map((s) => `${s.at}%→${s.alphaPct}%`).join("  ")}`);
}

writeFileSync("perf-profile.json", JSON.stringify(out, null, 2));
await browser.close();
console.log("\nwritten to perf-profile.json");
