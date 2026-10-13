'use strict';
// Animation modulaire : un personnage est découpé en pièces de pixel art (tête, torse, bras,
// avant-bras, poings, cuisses, tibias, chaussures). Les membres pivotent autour de leurs
// articulations, le torse se penche par cisaillement (plus naturel en pixel art qu'une rotation),
// avec écrasement/étirement et balancement du bas de la veste. Chaque pose est recomposée pixel
// par pixel, détourée automatiquement puis mise en cache.
(function () {
  const U = GS.U;
  const Pix = GS.Pix;
  const M = (GS.ModRig = {});

  const CW = 96;
  const CH = 92;
  const GROUND = 86;
  const ROOT_X = 44;
  M.CW = CW;
  M.CH = CH;
  M.GROUND = GROUND;
  M.FOOT = { x: ROOT_X + 1, y: GROUND + 1 };

  // ------------------------------------------------------------ rastérisation
  // Place `tpl` pour que son point (ax, ay) tombe en (px, py), tourné de `ang` (sens horaire).
  const stampRot = (g, tpl, ax, ay, px, py, ang, map) => {
    const th = tpl.length;
    const tw = tpl[0].length;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const rad = Math.ceil(Math.hypot(Math.max(ax, tw - ax), Math.max(ay, th - ay))) + 1;
    const out = [];
    for (let y = Math.floor(py - rad); y <= py + rad; y++) {
      if (y < 0 || y >= g.h) continue;
      for (let x = Math.floor(px - rad); x <= px + rad; x++) {
        if (x < 0 || x >= g.w) continue;
        const dx = x + 0.5 - px;
        const dy = y + 0.5 - py;
        const tx = Math.floor(dx * c + dy * s + ax);
        const ty = Math.floor(-dx * s + dy * c + ay);
        if (ty < 0 || ty >= th || tx < 0 || tx >= tw) continue;
        let ch = tpl[ty][tx];
        if (ch === '.') continue;
        if (map && map[ch]) ch = map[ch];
        g[y][x] = ch;
        out.push(y * g.w + x);
      }
    }
    return out;
  };
  M.stampRot = stampRot;

  // Torse en 2 pièces articulées à la taille : le bassin suit les hanches (penché de `hipLean`),
  // la poitrine se penche de `lean` à partir de la taille (cisaillement, plus propre en pixel
  // art qu'une rotation), avec écrasement/étirement et balancement de l'ourlet.
  // Le pivot (hanche) du gabarit est placé en (hx, hy).
  const WAIST = 11; // lignes entre la hanche et la taille
  M.WAIST = WAIST;
  const stampTorso = (g, tpl, pvx, pvy, hx, hy, lean, sy, sway, hemRows, hipLean) => {
    const th = tpl.length;
    const tw = tpl[0].length;
    const k = Math.tan(lean);
    const kh = Math.tan(hipLean === undefined ? lean * 0.4 : hipLean);
    const shiftOf = (up) => (up <= WAIST ? kh * up : kh * WAIST + k * (up - WAIST)) * sy;
    const top = Math.floor(hy - pvy * sy) - 2;
    const bottom = Math.ceil(hy + (th - pvy) * sy) + 1;
    for (let y = top; y <= bottom; y++) {
      if (y < 0 || y >= g.h) continue;
      const ty = Math.floor(pvy + (y + 0.5 - hy) / sy);
      if (ty < 0 || ty >= th) continue;
      const up = pvy - ty; // hauteur au-dessus de la hanche (en lignes du gabarit)
      let shift = shiftOf(up);
      const hemStart = th - hemRows;
      if (ty >= hemStart) shift += sway * ((ty - hemStart + 1) / hemRows);
      const row = tpl[ty];
      for (let tx = 0; tx < tw; tx++) {
        const ch = row[tx];
        if (ch === '.') continue;
        const x = Math.round(hx + (tx - pvx) + shift);
        if (x >= 0 && x < g.w) g[y][x] = ch;
      }
    }
    // position (en grille) d'un point du gabarit après transformation
    return (px, py) => {
      const up = pvy - py;
      return { x: hx + (px - pvx) + shiftOf(up), y: hy - up * sy };
    };
  };

  // Liseré sombre autour d'une pièce, là où elle recouvre d'autres pièces.
  const innerOutline = (g, cells, ch) => {
    const set = new Set(cells);
    for (const id of cells) {
      const x = id % g.w;
      const y = (id - x) / g.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        const nid = ny * g.w + nx;
        if (set.has(nid) || g[ny][nx] === '.') continue;
        g[ny][nx] = ch;
      }
    }
  };

  const ang0 = (p) => Math.atan2(p.end[0] - p.pivot[0], p.end[1] - p.pivot[1]);
  const len = (p) => Math.hypot(p.end[0] - p.pivot[0], p.end[1] - p.pivot[1]);
  const lumOf = (h) => {
    const [r, g, b] = U.hexToRgb(h);
    return 0.3 * r + 0.59 * g + 0.11 * b;
  };
  const isWarm = (h) => {
    const [r, g] = U.hexToRgb(h);
    return r > g + 20;
  };

  // ------------------------------------------------------------ personnage
  class ModChar {
    constructor(spec) {
      this.spec = spec;
      this.P = spec.art.parts;
      this.cache = new Map();
      this.L = { thigh: len(this.P.thighF), shin: len(this.P.shinF) };
      // membres arrachés (gore) : 'armF', 'armB', 'head'
      this.lost = {};
      this.lostKey = '';
      // palette assombrie pour les membres arrière (profondeur) : couleur la plus proche
      // d'une version assombrie de chaque teinte (garde la même famille de couleur)
      const pal = spec.art.pal;
      const keys = Object.keys(pal);
      this.shade = {};
      for (const k of keys) {
        const target = U.hexToRgb(U.shade(pal[k], -0.22));
        let best = k;
        let bd = 1e9;
        for (const k2 of keys) {
          const c = U.hexToRgb(pal[k2]);
          const d = (c[0] - target[0]) ** 2 + (c[1] - target[1]) ** 2 + (c[2] - target[2]) ** 2;
          if (d < bd) {
            bd = d;
            best = k2;
          }
        }
        this.shade[k] = best;
      }
    }

    render(pose) {
      const sp = this.spec;
      const P = this.P;
      const L = this.L;
      const J = sp.joints;
      const lost = this.lost;
      const g = Pix.grid(CW, CH);
      const lean = pose.lean || 0;
      const sy = 1 + (pose.squash || 0);
      const stumps = [];
      const pts = {};
      // hauteur de hanche : le pied le plus bas touche le sol (sauf en l'air : pose.y < 0)
      const ext = (l, side) => {
        if (lost['leg' + side]) return -1;
        return Math.cos(l.a) * L.thigh + (lost['knee' + side] ? 0 : Math.cos(l.a - l.k) * L.shin);
      };
      let lowest = Math.max(ext(pose.legs[0], 'B'), ext(pose.legs[1], 'F'));
      if (lowest < 0) lowest = 2; // plus de jambes : sur le bassin
      const hip = { x: ROOT_X + (pose.x || 0), y: GROUND - 6 - lowest + (pose.y || 0) };

      const limb = (part, x, y, a, map) => {
        const p = P[part];
        const cells = stampRot(g, p.t, p.pivot[0] + 0.5, p.pivot[1] + 0.5, x, y, ang0(p) - a, map);
        return { cells, ex: x + Math.sin(a) * len(p), ey: y + Math.cos(a) * len(p) };
      };

      // Jambe en 3 pièces : cuisse, tibia, pied.
      const drawLeg = (l, front) => {
        const side = front ? 'F' : 'B';
        const hx = hip.x + (front ? sp.hipF : sp.hipB);
        pts['hip' + side] = { x: hx, y: hip.y };
        if (lost['leg' + side]) {
          stumps.push([hx, hip.y + 1, 5, 3]);
          return;
        }
        const map = front ? null : this.shade;
        const t = limb(front ? 'thighF' : 'thighB', hx, hip.y, l.a, map);
        pts['knee' + side] = { x: t.ex, y: t.ey };
        let cells = t.cells;
        if (lost['knee' + side]) stumps.push([t.ex, t.ey, 4, 4]);
        else {
          const sa = l.a - l.k;
          const s = limb(front ? 'shinF' : 'shinB', t.ex, t.ey, sa, map);
          const shoe = P.shoe;
          const fr = U.clamp(-sa * 0.65 + (l.toe || 0), -0.7, 1.4);
          cells = cells.concat(s.cells, stampRot(g, shoe.t, shoe.pivot[0] + 0.5, shoe.pivot[1] + 0.5, s.ex, s.ey - 1, fr, map));
          pts['ank' + side] = { x: s.ex, y: s.ey - 1 };
        }
        if (front) innerOutline(g, cells, sp.outline);
      };

      // Torse d'abord dans une grille à part pour connaître les épaules.
      // Les bras "mains dans les poches" de la fiche sont collés au torse (même cisaillement).
      const tp = P.torso;
      const tg = Pix.grid(CW, CH);
      const intact = (side) => !lost['arm' + side] && !lost['lo' + side] && !lost['fist' + side];
      const pocketB = (pose.arms[0].hand || 'fist') === 'pocket' && P.pocketB && intact('B');
      const pocketF = (pose.arms[1].hand || 'fist') === 'pocket' && P.pocketF && intact('F');
      const torsoStamp = (part) => stampTorso(tg, P[part].t, P[part].pivot[0] + 0.5, P[part].pivot[1] + 0.5, hip.x, hip.y, lean, sy, pose.sway || 0, 5, pose.hipLean);
      // bras avant derrière le torse (tous sauf Djegui) : sa poche passe sous le torse
      const under = sp.frontArm === 'under';
      if (pocketB) torsoStamp('pocketB');
      let pg = null;
      if (pocketF && under) {
        pg = Pix.grid(CW, CH);
        stampTorso(pg, P.pocketF.t, P.pocketF.pivot[0] + 0.5, P.pocketF.pivot[1] + 0.5, hip.x, hip.y, lean, sy, pose.sway || 0, 5, pose.hipLean);
      }
      const map = torsoStamp('torso');
      if (pocketF && !under) torsoStamp('pocketF');
      // liseré sombre là où le bras passe sous le bord du torse
      const seamUnder = (grid, cells) => {
        for (const id of cells) {
          const x = id % CW;
          const y = (id - x) / CW;
          if (tg[y][x] !== '.') continue;
          if ((x > 0 && tg[y][x - 1] !== '.') || (x < CW - 1 && tg[y][x + 1] !== '.') || (y > 0 && tg[y - 1][x] !== '.') || (y < CH - 1 && tg[y + 1][x] !== '.')) grid[y][x] = sp.outline;
        }
      };
      if (pg) {
        const cells = [];
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (pg[y][x] !== '.' && tg[y][x] === '.') cells.push(y * CW + x);
        seamUnder(pg, cells);
        for (const id of cells) {
          const x = id % CW;
          const y = (id - x) / CW;
          tg[y][x] = pg[y][x];
        }
      }
      const local = (j) => [j[0] - (J.hip[0] - tp.pivot[0]), j[1] - (J.hip[1] - tp.pivot[1])];
      const shF = map(...local(J.shoulderF));
      const shB = map(...local(J.shoulderB));
      // rotation du buste : l'épaule arrière avance (coup du bras arrière, garde)
      const tw = pose.twist || 0;
      shB.x += tw * 13;
      shB.y += tw * 1;
      shF.x -= tw * 3;
      const neck = map(...local(J.neck));
      pts.waist = map(tp.pivot[0], tp.pivot[1] - WAIST);

      // Bras en 3 pièces : biceps, avant-bras, poing (+ arme dans le poing avant).
      let handF = null;
      const drawArm = (arm, front) => {
        const side = front ? 'F' : 'B';
        const sh = front ? shF : shB;
        pts['sh' + side] = sh;
        if (lost['arm' + side]) {
          stumps.push([sh.x, sh.y, 4, 4]);
          return [];
        }
        let hand = arm.hand || 'fist';
        if (hand === 'pocket') {
          if (front ? pocketF : pocketB) return [];
          // bras mutilé : il pend le long du corps
          arm = { a: front ? -0.12 : 0.12, e: front ? 0.2 : -0.2, hand: 'fist' };
          hand = 'fist';
        }
        const mp = null;
        const upN = front ? 'armUpF' : 'armUpB';
        const loN = front ? 'armLoF' : 'armLoB';
        const u = limb(upN, sh.x, sh.y, arm.a, mp);
        pts['elb' + side] = { x: u.ex, y: u.ey };
        let cells = u.cells;
        const fa = arm.a + (arm.e || 0);
        if (lost['lo' + side]) stumps.push([u.ex, u.ey, 3, 3]);
        else {
          const lo = limb(loN, u.ex, u.ey, fa, mp);
          cells = cells.concat(lo.cells);
          const hl = len(P[loN]) + 0.5;
          const hx = u.ex + Math.sin(fa) * hl;
          const hy = u.ey + Math.cos(fa) * hl;
          pts['wr' + side] = { x: hx, y: hy };
          if (lost['fist' + side]) stumps.push([lo.ex, lo.ey, 3, 3]);
          else {
            const W = sp.weapon;
            if (front && W && pose.wpn !== 'none' && hand !== 'pocket') {
              const wa = pose.wabs !== undefined ? pose.wabs : fa + (pose.wr !== undefined ? pose.wr : 1.6);
              cells = cells.concat(stampRot(g, W.t, W.grip[0] + 0.5, W.grip[1] + 0.5, hx, hy, Math.PI - wa));
            }
            if (hand !== 'pocket') {
              const f = P.fist;
              cells = cells.concat(stampRot(g, f.t, f.pivot[0] + 0.5, f.pivot[1] + 0.5, hx, hy, -fa, mp));
            }
            if (front) handF = { x: hx, y: hy, ang: fa };
          }
        }
        if (front || pose.swap || pose.backArm === 'front') innerOutline(g, cells, sp.outline);
        return cells;
      };

      const backBehind = !pose.swap && pose.backArm !== 'front';
      if (backBehind) drawArm(pose.arms[0], false);
      drawLeg(pose.legs[0], false);
      drawLeg(pose.legs[1], true);
      // bras avant sous le torse (par-dessus les jambes)
      const armUnder = under ? drawArm(pose.arms[1], true) : null;
      const headRot = (pose.tilt || 0) + lean * 0.5;
      const hy0 = neck.y + (pose.hy || 0) - (sp.headLift || 0);
      if (P.hairBack && !lost.head) {
        const hb = P.hairBack;
        stampRot(g, hb.t, hb.pivot[0] + 0.5, hb.pivot[1] + 0.5, neck.x + (pose.hx || 0), hy0, headRot * 0.6);
      }
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (tg[y][x] !== '.') g[y][x] = tg[y][x];
      if (armUnder) seamUnder(g, armUnder);
      const hp = P.head;
      if (!lost.head) stampRot(g, hp.t, hp.pivot[0] + 0.5, hp.pivot[1] + 0.5, neck.x + (pose.hx || 0), hy0, headRot);
      else stumps.push([neck.x, neck.y - 1, 6, 3]);
      if (!backBehind && !pose.swap) drawArm(pose.arms[0], false);
      if (!under) drawArm(pose.arms[1], true);
      if (pose.swap) drawArm(pose.arms[0], false);

      const canvas = Pix.render(g, sp.art.pal, { outlineColor: sp.outlineColor || '#050307' });
      // moignons sanglants
      if (stumps.length) {
        const c = canvas.getContext('2d');
        for (const [x, y, w, h] of stumps) {
          const x0 = Math.round(x + 1 - w / 2);
          const y0 = Math.round(y + 1 - h / 2);
          c.fillStyle = '#5a040c';
          c.fillRect(x0, y0, w, h);
          c.fillStyle = '#c01020';
          c.fillRect(x0 + 1, y0 + 1, Math.max(1, w - 2), Math.max(1, h - 2));
        }
      }
      const P1 = (p) => (p ? { x: p.x + 1, y: p.y + 1 } : null);
      const out = {
        canvas,
        hand: handF ? { x: handF.x + 1, y: handF.y + 1, ang: handF.ang } : null,
        head: { x: neck.x + 1, y: neck.y - 9 + 1 },
        shF: P1(shF),
        shB: P1(shB),
        neck: P1(neck),
        hip: P1(hip),
      };
      for (const k of Object.keys(pts)) if (!out[k]) out[k] = P1(pts[k]);
      return out;
    }

    // Copie indépendante (mêmes graphismes, membres et cache propres) : un par combattant.
    clone() {
      return new ModChar(this.spec);
    }

    // Recolle tous les membres (réanimation).
    heal() {
      this.lost = {};
      this.lostKey = '';
      this.cache.clear();
    }

    // Arrache un membre : les images suivantes sont rendues sans lui.
    lose(part) {
      if (this.lost[part]) return false;
      this.lost[part] = true;
      this.lostKey = Object.keys(this.lost).sort().join(',');
      this.cache.clear();
      return true;
    }

    // Image isolée d'une partie du corps (morceaux qui volent). Segments : 'head', 'chest',
    // 'pelvis', 'upF' (biceps), 'lowF' (avant-bras), 'handF' (poing + arme), 'thighF',
    // 'shinF', 'footF' (et B). Membres entiers coupés à une articulation : 'armF' (épaule),
    // 'loF' (coude), 'fistF' (poignet), 'legF' (hanche), 'kneeF' (genou). Canvas recadré.
    partCanvas(name) {
      const cache = this.spec._parts || (this.spec._parts = {});
      return cache[name] || (cache[name] = this.renderPart(name));
    }

    renderPart(name) {
      const P = this.P;
      const sp = this.spec;
      const S = 64;
      const g = Pix.grid(S, S);
      const cx = S / 2;
      const side = name[name.length - 1];
      const base = name.slice(0, -1);
      const st = (p, x, y, a) => stampRot(g, p.t, p.pivot[0] + 0.5, p.pivot[1] + 0.5, x, y, ang0(p) - a);
      const up = P[side === 'B' ? 'armUpB' : 'armUpF'];
      const lo = P[side === 'B' ? 'armLoB' : 'armLoF'];
      const th = P[side === 'B' ? 'thighB' : 'thighF'];
      const sh = P[side === 'B' ? 'shinB' : 'shinF'];
      const arm = (from, a = 0.3) => {
        // biceps (si 'up'), avant-bras (si <= 'lo'), poing + arme
        let x = cx;
        let y = 14;
        const fa = a + 0.4;
        if (from === 'up') {
          st(up, x, y, a);
          x += Math.sin(a) * len(up);
          y += Math.cos(a) * len(up);
        }
        if (from === 'up' || from === 'lo') {
          st(lo, x, y, fa);
          x += Math.sin(fa) * (len(lo) + 0.5);
          y += Math.cos(fa) * (len(lo) + 0.5);
        }
        if (side === 'F' && sp.weapon) stampRot(g, sp.weapon.t, sp.weapon.grip[0] + 0.5, sp.weapon.grip[1] + 0.5, x, y, Math.PI - (fa + 1.6));
        stampRot(g, P.fist.t, P.fist.pivot[0] + 0.5, P.fist.pivot[1] + 0.5, x, y, -fa);
      };
      const leg = (from) => {
        let y = 10;
        if (from === 'thigh') {
          st(th, cx, y, 0);
          y += len(th);
        }
        if (from !== 'foot') {
          st(sh, cx, y, 0);
          y += len(sh);
        }
        stampRot(g, P.shoe.t, P.shoe.pivot[0] + 0.5, P.shoe.pivot[1] + 0.5, cx, y - 1, 0);
      };
      const torsoRows = (r0, r1) => {
        const t = P.torso;
        const tpl = t.t.map((row, y) => (y >= r0 && y <= r1 ? row : '.'.repeat(row.length)));
        stampRot(g, tpl, t.pivot[0] + 0.5, t.pivot[1] + 0.5, cx, 50, 0);
      };
      const waistRow = P.torso.pivot[1] - WAIST;
      if (name === 'head') {
        if (P.hairBack) stampRot(g, P.hairBack.t, P.hairBack.pivot[0] + 0.5, P.hairBack.pivot[1] + 0.5, cx, 40, 0);
        stampRot(g, P.head.t, P.head.pivot[0] + 0.5, P.head.pivot[1] + 0.5, cx, 40, 0);
      } else if (name === 'chest') torsoRows(0, waistRow - 1);
      else if (name === 'pelvis') torsoRows(waistRow, 99);
      else if (name === 'torso') torsoRows(0, 99);
      else if (base === 'arm') arm('up');
      else if (base === 'lo') arm('lo');
      else if (base === 'fist' || base === 'hand') arm('fist');
      else if (base === 'up') st(up, cx, 14, 0.3);
      else if (base === 'low') st(lo, cx, 14, 0.5);
      else if (base === 'leg') leg('thigh');
      else if (base === 'knee') leg('shin');
      else if (base === 'thigh') st(th, cx, 10, 0);
      else if (base === 'shin') st(sh, cx, 10, 0);
      else if (base === 'foot') leg('foot');
      const cv = Pix.render(g, sp.art.pal, { outlineColor: sp.outlineColor || '#050307' });
      const c = GS.Gore.crop(cv);
      return c ? c.canvas : cv;
    }

    frame(pose) {
      const q = quant(pose);
      const key = this.lostKey + JSON.stringify(q);
      let f = this.cache.get(key);
      if (!f) {
        f = this.render(q);
        if (this.cache.size > 700) this.cache.clear();
        this.cache.set(key, f);
      }
      return f;
    }

    // anim : nom d'un cycle, d'une séquence ou d'une pose-clé ; t en secondes.
    poseOf(anim, t = 0) {
      const map = this.spec.animMap;
      return M.pose((map && map[anim]) || anim, t);
    }

    // Toutes les poses distinctes d'animations (pré-calcul progressif, évite les saccades).
    warmList(names) {
      const map = this.spec.animMap || {};
      const out = [];
      for (const n0 of names) {
        const n = map[n0] || n0;
        const C = CYCLES[n];
        const S = SEQ[n];
        if (C) for (let f = 0; f < C.frames; f++) out.push(() => this.anim(n, ((f + 0.5) / C.frames) * C.dur));
        else if (S) {
          let acc = 0;
          for (let i = 1; i < S.length; i++) {
            const d = S[i][1];
            for (let q = 0; q <= 4; q++) {
              const t = acc + (d * q) / 4;
              out.push(() => this.anim(n, t));
            }
            acc += d;
          }
        }
      }
      return out;
    }

    anim(anim, t = 0) {
      const map = this.spec.animMap;
      return this.frame(M.pose((map && map[anim]) || anim, t));
    }
  }
  M.Char = ModChar;

  const q1 = (v) => Math.round((v || 0) * 20) / 20;
  function quant(p) {
    return {
      swap: !!p.swap,
      backArm: p.backArm || 'behind',
      wr: p.wr === undefined ? undefined : q1(p.wr),
      wabs: p.wabs === undefined ? undefined : q1(p.wabs),
      wpn: p.wpn,
      twist: q1(p.twist),
      x: Math.round(p.x || 0),
      y: Math.round(p.y || 0),
      lean: q1(p.lean),
      squash: Math.round((p.squash || 0) * 20) / 20,
      sway: Math.round(p.sway || 0),
      tilt: q1(p.tilt),
      hx: Math.round(p.hx || 0),
      hy: Math.round(p.hy || 0),
      legs: p.legs.map((l) => ({ a: q1(l.a), k: q1(l.k), toe: q1(l.toe) })),
      arms: p.arms.map((a) => ({ a: q1(a.a), e: q1(a.e), hand: a.hand || 'fist' })),
    };
  }

  const lerp = U.lerp;
  M.blend = (p, q, t) => ({
    swap: t < 0.5 ? p.swap : q.swap,
    backArm: t < 0.5 ? p.backArm : q.backArm,
    wpn: t < 0.5 ? p.wpn : q.wpn,
    wr: p.wr === undefined && q.wr === undefined ? undefined : lerp(p.wr === undefined ? 1.6 : p.wr, q.wr === undefined ? 1.6 : q.wr, t),
    wabs: p.wabs !== undefined && q.wabs !== undefined ? lerp(p.wabs, q.wabs, t) : t < 0.5 ? p.wabs : q.wabs,
    twist: lerp(p.twist || 0, q.twist || 0, t),
    x: lerp(p.x || 0, q.x || 0, t),
    y: lerp(p.y || 0, q.y || 0, t),
    lean: lerp(p.lean || 0, q.lean || 0, t),
    squash: lerp(p.squash || 0, q.squash || 0, t),
    sway: lerp(p.sway || 0, q.sway || 0, t),
    tilt: lerp(p.tilt || 0, q.tilt || 0, t),
    hx: lerp(p.hx || 0, q.hx || 0, t),
    hy: lerp(p.hy || 0, q.hy || 0, t),
    legs: [0, 1].map((i) => ({ a: lerp(p.legs[i].a, q.legs[i].a, t), k: lerp(p.legs[i].k, q.legs[i].k, t), toe: lerp(p.legs[i].toe || 0, q.legs[i].toe || 0, t) })),
    arms: [0, 1].map((i) => ({ a: lerp(p.arms[i].a, q.arms[i].a, t), e: lerp(p.arms[i].e || 0, q.arms[i].e || 0, t), hand: t < 0.5 ? p.arms[i].hand : q.arms[i].hand })),
  });

  // ------------------------------------------------------------ poses-clés
  // Angles : 0 = vers le bas, positif = vers l'avant (droite). [arrière, avant].
  // k = flexion du genou, e = flexion du coude, toe = rotation du pied.
  const PK = { a: 0, e: 0, hand: 'pocket' };
  const PP = [PK, PK];
  const K = (M.KEY = {
    idle: { legs: [{ a: -0.1, k: 0.04 }, { a: 0.12, k: 0.04 }], arms: PP },
    // attitude de combat : mains dans les poches, appui sur la jambe arrière
    guard: { lean: 0.04, x: -1, legs: [{ a: -0.34, k: 0.22 }, { a: 0.26, k: 0.3 }], arms: PP },
    guard2: { lean: 0.02, x: -1, y: 1, squash: -0.02, legs: [{ a: -0.36, k: 0.32 }, { a: 0.28, k: 0.4 }], arms: PP },
    crouch: { lean: 0.22, squash: -0.06, legs: [{ a: -0.7, k: 1.3 }, { a: 0.65, k: 1.45 }], arms: PP },
    // direct du bras avant
    windup: { lean: -0.1, x: -3, sway: -1, legs: [{ a: -0.5, k: 0.5 }, { a: 0.36, k: 0.6 }], arms: [PK, { a: -0.9, e: 2.0 }] },
    jab: { lean: 0.3, x: 4, sway: 2, legs: [{ a: -0.7, k: 0.1 }, { a: 0.55, k: 0.45 }], arms: [PK, { a: 1.6, e: 0.0 }] },
    // cross du bras arrière (le bras avant reste dans la poche)
    crossWind: { swap: true, twist: 0.4, lean: -0.02, x: -1, legs: [{ a: -0.55, k: 0.45 }, { a: 0.45, k: 0.6 }], arms: [{ a: -0.6, e: 1.6 }, PK] },
    cross: { swap: true, twist: 1, lean: 0.38, x: 6, sway: 2, legs: [{ a: -0.8, k: 0.05 }, { a: 0.6, k: 0.55 }], arms: [{ a: 1.6, e: 0.0 }, PK] },
    upWind: { lean: 0.25, squash: -0.06, x: 1, legs: [{ a: -0.75, k: 1.2 }, { a: 0.6, k: 1.4 }], arms: [PK, { a: 0.3, e: 2.4 }] },
    uppercut: { lean: -0.05, y: -8, x: 3, squash: 0.06, legs: [{ a: -0.3, k: 0.2 }, { a: 0.5, k: 1.2 }], arms: [PK, { a: 2.85, e: 0.15 }] },
    // coups de pied, mains dans les poches
    kickPrep: { lean: -0.15, legs: [{ a: -0.15, k: 0.3 }, { a: 1.2, k: 2.1 }], arms: PP },
    kick: { lean: -0.32, x: -2, sway: -2, legs: [{ a: -0.25, k: 0.15 }, { a: 1.7, k: 0.0, toe: -0.8 }], arms: PP },
    airKick: { lean: -0.25, y: -14, sway: -2, legs: [{ a: 0.4, k: 1.7 }, { a: 1.75, k: 0.0, toe: -0.8 }], arms: PP },
    hurt: { lean: -0.3, x: -4, tilt: -0.2, sway: -2, legs: [{ a: -0.35, k: 0.55 }, { a: 0.4, k: 0.7 }], arms: PP },
    ko: { lean: -0.25, tilt: 0.25, legs: [{ a: -0.6, k: 1.2 }, { a: 0.5, k: 1.4 }], arms: PP },
    // pose de pouvoir (fiche) : accroupi, une main au sol, poing tendu
    power: { backArm: 'front', twist: 0.6, lean: 0.42, x: 3, tilt: 0.05, squash: -0.05, legs: [{ a: -1.15, k: 0.3 }, { a: 1.05, k: 2.0 }], arms: [{ a: 0.15, e: -0.1, hand: 'fist' }, { a: 1.5, e: 0.0 }] },
    // regard écarlate : il fixe l'ennemi, mains dans les poches
    cast: { lean: -0.06, tilt: 0.06, legs: [{ a: -0.3, k: 0.15 }, { a: 0.3, k: 0.2 }], arms: PP },
    victory: { tilt: -0.1, legs: [{ a: -0.15, k: 0.04 }, { a: 0.15, k: 0.04 }], arms: PP },
    jump: { lean: 0.15, y: -10, legs: [{ a: 0.6, k: 1.7 }, { a: 1.1, k: 2.0 }], arms: PP },
    land: { lean: 0.25, squash: -0.08, legs: [{ a: -0.8, k: 1.5 }, { a: 0.7, k: 1.6 }], arms: PP },
    dash: { lean: 0.5, sway: -3, legs: [{ a: -1.1, k: 0.45 }, { a: 0.75, k: 1.4 }], arms: PP },
  });

  // poses avec arme (épée, lance, bâton, arc...) : le poing avant tient l'arme
  const ARM_POSES = {
    aidle: { legs: [{ a: -0.14, k: 0.06 }, { a: 0.16, k: 0.06 }], arms: [PK, { a: 0.3, e: 0.5 }], wr: 1.7 },
    astance1: { lean: 0.06, x: -1, legs: [{ a: -0.42, k: 0.38 }, { a: 0.34, k: 0.46 }], arms: [PK, { a: 0.55, e: 0.6 }], wr: 1.45 },
    astance2: { lean: 0.04, x: -1, y: 1, squash: -0.02, legs: [{ a: -0.44, k: 0.48 }, { a: 0.36, k: 0.56 }], arms: [PK, { a: 0.5, e: 0.65 }], wr: 1.5 },
    slashWind: { lean: -0.12, x: -3, sway: -1, legs: [{ a: -0.5, k: 0.5 }, { a: 0.36, k: 0.6 }], arms: [PK, { a: -2.7, e: -0.3 }], wr: -0.4 },
    slash: { lean: 0.32, x: 5, sway: 2, legs: [{ a: -0.75, k: 0.12 }, { a: 0.6, k: 0.5 }], arms: [PK, { a: 1.35, e: 0.05 }], wr: -0.35 },
    slashLow: { lean: 0.15, x: 0, legs: [{ a: -0.6, k: 0.7 }, { a: 0.5, k: 0.8 }], arms: [PK, { a: -0.5, e: 0.2 }], wr: -0.7 },
    slashUp: { lean: -0.05, x: 4, y: -2, legs: [{ a: -0.4, k: 0.2 }, { a: 0.5, k: 0.4 }], arms: [PK, { a: 2.5, e: 0.15 }], wr: 0.3 },
    thrustWind: { lean: -0.05, x: -3, legs: [{ a: -0.5, k: 0.5 }, { a: 0.4, k: 0.6 }], arms: [PK, { a: -0.3, e: 1.85 }], wabs: 1.57 },
    thrust: { lean: 0.36, x: 7, sway: 2, legs: [{ a: -0.85, k: 0.05 }, { a: 0.65, k: 0.5 }], arms: [PK, { a: 1.55, e: 0.0 }], wabs: 1.57 },
    castStaff: { lean: -0.06, legs: [{ a: -0.3, k: 0.15 }, { a: 0.3, k: 0.2 }], arms: [PK, { a: 2.55, e: 0.25 }], wabs: Math.PI },
    drawBow: { backArm: 'front', twist: 0.5, lean: 0.05, legs: [{ a: -0.45, k: 0.3 }, { a: 0.4, k: 0.35 }], arms: [{ a: 1.35, e: 2.5 }, { a: 1.55, e: 0.0 }], wabs: Math.PI },
    shoot: { backArm: 'front', twist: 0.4, lean: -0.05, x: -2, legs: [{ a: -0.45, k: 0.3 }, { a: 0.4, k: 0.35 }], arms: [{ a: 0.9, e: 1.9 }, { a: 1.55, e: 0.0 }], wabs: Math.PI },
    avictory: { tilt: -0.08, legs: [{ a: -0.15, k: 0.04 }, { a: 0.15, k: 0.04 }], arms: [PK, { a: 2.95, e: 0.1 }], wabs: Math.PI },
    ahurt: { lean: -0.3, x: -4, tilt: -0.2, sway: -2, legs: [{ a: -0.35, k: 0.55 }, { a: 0.4, k: 0.7 }], arms: [PK, { a: -0.5, e: 0.7 }], wr: 1.2 },
    ako: { lean: -0.25, tilt: 0.25, legs: [{ a: -0.6, k: 1.2 }, { a: 0.5, k: 1.4 }], arms: [PK, { a: 0.4, e: 0.5 }], wr: 1.6 },
    ajump: { lean: 0.15, y: -10, legs: [{ a: 0.6, k: 1.7 }, { a: 1.1, k: 2.0 }], arms: [PK, { a: 0.9, e: 0.9 }], wr: 1.4 },
    aland: { lean: 0.25, squash: -0.08, legs: [{ a: -0.8, k: 1.5 }, { a: 0.7, k: 1.6 }], arms: [PK, { a: 0.9, e: 0.6 }], wr: 1.4 },
  };
  Object.assign(K, ARM_POSES);

  // ------------------------------------------------------------ cycles
  const TAU = Math.PI * 2;
  const CYCLES = (M.CYCLES = {
    idle: {
      frames: 4,
      dur: 2.0,
      pose: (p) => {
        const b = p >= 0.25 && p < 0.75 ? 1 : 0;
        return Object.assign({}, K.idle, { y: b, squash: b ? -0.02 : 0 });
      },
    },
    // garde rebondissante façon jeu de combat
    stance: {
      frames: 6,
      dur: 1.2,
      pose: (p) => M.blend(K.guard, K.guard2, (1 - Math.cos(p * TAU)) / 2),
    },
    walk: {
      frames: 8,
      dur: 0.84,
      pose: (p) => {
        const s = Math.sin(p * TAU);
        const c = Math.cos(p * TAU);
        return {
          y: Math.abs(s) < 0.5 ? 0 : -1,
          lean: 0.06,
          sway: Math.round(-s * 1.2),
          tilt: s * 0.03,
          x: c * 0.6,
          legs: [
            { a: -0.48 * s, k: 0.1 + 0.85 * Math.max(0, -c), toe: s > 0.6 ? 0.5 : 0 },
            { a: 0.48 * s, k: 0.1 + 0.85 * Math.max(0, c), toe: s < -0.6 ? 0.5 : 0 },
          ],
          arms: PP,
        };
      },
    },
    run: {
      frames: 8,
      dur: 0.5,
      pose: (p) => {
        const s = Math.sin(p * TAU);
        const c = Math.cos(p * TAU);
        return {
          y: -Math.abs(c) * 3 + 1.5,
          lean: 0.36,
          x: 3,
          sway: Math.round(-2 - s * 1.5),
          legs: [
            { a: -0.95 * s + 0.15, k: 0.35 + 1.65 * Math.max(0, -c), toe: 0.3 * Math.max(0, s) },
            { a: 0.95 * s + 0.15, k: 0.35 + 1.65 * Math.max(0, c), toe: 0.3 * Math.max(0, -s) },
          ],
          arms: PP,
        };
      },
    },
  });

  const withWeapon = (pose, arm, extra) => Object.assign({}, pose, { arms: [PK, arm] }, extra);
  CYCLES.astance = { frames: 6, dur: 1.2, pose: (p) => M.blend(K.astance1, K.astance2, (1 - Math.cos(p * TAU)) / 2) };
  CYCLES.awalk = {
    frames: 8,
    dur: 0.84,
    pose: (p) => withWeapon(CYCLES.walk.pose(p), { a: 0.3 + Math.sin(p * TAU) * 0.15, e: 0.5 }, { wr: 1.7 }),
  };
  CYCLES.arun = {
    frames: 8,
    dur: 0.5,
    pose: (p) => withWeapon(CYCLES.run.pose(p), { a: -0.5 + Math.sin(p * TAU) * 0.2, e: 0.9 }, { wabs: -2.3 }),
  };

  // ------------------------------------------------------------ séquences d'attaque
  // Liste de [pose, durée] ; on interpole avec un easing (anticipation -> frappe -> retour).
  const SEQ = (M.SEQ = {
    jab: [['guard', 0.0], ['windup', 0.07], ['jab', 0.05], ['jab', 0.07], ['guard', 0.12]],
    cross: [['guard', 0.0], ['crossWind', 0.07], ['cross', 0.05], ['cross', 0.08], ['guard', 0.14]],
    uppercut: [['guard', 0.0], ['upWind', 0.09], ['uppercut', 0.06], ['uppercut', 0.1], ['land', 0.1], ['guard', 0.12]],
    kick: [['guard', 0.0], ['kickPrep', 0.08], ['kick', 0.05], ['kick', 0.1], ['guard', 0.14]],
    airKick: [['guard', 0.0], ['crouch', 0.08], ['jump', 0.08], ['airKick', 0.06], ['airKick', 0.1], ['land', 0.1], ['guard', 0.12]],
    hurt: [['hurt', 0.0], ['hurt', 0.16], ['guard', 0.2]],
    power: [['guard', 0.0], ['crouch', 0.12], ['power', 0.1], ['power', 0.6]],
    cast: [['guard', 0.0], ['cast', 0.15], ['cast', 0.3], ['guard', 0.15]],
    // avec arme
    slashA: [['astance1', 0.0], ['slashWind', 0.08], ['slash', 0.05], ['slash', 0.08], ['astance1', 0.12]],
    slashB: [['astance1', 0.0], ['slashLow', 0.07], ['slashUp', 0.05], ['slashUp', 0.08], ['astance1', 0.12]],
    thrust: [['astance1', 0.0], ['thrustWind', 0.08], ['thrust', 0.05], ['thrust', 0.08], ['astance1', 0.12]],
    shoot: [['astance1', 0.0], ['drawBow', 0.12], ['drawBow', 0.06], ['shoot', 0.05], ['shoot', 0.08], ['astance1', 0.12]],
    castStaff: [['astance1', 0.0], ['castStaff', 0.15], ['castStaff', 0.3], ['astance1', 0.15]],
    ahurt: [['ahurt', 0.0], ['ahurt', 0.16], ['astance1', 0.2]],
  });
  // instant (secondes) du coup dans chaque séquence
  M.HIT = { jab: 0.12, cross: 0.12, uppercut: 0.15, kick: 0.13, airKick: 0.22, power: 0.22, cast: 0.15, slashA: 0.13, slashB: 0.12, thrust: 0.13, shoot: 0.23, castStaff: 0.15 };

  M.seqDur = (name) => SEQ[name].reduce((s, k) => s + k[1], 0);

  const easeOut = (t) => 1 - (1 - t) * (1 - t);
  M.pose = (anim, t = 0) => {
    if (typeof anim !== 'string') return anim;
    const C = CYCLES[anim];
    if (C) {
      const p = (((t % C.dur) + C.dur) % C.dur) / C.dur;
      return C.pose(Math.floor(p * C.frames) / C.frames);
    }
    const S = SEQ[anim];
    if (S) {
      let acc = 0;
      for (let i = 1; i < S.length; i++) {
        const d = S[i][1];
        if (t <= acc + d) {
          // 30 images/s : on quantifie pour un rendu "image par image"
          const u = d > 0 ? Math.round(((t - acc) / d) * 4) / 4 : 1;
          return M.blend(K[S[i - 1][0]], K[S[i][0]], easeOut(U.clamp(u, 0, 1)));
        }
        acc += d;
      }
      return K[S[S.length - 1][0]];
    }
    return K[anim] || K.idle;
  };
})();
