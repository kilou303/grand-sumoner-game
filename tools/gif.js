// Capture une page de démo image par image (window.renderAt(t)) et écrit les PNG dans un dossier.
// Usage : node tools/gif.js tools/demo.html <dossier> [fps]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const [, , target, outDir, fpsArg] = process.argv;
  const fps = +(fpsArg || 20);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.resolve(target));
  await page.waitForTimeout(300);
  const dur = await page.evaluate(() => window.DEMO_DUR || 3);
  const n = Math.ceil(dur * fps);
  const canvas = await page.$('canvas');
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.renderAt(t), i / fps);
    await canvas.screenshot({ path: path.join(outDir, String(i).padStart(4, '0') + '.png') });
  }
  if (errors.length) console.log(errors.join('\n'));
  console.log('frames', n);
  await browser.close();
})();
