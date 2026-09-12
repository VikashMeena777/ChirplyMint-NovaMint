/** Sample avg colour of regions in two screenshots to quantify the diff. */
import { chromium } from "playwright";

const CHROME =
  process.env.CHROME_PATH ||
  [process.env.LOCALAPPDATA, "ms-playwright", "chromium-1208", "chrome-win64", "chrome.exe"].join("/");

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

async function sample(file, box) {
  await page.goto("file:///" + process.cwd().replace(/\\/g, "/") + "/" + file);
  return page.evaluate((box) => {
    const img = document.querySelector("img");
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const cx = cv.getContext("2d");
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(box.x, box.y, box.w, box.h).data;
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }, box);
}

const regions = {
  marqueeBand: { x: 200, y: 840, w: 1000, h: 60 },
  heroBadge: { x: 120, y: 210, w: 320, h: 40 },
  ctaButton: { x: 120, y: 575, w: 220, h: 60 },
  heroText: { x: 120, y: 300, w: 500, h: 80 },
};
for (const [name, box] of Object.entries(regions)) {
  const base = await sample("shots/base-frozen/light-0.png", box);
  const fin = await sample("shots/final/light-0.png", box);
  const d = Math.abs(base[0] - fin[0]) + Math.abs(base[1] - fin[1]) + Math.abs(base[2] - fin[2]);
  console.log(name.padEnd(12), "base rgb(" + base + ")  final rgb(" + fin + ")  |diff|", d);
}
await browser.close();
