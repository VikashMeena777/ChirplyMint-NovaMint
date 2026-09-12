/**
 * Calibrate radial-gradient replacements for filter:blur() blobs.
 * Renders the CURRENT look (solid circle + blur) against candidate
 * gradients, then pixel-compares to find the closest match.
 * Usage: node perf-calibrate.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

// The real blobs from page.tsx (size, blur radius, colour)
const CASES = [
  { name: "aurora-1", size: 480, blur: 140, color: "oklch(0.7 0.16 162 / 30%)" },
  { name: "aurora-2", size: 420, blur: 150, color: "oklch(0.7 0.13 185 / 25%)" },
  { name: "aurora-3", size: 380, blur: 130, color: "oklch(0.68 0.16 275 / 20%)" },
];

// Candidate gradient profiles: [stop%, alphaMultiplier] pairs.
// A gaussian-blurred disc has a smooth sigmoid falloff; these approximate it.
const PROFILES = {
  A: "C 0%, transparent 70%",
  B: "C 0%, C 20%, transparent 72%",
  C: "Ca85 0%, Ca55 30%, Ca22 50%, transparent 75%",
  D: "Ca90 0%, Ca62 25%, Ca30 45%, Ca10 62%, transparent 78%",
  E: "Ca100 0%, Ca70 22%, Ca38 42%, Ca14 60%, Ca4 72%, transparent 82%",
};

function buildGradient(profile, color, alphaBase) {
  // Replace tokens: C = full colour, CaNN = colour at NN% of base alpha
  return profile.replace(/Ca(\d+)|C/g, (m, pct) => {
    if (m === "C") return color;
    const a = (alphaBase * (+pct / 100)).toFixed(2);
    return color.replace(/\/\s*[\d.]+%?\s*\)/, `/ ${a}%)`);
  });
}

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });

const results = [];

for (const c of CASES) {
  const alphaBase = +c.color.match(/\/\s*([\d.]+)%/)[1];
  // The blurred circle spreads roughly size + 2*blur; the gradient box must match
  const box = c.size + 2 * c.blur;

  // 1. Reference: the current implementation
  await page.setContent(`<body style="margin:0;background:#0a0a0a;width:1200px;height:1200px">
    <div style="position:absolute;left:${(1200 - c.size) / 2}px;top:${(1200 - c.size) / 2}px;
      width:${c.size}px;height:${c.size}px;border-radius:9999px;
      background:${c.color};filter:blur(${c.blur}px)"></div></body>`);
  await page.waitForTimeout(250);
  const ref = await page.screenshot();

  const scores = [];
  for (const [key, profile] of Object.entries(PROFILES)) {
    const grad = buildGradient(profile, c.color, alphaBase);
    await page.setContent(`<body style="margin:0;background:#0a0a0a;width:1200px;height:1200px">
      <div style="position:absolute;left:${(1200 - box) / 2}px;top:${(1200 - box) / 2}px;
        width:${box}px;height:${box}px;
        background:radial-gradient(closest-side, ${grad})"></div></body>`);
    await page.waitForTimeout(250);
    const cand = await page.screenshot();

    // Pixel-compare in the browser (decode both PNGs on a canvas)
    const diff = await page.evaluate(
      async ([a, b]) => {
        async function load(b64) {
          const img = new Image();
          img.src = "data:image/png;base64," + b64;
          await img.decode();
          const cv = document.createElement("canvas");
          cv.width = img.width;
          cv.height = img.height;
          const cx = cv.getContext("2d");
          cx.drawImage(img, 0, 0);
          return cx.getImageData(0, 0, cv.width, cv.height).data;
        }
        const [A, B] = [await load(a), await load(b)];
        let sum = 0,
          max = 0,
          n = 0;
        for (let i = 0; i < A.length; i += 4) {
          const d =
            Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
          sum += d;
          if (d > max) max = d;
          n++;
        }
        return { meanDiff: +(sum / n / 3).toFixed(3), maxChannelDiff: max };
      },
      [ref.toString("base64"), cand.toString("base64")]
    );
    scores.push({ profile: key, gradient: grad, box, ...diff });
  }

  scores.sort((x, y) => x.meanDiff - y.meanDiff);
  results.push({ case: c.name, size: c.size, blur: c.blur, box, best: scores[0], all: scores });
  console.log(`\n${c.name} (${c.size}px, blur ${c.blur}px → box ${box}px)`);
  for (const s of scores)
    console.log(`  ${s.profile}: mean diff ${s.meanDiff}/255  max channel ${s.maxChannelDiff}`);
}

writeFileSync("perf-calibration.json", JSON.stringify(results, null, 2));
await browser.close();
console.log("\nBest profiles written to perf-calibration.json");
