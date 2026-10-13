// Usage: node tools/shot.js <url-or-file> <out.png> [width] [height] [waitMs] [script]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [,, target, out, w = '1152', h = '648', wait = '800', script = ''] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  const url = target.startsWith('http') ? target : 'file://' + require('path').resolve(target);
  await page.goto(url);
  await page.waitForTimeout(+wait);
  if (script) { await page.evaluate(script); await page.waitForTimeout(+wait); }
  await page.screenshot({ path: out });
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
})();
