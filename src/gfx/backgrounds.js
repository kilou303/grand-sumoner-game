'use strict';
// Décors procéduraux en pixel art, en couches de parallaxe qui se répètent sans couture
// (les niveaux défilent horizontalement pendant l'exploration).
(function () {
  const U = GS.U;
  const Pix = GS.Pix;
  const BG = (GS.BG = {});
  const TW = 960; // largeur d'une tuile de décor (répétée à l'infini)
  BG.GROUND = 160; // début du sol

  // ------------------------------------------------------------ outils de peinture
  const px = (ctx, x, y, c, w = 1, h = 1) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  // Dessine `fn(x)` en tenant compte du raccord de la tuile.
  const wrap = (x, w, fn) => {
    fn(x);
    if (x + w > TW) fn(x - TW);
    if (x - w < 0) fn(x + TW);
  };

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // Dégradé vertical tramé (rapide via ImageData).
  const ditherGrad = (ctx, x, y, w, h, colors) => {
    const img = ctx.getImageData(x, y, w, h);
    const d = img.data;
    const cols = colors.map(U.hexToRgb);
    const n = cols.length - 1;
    for (let yy = 0; yy < h; yy++) {
      const t = (yy / h) * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      for (let xx = 0; xx < w; xx++) {
        const thr = (BAYER[(yy & 3) * 4 + (xx & 3)] + 0.5) / 16;
        const c = f > thr ? cols[i + 1] : cols[i];
        const o = (yy * w + xx) * 4;
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, x, y);
  };

  // Silhouette de montagnes périodique (raccord parfait sur TW).
  const ridge = (rng, base, amp, rough = 0.55) => {
    let pts = [base, base];
    let a = amp;
    while (pts.length < TW) {
      const np = [];
      for (let i = 0; i < pts.length - 1; i++) np.push(pts[i], (pts[i] + pts[i + 1]) / 2 + (rng() - 0.5) * a);
      np.push(pts[pts.length - 1]);
      pts = np;
      a *= rough;
    }
    const out = [];
    for (let x = 0; x < TW; x++) out.push(pts[Math.floor((x / TW) * (pts.length - 1))]);
    return out;
  };
  const fillRidge = (ctx, hs, bottom, color, light) => {
    for (let x = 0; x < TW; x++) {
      const y = Math.round(hs[x]);
      px(ctx, x, y, color, 1, bottom - y);
      if (light && hs[(x + TW - 1) % TW] > hs[x]) px(ctx, x, y, light);
    }
  };
  const blob = (ctx, cx, cy, r, c) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      px(ctx, cx - w, cy + y, c, w * 2 + 1, 1);
    }
  };
  const cloud = (ctx, x, y, w, rng, c, sh) => {
    const n = Math.max(3, Math.floor(w / 8));
    const rs = [];
    for (let i = 0; i < n; i++) rs.push([x + (i / n) * w, 4 + rng() * (w / 6), 3 + rng() * (w / 6)]);
    for (const [cx, r] of rs) blob(ctx, cx, y + 2, Math.round(r), sh);
    for (const [cx, , r2] of rs) blob(ctx, cx, y - 1, Math.round(r2), c);
  };
  const pine = (ctx, x, base, h, c, c2) => {
    for (let y = 0; y < h; y++) {
      const w = Math.floor((y / h) * (h * 0.36)) + (y % 5 < 2 ? 0 : 1);
      px(ctx, x - w, base - h + y, c, w * 2 + 1, 1);
      if (c2 && w > 1) px(ctx, x - w, base - h + y, c2, 1, 1);
    }
    px(ctx, x - 1, base, c, 3, 4);
  };
  const layer = () => Pix.makeCanvas(TW, GS.H);
  const G = BG.GROUND;

  // ------------------------------------------------------------ définitions
  const DEFS = {};

  // Remparts nocturnes (ciel étoilé, nuages, mur au liseré rose, pavés) — comme la capture.
  DEFS.castle = (rng) => {
    const sky = layer();
    let c = sky.getContext('2d');
    ditherGrad(c, 0, 0, TW, 150, ['#05040f', '#0c0a24', '#1a1240', '#2c1a50', '#4a2a62']);
    for (let i = 0; i < 50; i++) {
      c.globalAlpha = 0.05;
      const x = rng() * TW;
      wrap(x, 30, (xx) => blob(c, xx, 20 + rng() * 80, 6 + Math.floor(rng() * 18), i % 2 ? '#6a40a0' : '#3050a0'));
    }
    c.globalAlpha = 1;
    blob(c, 700, 36, 11, '#fff4d8');
    blob(c, 704, 33, 10, '#1a1240');
    const far = layer();
    c = far.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const x = rng() * TW;
      const w = 40 + rng() * 70;
      wrap(x, w, (xx) => cloud(c, xx, 116 + rng() * 14, w, rng, '#c8c0e0', '#8a80b0'));
    }
    c.globalAlpha = 0.6;
    for (let i = 0; i < 10; i++) {
      const x = rng() * TW;
      const w = 60 + rng() * 70;
      wrap(x, w, (xx) => cloud(c, xx, 130 + rng() * 8, w, rng, '#e8e4f8', '#b0a8d0'));
    }
    c.globalAlpha = 1;
    const mid = layer();
    c = mid.getContext('2d');
    const top = 116;
    for (let x = 0; x < TW; x += 24) {
      px(c, x, top, '#3a2a40', 17, 12);
      px(c, x, top, '#f0a8d8', 17, 2);
      px(c, x, top + 2, '#b878b0', 17, 1);
    }
    px(c, 0, top + 12, '#3a2a40', TW, 32);
    px(c, 0, top + 12, '#f0a8d8', TW, 2);
    px(c, 0, top + 14, '#a06a9a', TW, 1);
    for (let y = top + 16; y < G; y += 5) {
      for (let x = (y / 5) % 2 ? 0 : 6; x < TW; x += 12) {
        px(c, x, y, '#2a1e30', 11, 4);
        px(c, x, y, '#4a3852', 11, 1);
      }
    }
    for (const sx of [40, 520]) {
      px(c, sx, top - 8, '#2a6a5a', 16, 20);
      px(c, sx + 3, top - 20, '#3a8a72', 10, 12);
      px(c, sx + 1, top - 25, '#3a8a72', 4, 6);
      px(c, sx + 11, top - 25, '#3a8a72', 4, 6);
      px(c, sx + 5, top - 15, '#60c0a0', 2, 2);
      px(c, sx + 9, top - 15, '#60c0a0', 2, 2);
      px(c, sx - 2, top + 12, '#2a1e30', 20, 32);
    }
    const ground = layer();
    c = ground.getContext('2d');
    px(c, 0, G, '#3a3448', TW, GS.H - G);
    for (let y = G; y < GS.H; y += 8) {
      const off = Math.floor(rng() * 8);
      for (let x = -off; x < TW; x += 12 + Math.floor(rng() * 4)) {
        const w = 9 + Math.floor(rng() * 4);
        wrap(x, w, (xx) => {
          px(c, xx, y, '#5a5068', w, 6);
          px(c, xx, y, '#7a7088', w, 1);
          px(c, xx + 1, y + 5, '#2a2436', w - 1, 1);
        });
        if (rng() < 0.2) px(c, x + 2, y + 2, '#8a80a0', 2, 1);
      }
    }
    for (let i = 0; i < 6; i++) {
      c.globalAlpha = 0.35 - i * 0.05;
      px(c, 0, G + i, '#100818', TW, 1);
    }
    c.globalAlpha = 1;
    const fore = layer();
    c = fore.getContext('2d');
    for (let x = 8; x < TW; x += 80) {
      px(c, x, 246, '#1f5a54', 48, 30);
      px(c, x, 246, '#3a8a7a', 48, 2);
      px(c, x + 2, 250, '#2a6a62', 44, 1);
    }
    return { layers: [[sky, 0.04], [far, 0.12], [mid, 0.3], [ground, 1], [fore, 1.3]], stars: true };
  };

  DEFS.plains = (rng) => {
    const sky = layer();
    let c = sky.getContext('2d');
    ditherGrad(c, 0, 0, TW, 150, ['#3a78d8', '#5a9ef0', '#88c4f8', '#c4e8ff']);
    blob(c, 160, 40, 14, '#fff8d0');
    blob(c, 160, 40, 10, '#ffffff');
    const far = layer();
    c = far.getContext('2d');
    fillRidge(c, ridge(rng, 104, 50), 150, '#8aa8d8', '#b8d0f0');
    fillRidge(c, ridge(rng, 124, 26), 150, '#6a9ab8', null);
    const mid = layer();
    c = mid.getContext('2d');
    fillRidge(c, ridge(rng, 140, 18, 0.6), 170, '#4a9a48', '#78c060');
    for (let i = 0; i < 50; i++) {
      const x = rng() * TW;
      const y = 136 + rng() * 14;
      const r = 3 + Math.floor(rng() * 4);
      wrap(x, r + 2, (xx) => {
        blob(c, xx, y, r, '#2e7a3a');
        blob(c, xx - 1, y - 1, r - 1, '#4a9a48');
      });
    }
    const ground = layer();
    c = ground.getContext('2d');
    ditherGrad(c, 0, G - 6, TW, GS.H - G + 6, ['#5aae48', '#4a9a40', '#3a8238']);
    for (let i = 0; i < 1400; i++) px(c, rng() * TW, G - 4 + rng() * (GS.H - G), rng() < 0.5 ? '#6ac058' : '#327030', 1, 2);
    for (let i = 0; i < 160; i++) {
      const x = rng() * TW;
      const y = G + rng() * (GS.H - G);
      px(c, x, y, U.choice(['#ffffff', '#ffe040', '#ff6080', '#c0a0ff']));
      px(c, x - 1, y + 1, '#2a6a28');
    }
    for (let x = 0; x < TW; x++) {
      const y = 196 + Math.sin((x / TW) * Math.PI * 6) * 4;
      px(c, x, y, '#b89a68', 1, 22);
      px(c, x, y, '#d8bc88', 1, 1);
      if (rng() < 0.2) px(c, x, y + 4 + rng() * 14, '#8a7048');
    }
    const fore = layer();
    c = fore.getContext('2d');
    for (let x = 0; x < TW; x += 3) {
      const h = 6 + Math.floor(rng() * 12);
      px(c, x, GS.H - h, rng() < 0.5 ? '#2e7a30' : '#3a8a38', 2, h);
    }
    return { layers: [[sky, 0.04], [far, 0.12], [mid, 0.3], [ground, 1], [fore, 1.3]], clouds: '#ffffff' };
  };

  DEFS.forest = (rng) => {
    const sky = layer();
    let c = sky.getContext('2d');
    ditherGrad(c, 0, 0, TW, 150, ['#3a1a50', '#6a2a68', '#b04a60', '#ff8a50', '#ffc070']);
    blob(c, 600, 120, 16, '#ffe0a0');
    const far = layer();
    c = far.getContext('2d');
    for (let x = 0; x < TW; x += 9) {
      const h = 30 + rng() * 24;
      wrap(x, 14, (xx) => pine(c, xx, 148, h, '#4a2048'));
    }
    const mid = layer();
    c = mid.getContext('2d');
    for (let x = 0; x < TW; x += 15) {
      const h = 44 + rng() * 30;
      const xo = x + rng() * 8;
      wrap(xo, 20, (xx) => pine(c, xx, 162, h, '#2a1430', '#3a2040'));
    }
    const ground = layer();
    c = ground.getContext('2d');
    ditherGrad(c, 0, G - 4, TW, GS.H - G + 4, ['#2a3a2a', '#24301e', '#1a2418']);
    for (let i = 0; i < 1000; i++) px(c, rng() * TW, G + rng() * (GS.H - G), rng() < 0.5 ? '#3a5034' : '#16200f', 2, 1);
    for (let i = 0; i < 30; i++) {
      const x = rng() * TW;
      const y = G + 10 + rng() * 90;
      px(c, x, y, '#e04848', 3, 2);
      px(c, x + 1, y + 2, '#f0e0c0', 1, 2);
    }
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 160 + rng() * 40;
      px(c, x, 0, '#1a0c18', 14, G + 4);
      px(c, x + 2, 0, '#2a1626', 4, G + 4);
      px(c, x - 4, G, '#1a0c18', 22, 5);
    }
    const fore = layer();
    c = fore.getContext('2d');
    for (let x = 0; x < TW; x += 4) {
      const h = 5 + Math.floor(rng() * 14);
      px(c, x, GS.H - h, '#101a10', 3, h);
    }
    return { layers: [[sky, 0.04], [far, 0.12], [mid, 0.3], [ground, 1], [fore, 1.3]], fireflies: true };
  };

  DEFS.volcano = (rng) => {
    const sky = layer();
    let c = sky.getContext('2d');
    ditherGrad(c, 0, 0, TW, 156, ['#120406', '#2a0a0a', '#501410', '#8a2a10', '#c04a18']);
    const far = layer();
    c = far.getContext('2d');
    for (const vx of [260, 760]) {
      for (let y = 0; y < 86; y++) {
        const w = 20 + y * 1.8;
        px(c, vx - w, 62 + y, '#2a1010', w * 2, 1);
      }
      px(c, vx - 20, 62, '#ff8020', 40, 2);
      for (let i = 0; i < 6; i++) {
        let x = vx - 16 + rng() * 32;
        for (let y = 64; y < 140; y += 2) {
          x += (rng() - 0.5) * 3;
          px(c, x, y, y < 100 ? '#ff7a20' : '#c84010', 2, 2);
        }
      }
    }
    fillRidge(c, ridge(rng, 132, 24), 156, '#1a0808', null);
    const mid = layer();
    c = mid.getContext('2d');
    fillRidge(c, ridge(rng, 146, 20, 0.7), 166, '#2a1212', '#5a2a1a');
    const ground = layer();
    c = ground.getContext('2d');
    ditherGrad(c, 0, G - 4, TW, GS.H - G + 4, ['#3a2420', '#2a1814', '#1a100c']);
    for (let i = 0; i < 800; i++) px(c, rng() * TW, G + rng() * (GS.H - G), rng() < 0.5 ? '#4a302a' : '#140a08', 2, 1);
    for (let i = 0; i < 18; i++) {
      let x = rng() * TW;
      let y = G + 8 + rng() * 96;
      for (let k = 0; k < 34; k++) {
        x = (x + 1 + rng()) % TW;
        y += (rng() - 0.5) * 2;
        px(c, x, y, '#ff6a10');
        if (rng() < 0.4) px(c, x, y - 1, '#ffb040');
      }
    }
    const fore = layer();
    c = fore.getContext('2d');
    for (let x = 0; x < TW; x += 40 + rng() * 40) {
      const h = 12 + rng() * 18;
      wrap(x, 40, (xx) => {
        for (let y = 0; y < h; y++) px(c, xx - y * 0.4, GS.H - h + y, '#120806', 12 + y * 0.8, 1);
      });
    }
    return { layers: [[sky, 0.04], [far, 0.12], [mid, 0.3], [ground, 1], [fore, 1.3]], embers: true };
  };

  DEFS.town = (rng) => {
    const sky = layer();
    let c = sky.getContext('2d');
    ditherGrad(c, 0, 0, TW, 190, ['#141038', '#2a2060', '#5a3a80', '#c06a80', '#ffb070']);
    const far = layer();
    c = far.getContext('2d');
    for (let i = 0; i < 10; i++) {
      const x = rng() * TW;
      const w = 40 + rng() * 60;
      wrap(x, w, (xx) => cloud(c, xx, 50 + rng() * 50, w, rng, '#d090a0', '#9a6a90'));
    }
    const cx = 640;
    px(c, cx - 38, 88, '#2a1a40', 76, 80);
    for (const [dx, h] of [[-42, 50], [-12, 80], [20, 62], [42, 44]]) {
      px(c, cx + dx - 6, 168 - h - 12, '#2a1a40', 12, h);
      for (let y = 0; y < 10; y++) px(c, cx + dx - y * 0.7, 168 - h - 22 + y, '#3a2050', Math.max(1, y * 1.4), 1);
    }
    for (let i = 0; i < 18; i++) px(c, cx - 34 + rng() * 68, 96 + rng() * 50, '#ffd070', 1, 2);
    fillRidge(c, ridge(rng, 156, 18), 176, '#1e1636', null);
    const mid = layer();
    c = mid.getContext('2d');
    for (let x = -10; x < TW; x += 40 + rng() * 12) {
      const h = 22 + rng() * 18;
      const y = 190 - h;
      wrap(x, 40, (xx) => {
        px(c, xx, y, '#3a2840', 30, h + 80);
        for (let k = 0; k < 12; k++) px(c, xx - 3 + k * 0.4, y - 12 + k, '#5a2a3a', 36 - k * 0.8, 1);
        px(c, xx + 7, y + 8, '#ffd070', 5, 6);
        px(c, xx + 18, y + 8, '#ffb050', 5, 6);
      });
    }
    const ground = layer();
    c = ground.getContext('2d');
    ditherGrad(c, 0, 190, TW, GS.H - 190, ['#4a3a50', '#3a2c40', '#2a2030']);
    for (let y = 192; y < GS.H; y += 7) {
      for (let x = (y / 7) % 2 ? 0 : 6; x < TW; x += 12) px(c, x, y, '#5a4a60', 9, 1);
    }
    return { layers: [[sky, 0.04], [far, 0.12], [mid, 0.45], [ground, 1]], stars: true, fireflies: true };
  };

  // ------------------------------------------------------------ instance
  const cache = {};
  BG.get = (name) => {
    if (cache[name]) return cache[name];
    let h = 7;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const def = DEFS[name](U.seeded(h));
    const r2 = U.seeded(99);
    def.starList = [];
    if (def.stars) for (let i = 0; i < 220; i++) def.starList.push([r2() * TW, r2() * 120, r2() * 6, r2() < 0.15 ? 2 : 1]);
    def.cloudList = [];
    if (def.clouds) for (let i = 0; i < 8; i++) def.cloudList.push([r2() * TW, 14 + r2() * 60, 30 + r2() * 50, 4 + r2() * 6]);
    def.motes = [];
    for (let i = 0; i < 40; i++) def.motes.push([r2() * GS.W, r2() * GS.H, r2() * 10, 0.5 + r2()]);
    cache[name] = def;
    return def;
  };

  const cloudSprite = (w, col) => {
    const key = Math.round(w) + col;
    if (cloudSprite[key]) return cloudSprite[key];
    const c = Pix.makeCanvas(Math.round(w) + 24, 30);
    cloud(c.getContext('2d'), 10, 16, w, U.seeded(Math.round(w)), col, U.mix(col, '#a0b8d8', 0.4));
    cloudSprite[key] = c;
    return c;
  };

  const tile = (ctx, cv, x, y) => {
    let o = -(((x % TW) + TW) % TW);
    for (; o < GS.W; o += TW) ctx.drawImage(cv, Math.round(o), Math.round(y));
  };

  // camX : position de la caméra (défilement + tremblement). t : temps (s).
  BG.draw = (name, t, camX = 0, camY = 0) => {
    const d = BG.get(name);
    const ctx = GS.ctx;
    d.layers.forEach(([cv, f], i) => {
      tile(ctx, cv, camX * f, -camY * f * 0.5);
      if (i === 0) {
        for (const s of d.starList) {
          const tw = Math.sin(t * 2 + s[2]);
          if (tw <= -0.3) continue;
          const x = (((s[0] - camX * 0.04) % TW) + TW) % TW;
          if (x < GS.W) px(ctx, x, s[1], tw > 0.7 ? '#ffffff' : '#9ab0ff', s[3], s[3]);
        }
        for (const cl of d.cloudList) {
          const x = ((((cl[0] + t * cl[3] - camX * 0.08) % (GS.W + 160)) + GS.W + 160) % (GS.W + 160)) - 80;
          ctx.drawImage(cloudSprite(cl[2], d.clouds), Math.round(x), Math.round(cl[1]));
        }
      }
    });
    if (d.embers) {
      for (const m of d.motes) {
        const y = (((m[1] - t * 18 * m[3]) % GS.H) + GS.H) % GS.H;
        const x = (((m[0] + Math.sin(t + m[2]) * 6 - camX * 0.5) % GS.W) + GS.W) % GS.W;
        px(ctx, x, y, Math.sin(t * 3 + m[2]) > 0 ? '#ffb040' : '#ff5010', 1, 1);
      }
    }
    if (d.fireflies) {
      for (const m of d.motes) {
        const a = Math.sin(t * 1.5 + m[2]);
        if (a < 0.2) continue;
        const x = (((m[0] + Math.sin(t * 0.3 + m[2]) * 20 - camX * 0.6) % GS.W) + GS.W) % GS.W;
        const y = 70 + (m[1] % 140) + Math.cos(t * 0.5 + m[2]) * 6;
        ctx.globalAlpha = a;
        px(ctx, x, y, '#e8ff80', 1, 1);
        ctx.globalAlpha = a * 0.3;
        px(ctx, x - 1, y - 1, '#e8ff80', 3, 3);
        ctx.globalAlpha = 1;
      }
    }
  };
})();
