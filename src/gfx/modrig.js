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

  // Torse : cisaillement (penché) + étirement vertical + balancement de l'ourlet.
  // Le pivot (hanche) du gabarit est placé en (hx, hy).
  const stampTorso = (g, tpl, pvx, pvy, hx, hy, lean, sy, sway, hemRows) => {
    const th = tpl.length;
    const tw = tpl[0].length;
    const k = Math.tan(lean);
    const top = Math.floor(hy - pvy * sy) - 2;
    for (let y = top; y <= hy + 3; y++) {
      if (y < 0 || y >= g.h) continue;
      const ty = Math.floor(pvy + (y + 0.5 - hy) / sy);
      if (ty < 0 || ty >= th) continue;
      const up = pvy - ty; // hauteur au-dessus de la hanche (en lignes du gabarit)
      let shift = k * up * sy;
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
      return { x: hx + (px - pvx) + k * up * sy, y: hy - up * sy };
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
      // palette assombrie pour les membres arrière (profondeur)
      const pal = spec.art.pal;
      const keys = Object.keys(pal);
      this.shade = {};
      for (const k of keys) {
        const L = lumOf(pal[k]);
        let best = k;
        let bd = 1e9;
        for (const k2 of keys) {
          if (isWarm(pal[k2]) !== isWarm(pal[k])) continue;
          const d = Math.abs(lumOf(pal[k2]) - L * 0.74);
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
      const g = Pix.grid(CW, CH);
      const lean = pose.lean || 0;
      const sy = 1 + (pose.squash || 0);
      // hauteur de hanche : le pied le plus bas touche le sol (sauf en l'air : pose.y < 0)
      const ext = (l) => Math.cos(l.a) * L.thigh + Math.cos(l.a - l.k) * L.shin;
      const lowest = Math.max(ext(pose.legs[0]), ext(pose.legs[1]));
      const hip = { x: ROOT_X + (pose.x || 0), y: GROUND - 6 - lowest + (pose.y || 0) };

      const limb = (part, x, y, a, map) => {
        const p = P[part];
        const cells = stampRot(g, p.t, p.pivot[0] + 0.5, p.pivot[1] + 0.5, x, y, ang0(p) - a, map);
        return { cells, ex: x + Math.sin(a) * len(p), ey: y + Math.cos(a) * len(p) };
      };

      const drawLeg = (l, front) => {
        const hx = hip.x + (front ? sp.hipF : sp.hipB);
        const map = front ? null : this.shade;
        const t = limb(front ? 'thighF' : 'thighB', hx, hip.y, l.a, map);
        const sa = l.a - l.k;
        const s = limb(front ? 'shinF' : 'shinB', t.ex, t.ey, sa, map);
        const shoe = P.shoe;
        const fr = U.clamp(-sa * 0.65 + (l.toe || 0), -0.7, 1.4);
        const cells = stampRot(g, shoe.t, shoe.pivot[0] + 0.5, shoe.pivot[1] + 0.5, s.ex, s.ey - 1, fr, map);
        if (front) innerOutline(g, t.cells.concat(s.cells, cells), sp.outline);
      };

      // Torse d'abord dans une grille à part pour connaître les épaules.
      const tp = P.torso;
      const tg = Pix.grid(CW, CH);
      const map = stampTorso(tg, tp.t, tp.pivot[0] + 0.5, tp.pivot[1] + 0.5, hip.x, hip.y, lean, sy, pose.sway || 0, 5);
      const local = (j) => [j[0] - (J.hip[0] - tp.pivot[0]), j[1] - (J.hip[1] - tp.pivot[1])];
      const shF = map(...local(J.shoulderF));
      const shB = map(...local(J.shoulderB));
      const neck = map(...local(J.neck));

      let handF = null;
      const drawArm = (arm, front) => {
        const sh = front ? shF : shB;
        const mp = front ? null : this.shade;
        const upN = front ? 'armUpF' : 'armUpB';
        const loN = front ? 'armLoF' : 'armLoB';
        const u = limb(upN, sh.x, sh.y, arm.a, mp);
        const fa = arm.a + (arm.e || 0);
        const lo = limb(loN, u.ex, u.ey, fa, mp);
        let cells = u.cells.concat(lo.cells);
        const hand = arm.hand || 'fist';
        const hl = len(P[loN]) + 0.5;
        const hx = u.ex + Math.sin(fa) * hl;
        const hy = u.ey + Math.cos(fa) * hl;
        if (hand !== 'pocket') {
          const f = P.fist;
          cells = cells.concat(stampRot(g, f.t, f.pivot[0] + 0.5, f.pivot[1] + 0.5, hx, hy, -fa, mp));
        }
        if (front) {
          innerOutline(g, cells, sp.outline);
          handF = { x: hx, y: hy, ang: fa };
        }
      };

      if (!pose.swap) drawArm(pose.arms[0], false);
      drawLeg(pose.legs[0], false);
      drawLeg(pose.legs[1], true);
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (tg[y][x] !== '.') g[y][x] = tg[y][x];
      const hp = P.head;
      stampRot(g, hp.t, hp.pivot[0] + 0.5, hp.pivot[1] + 0.5, neck.x + (pose.hx || 0), neck.y + (pose.hy || 0), (pose.tilt || 0) + lean * 0.5);
      drawArm(pose.arms[1], true);
      if (pose.swap) drawArm(pose.arms[0], false);

      const canvas = Pix.render(g, sp.art.pal, { outlineColor: sp.outlineColor || '#050307' });
      return {
        canvas,
        hand: handF ? { x: handF.x + 1, y: handF.y + 1, ang: handF.ang } : null,
        head: { x: neck.x + 1, y: neck.y - 9 + 1 },
      };
    }

    frame(pose) {
      const q = quant(pose);
      const key = JSON.stringify(q);
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
      return M.pose(anim, t);
    }

    anim(anim, t = 0) {
      return this.frame(M.pose(anim, t));
    }
  }
  M.Char = ModChar;

  const q1 = (v) => Math.round((v || 0) * 20) / 20;
  function quant(p) {
    return {
      swap: !!p.swap,
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
  const K = (M.KEY = {
    idle: { legs: [{ a: -0.1, k: 0.04 }, { a: 0.12, k: 0.04 }], arms: [{ a: 0, e: 0, hand: 'pocket' }, { a: 0, e: 0, hand: 'pocket' }] },
    // garde de combat (idle en bataille)
    guard: { lean: 0.1, x: -1, legs: [{ a: -0.5, k: 0.5 }, { a: 0.42, k: 0.62 }], arms: [{ a: 0.75, e: 1.85 }, { a: 0.5, e: 2.15 }] },
    guard2: { lean: 0.08, x: -1, y: 1, squash: -0.03, legs: [{ a: -0.52, k: 0.62 }, { a: 0.44, k: 0.74 }], arms: [{ a: 0.7, e: 1.95 }, { a: 0.45, e: 2.25 }] },
    crouch: { lean: 0.2, squash: -0.06, legs: [{ a: -0.7, k: 1.3 }, { a: 0.65, k: 1.45 }], arms: [{ a: 0.5, e: 1.7 }, { a: 0.3, e: 2.0 }] },
    windup: { lean: -0.12, x: -3, sway: -1, legs: [{ a: -0.5, k: 0.5 }, { a: 0.36, k: 0.6 }], arms: [{ a: 0.6, e: 1.9 }, { a: -0.9, e: 2.0 }] },
    jab: { lean: 0.3, x: 4, sway: 2, legs: [{ a: -0.7, k: 0.1 }, { a: 0.55, k: 0.45 }], arms: [{ a: 0.6, e: 1.9 }, { a: 1.6, e: 0.0 }] },
    crossWind: { lean: 0.0, x: -1, legs: [{ a: -0.55, k: 0.45 }, { a: 0.45, k: 0.6 }], arms: [{ a: -0.4, e: 1.9 }, { a: 0.8, e: 2.0 }] },
    cross: { swap: true, lean: 0.38, x: 6, sway: 2, legs: [{ a: -0.8, k: 0.05 }, { a: 0.6, k: 0.55 }], arms: [{ a: 1.6, e: 0.0 }, { a: 0.4, e: 2.1 }] },
    upWind: { lean: 0.25, squash: -0.06, x: 1, legs: [{ a: -0.75, k: 1.2 }, { a: 0.6, k: 1.4 }], arms: [{ a: 0.6, e: 1.8 }, { a: 0.2, e: 2.5 }] },
    uppercut: { lean: -0.05, y: -8, x: 3, squash: 0.06, legs: [{ a: -0.3, k: 0.2 }, { a: 0.5, k: 1.2 }], arms: [{ a: -0.4, e: 1.4 }, { a: 2.85, e: 0.15 }] },
    kickPrep: { lean: -0.15, legs: [{ a: -0.15, k: 0.3 }, { a: 1.2, k: 2.1 }], arms: [{ a: 0.8, e: 1.8 }, { a: -0.6, e: 1.6 }] },
    kick: { lean: -0.32, x: -2, sway: -2, legs: [{ a: -0.25, k: 0.15 }, { a: 1.7, k: 0.0, toe: -0.8 }], arms: [{ a: 1.0, e: 1.5 }, { a: -0.9, e: 1.1 }] },
    airKick: { lean: -0.25, y: -14, sway: -2, legs: [{ a: 0.4, k: 1.7 }, { a: 1.75, k: 0.0, toe: -0.8 }], arms: [{ a: 1.1, e: 1.4 }, { a: -1.0, e: 1.0 }] },
    hurt: { lean: -0.32, x: -4, tilt: -0.2, sway: -2, legs: [{ a: -0.35, k: 0.55 }, { a: 0.4, k: 0.7 }], arms: [{ a: -0.85, e: 0.5, hand: 'fist' }, { a: -0.55, e: 0.8 }] },
    ko: { lean: -0.25, tilt: 0.25, legs: [{ a: -0.6, k: 1.2 }, { a: 0.5, k: 1.4 }], arms: [{ a: -0.5, e: 0.3 }, { a: 0.4, e: 0.5 }] },
    // pose de pouvoir (fiche) : accroupi, une main au sol, poing tendu
    power: { lean: 0.42, x: 3, tilt: 0.05, squash: -0.05, legs: [{ a: -1.15, k: 0.3 }, { a: 1.05, k: 2.0 }], arms: [{ a: 0.15, e: -0.1, hand: 'fist' }, { a: 1.5, e: 0.0 }] },
    cast: { lean: -0.05, legs: [{ a: -0.35, k: 0.2 }, { a: 0.35, k: 0.25 }], arms: [{ a: 0.6, e: 0.8 }, { a: 2.5, e: 0.3 }] },
    victory: { legs: [{ a: -0.15, k: 0.04 }, { a: 0.15, k: 0.04 }], arms: [{ a: 0, e: 0, hand: 'pocket' }, { a: 3.0, e: 0.1 }] },
    jump: { lean: 0.15, y: -10, legs: [{ a: 0.6, k: 1.7 }, { a: 1.1, k: 2.0 }], arms: [{ a: -0.7, e: 1.0 }, { a: 1.0, e: 1.4 }] },
    land: { lean: 0.25, squash: -0.08, legs: [{ a: -0.8, k: 1.5 }, { a: 0.7, k: 1.6 }], arms: [{ a: -0.4, e: 0.8 }, { a: 0.9, e: 1.0 }] },
    dash: { lean: 0.5, sway: -3, legs: [{ a: -1.1, k: 0.45 }, { a: 0.75, k: 1.4 }], arms: [{ a: -1.0, e: 0.5 }, { a: 0.7, e: 1.8 }] },
  });

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
      dur: 0.9,
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
          lean: 0.08,
          sway: Math.round(-s * 1.2),
          x: c * 0.6,
          legs: [
            { a: -0.48 * s, k: 0.1 + 0.85 * Math.max(0, -c), toe: s > 0.6 ? 0.5 : 0 },
            { a: 0.48 * s, k: 0.1 + 0.85 * Math.max(0, c), toe: s < -0.6 ? 0.5 : 0 },
          ],
          arms: [
            { a: 0.42 * s, e: 0.35 + 0.25 * Math.max(0, s) },
            { a: -0.42 * s, e: 0.35 + 0.25 * Math.max(0, -s) },
          ],
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
          lean: 0.42,
          x: 3,
          sway: Math.round(-2 - s),
          legs: [
            { a: -0.95 * s + 0.15, k: 0.35 + 1.65 * Math.max(0, -c), toe: 0.3 * Math.max(0, s) },
            { a: 0.95 * s + 0.15, k: 0.35 + 1.65 * Math.max(0, c), toe: 0.3 * Math.max(0, -s) },
          ],
          arms: [
            { a: 1.0 * s + 0.2, e: 1.7 },
            { a: -1.0 * s + 0.2, e: 1.7 },
          ],
        };
      },
    },
  });

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
  });
  // instant (secondes) du coup dans chaque séquence
  M.HIT = { jab: 0.12, cross: 0.12, uppercut: 0.15, kick: 0.13, airKick: 0.22, power: 0.22, cast: 0.15 };

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
