'use strict';
// Gore façon Happy Wheels, en pixel art : découpe de sprites (membres tranchés), explosions
// en morceaux physiques qui rebondissent, giclées de sang et flaques qui restent au sol.
(function () {
  const U = GS.U;
  const Pix = GS.Pix;

  // Types de "sang" selon la créature.
  const BLOOD = {
    red: ['#b00c1c', '#8a0814', '#5a040c', '#d82030'],
    goo: null, // couleur du slime (calculée)
    bone: ['#e8e0d0', '#b8b0a0', '#8a8478', '#ffffff'],
    rock: ['#6a5a48', '#4a3e32', '#8a7a64', '#ff6a20'],
    fire: ['#ff7020', '#ffb040', '#c03010', '#fff080'],
    ichor: ['#7a20b0', '#4a1070', '#b060ff', '#200830'],
    // fléaux : sang noirâtre presque violet
    curse: ['#6a0820', '#420414', '#9a1030', '#1a0208'],
  };

  // Copie miroir / agrandie (plus proche voisin) d'un canvas.
  const FLIP = new WeakMap();
  const flip = (cv) => {
    const c0 = FLIP.get(cv);
    if (c0) return c0;
    const out = flipRaw(cv);
    FLIP.set(cv, out);
    return out;
  };
  const flipRaw = (cv) => {
    const out = Pix.makeCanvas(cv.width, cv.height);
    const c = out.getContext('2d');
    c.translate(cv.width, 0);
    c.scale(-1, 1);
    c.drawImage(cv, 0, 0);
    return out;
  };
  const scaleCv = (cv, k) => {
    if (k === 1) return cv;
    const out = Pix.makeCanvas(Math.max(1, Math.round(cv.width * k)), Math.max(1, Math.round(cv.height * k)));
    const c = out.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(cv, 0, 0, out.width, out.height);
    return out;
  };
  // Petit morceau de chair (éclat rond sanglant).
  const chunk = (cols, r) => {
    const s = r * 2 + 1;
    const cv = Pix.makeCanvas(s, s);
    const c = cv.getContext('2d');
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const d = Math.hypot(x - r, y - r);
        if (d > r + 0.3 - Math.random() * 0.6) continue;
        c.fillStyle = d > r - 1 ? cols[1] : Math.random() < 0.25 ? cols[3] || cols[0] : cols[0];
        c.fillRect(x, y, 1, 1);
      }
    return cv;
  };

  // Découpe un canvas par une droite passant par (px, py) d'angle `ang`.
  // Renvoie { a, b } (deux canvases de même taille) : a = côté "positif".
  const slice = (cv, px, py, ang, edge) => {
    const w = cv.width;
    const h = cv.height;
    const src = cv.getContext('2d').getImageData(0, 0, w, h);
    const A = Pix.makeCanvas(w, h);
    const B = Pix.makeCanvas(w, h);
    const ia = A.getContext('2d').createImageData(w, h);
    const ib = B.getContext('2d').createImageData(w, h);
    const s = Math.sin(ang);
    const c = Math.cos(ang);
    const e = U.hexToRgb(edge || '#7a0610');
    let na = 0;
    let nb = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        if (!src.data[o + 3]) continue;
        const d = (x - px) * s - (y - py) * c;
        const dst = d > 0 ? ia : ib;
        if (d > 0) na++;
        else nb++;
        // bord sanglant le long de la coupe
        const near = Math.abs(d) < 1.6;
        dst.data[o] = near ? e[0] : src.data[o];
        dst.data[o + 1] = near ? e[1] : src.data[o + 1];
        dst.data[o + 2] = near ? e[2] : src.data[o + 2];
        dst.data[o + 3] = 255;
      }
    }
    A.getContext('2d').putImageData(ia, 0, 0);
    B.getContext('2d').putImageData(ib, 0, 0);
    return { a: A, b: B, na, nb };
  };

  // Recadre un canvas sur ses pixels opaques ; renvoie { canvas, ox, oy } ou null.
  const crop = (cv) => {
    const w = cv.width;
    const h = cv.height;
    const d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (d[(y * w + x) * 4 + 3]) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) return null;
    const out = Pix.makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
    out.getContext('2d').drawImage(cv, -x0, -y0);
    return { canvas: out, ox: x0, oy: y0, n: (x1 - x0 + 1) * (y1 - y0 + 1) };
  };

  // Brise un canvas en n morceaux trapus : découpes successives du plus gros morceau
  // (alternativement ~horizontales / ~verticales), calculées en un passage sur les pixels.
  const shatter = (cv, n, edge) => {
    const w = cv.width;
    const h = cv.height;
    const src = cv.getContext('2d').getImageData(0, 0, w, h).data;
    const reg = new Int16Array(w * h).fill(-1);
    const regions = [[]];
    for (let i = 0; i < w * h; i++) if (src[i * 4 + 3]) {
      reg[i] = 0;
      regions[0].push(i);
    }
    const bbox = (px) => {
      let x0 = w;
      let y0 = h;
      let x1 = 0;
      let y1 = 0;
      for (const i of px) {
        const x = i % w;
        const y = (i - x) / w;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      return [x0, y0, x1, y1];
    };
    for (let k = 0; k < n - 1; k++) {
      let bi = 0;
      for (let r = 1; r < regions.length; r++) if (regions[r].length > regions[bi].length) bi = r;
      const px = regions[bi];
      if (px.length < 8) break;
      const [x0, y0, x1, y1] = bbox(px);
      const ang = (x1 - x0 >= y1 - y0 ? Math.PI / 2 : 0) + U.rand(-0.45, 0.45);
      const cx = U.lerp(x0, x1, U.rand(0.35, 0.65));
      const cy = U.lerp(y0, y1, U.rand(0.35, 0.65));
      const s = Math.sin(ang);
      const c = Math.cos(ang);
      const A = [];
      const B = [];
      for (const i of px) {
        const x = i % w;
        ((x - cx) * s - ((i - x) / w - cy) * c > 0 ? A : B).push(i);
      }
      if (!A.length || !B.length) continue;
      for (const i of B) reg[i] = regions.length;
      regions[bi] = A;
      regions.push(B);
    }
    // une image par morceau, bord sanglant là où il touchait un autre morceau
    const e = U.hexToRgb(edge || '#7a0610');
    const out = [];
    regions.forEach((px, id) => {
      if (px.length < 3) return;
      const [x0, y0, x1, y1] = bbox(px);
      const pw = x1 - x0 + 1;
      const ph = y1 - y0 + 1;
      const pc = Pix.makeCanvas(pw, ph);
      const ctx = pc.getContext('2d');
      const img = ctx.createImageData(pw, ph);
      for (const i of px) {
        const x = i % w;
        const y = (i - x) / w;
        let cut = false;
        for (let d = 0; d < 4 && !cut; d++) {
          const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0);
          const ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const r2 = reg[ny * w + nx];
          cut = r2 >= 0 && r2 !== id;
        }
        const o = ((y - y0) * pw + (x - x0)) * 4;
        img.data[o] = cut ? e[0] : src[i * 4];
        img.data[o + 1] = cut ? e[1] : src[i * 4 + 1];
        img.data[o + 2] = cut ? e[2] : src[i * 4 + 2];
        img.data[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      out.push({ canvas: pc, ox: x0, oy: y0, n: px.length });
    });
    return out;
  };

  class GoreLayer {
    constructor(width) {
      this.gibs = [];
      this.drops = [];
      this.spurts = [];
      this.decal = Pix.makeCanvas(Math.max(GS.W, width), GS.H);
      this.dctx = this.decal.getContext('2d');
    }

    static bloodOf(f) {
      const k = f.def && f.def.blood;
      if (k === 'goo') {
        const col = f.sprite && f.sprite.goo;
        const c = col || '#58c860';
        return [c, U.shade(c, -0.3), U.shade(c, 0.3), U.shade(c, -0.5)];
      }
      return BLOOD[k] || BLOOD.red;
    }

    // Giclée de gouttes.
    spray(x, y, ground, cols, o = {}) {
      const n = o.n || 16;
      for (let i = 0; i < n; i++) {
        const ang = (o.angle !== undefined ? o.angle : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread || 2.2);
        const sp = (o.speed || 120) * (0.35 + Math.random() * 0.9);
        this.drops.push({ x, y, vx: Math.cos(ang) * sp + (o.vx || 0), vy: Math.sin(ang) * sp, c: cols[Math.floor(Math.random() * cols.length)], ground: ground + U.rand(-5, 6), s: Math.random() < 0.3 ? 2 : 1 });
      }
    }

    // Morceau physique (membre, éclat) : canvas lancé avec rotation, rebondit au sol.
    gib(canvas, x, y, vx, vy, ground, cols, o = {}) {
      this.gibs.push({ canvas, x, y, vx, vy, rot: 0, spin: o.spin !== undefined ? o.spin : U.rand(-12, 12), ground: ground + U.rand(-4, 5), cols, life: o.life || 7, bleed: o.bleed === undefined ? 1.2 : o.bleed, rest: false });
    }

    // Fontaine de sang qui suit une cible (moignon après une coupe). pos() -> [x, y] monde.
    spurt(f, pos, cols, dur = 1.0) {
      this.spurts.push({ f, pos, cols, t: dur, dur });
    }

    // Repère monde d'un ennemi modulaire (rig) : point local de l'image -> monde.
    static rigMap(f) {
      const rs = f.rscale || 1;
      const dir = f.dir < 0 || f.flip ? -1 : 1;
      const FOOT = GS.ModRig.FOOT;
      return {
        rs,
        dir,
        x: (lx) => f.x + f.offX + (f.kx || 0) + (lx - FOOT.x) * rs * dir,
        y: (ly) => f.y + f.offY + (ly - FOOT.y) * rs,
      };
    }

    // Tranche un membre. Renvoie le nom de la partie coupée (ou false).
    dismember(f, hitDir) {
      return f.rig ? this.dismemberRig(f, hitDir) : this.dismemberSprite(f, hitDir);
    }

    // Articulation d'une image du rig (avec repli si le membre est caché, ex. main en poche).
    static joint(fr, k) {
      if (fr[k]) return fr[k];
      const s = k[k.length - 1];
      const b = k.slice(0, -1);
      const off = (p, dy) => ({ x: p.x, y: p.y + dy });
      if (b === 'elb') return off(GoreLayer.joint(fr, 'sh' + s), 7);
      if (b === 'wr') return off(GoreLayer.joint(fr, 'sh' + s), 14);
      if (b === 'knee') return off(GoreLayer.joint(fr, 'hip' + s), 6);
      if (b === 'ank') return off(GoreLayer.joint(fr, 'knee' + s), 7);
      if (b === 'hip') return fr.hip;
      return fr.hip;
    }

    // Humain modulaire : coupe à une articulation (épaule, coude, poignet, hanche, genou) ;
    // le morceau vole, le moignon gicle.
    dismemberRig(f, hitDir) {
      const rig = f.art.rig;
      const L = rig.lost;
      const cand = [];
      for (const s of ['F', 'B']) {
        // un héros perd plutôt ses membres arrière (il garde son arme)
        const w = f.isHero && s === 'F' ? 0.25 : 1;
        if (!L['arm' + s]) {
          cand.push(['arm' + s, 3 * w, 'sh' + s]);
          if (!L['lo' + s]) {
            cand.push(['lo' + s, 3 * w, 'elb' + s]);
            if (!L['fist' + s]) cand.push(['fist' + s, 1.5 * w, 'wr' + s]);
          }
        }
        if (!L['leg' + s]) {
          if (!L['knee' + s]) cand.push(['knee' + s, 2 * w, 'knee' + s]);
          cand.push(['leg' + s, 0.8 * w, 'hip' + s]);
        }
      }
      if (!cand.length) return false;
      let r = Math.random() * cand.reduce((a, c) => a + c[1], 0);
      let pick = cand[0];
      for (const c of cand) {
        r -= c[1];
        if (r <= 0) {
          pick = c;
          break;
        }
      }
      const [part, , jk] = pick;
      const fr = f.art.frame(f.anim, f.at);
      const M = GoreLayer.rigMap(f);
      const j = GoreLayer.joint(fr, jk);
      const cols = GoreLayer.bloodOf(f);
      let cv = scaleCv(rig.partCanvas(part), M.rs);
      rig.lose(part);
      if (M.dir < 0) cv = flip(cv);
      const sx = M.x(j.x);
      const sy = M.y(j.y);
      this.gib(cv, sx - cv.width / 2, sy - 3, hitDir * U.rand(60, 130), -U.rand(150, 230), f.y, cols, { spin: hitDir * U.rand(8, 16) });
      this.spray(sx, sy, f.y, cols, { n: 34, speed: 170, angle: -Math.PI / 2 + hitDir * 0.5, spread: 1.4 });
      // le moignon reste à l'articulation coupée
      this.spurt(
        f,
        () => {
          const f2 = f.art.frame(f.anim, f.at);
          const j2 = GoreLayer.joint(f2, jk);
          const M2 = GoreLayer.rigMap(f);
          return [M2.x(j2.x), M2.y(j2.y)];
        },
        cols,
        1.6
      );
      f.cuts = (f.cuts || 0) + 1;
      return part;
    }

    // Sprite (fléau) : une découpe droite, appliquée à toutes les images de l'animation.
    dismemberSprite(f, hitDir) {
      const sp = f.sprite;
      const cv = sp.body;
      const w = cv.width;
      const h = cv.height;
      const cols = GoreLayer.bloodOf(f);
      // coupe : ligne prévue pour la créature (tête, pattes...) ou tête/côté au hasard
      const used = f.usedCuts || (f.usedCuts = []);
      const hints = (sp.cutHints || []).filter((c, i) => !used.includes(i));
      let px;
      let py;
      let ang;
      let head = false;
      if (hints.length) {
        const c = hints[Math.floor(Math.random() * hints.length)];
        used.push(sp.cutHints.indexOf(c));
        px = w * c.x + U.rand(-1, 1);
        py = h * c.y + U.rand(-1, 1);
        ang = c.a + U.rand(-0.25, 0.25);
        head = !!c.head;
      } else {
        const top = Math.random() < 0.6;
        px = top ? w / 2 : w * (hitDir > 0 ? 0.3 : 0.7);
        py = top ? h * U.rand(0.28, 0.4) : h * U.rand(0.35, 0.55);
        ang = top ? U.rand(-0.35, 0.35) : (hitDir > 0 ? -1 : 1) * U.rand(1.1, 1.5);
      }
      const edge = cols[2] || cols[1];
      const r = slice(cv, px, py, ang, edge);
      // le morceau coupé = le plus petit des deux
      const cutIsA = r.na < r.nb;
      const cut = crop(cutIsA ? r.a : r.b);
      const kept = cutIsA ? r.b : r.a;
      if (!cut || cut.n < 6) return false;
      const flyY = f.fly ? -16 : 0;
      const ox = f.x + f.offX + (f.kx || 0) - sp.foot.x;
      const oy = f.y - sp.foot.y + flyY;
      this.gib(cut.canvas, ox + cut.ox, oy + cut.oy, hitDir * U.rand(60, 130), -U.rand(120, 200), f.y, cols, { spin: hitDir * U.rand(6, 16) });
      this.spray(ox + px, oy + py, f.y, cols, { n: 30, speed: 160, angle: -Math.PI / 2 + hitDir * 0.5, spread: 1.4 });
      this.spurt(f, () => [f.x + f.offX + (f.kx || 0) - f.sprite.foot.x + px, f.y - f.sprite.foot.y + py + (f.fly ? -16 : 0)], cols, 1.4);
      const frames = sp.frames ? sp.frames.map((fr, i) => (i === 0 ? kept : (s2 => (cutIsA ? s2.b : s2.a))(slice(fr, px, py, ang, edge)))) : null;
      f.sprite = Object.assign({}, sp, { body: kept, frames, white: Pix.silhouette(kept, '#ffffff'), dark: Pix.silhouette(kept, '#0a0614'), red: null, ghost: null });
      for (const k of Object.keys(f.sprite)) if (k[0] === 'f' && k.length > 1 && k[1] === '#') delete f.sprite[k];
      f.cuts = (f.cuts || 0) + 1;
      return head ? 'head' : 'side';
    }

    // Explose un ennemi en morceaux (mort).
    explode(f, power = 1, img) {
      if (f.rig) return this.explodeRig(f, power);
      const sp = f.sprite;
      const cols = GoreLayer.bloodOf(f);
      const n = f.boss ? 14 : 7 + Math.floor(Math.random() * 3);
      const body = img || sp.body;
      const pieces = shatter(body, n, cols[2] || cols[1]);
      const ox = f.x + f.offX + (f.kx || 0) - sp.foot.x;
      const oy = f.y - sp.foot.y + (f.fly ? -16 : 0);
      const cx = sp.w / 2;
      const cy = sp.h / 2;
      for (const p of pieces) {
        const px = p.ox + p.canvas.width / 2;
        const py = p.oy + p.canvas.height / 2;
        const ang = Math.atan2(py - cy, px - cx);
        const sp2 = U.rand(80, 200) * power;
        this.gib(p.canvas, ox + p.ox, oy + p.oy, Math.cos(ang) * sp2 + 40, Math.sin(ang) * sp2 - U.rand(120, 240) * power, f.y, cols);
      }
      this.meat(ox + cx, oy + cy, f.y, cols, f.boss ? 14 : 7, power);
      this.spray(ox + cx, oy + cy, f.y, cols, { n: f.boss ? 160 : 80, speed: 230 * power, spread: 6.3 });
    }

    // Humain : le corps se sépare à chaque articulation (tête, poitrine, bassin, biceps,
    // avant-bras, poings, cuisses, tibias, pieds) et chaque morceau part de son côté.
    explodeRig(f, power = 1) {
      const rig = f.art.rig;
      const L = rig.lost;
      const fr = f.art.frame(f.anim, f.at);
      const M = GoreLayer.rigMap(f);
      const cols = GoreLayer.bloodOf(f);
      const J = (k) => GoreLayer.joint(fr, k);
      const mid = (a, b, dy = 0) => [(a.x + b.x) / 2, (a.y + b.y) / 2 + dy];
      const waist = fr.waist || mid(fr.neck, fr.hip);
      const W = Array.isArray(waist) ? { x: waist[0], y: waist[1] } : waist;
      const parts = [];
      if (!L.head) parts.push(['head', fr.neck.x, fr.neck.y - 8]);
      parts.push(['chest', ...mid(fr.neck, W)], ['pelvis', ...mid(W, fr.hip, 1)]);
      for (const s of ['F', 'B']) {
        if (!L['arm' + s]) {
          parts.push(['up' + s, ...mid(J('sh' + s), J('elb' + s))]);
          if (!L['lo' + s]) {
            parts.push(['low' + s, ...mid(J('elb' + s), J('wr' + s))]);
            if (!L['fist' + s]) parts.push(['hand' + s, J('wr' + s).x, J('wr' + s).y]);
          }
        }
        if (!L['leg' + s]) {
          parts.push(['thigh' + s, ...mid(J('hip' + s), J('knee' + s))]);
          if (!L['knee' + s]) {
            parts.push(['shin' + s, ...mid(J('knee' + s), J('ank' + s))]);
            parts.push(['foot' + s, J('ank' + s).x + 2, J('ank' + s).y + 2]);
          }
        }
      }
      const cx = M.x(W.x);
      const cy = M.y(W.y);
      for (const [name, lx, ly] of parts) {
        let cv = scaleCv(rig.partCanvas(name), M.rs);
        if (M.dir < 0) cv = flip(cv);
        const wx = M.x(lx);
        const wy = M.y(ly);
        const ang = Math.atan2(wy - cy, wx - cx + U.rand(-2, 2));
        const v = U.rand(90, 200) * power;
        this.gib(cv, wx - cv.width / 2, wy - cv.height / 2, Math.cos(ang) * v + U.rand(-30, 50), Math.sin(ang) * v - U.rand(140, 260) * power, f.y, cols, { spin: U.rand(-14, 14), bleed: 1.6 });
      }
      this.meat(cx, cy, f.y, cols, f.boss ? 16 : 8, power);
      this.spray(cx, cy, f.y, cols, { n: f.boss ? 170 : 90, speed: 230 * power, spread: 6.3 });
    }

    // Petits morceaux de chair.
    meat(x, y, ground, cols, n, power = 1) {
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = U.rand(60, 220) * power;
        this.gib(chunk(cols, U.randInt(1, 2)), x, y, Math.cos(ang) * v, Math.sin(ang) * v - U.rand(100, 220), ground, cols, { bleed: 0.6, life: 6 });
      }
    }

    stain(x, y, c, s = 1) {
      this.dctx.fillStyle = c;
      this.dctx.fillRect(Math.round(x), Math.round(y), s + (Math.random() < 0.4 ? 1 : 0), s);
    }

    update(dt) {
      for (const d of this.drops) {
        d.vy += 520 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.vy > 0 && d.y >= d.ground) {
          this.stain(d.x, d.ground, d.c, d.s);
          d.dead = true;
        }
      }
      this.drops = this.drops.filter((d) => !d.dead);
      for (const g of this.gibs) {
        if (g.rest) {
          g.life -= dt;
          continue;
        }
        g.vy += 520 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.rot += g.spin * dt;
        const bottom = g.y + g.canvas.height / 2;
        if (bottom >= g.ground && g.vy > 0) {
          g.y = g.ground - g.canvas.height / 2;
          g.vy *= -0.32;
          g.vx *= 0.55;
          g.spin *= 0.5;
          if (Math.abs(g.vy) < 30) {
            g.vy = 0;
            g.rest = true;
            g.rot = Math.round(g.rot / (Math.PI / 2)) * (Math.PI / 2);
            // flaque sous le morceau
            for (let i = 0; i < 6; i++) this.stain(g.x + g.canvas.width / 2 + U.rand(-5, 5), g.ground + U.rand(-1, 2), g.cols[i % 2]);
          }
        }
        if (g.bleed > 0) {
          g.bleed -= dt;
          if (Math.random() < 0.6) this.drops.push({ x: g.x + g.canvas.width / 2, y: g.y + g.canvas.height / 2, vx: U.rand(-20, 20), vy: U.rand(-30, 10), c: g.cols[Math.floor(Math.random() * 2)], ground: g.ground + U.rand(-3, 4), s: 1 });
        }
      }
      this.gibs = this.gibs.filter((g) => g.life > 0);
      for (const s of this.spurts) {
        s.t -= dt;
        const f = s.f;
        if (f.ko >= 1 || !f.alive) {
          s.t = 0;
          continue;
        }
        const [x, y] = s.pos();
        const k = Math.max(0, s.t / s.dur);
        // jets pulsés (battements de coeur)
        if (Math.sin(s.t * 18) > -0.2) this.spray(x, y, f.y, s.cols, { n: Math.ceil(3 * k), speed: 100 * k + 30, spread: 0.8 });
      }
      this.spurts = this.spurts.filter((s) => s.t > 0);
    }

    // camX : ne copie que la partie visible des flaques.
    drawDecals(ctx, camX = 0) {
      const x = Math.max(0, Math.floor(camX) - 8);
      const w = Math.min(this.decal.width - x, GS.W + 16);
      if (w > 0) ctx.drawImage(this.decal, x, 0, w, GS.H, x, 0, w, GS.H);
    }

    draw(ctx) {
      for (const g of this.gibs) {
        const a = g.rest && g.life < 1 ? g.life : 1;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(Math.round(g.x + g.canvas.width / 2), Math.round(g.y + g.canvas.height / 2));
        ctx.rotate(g.rot);
        ctx.drawImage(g.canvas, -Math.round(g.canvas.width / 2), -Math.round(g.canvas.height / 2));
        ctx.restore();
      }
      for (const d of this.drops) {
        ctx.fillStyle = d.c;
        ctx.fillRect(Math.round(d.x), Math.round(d.y), d.s, d.s + (d.vy > 150 ? 1 : 0));
      }
    }
  }

  GS.Gore = { Layer: GoreLayer, slice, shatter, crop, flip, scaleCv, BLOOD };
})();
