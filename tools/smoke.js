// Test de fumée : parcourt les écrans principaux et capture des images.
// Usage : node tools/smoke.js <dossier_sortie>
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || 'smoke';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(800);
  const shot = async (name) => page.screenshot({ path: path.join(out, name + '.png') });
  const click = async (x, y) => {
    // coordonnées internes (480x270) -> écran
    const box = await page.$eval('canvas', (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    const px = box.x + (x / 480) * box.w;
    const py = box.y + (y / 270) * box.h;
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.waitForTimeout(40);
    await page.mouse.up();
    await page.waitForTimeout(120);
  };
  const scene = () => page.evaluate(() => GS.Scenes.current && GS.Scenes.current.constructor.name);

  await shot('01_titre');
  await click(240, 150);
  await page.waitForTimeout(700);
  await shot('02_accueil');
  console.log('scène', await scene());

  await click(380, 46); // QUÊTES
  await page.waitForTimeout(700);
  await shot('03_quetes');
  console.log('scène', await scene());

  // combat : exploration manuelle puis auto
  await page.evaluate(() => {
    GS.data.settings.auto = false;
    GS.data.settings.speed = 1;
    GS.go(new GS.BattleScene(0, 1));
  });
  await page.waitForTimeout(900);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await shot('04_exploration');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(1500);
  await shot('05_rencontre');
  // attend le menu de commande et attaque
  for (let i = 0; i < 40; i++) {
    const m = await page.evaluate(() => !!(GS.Scenes.current.menu && GS.Scenes.current.menu.state === 'main'));
    if (m) break;
    await page.waitForTimeout(250);
  }
  await shot('06_menu');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await shot('07_cible');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  await shot('08_attaque');
  await page.waitForTimeout(500);
  await shot('09_attaque2');
  // passe en auto rapide jusqu'à la fin
  await page.evaluate(() => {
    const s = GS.Scenes.current;
    s.auto = true;
    s.speed = 3;
  });
  let k = 0;
  for (let i = 0; i < 160; i++) {
    const name = await scene();
    if (name === 'ResultScene') break;
    if (i % 12 === 0) await shot('10_combat_' + String(k++).padStart(2, '0'));
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(3200);
  await shot('11_resultat');
  console.log('scène', await scene());

  // overlimit (forcé) pour vérifier le cut-in
  await page.evaluate(() => {
    GS.data.settings.auto = false;
    GS.data.settings.speed = 1;
    GS.go(new GS.BattleScene(0, 0), true);
    const s = GS.Scenes.current;
    s.leader().x = s.groups[0].x - 140;
  });
  for (let i = 0; i < 80; i++) {
    const m = await page.evaluate(() => !!(GS.Scenes.current.menu && GS.Scenes.current.menu.state === 'main'));
    if (m) break;
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => {
    const s = GS.Scenes.current;
    const f = s.menu.f;
    const dj = s.heroes.find((h) => h.def.id === 'djegui') || f;
    s.menu.f = dj;
    dj.sl = 100;
    s.command = { type: 'overlimit', ab: dj.def.overlimit, targets: s.enemies.filter((e) => e.alive) };
  });
  await page.waitForTimeout(700);
  await shot('12_cutin');
  await page.waitForTimeout(1500);
  await shot('13_overlimit');
  await page.waitForTimeout(800);
  await shot('14_overlimit2');

  // invocation
  await page.evaluate(() => GS.go(new GS.SummonScene()));
  await page.waitForTimeout(800);
  await shot('15_banniere');
  await page.evaluate(() => GS.Scenes.current.pull(10));
  await page.waitForTimeout(1500);
  await shot('16_portail');
  await page.waitForTimeout(1600);
  await shot('17_revelation');
  await page.waitForTimeout(1200);
  await shot('18_revelation2');
  await page.evaluate(() => (GS.Scenes.current.state = 'results'));
  await page.waitForTimeout(400);
  await shot('19_resultats');

  await page.evaluate(() => GS.go(new GS.UnitsScene()));
  await page.waitForTimeout(700);
  await shot('20_heros');
  await page.evaluate(() => (GS.Scenes.current.detail = GS.data.units[0]));
  await page.waitForTimeout(300);
  await shot('21_fiche');
  await page.evaluate(() => GS.go(new GS.TeamScene()));
  await page.waitForTimeout(700);
  await shot('22_equipe');
  await page.evaluate(() => GS.go(new GS.EquipScene()));
  await page.waitForTimeout(700);
  await shot('23_equipement');
  await page.evaluate(() => GS.Scenes.current.setTab('weapon'));
  await page.waitForTimeout(300);
  await shot('24_inventaire');
  await page.evaluate(() => GS.go(new GS.ShopScene()));
  await page.waitForTimeout(700);
  await shot('25_boutique');
  await page.evaluate(() => {
    const s = new GS.SummonScene();
    s.mode = 'equip';
    GS.go(s);
  });
  await page.waitForTimeout(700);
  await shot('26_invocation_equipement');

  console.log(errors.length ? errors.join('\n---\n') : 'aucune erreur');
  await browser.close();
})();
