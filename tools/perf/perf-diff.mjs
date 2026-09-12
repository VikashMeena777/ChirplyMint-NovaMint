/**
 * Pixel-compare two screenshot sets (visual regression).
 * Usage: node perf-diff.mjs <labelA> <labelB>
 */
import { chromium } from "playwright";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";

const [A, B] = [process.argv[2] || "before", process.argv[3] || "after1"];
const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

mkdirSync("shots/diff", { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const files = readdirSync(`shots/${A}`).filter((f) => f.endsWith(".png"));
const rows = [];

for (const f of files) {
  const a = readFileSync(`shots/${A}/${f}`).toString("base64");
  const b = readFileSync(`shots/${B}/${f}`).toString("base64");

  const r = await page.evaluate(
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
        return { data: cx.getImageData(0, 0, cv.width, cv.height), w: cv.width, h: cv.height };
      }
      const A = await load(a);
      const B = await load(b);
      if (A.w !== B.w || A.h !== B.h) return { error: `size ${A.w}x${A.h} vs ${B.w}x${B.h}` };

      const da = A.data.data;
      const db = B.data.data;
      let sum = 0,
        max = 0,
        over8 = 0,
        over24 = 0,
        n = 0;
      // heat map of where it differs
      const out = document.createElement("canvas");
      out.width = A.w;
      out.height = A.h;
      const ox = out.getContext("2d");
      const heat = ox.createImageData(A.w, A.h);
      for (let i = 0; i < da.length; i += 4) {
        const d =
          (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
        sum += d;
        if (d > max) max = d;
        if (d > 8) over8++;
        if (d > 24) over24++;
        n++;
        const v = Math.min(255, d * 8);
        heat.data[i] = v;
        heat.data[i + 1] = 0;
        heat.data[i + 2] = v > 0 ? 60 : 0;
        heat.data[i + 3] = 255;
      }
      ox.putImageData(heat, 0, 0);
      return {
        meanDiff: +(sum / n).toFixed(3),
        maxDiff: Math.round(max),
        pctPixelsOver8: +((over8 / n) * 100).toFixed(2),
        pctPixelsOver24: +((over24 / n) * 100).toFixed(2),
        heat: out.toDataURL("image/png").split(",")[1],
      };
    },
    [a, b]
  );

  if (r.error) {
    console.log(`${f}: SIZE MISMATCH ${r.error}`);
    continue;
  }
  writeFileSync(`shots/diff/${f}`, Buffer.from(r.heat, "base64"));
  delete r.heat;
  rows.push({ file: f, ...r });
  const verdict = r.pctPixelsOver24 < 0.5 ? "OK" : r.pctPixelsOver24 < 3 ? "CHECK" : "DIFFERENT";
  console.log(
    `${f.padEnd(16)} mean ${String(r.meanDiff).padStart(6)}  max ${String(r.maxDiff).padStart(3)}  ` +
      `>8: ${String(r.pctPixelsOver8).padStart(5)}%  >24: ${String(r.pctPixelsOver24).padStart(5)}%  ${verdict}`
  );
}

const worst = rows.slice().sort((x, y) => y.pctPixelsOver24 - x.pctPixelsOver24)[0];
console.log(`\nworst frame: ${worst.file} (${worst.pctPixelsOver24}% of pixels differ by >24/255)`);
writeFileSync("perf-visual-diff.json", JSON.stringify(rows, null, 2));
await browser.close();
