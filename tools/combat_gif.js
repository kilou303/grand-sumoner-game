// Tourne un combat scripté image par image (boucle du jeu pilotée, 30 images/s) et écrit les
// PNG dans un dossier : coups signature des héros, réactions des ennemis, coup final.
// Usage : node tools/combat_gif.js <dossier> [nombre d'actions] [zone] [quête]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || 'combat_gif';
  const actions = +(process.argv[3] || 5);
  const area = +(process.argv[4] || 0);
  const stage = +(process.argv[5] || 0);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // horloge et boucle d'animation pilotées depuis le script, hasard reproductible
  await page.addInitScript(() => {
    let now = 0;
    let cb = null;
    let seed = 11;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    performance.now = () => now;
    window.requestAnimationFrame = (f) => {
      cb = f;
      return 1;
    };
    window.STEP = (n = 1) => {
      for (let i = 0; i < n; i++) {
        now += 1000 / 30;
        const f = cb;
        cb = null;
        if (f) f(now);
      }
    };
  });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.STEP(10));
  // équipe : Valka, Sakura, Vesper ; ennemis solides pour enchaîner les coups
  await page.evaluate(([AREA, STAGE]) => {
    const id = (n) => GS.data.units.find((u) => u.id === n).uid;
    GS.data.team = [id('valka'), id('sakura'), id('vesper')];
    GS.data.settings.auto = false;
    GS.data.settings.speed = 1;
    GS.go(new GS.BattleScene(AREA, STAGE), true);
    const s = GS.Scenes.current;
    s.leader().x = s.groups[0].x - 140;
  }, [area, stage]);
  const step = (n) => page.evaluate((k) => window.STEP(k), n);
  const menuReady = () => page.evaluate(() => !!(GS.Scenes.current.menu && GS.Scenes.current.menu.state === 'main'));
  for (let i = 0; i < 400 && !(await menuReady()); i++) await step(3);
  await page.evaluate(() => GS.Scenes.current.enemies.forEach((e) => (e.hp = e.maxHp = e.maxHp * 30)));
  let frame = 0;
  const shot = async () => {
    await page.screenshot({ path: path.join(out, String(frame++).padStart(4, '0') + '.png') });
  };
  // coups signature : le spécial au premier tour de chaque héros, puis une compétence
  const done = {};
  for (let a = 0; a < actions; a++) {
    for (let i = 0; i < 600 && !(await menuReady()); i++) {
      await step(1);
      await shot();
    }
    const who = await page.evaluate((done) => {
      const s = GS.Scenes.current;
      const f = s.menu.f;
      const kind = done[f.def.id] ? 'skill' : 'special';
      const ab = kind === 'special' ? f.def.special : f.def.skills.find((k) => k.moves) || f.def.skills[0];
      f.mp = 999;
      f.sp = 100;
      // les humains d'abord : leurs réactions se voient mieux
      const foes = s.enemies.filter((e) => e.alive);
      const tgt = foes.find((e) => e.rig) || foes[0];
      s.command = { type: kind, ab, targets: [tgt] };
      return [f.def.id, kind, ab.name];
    }, done);
    done[who[0]] = true;
    console.log('action', a, who.join(' '));
    for (let i = 0; i < 150; i++) {
      await step(1);
      await shot();
      if (i > 20 && (await menuReady())) break;
    }
  }
  if (errors.length) console.log(errors.join('\n'));
  console.log('images', frame);
  await browser.close();
})();
