'use strict';
// Créateur de tenues pour les persos au format de Djegui.
// Hauts : doudoune (fiche d'origine), sweat à capuche, t-shirt, débardeur, uniforme à col
// montant, manteau long, veste ouverte. Bas : cargo (fiche), jean, jogging, short, jupe.
// Chaussures : baskets (fiche), montantes, bottes, mocassins, sandales. Imprimés sur le torse.
// Chaque pièce est peinte en couleurs (grilles de codes hex) dans le même repère que les
// pièces relevées sur la fiche (mêmes articulations), puis convertie en palette (variants.js).
(function () {
  const U = GS.U;
  const O = (GS.Outfits = {});

  // ------------------------------------------------------------ peinture
  const grid = (w, h) => {
    const g = [];
    for (let y = 0; y < h; y++) g.push(new Array(w).fill(null));
    return g;
  };
  const put = (g, x, y, c) => {
    if (c && y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
  };
  const at = (ramp, i) => ramp[U.clamp(Math.round(i), 0, ramp.length - 1)];

  // Membre (capsule) de (x0, y0) à (x1, y1), rayon r0 -> r1 (centres de pixels entiers).
  // col(t, s, x, y) : t le long du membre (0..1), s en travers (-1 dos .. 1 avant/droite).
  const capsule = (g, x0, y0, x1, y1, r0, r1, col) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L2 = dx * dx + dy * dy || 1;
    const L = Math.sqrt(L2);
    const nx = dy / L;
    const ny = -dx / L;
    const R = Math.max(r0, r1) + 1;
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++)
      for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
        const t = U.clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1);
        const cx = x0 + dx * t;
        const cy = y0 + dy * t;
        const r = r0 + (r1 - r0) * t;
        if (Math.hypot(x - cx, y - cy) > r) continue;
        const s = U.clamp(((x - cx) * nx + (y - cy) * ny) / Math.max(0.6, r), -1, 1);
        put(g, x, y, col(t, s, x, y));
      }
  };

  // Ombrage d'un membre : dos sombre, avant éclairé (lumière venant de face/droite).
  const limbShade = (ramp, rng, o = {}) => (t, s) => {
    if (s < -0.62) return ramp[o.edge === undefined ? 1 : o.edge];
    let l = 3 + s * 1.3 + (rng() - 0.5) * (o.noise || 0.35);
    if (o.hi && s > 0.5) l += 0.6;
    return at(ramp, l);
  };

  // Rangées de torse : spans[y] = [x0, x1].
  const spans = (list) => {
    const s = [];
    for (const [y0, y1, x0, x1] of list) for (let y = y0; y <= y1; y++) s[y] = [x0, x1];
    return s;
  };
  const fillBody = (g, sp, fill) => {
    sp.forEach((r, y) => {
      if (!r) return;
      for (let x = r[0]; x <= r[1]; x++) put(g, x, y, fill(x, y, (x - r[0]) / Math.max(1, r[1] - r[0]), r));
    });
  };
  // Tissu : dos à gauche dans l'ombre, ventre à droite éclairé, un peu de grain.
  const fabric = (ramp, rng, o = {}) => (x, y, u, r) => {
    if (x === r[0]) return ramp[1];
    let l = 1.9 + u * (o.spread || 2.5) + (rng() - 0.5) * (o.noise || 0.45);
    if (x === r[1]) l += o.rim || 0.3;
    if (o.dark && y >= o.dark) l -= 0.5;
    return at(ramp, l);
  };

  // Plis diagonaux (t-shirt, sweat).
  const folds = (g, ramp, lines) => {
    for (const [x0, y0, x1, y1] of lines) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n);
        const y = Math.round(y0 + ((y1 - y0) * i) / n);
        if (g[y] && g[y][x]) g[y][x] = ramp[2];
      }
    }
  };

  // Imprimés de poitrine (5 x 5).
  const PRINTS = (O.PRINTS = {
    skull: ['.###.', '#.#.#', '#####', '.#.#.', '.....'],
    star: ['..#..', '.###.', '#####', '.#.#.', '#...#'],
    heart: ['##.##', '#####', '.###.', '..#..', '.....'],
    bolt: ['..##.', '.##..', '####.', '.##..', '##...'],
    curse: ['#.###', '#.#.#', '#.###', '#..#.', '##.##'],
    eye: ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
    x: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  });
  const stampPrint = (g, name, x0, y0, col) => {
    const p = PRINTS[name];
    if (!p) return;
    p.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && g[y0 + y] && g[y0 + y][x0 + x] && put(g, x0 + x, y0 + y, col)));
  };

  // ------------------------------------------------------------ hauts
  // Repère du torse (29 x 27, hanche en (14, 26), cou en (14, 0)) identique à la fiche.
  const TW = 29;
  // sleeve : 'long' | 'short' | 'none' ; sh : épaules (repère du torse) ; ext : rangées sous la hanche
  const TOPS = (O.TOPS = {
    puffer: { label: 'Doudoune', sleeve: 'long', original: true },
    hoodie: { label: 'Sweat à capuche', sleeve: 'long', sh: [22, 6] },
    tshirt: { label: 'T-shirt', sleeve: 'short', sh: [21, 7] },
    tank: { label: 'Débardeur', sleeve: 'none', sh: [21, 7] },
    uniform: { label: 'Uniforme', sleeve: 'long', sh: [21, 7] },
    coat: { label: 'Manteau long', sleeve: 'long', sh: [22, 6], ext: 8 },
    jacket: { label: 'Veste ouverte', sleeve: 'long', sh: [21, 7] },
  });

  // Cou de peau (encolures ouvertes).
  const neck = (g, skin, wide) => {
    for (let x = 12; x <= 16; x++) put(g, x, 0, x === 12 ? skin[2] : skin[3]);
    for (let x = wide ? 12 : 13; x <= (wide ? 16 : 15); x++) put(g, x, 1, x < 14 ? skin[2] : skin[3]);
  };

  // Bas du torse (ceinture + haut du pantalon) : rangées 23 à 26.
  const waist = (g, pants, belt, rng) => {
    fillBody(g, spans([[23, 23, 8, 20]]), (x) => (belt ? (x === 17 ? '#d8b048' : belt[x % 5 === 0 ? 1 : 2]) : pants[1]));
    fillBody(g, spans([[24, 26, 6, 21]]), fabric(pants, rng, { spread: 1.8 }));
  };

  // Jupe / pans du manteau sous la hanche (rangées 21 à 26 + ext).
  const skirtRows = (g, ramp, rng, y0, n, x0, x1, flare, pleats) => {
    for (let i = 0; i <= n; i++) {
      const y = y0 + i;
      const f = Math.round((i / n) * flare);
      const r = [x0 - f, x1 + Math.round(f * 0.6)];
      for (let x = r[0]; x <= r[1]; x++) {
        const u = (x - r[0]) / Math.max(1, r[1] - r[0]);
        let l = x === r[0] ? 1 : 1.9 + u * 2.4 + (rng() - 0.5) * 0.4;
        if (pleats && (x - r[0]) % 3 === 2) l -= 1;
        if (i === n) l -= 0.8;
        put(g, x, y, at(ramp, l));
      }
    }
  };

  const paintTop = (type, R, o) => {
    const { top, skin, pants, accent, inner, rng } = R;
    const ext = TOPS[type].ext || (o.bottom === 'skirt' ? 8 : 0);
    const g = grid(TW, 27 + ext);
    const fab = (opt) => fabric(top, rng, opt);
    if (type === 'tshirt') {
      neck(g, skin);
      fillBody(g, spans([[1, 1, 10, 18], [2, 2, 8, 20], [3, 5, 7, 21], [6, 13, 8, 20], [14, 22, 9, 20]]), fab({ dark: 21 }));
      for (let x = 13; x <= 15; x++) put(g, x, 1, skin[3]);
      put(g, 12, 1, top[1]);
      put(g, 16, 1, top[1]);
      for (let x = 12; x <= 16; x++) put(g, x, 2, top[2]);
      folds(g, top, [[10, 7, 12, 13], [18, 15, 20, 19], [11, 17, 13, 21]]);
    } else if (type === 'tank') {
      // épaules nues, bretelles
      fillBody(g, spans([[1, 4, 8, 20]]), (x, y, u) => at(skin, 2 + u * 2 + (rng() - 0.5) * 0.3));
      fillBody(g, spans([[1, 5, 10, 11], [1, 5, 16, 17], [5, 13, 8, 20], [14, 22, 9, 20]]), fab({ dark: 21 }));
      for (let x = 12; x <= 15; x++) put(g, x, 5, skin[x < 14 ? 2 : 3]);
      put(g, 13, 6, skin[2]);
      put(g, 14, 6, skin[3]);
      neck(g, skin, true);
    } else if (type === 'hoodie') {
      fillBody(g, spans([[1, 1, 7, 18], [2, 5, 6, 22], [6, 20, 7, 21], [21, 22, 8, 20]]), fab({ noise: 0.3 }));
      // capuche roulée derrière la nuque + bord avant
      fillBody(g, spans([[0, 2, 6, 11]]), (x, y, u) => at(top, 1.5 + u * 1.6 + (y === 2 ? -0.5 : 0)));
      for (let x = 12; x <= 15; x++) put(g, x, 0, skin[x < 14 ? 2 : 3]);
      put(g, 16, 0, top[4]);
      put(g, 17, 0, top[3]);
      // cordons
      const cord = accent || '#e8e6ee';
      for (let y = 1; y <= 7; y++) {
        put(g, 14, y, y > 5 ? null : cord);
        put(g, 17, y, cord);
      }
      // poche kangourou
      for (let y = 14; y <= 19; y++) for (let x = 11; x <= 19; x++) {
        const edge = y === 14 || x === 11 || (x === 19 && y > 15);
        if (edge) put(g, x, y, top[1]);
        else if (y === 15 && x < 13) put(g, x, y, top[2]);
      }
      // bande côtelée
      for (let x = 8; x <= 20; x++) for (let y = 21; y <= 22; y++) put(g, x, y, x % 2 ? top[2] : top[1]);
      folds(g, top, [[9, 8, 11, 13]]);
    } else if (type === 'uniform') {
      // col montant (style lycée d'exorcistes) + boutons dorés
      fillBody(g, spans([[0, 0, 11, 17], [1, 1, 10, 18], [2, 2, 9, 19]]), (x, y, u) => at(top, 1 + u * 1.6));
      fillBody(g, spans([[3, 5, 7, 21], [6, 20, 8, 20], [21, 22, 8, 21]]), fab({ spread: 2.2, rim: 0.6 }));
      const gold = accent || '#e8c048';
      put(g, 17, 1, gold);
      for (let y = 3; y <= 22; y++) put(g, 16, y, top[1]);
      for (const y of [5, 9, 13, 17]) {
        put(g, 17, y, gold);
        put(g, 18, y, U.shade(gold, -0.35));
      }
    } else if (type === 'coat') {
      const shirt = inner || ['#3a3640', '#5a5664', '#8a8696', '#c8c4d0', '#e8e4ee', '#ffffff'];
      fillBody(g, spans([[1, 2, 8, 20], [3, 22, 7, 21]]), fab({ spread: 2.2, rim: 0.5 }));
      // col relevé
      for (const [x, y] of [[9, 0], [10, 0], [11, 0], [17, 0], [18, 0], [19, 0], [9, 1], [19, 1], [8, 2]]) put(g, x, y, top[y ? 3 : 4]);
      // revers en V sur la chemise
      const V = [[1, 13, 15], [2, 13, 15], [3, 14, 15], [4, 14, 15], [5, 14, 15], [6, 15, 15]];
      for (const [y, a, b] of V) {
        for (let x = a; x <= b; x++) put(g, x, y, shirt[3 + (x > 14 ? 1 : 0)]);
        put(g, a - 1, y, top[1]);
        put(g, b + 1, y, top[4]);
      }
      // ceinture
      for (let x = 7; x <= 21; x++) put(g, x, 19, top[1]);
      put(g, 17, 19, '#c8a040');
      // pans du manteau sous la hanche
      skirtRows(g, top, rng, 23, 3 + ext, 7, 21, 2, false);
      for (let y = 20; y < g.length; y++) if (g[y][16]) put(g, 16, y, top[1]);
      for (const y of [8, 12, 16]) put(g, 17, y, top[1]);
    } else if (type === 'jacket') {
      const shirt = inner || ['#3a3640', '#5a5664', '#8a8696', '#c8c4d0', '#e8e4ee', '#ffffff'];
      neck(g, skin);
      fillBody(g, spans([[2, 5, 7, 21], [6, 20, 8, 20], [21, 22, 8, 20]]), fab({ rim: 0.5 }));
      // t-shirt visible dans l'ouverture
      for (let y = 1; y <= 22; y++) for (let x = 13; x <= 16; x++) put(g, x, y, at(shirt, 3 + (x - 13) * 0.5 + (y > 20 ? -1 : 0)));
      for (let x = 13; x <= 15; x++) put(g, x, 1, skin[3]);
      for (let y = 2; y <= 22; y++) {
        put(g, 12, y, top[1]);
        put(g, 17, y, top[4]);
      }
      // col rabattu
      for (const [x, y] of [[10, 1], [11, 1], [12, 1], [17, 1], [18, 1], [9, 2], [10, 2], [11, 2], [18, 2], [19, 2]]) put(g, x, y, top[4]);
      for (let x = 8; x <= 20; x++) put(g, x, 22, x % 2 ? top[2] : top[1]);
    }
    if (o.print && type !== 'coat' && type !== 'uniform') {
      const pc = o.printColor || '#f0ecf4';
      if (o.print === 'stripes') {
        for (const y of [8, 11, 14, 17, 20]) for (let x = 7; x <= 21; x++) if (g[y][x] === top[3] || g[y][x] === top[4] || g[y][x] === top[2]) put(g, x, y, U.shade(pc, x < 12 ? -0.35 : 0));
      } else stampPrint(g, o.print, type === 'jacket' ? 13 : 14, 8, pc);
    }
    if (!TOPS[type].ext && o.bottom !== 'skirt') waist(g, pants, o.belt ? R.belt : null, rng);
    else if (o.bottom === 'skirt' && type !== 'coat') {
      // jupe portée à la taille, plissée
      for (let x = 8; x <= 20; x++) put(g, x, 22, R.bottom[1]);
      skirtRows(g, R.bottom, rng, 23, 3 + ext, 7, 21, 3, true);
    }
    return g;
  };

  // Bras "mains dans les poches" (même repère que le torse).
  const pocketArm = (type, R, front, sh, ext) => {
    const { top, skin, rng } = R;
    const g = grid(TW, 27 + ext);
    const sleeve = TOPS[type].sleeve;
    const [sx, sy] = front ? [sh[0], 4] : [sh[1], 5];
    const ex = sx + (front ? 1.5 : -1.5);
    const ey = 12;
    const wx = sx + (front ? -0.5 : 0.5);
    const wy = 19.5;
    const fab = limbShade(top, rng);
    const sk = limbShade(skin, rng, { edge: 2 });
    // avant-bras puis bras (le bras passe devant)
    capsule(g, ex, ey, wx, wy, sleeve === 'long' ? 2.4 : 1.9, sleeve === 'long' ? 2.2 : 1.7, (t, s) => (sleeve === 'long' ? (t > 0.88 ? top[1] : fab(t, s)) : sk(t, s)));
    capsule(g, sx, sy, ex, ey, sleeve === 'long' ? 2.7 : sleeve === 'short' ? 2.7 : 2.1, sleeve === 'long' ? 2.5 : 2.0, (t, s) => {
      if (sleeve === 'long') return fab(t, s);
      if (sleeve === 'short' && t < 0.45) return t > 0.36 ? top[2] : fab(t, s);
      return sk(t, s);
    });
    // la main disparaît dans la poche
    put(g, Math.round(wx), 20, skin[1]);
    return g;
  };

  // Bras libres (coups) : haut (pivot (3,1) -> (3,8)) et avant-bras (pivot (3,0) -> (3,6)).
  const armParts = (type, R) => {
    const { top, skin, rng } = R;
    const sleeve = TOPS[type].sleeve;
    const fab = limbShade(top, rng);
    const sk = limbShade(skin, rng, { edge: 2 });
    const up = grid(7, 9);
    capsule(up, 3, 1, 3, 8, sleeve === 'none' ? 2.1 : 2.7, sleeve === 'long' ? 2.5 : 2.0, (t, s) => {
      if (sleeve === 'long') return fab(t, s);
      if (sleeve === 'short' && t < 0.45) return t > 0.36 ? top[2] : fab(t, s);
      return sk(t, s);
    });
    const lo = grid(7, 7);
    capsule(lo, 3, 0, 3, 6, sleeve === 'long' ? 2.4 : 1.9, sleeve === 'long' ? 2.2 : 1.7, (t, s) => (sleeve === 'long' ? (t > 0.82 ? top[1] : fab(t, s)) : sk(t, s)));
    return { up, lo };
  };

  // ------------------------------------------------------------ bas
  const BOTTOMS = (O.BOTTOMS = {
    cargo: { label: 'Cargo', original: true },
    jeans: { label: 'Jean' },
    joggers: { label: 'Jogging' },
    shorts: { label: 'Short' },
    skirt: { label: 'Jupe' },
  });

  // Cuisse et tibia : longueurs identiques à la fiche (6 et 7).
  const legParts = (type, R, back, cover) => {
    const { bottom, skin, rng, shoe } = R;
    const fab = limbShade(bottom, rng, { hi: type === 'jeans' });
    const sk = limbShade(skin, rng, { edge: 2 });
    const k = back ? 0.92 : 1;
    const bare = type === 'shorts' || type === 'skirt';
    const tr = type === 'skirt' ? [2.3, 2.0] : type === 'shorts' ? [3.8, 3.7] : type === 'joggers' ? [3.7, 3.2] : [3.5, 3.0];
    const thigh = grid(11, 9);
    capsule(thigh, 5, 0, 5, 6, tr[0] * k, tr[1] * k, (t, s) => {
      if (type === 'skirt') return sk(t, s);
      if (type === 'shorts' && t > 0.86) return bottom[1];
      if (type === 'jeans' && s > 0.25 && s < 0.5) return bottom[2];
      return fab(t, s);
    });
    const shin = grid(9, 10);
    const sr = bare ? [2.0, 1.6] : type === 'joggers' ? [3.1, 2.4] : [3.0, 2.7];
    capsule(shin, 4, 0, 4, 7, sr[0] * k, sr[1] * k, (t, s) => {
      const row = t * 7;
      if (cover && row > 7 - cover) return limbShade(shoe, rng)(t, s);
      if (bare) return t < 0.12 && s > -0.3 ? skin[4] : sk(t, s);
      if (type === 'joggers' && t > 0.8) return s < -0.4 ? bottom[0] : bottom[1];
      return fab(t, s);
    });
    return {
      thigh: { pivot: [5, 0], end: [5, 6], g: thigh },
      shin: { pivot: [4, 0], end: [4, 7], g: shin },
    };
  };

  // ------------------------------------------------------------ chaussures (11 x 7)
  // u dessus, h reflet, d ombre, l lacets, s semelle, b dessous, k peau, o chaussette
  const SHOES = (O.SHOES = {
    sneakers: { label: 'Baskets', original: true },
    hightops: {
      label: 'Montantes',
      cover: 2,
      t: ['.uuuuu.....', '.uhuuuu....', '.uuluhuu...', 'uuuluuuhuu.', 'uhuuuuuuuuu', 'sssssssssss', '.bbbbbbbbb.'],
    },
    boots: {
      label: 'Bottes',
      cover: 4,
      t: ['.uuuuu.....', '.uhuuu.....', '.uhuuuu....', '.uhuuuuuu..', 'uuuuuuuuhu.', 'ssssssssss.', 'bbb...bbbb.'],
    },
    loafers: {
      label: 'Mocassins',
      t: ['..ooo......', '.ooooo.....', '.duuuu.....', 'duhuuuuu...', 'uuuuuuuuhu.', 'dddddddddd.', '.bb....bbb.'],
    },
    sandals: {
      label: 'Sandales',
      t: ['..kkk......', '.kkkkk.....', '.ukkkkk....', 'kukkkkkkkk.', 'kkukkkuukkk', 'sssssssssss', '.bbbbbbbbbb'],
    },
  });
  const shoePart = (type, R, o) => {
    const S = SHOES[type];
    const { shoe, skin } = R;
    const sole = o.sole ? GS.Variants.ramp(o.sole) : type === 'boots' || type === 'loafers' ? GS.Variants.ramp('#2a2228') : GS.Variants.ramp('#e8e4ec');
    const lace = o.laces || (type === 'hightops' ? '#f0f0f4' : shoe[5]);
    const sock = o.socks || '#e8e4ec';
    const cmap = { u: shoe[3], h: shoe[5], d: shoe[1], l: lace, s: sole[3], b: sole[1], k: skin[3], o: sock };
    return { pivot: [3, 0], end: [8, 4], g: S.t.map((row) => [...row].map((ch) => (ch === '.' ? null : cmap[ch]))) };
  };

  // ------------------------------------------------------------ accessoires de tête
  // Gabarits dans le repère du visage (22 x 18, posé en (1, 2) dans la tête).
  O.HEAD_ACC = {
    glasses: { label: 'Lunettes', t: ['', '', '', '', '', '', '', '', '.......gggg..gggg.....', '...ggggg..gggg..g.....', '.......g..g..g..g.....', '.......gggg..gggg.....'] },
    shades: { label: 'Lunettes noires', t: ['', '', '', '', '', '', '', '', '.......GGGG..GGGG.....', '...gggGGGGggGGGG.....', '.......GGGG..GGGG.....', '........GG....GG......'] },
    blindfold: { label: 'Bandeau sur les yeux', t: ['', '', '', '', '', '', '', '', '...BBBBBBBBBBBBBBBBB..', '.BBBBBBBBBBBBBBBBBBB..', 'BB.BBBBBBBBBBBBBBBBB..', 'B..BBBBBBBBBBBBBBBBB..', 'B.....................'] },
    headband: { label: 'Bandeau', t: ['', '', '', '', '', '...BBBBBBBBBBBBBBBB...', '..BBBBBBBBBBBBBBBBB...', 'B.....................', 'BB....................'] },
    scar: { label: 'Cicatrice', t: ['', '', '', '', '', '', '', '', '...............r......', '..............r.......', '...............r......', '..............r.......', '...............r......'] },
    collar: { label: 'Col montant', t: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '.....CCCCCCCCCCCCC....', '....CCCCCCCCCCCCCC....', '....CCCCCCCCCCCCCC....', '.....CCCCCCCCCCCCC....'] },
  };

  // Ajoute une jupe sous un torse existant (doudoune de la fiche).
  O.addSkirt = (g0, ramp) => {
    const g = g0.slice(0, 23).map((r) => r.slice());
    while (g.length < 35) g.push(new Array(TW).fill(null));
    skirtRows(g, ramp, U.seeded(5), 23, 11, 7, 21, 3, true);
    return g;
  };

  // ------------------------------------------------------------ assemblage
  // Renvoie les pièces peintes (grilles de couleurs) + articulations, pour variants.js.
  O.build = (spec, ramps) => {
    const top = spec.top || 'puffer';
    const bottom = spec.bottom || 'cargo';
    const shoes = spec.shoeType || 'sneakers';
    const rng = U.seeded(((spec.jacket || '').length + 3) * 131 + top.length * 17 + bottom.length);
    const R = Object.assign({ rng }, ramps);
    const out = { parts: {}, joints: null, cover: 0 };
    const S = SHOES[shoes] || SHOES.sneakers;
    out.cover = S.cover || 0;
    const T = TOPS[top] || TOPS.puffer;
    const opt = { print: spec.print, printColor: spec.printColor, belt: !!spec.belt, bottom };
    if (!T.original) {
      const ext = T.ext || (bottom === 'skirt' ? 8 : 0);
      const sh = T.sh;
      out.parts.torso = { pivot: [14, 26], end: [14, 0], g: paintTop(top, R, opt) };
      out.parts.pocketF = { pivot: [14, 26], end: [14, 0], g: pocketArm(top, R, true, sh, ext) };
      out.parts.pocketB = { pivot: [14, 26], end: [14, 0], g: pocketArm(top, R, false, sh, ext) };
      const a = armParts(top, R);
      out.parts.armUpF = out.parts.armUpB = { pivot: [3, 1], end: [3, 8], g: a.up };
      out.parts.armLoF = out.parts.armLoB = { pivot: [3, 0], end: [3, 6], g: a.lo };
      // épaules plus proches du corps qu'avec la doudoune (repère de la fiche : +15 lignes)
      out.joints = { hip: [14, 41], neck: [14, 15], shoulderF: [sh[0], 19], shoulderB: [sh[1], 20] };
    } else if (bottom === 'skirt') out.skirtUnder = true;
    if (!(BOTTOMS[bottom] || {}).original) {
      const f = legParts(bottom, R, false, out.cover);
      const b = legParts(bottom, R, true, out.cover);
      out.parts.thighF = f.thigh;
      out.parts.shinF = f.shin;
      out.parts.thighB = b.thigh;
      out.parts.shinB = b.shin;
    }
    if (!S.original) out.parts.shoe = shoePart(shoes, R, spec);
    return out;
  };
})();
