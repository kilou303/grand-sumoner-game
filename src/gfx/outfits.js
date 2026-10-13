'use strict';
// Créateur de tenues pour les persos au format de Djegui, rendu façon sprites de combat JUS.
// Hauts : doudoune (fiche d'origine), sweat à capuche, t-shirt, débardeur, chemise, uniforme à
// col montant, veste ouverte, manteau long, robe à tabard. Bas : cargo (fiche), jean, jogging,
// short, jupe, pantalon bouffant. Chaussures : baskets (fiche), montantes, bottes, mocassins,
// sandales, bottines, chaussons. Imprimés sur le torse.
// Ombrage en aplats francs (liseré + ombre + base + lumière, éclairage de face/haut), sans
// bruit. Chaque pièce est peinte en couleurs (grilles de codes hex) dans le même repère que les
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
  const get = (g, x, y) => (y >= 0 && y < g.length && x >= 0 && x < g[0].length ? g[y][x] : null);
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

  // Ombrage d'un membre en aplats : côté dos dans l'ombre, base, arête avant éclairée.
  // Les bras passent derrière le torse : un ton plus sombre que lui (o.dim) pour s'en détacher.
  const limbCel = (ramp, o = {}) => (t, s) => {
    const d = o.dim ? 1 : 0;
    if (s < (o.shadow === undefined ? -0.3 : o.shadow)) return ramp[2 - d];
    if (s > (o.light === undefined ? 0.5 : o.light)) return ramp[4 - d];
    return ramp[3 - d];
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
  // Torse en aplats (vue 3/4 vers la droite, lumière de face et d'en haut) : liseré sombre au
  // dos, bande d'ombre côté dos (s'élargit vers le bas), base, bande éclairée côté ventre.
  // o.sh(y) / o.li(y) : largeurs des bandes ; o.lit : rangées du haut éclairées (épaules).
  const band = (v, y, def) => (typeof v === 'function' ? v(y) : v === undefined ? def : v);
  const cel = (ramp, o = {}) => (x, y, u, r) => {
    if (x === r[0]) return ramp[1];
    if (x - r[0] <= band(o.sh, y, y < 5 ? 1 : y < 13 ? 2 : 3)) return ramp[2];
    if (r[1] - x < band(o.li, y, y < 10 ? 4 : y < 16 ? 3 : 2)) return ramp[4];
    if (y <= (o.lit === undefined ? -1 : o.lit)) return ramp[4];
    return ramp[3];
  };
  const body = (g, rows, ramp, o) => fillBody(g, spans(rows), cel(ramp, o));

  // Calque dessiné à la main, posé en (x0, y0). Codes : 0-5 tons du haut, a-e peau (sombre ->
  // clair), f-j dessous (chemise, tabard), p-t bas (pantalon), u-y détails (boutons, liserés),
  // K noir de couture. '.' transparent ; '_' ne peint que sur du tissu déjà posé.
  const keyCol = (R, ch) => {
    if (ch >= '0' && ch <= '5') return R.top[+ch];
    let i = 'abcde'.indexOf(ch);
    if (i >= 0) return R.skin[i + 1];
    i = 'fghij'.indexOf(ch);
    if (i >= 0) return R.inr[i + 1];
    i = 'pqrst'.indexOf(ch);
    if (i >= 0) return R.bottom[i + 1];
    i = 'uvwxy'.indexOf(ch);
    if (i >= 0) return R.acc[i + 1];
    if (ch === 'K') return R.seam;
    return null;
  };
  const layer = (g, R, x0, y0, rows, onlyOn) => {
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      if (onlyOn && !get(g, x0 + x, y0 + y)) return;
      put(g, x0 + x, y0 + y, keyCol(R, ch));
    }));
  };
  // Pli : trait d'ombre avec un reflet sur son bord éclairé (lisible à l'échelle 1).
  const crease = (g, ramp, pts, hi = [1, 0]) => {
    for (const [x, y] of pts) {
      const c = get(g, x, y);
      if (!c || ramp.indexOf(c) < 2) continue;
      g[y][x] = ramp[2];
      const h = get(g, x + hi[0], y + hi[1]);
      if (h === ramp[3]) g[y + hi[1]][x + hi[0]] = ramp[4];
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
    diamond: ['..#..', '.###.', '#####', '.###.', '..#..'],
    flame: ['..#..', '.##..', '.###.', '#####', '.###.'],
  });
  // L'imprimé suit l'ombrage du tissu : sa partie côté dos est assombrie.
  const stampPrint = (g, name, x0, y0, col, ramp) => {
    const p = PRINTS[name];
    if (!p) return;
    const dark = U.shade(col, -0.3);
    p.forEach((row, y) => [...row].forEach((ch, x) => {
      const c = get(g, x0 + x, y0 + y);
      if (ch !== '#' || !c) return;
      put(g, x0 + x, y0 + y, ramp && ramp.indexOf(c) >= 0 && ramp.indexOf(c) <= 2 ? dark : col);
    }));
  };

  // ------------------------------------------------------------ hauts
  // Repère du torse (29 x 27, hanche en (14, 26), cou en (14, 0)) identique à la fiche.
  // Taille (articulation poitrine / bassin) en rangée 15, ceinture en 23.
  const TW = 29;
  // sleeve : 'long' | 'short' | 'none' | 'wide' ; sh : épaules (repère du torse) ; ext : rangées
  // sous la hanche (pans, robe)
  const TOPS = (O.TOPS = {
    puffer: { label: 'Doudoune', sleeve: 'long', original: true },
    hoodie: { label: 'Sweat à capuche', sleeve: 'long', sh: [22, 6] },
    tshirt: { label: 'T-shirt', sleeve: 'short', sh: [21, 7] },
    tank: { label: 'Débardeur', sleeve: 'none', sh: [21, 7] },
    shirt: { label: 'Chemise', sleeve: 'long', sh: [21, 7] },
    uniform: { label: 'Uniforme', sleeve: 'long', sh: [21, 7] },
    jacket: { label: 'Veste ouverte', sleeve: 'long', sh: [21, 7] },
    coat: { label: 'Manteau long', sleeve: 'long', sh: [22, 6], ext: 8 },
    robe: { label: 'Robe à tabard', sleeve: 'wide', sh: [22, 6], ext: 12 },
  });

  // Cou de peau (encolures ouvertes) : à l'ombre du menton.
  const neck = (g, skin, wide) => {
    for (let x = 12; x <= 16; x++) put(g, x, 0, x === 12 ? skin[1] : skin[2]);
    for (let x = wide ? 12 : 13; x <= (wide ? 16 : 15); x++) put(g, x, 1, x < 14 ? skin[2] : skin[3]);
  };

  // Bas du torse (ceinture + haut du pantalon) : rangées 23 à 26.
  const waist = (g, R, belt, wide) => {
    const P = R.bottom;
    const w = wide ? 1 : 0;
    fillBody(g, spans([[24, 26, 6 - w, 21 + w]]), cel(P, { sh: 2, li: 2 }));
    // braguette et pli de l'aine (bassin de 3/4)
    for (let y = 24; y <= 26; y++) put(g, 17, y, P[2]);
    put(g, 12, 26, P[2]);
    if (belt) {
      for (let x = 8 - w; x <= 20 + w; x++) put(g, x, 23, x === 8 - w ? belt[1] : x > 18 ? belt[4] : belt[3]);
      for (const x of [10, 14]) put(g, x, 23, belt[2]);
      // boucle dorée
      put(g, 16, 23, '#8a6018');
      put(g, 17, 23, '#f0c850');
      put(g, 18, 23, '#c89830');
    } else {
      for (let x = 8 - w; x <= 20 + w; x++) put(g, x, 23, x === 8 - w ? P[0] : x > 18 ? P[3] : P[2]);
    }
  };

  // Jupe / pans sous la hanche (rangées y0 .. y0 + n), qui s'évasent vers le bas.
  const skirtRows = (g, ramp, y0, n, x0, x1, flare, pleats) => {
    for (let i = 0; i <= n; i++) {
      const y = y0 + i;
      const f = Math.round((i / n) * flare);
      const r = [x0 - f, x1 + Math.round(f * 0.6)];
      for (let x = r[0]; x <= r[1]; x++) {
        let l = x === r[0] ? 1 : x - r[0] <= 2 + (i > n / 2 ? 1 : 0) ? 2 : r[1] - x < 2 ? 4 : 3;
        // plis : creux sombre + arête éclairée
        if (pleats && x > r[0] + 1 && x < r[1]) {
          const k = (x - r[0]) % 4;
          if (k === 0) l = Math.min(l, 2);
          else if (k === 1 && l === 3) l = 4;
        }
        if (i === n) l = Math.max(1, l - 1);
        put(g, x, y, ramp[l]);
      }
    }
  };

  // Chaque haut peint sa silhouette, ses plis et ses détails.
  const PAINT = {
    tshirt: (g, R) => {
      const { top, skin } = R;
      neck(g, skin);
      body(g, [[1, 1, 10, 18], [2, 2, 8, 20], [3, 5, 7, 21], [6, 10, 8, 21], [11, 14, 8, 20], [15, 22, 9, 20]], top, { lit: 2 });
      // col rond (le dos du col est plus haut que le devant)
      layer(g, R, 10, 1, ['442bbb244', '.3444443.']);
      // plis : sous l'aisselle, sur le ventre, et bas qui blouse
      crease(g, top, [[19, 7], [18, 8], [18, 9]], [1, 0]);
      crease(g, top, [[12, 13], [13, 14], [13, 15]], [1, 0]);
      crease(g, top, [[11, 20], [12, 21], [16, 21], [17, 20]], [0, -1]);
      layer(g, R, 9, 22, ['122222223333']);
    },
    tank: (g, R) => {
      const { top, skin } = R;
      // épaules nues (peau en aplats) puis débardeur échancré
      fillBody(g, spans([[1, 1, 10, 18], [2, 2, 8, 20], [3, 7, 7, 21]]), (x, y, u, r) => (x === r[0] ? skin[1] : x - r[0] <= 1 ? skin[2] : r[1] - x < 3 ? skin[4] : skin[3]));
      neck(g, skin, true);
      // clavicules
      layer(g, R, 11, 3, ['b.....b', '.bb.bb.']);
      body(g, [[5, 5, 9, 19], [6, 7, 8, 20], [8, 10, 8, 21], [11, 14, 8, 20], [15, 22, 9, 20]], top, {});
      // bretelles + échancrures (bras et col)
      layer(g, R, 9, 1, ['.2..........44', '.23........344', '.23........34', '.23.......344', '.23.......34']);
      layer(g, R, 11, 5, ['cddd.ccc', '.ccdddd', '..cdd']);
      for (const [x, y] of [[8, 6], [8, 7], [20, 6], [20, 7], [21, 7]]) put(g, x, y, x < 12 ? skin[2] : skin[4]);
      // ourlet de l'encolure
      layer(g, R, 10, 5, ['3', '.3', '..344443.', '......4']);
      crease(g, top, [[12, 13], [13, 14], [13, 15]]);
      crease(g, top, [[11, 20], [12, 21], [17, 20], [16, 21]], [0, -1]);
      layer(g, R, 9, 22, ['122222223333']);
    },
    hoodie: (g, R) => {
      const { top, skin } = R;
      body(g, [[1, 1, 8, 19], [2, 5, 6, 22], [6, 12, 7, 22], [13, 20, 7, 21], [21, 22, 8, 20]], top, { lit: 2, li: (y) => (y < 12 ? 4 : 3), sh: (y) => (y < 6 ? 1 : y < 14 ? 2 : 3) });
      // capuche roulée derrière la nuque
      layer(g, R, 5, 0, ['.1234443', '12333443', '1223333', '.1222']);
      // encolure : cou dans l'ombre de la capuche
      layer(g, R, 12, 0, ['abbb45', '.2bb34', '..24']);
      // cordons
      const cord = R.acc;
      for (let y = 1; y <= 7; y++) {
        if (y <= 5) put(g, 14, y, cord[y === 5 ? 3 : 4]);
        put(g, 17, y, cord[y === 7 ? 3 : 4]);
      }
      put(g, 14, 6, cord[2]);
      // poche kangourou : couture du haut, ouverture côté ventre dans l'ombre
      layer(g, R, 10, 14, ['K22222222', '_1333333..', '_1333334.', '_1333334.', '_2333334.', '_2222222.'], true);
      for (let y = 15; y <= 19; y++) put(g, 20, y, top[1]);
      // plis de la manche montée et du ventre
      crease(g, top, [[19, 6], [18, 7], [18, 8]]);
      crease(g, top, [[9, 9], [10, 10], [10, 11]]);
      // bande côtelée du bas
      layer(g, R, 8, 21, ['2333333333334', '1222222222223']);
    },
    shirt: (g, R) => {
      const { top, skin } = R;
      neck(g, skin);
      body(g, [[1, 1, 10, 18], [2, 2, 8, 20], [3, 5, 7, 21], [6, 10, 8, 21], [11, 14, 8, 20], [15, 22, 9, 20]], top, { lit: 2 });
      // col pointu ouvert sur le cou
      layer(g, R, 10, 0, ['.24...34', '2344bc443', '.13445442', '..2.24.2', '.....3']);
      // patte de boutonnage + boutons
      for (let y = 4; y <= 22; y++) put(g, 16, y, top[2]);
      for (const y of [6, 10, 14, 18]) put(g, 15, y, top[5]);
      // poche de poitrine
      layer(g, R, 17, 7, ['2222', '_334', '_334', '2222'], true);
      // plis sous les bras et à la taille (chemise rentrée)
      crease(g, top, [[19, 11], [18, 12]]);
      crease(g, top, [[10, 12], [11, 13], [11, 14]]);
      crease(g, top, [[11, 20], [12, 21], [13, 21], [18, 20], [19, 21]], [0, -1]);
      layer(g, R, 9, 22, ['122222223333']);
    },
    uniform: (g, R) => {
      const { top } = R;
      body(g, [[3, 5, 7, 21], [6, 10, 8, 21], [11, 20, 8, 20], [21, 22, 8, 21]], top, { lit: 3 });
      // col montant (style lycée d'exorcistes) bordé d'un liseré
      layer(g, R, 9, 0, ['..1222223', '.12222233.', '1122223334', '.4444444444']);
      put(g, 17, 1, R.acc[4]);
      // patte de boutonnage + boutons dorés
      for (let y = 3; y <= 22; y++) put(g, 16, y, top[1]);
      for (const y of [5, 9, 13, 17]) {
        put(g, 17, y, R.acc[5]);
        put(g, 18, y, R.acc[3]);
        put(g, 17, y + 1, R.acc[2]);
      }
      // couture de l'épaule et plis du flanc
      crease(g, top, [[9, 9], [10, 10], [10, 11]]);
      crease(g, top, [[19, 12], [18, 13]]);
      layer(g, R, 8, 21, ['1222222212334', '1111111112222']);
    },
    jacket: (g, R) => {
      const { top, skin } = R;
      neck(g, skin);
      body(g, [[2, 5, 7, 21], [6, 10, 8, 21], [11, 20, 8, 20], [21, 22, 8, 20]], top, { lit: 3 });
      // t-shirt visible dans l'ouverture (ombré : le col de la veste lui fait de l'ombre)
      fillBody(g, spans([[1, 22, 13, 16]]), (x, y) => (x === 13 || y < 4 ? R.inr[2] : x === 16 ? R.inr[4] : R.inr[3]));
      for (let x = 13; x <= 15; x++) put(g, x, 1, skin[3]);
      // bords de l'ouverture : revers côté dos dans l'ombre, côté ventre éclairé
      for (let y = 2; y <= 22; y++) {
        put(g, 12, y, top[1]);
        put(g, 17, y, top[y < 9 ? 5 : 4]);
        put(g, 18, y, top[2]);
      }
      // col rabattu
      layer(g, R, 9, 1, ['.344....345', '34441...1443', '.122.....12']);
      // plis du coude du flanc et bas élastique
      crease(g, top, [[9, 9], [10, 10], [10, 11]]);
      crease(g, top, [[20, 13], [19, 14]]);
      layer(g, R, 8, 21, ['_____......2', '1222K....122'], true);
      for (let x = 8; x <= 20; x++) if (x < 12 || x > 17) put(g, x, 22, x % 2 ? top[2] : top[1]);
    },
    coat: (g, R, o) => {
      const { top } = R;
      body(g, [[1, 2, 8, 20], [3, 10, 7, 21], [11, 22, 7, 21]], top, { lit: 2, li: (y) => (y < 10 ? 4 : 3) });
      // col relevé
      layer(g, R, 8, 0, ['.4434....3445', '.3.......244', '2']);
      // revers en V sur la chemise
      layer(g, R, 12, 1, ['1hhi4', '1hhi4', '.1hi4', '.1hi4', '.1hi4', '..1i4', '..14']);
      // ceinture du manteau + boucle
      for (let x = 7; x <= 21; x++) put(g, x, 19, x === 7 ? top[0] : x > 19 ? top[2] : top[1]);
      put(g, 17, 19, '#e8c060');
      put(g, 18, 19, '#9a7020');
      // pans sous la hanche, fente du devant
      skirtRows(g, top, 23, 3 + o.ext, 7, 21, 2, false);
      for (let y = 20; y < g.length; y++) if (g[y][16]) put(g, 16, y, top[1]);
      for (let y = 20; y < g.length; y++) if (g[y][17]) put(g, 17, y, top[4]);
      for (const y of [8, 12, 16]) put(g, 17, y, top[1]);
      crease(g, top, [[9, 9], [10, 10], [10, 11]]);
      crease(g, top, [[11, 25], [11, 26], [12, 27], [12, 28], [12, 29]]);
      crease(g, top, [[19, 26], [20, 27], [20, 28]]);
    },
    robe: (g, R, o) => {
      const { top } = R;
      const n = 3 + o.ext;
      // robe (épaules larges, col montant), jupe longue évasée
      body(g, [[1, 1, 9, 19], [2, 2, 7, 21], [3, 5, 6, 22], [6, 12, 7, 21], [13, 22, 8, 21]], top, { lit: 2, li: (y) => (y < 10 ? 4 : 3) });
      skirtRows(g, top, 23, n, 7, 21, 4, false);
      for (let y = 20; y < g.length; y++) for (const x of [10, 21]) if (g[y][x] && y > 24) put(g, x + ((y >> 2) & 1), y, top[2]);
      // col montant
      layer(g, R, 11, 0, ['.12234', '1223344', '.2222']);
      // camail sombre aux épaules, bordé de blanc (dos dans l'ombre, devant éclairé)
      layer(g, R, 5, 2, [
        '...ff........gg',
        '.jfgg.......ghhj',
        'jfgg........ghhhj',
        'jfg..........ghhj',
        '.jf..........gh j',
        '..j..........ghj',
        '.............gj',
      ].map((r) => r.replace(/ /g, '.')));
      // tabard central (bordure dorée, motifs en losange) jusqu'à l'ourlet
      const tabRows = [];
      for (let y = 3; y < 23 + n; y++) {
        const tip = y >= 23 + n - 2;
        tabRows.push(tip ? (y === 22 + n ? '..vv..' : '.vhhv.') : 'vghhhw');
      }
      layer(g, R, 13, 3, tabRows);
      const pc = o.printColor || '#f4f0f8';
      for (const [y, c] of [[9, R.acc[4]], [26, pc], [31, pc]]) if (y < 21 + n) stampPrint(g, 'diamond', 13 + 1, y - 2, c);
      // ceinture de tissu (écharpe nouée) par-dessus
      const sash = R.belt || GS.Variants.ramp('#2848c0');
      for (let y = 13; y <= 15; y++) for (let x = 7; x <= 21; x++) put(g, x, y, x === 7 ? sash[1] : x <= 9 || y === 15 ? sash[2] : x > 19 || y === 13 ? sash[4] : sash[3]);
      for (const x of [11, 15, 18]) put(g, x, 14, sash[2]);
      crease(g, top, [[19, 6], [18, 7]]);
    },
  };

  const paintTop = (type, R, o) => {
    const T = TOPS[type];
    const ext = T.ext || (o.bottom === 'skirt' ? 8 : 0);
    const g = grid(TW, 27 + ext);
    PAINT[type](g, R, Object.assign({ ext }, o));
    if (o.print && !['coat', 'uniform', 'robe'].includes(type)) {
      const pc = o.printColor || '#f0ecf4';
      if (o.print === 'stripes') {
        // rayures qui suivent l'ombrage du tissu
        const tone = [U.shade(pc, -0.45), U.shade(pc, -0.45), U.shade(pc, -0.25), pc, U.shade(pc, 0.2), U.shade(pc, 0.4)];
        for (const y of [8, 11, 14, 17, 20]) for (let x = 7; x <= 21; x++) {
          const i = R.top.indexOf(g[y][x]);
          if (i >= 1) put(g, x, y, tone[i]);
        }
      } else stampPrint(g, o.print, type === 'jacket' ? 13 : type === 'shirt' ? 10 : 14, 8, pc, R.top);
    }
    if (!T.ext && o.bottom !== 'skirt') waist(g, R, o.belt ? R.belt : null, o.bottom === 'baggy');
    else if (o.bottom === 'skirt' && !T.ext) {
      // jupe portée à la taille, plissée
      for (let x = 8; x <= 20; x++) put(g, x, 22, x === 8 ? R.bottom[0] : R.bottom[x > 18 ? 3 : 1]);
      skirtRows(g, R.bottom, 23, 3 + ext, 7, 21, 3, true);
    }
    return g;
  };

  // Bras "mains dans les poches" (même repère que le torse), dessinés sous le torse.
  const pocketArm = (type, R, front, sh, ext) => {
    const { top, skin } = R;
    const g = grid(TW, 27 + ext);
    const sleeve = TOPS[type].sleeve;
    const wide = sleeve === 'wide';
    const [sx, sy] = front ? [sh[0], 4] : [sh[1], 5];
    const ex = sx + (front ? 1.5 : -1.5);
    const ey = 12;
    const wx = sx + (front ? -0.5 : 0.5);
    const wy = 19.5;
    const fab = limbCel(top, { dim: true });
    const sk = limbCel(skin, { dim: true });
    const rl = wide ? [3.0, 3.8] : sleeve === 'long' ? [2.4, 2.2] : [1.9, 1.7];
    const ru = wide ? [3.0, 3.0] : sleeve === 'none' ? [2.1, 2.0] : [2.7, 2.5];
    // avant-bras puis bras (le bras passe devant) ; poignet de manche plus sombre
    capsule(g, ex, ey, wx, wy, rl[0], rl[1], (t, s) => {
      if (sleeve === 'long' || wide) return t > 0.86 ? top[wide ? 0 : 1] : fab(t, s);
      return sk(t, s);
    });
    capsule(g, sx, sy, ex, ey, ru[0], ru[1], (t, s) => {
      if (sleeve === 'long' || wide) return t > 0.88 && !wide ? top[1] : fab(t, s);
      if (sleeve === 'short' && t < 0.45) return t > 0.34 ? top[1] : fab(t, s);
      return sk(t, s);
    });
    // la main disparaît dans la poche
    if (!wide) put(g, Math.round(wx), 20, skin[1]);
    return g;
  };

  // Bras libres (coups) : haut (pivot (3,1) -> (3,8)) et avant-bras (pivot (3,0) -> (3,6)).
  // Manches larges : avant-bras évasé dans une grille plus large (pivot (5,0) -> (5,6)).
  const armParts = (type, R) => {
    const { top, skin } = R;
    const sleeve = TOPS[type].sleeve;
    const wide = sleeve === 'wide';
    const fab = limbCel(top, { dim: true });
    const sk = limbCel(skin, { dim: true });
    const up = grid(wide ? 9 : 7, 9);
    const ux = wide ? 4 : 3;
    capsule(up, ux, 1, ux, 8, wide ? 3.1 : sleeve === 'none' ? 2.1 : 2.7, wide ? 3.2 : sleeve === 'long' ? 2.5 : 2.0, (t, s) => {
      if (sleeve === 'long' || wide) return t > 0.82 && !wide && s < -0.2 ? top[1] : fab(t, s);
      if (sleeve === 'short' && t < 0.45) return t > 0.34 ? top[1] : fab(t, s);
      // coude : petit creux d'ombre
      if (t > 0.86 && s < 0.2) return skin[1];
      return sk(t, s);
    });
    const lw = wide ? 11 : 7;
    const lx = wide ? 5 : 3;
    const lo = grid(lw, wide ? 8 : 7);
    capsule(lo, lx, 0, lx, wide ? 6 : 6, wide ? 3.2 : sleeve === 'long' ? 2.4 : 1.9, wide ? 4.4 : sleeve === 'long' ? 2.2 : 1.7, (t, s) => {
      if (wide) return t > 0.9 ? (s > 0.2 ? top[2] : top[0]) : fab(t, s);
      if (sleeve === 'long') return t > 0.8 ? (s > 0.5 ? top[3] : top[1]) : fab(t, s);
      return sk(t, s);
    });
    return { up: { pivot: [ux, 1], end: [ux, 8], g: up }, lo: { pivot: [lx, 0], end: [lx, 6], g: lo } };
  };

  // ------------------------------------------------------------ bas
  const BOTTOMS = (O.BOTTOMS = {
    cargo: { label: 'Cargo', original: true },
    jeans: { label: 'Jean' },
    joggers: { label: 'Jogging' },
    shorts: { label: 'Short' },
    skirt: { label: 'Jupe' },
    baggy: { label: 'Bouffant (hakama)' },
  });

  // Cuisse et tibia : longueurs identiques à la fiche (6 et 7).
  const legParts = (type, R, back, cover, o) => {
    const { bottom, skin, shoe } = R;
    const fab = limbCel(bottom);
    const sk = limbCel(skin);
    const shoeC = limbCel(shoe);
    const k = back ? 0.92 : 1;
    const bare = type === 'shorts' || type === 'skirt';
    const tr = type === 'skirt' ? [2.3, 2.0] : type === 'shorts' ? [3.8, 3.7] : type === 'joggers' ? [3.7, 3.2] : type === 'baggy' ? [4.6, 4.3] : [3.5, 3.0];
    const stripe = o.stripe;
    const thigh = grid(13, 9);
    capsule(thigh, 6, 0, 6, 6, tr[0] * k, tr[1] * k, (t, s) => {
      if (type === 'skirt') return sk(t, s);
      if (type === 'shorts' && t > 0.84) return s > 0.5 ? bottom[3] : bottom[1];
      if (type === 'jeans' && s > -0.45 && s < -0.15) return bottom[2];
      if (type === 'joggers' && stripe && s > 0.1 && s < 0.45) return stripe;
      if (type === 'baggy' && (s > -0.1 && s < 0.12 && t > 0.3)) return bottom[2];
      // genou : creux d'ombre en bas de la cuisse
      if (t > 0.9 && s > -0.2 && s < 0.4 && type !== 'baggy') return bottom[2];
      return fab(t, s);
    });
    const shin = grid(11, 10);
    const sr = bare ? [2.0, 1.6] : type === 'joggers' ? [3.1, 2.4] : type === 'baggy' ? [4.3, 3.0] : [3.0, 2.7];
    capsule(shin, 5, 0, 5, 7, sr[0] * k, sr[1] * k, (t, s) => {
      const row = t * 7;
      if (cover && row > 7 - cover) return shoeC(t, s);
      if (bare) return t < 0.12 && s > -0.3 ? skin[4] : sk(t, s);
      if (type === 'joggers' && t > 0.8) return s < -0.3 ? bottom[1] : s > 0.5 ? bottom[3] : bottom[2];
      if (type === 'joggers' && stripe && s > 0.1 && s < 0.45) return stripe;
      if (type === 'baggy') {
        // tissu froncé à la cheville (bande), plis verticaux
        if (t > 0.78) return o.cuffs ? at(o.cuffs, s < -0.3 ? 2 : s > 0.5 ? 4 : 3) : s < -0.3 ? bottom[1] : bottom[2];
        if (t > 0.25 && s > -0.15 && s < 0.12) return bottom[2];
      }
      if (type === 'jeans' && t > 0.86) return s < -0.3 ? bottom[1] : bottom[2];
      return fab(t, s);
    });
    return {
      thigh: { pivot: [6, 0], end: [6, 6], g: thigh },
      shin: { pivot: [5, 0], end: [5, 7], g: shin },
    };
  };

  // ------------------------------------------------------------ chaussures (11 x 7)
  // u dessus, h reflet, d ombre, D creux, l lacets, s semelle, b dessous, k/K peau, o chaussette,
  // g/G métal (boucle, bande)
  const SHOES = (O.SHOES = {
    sneakers: { label: 'Baskets', original: true },
    hightops: {
      label: 'Montantes',
      cover: 2,
      t: ['.duuuh.....', '.duluh.....', '.dulluh....', 'dduulluhh..', 'duuuuuuuuhh', 'sssssssssss', '.bbbbbbbbb.'],
    },
    boots: {
      label: 'Bottes',
      cover: 4,
      t: ['.duuuh.....', '.duuuh.....', '.duuuuh....', '.duuuuuhh..', 'dduuuuuuuh.', 'ssssssssss.', 'bbb...bbbb.'],
    },
    loafers: {
      label: 'Mocassins',
      t: ['..ooo......', '.dooooo....', '.duuuuh....', 'dduDuuuhh..', 'duuuuuuuuh.', 'bsssssssss.', '.bb....bbb.'],
    },
    sandals: {
      label: 'Sandales',
      t: ['..kkk......', '.Kkkkk.....', '.Kukkkk....', 'KKukkkkkkk.', 'KkkuuukKkkk', 'sssssssssss', '.bbbbbbbbbb'],
    },
    ankle: {
      label: 'Bottines',
      cover: 2,
      t: ['.gggGG.....', '.duuuh.....', '.duuuuh....', 'dduuuuuhh..', 'duuuuuuuuhh', 'bssssssssb.', '.bb.....bb.'],
    },
    slippers: {
      label: 'Chaussons',
      t: ['..ooo......', '.ooooo.....', '.duuuuh....', 'dduuuuuhh..', 'duuuuuuuuh.', 'sssssssssss', '.bbbbbbbbb.'],
    },
  });
  const shoePart = (type, R, o) => {
    const S = SHOES[type];
    const { shoe, skin } = R;
    const sole = o.sole ? GS.Variants.ramp(o.sole) : ['boots', 'loafers', 'ankle', 'slippers'].includes(type) ? GS.Variants.ramp('#2a2228') : GS.Variants.ramp('#e8e4ec');
    const lace = o.laces || (type === 'hightops' ? '#f0f0f4' : shoe[5]);
    const sock = o.socks || '#e8e4ec';
    const gold = R.acc;
    const cmap = { u: shoe[3], h: shoe[4], d: shoe[2], D: shoe[1], l: lace, s: sole[3], b: sole[1], k: skin[3], K: skin[2], o: sock, g: gold[4], G: gold[2] };
    return { pivot: [3, 0], end: [8, 4], g: S.t.map((row) => [...row].map((ch) => (ch === '.' ? null : cmap[ch]))) };
  };

  // ------------------------------------------------------------ accessoires de tête
  O.HEAD_ACC = {
    glasses: { label: 'Lunettes' },
    shades: { label: 'Lunettes noires' },
    blindfold: { label: 'Bandeau sur les yeux' },
    headband: { label: 'Bandeau' },
    scar: { label: 'Cicatrice' },
    collar: { label: 'Col montant' },
    eyepatch: { label: 'Cache-œil' },
    mouthMask: { label: 'Masque de bouche' },
    earrings: { label: "Boucles d'oreille" },
    halo: { label: 'Anneau au cou', neck: true },
    scarf: { label: 'Écharpe', neck: true },
  };
  // gabarits dessinés dans heads.js (même grille que le visage)
  for (const k of Object.keys(O.HEAD_ACC)) O.HEAD_ACC[k].t = GS.HEAD_ACC_T[k] || (GS.NECK_ACC_T[k] || {}).t;

  // Ajoute une jupe sous un torse existant (doudoune de la fiche).
  O.addSkirt = (g0, ramp) => {
    const g = g0.slice(0, 23).map((r) => r.slice());
    while (g.length < 35) g.push(new Array(TW).fill(null));
    skirtRows(g, ramp, 23, 11, 7, 21, 3, true);
    return g;
  };

  // ------------------------------------------------------------ assemblage
  const SHIRT = ['#3a3640', '#5a5664', '#8a8696', '#c8c4d0', '#e8e4ee', '#ffffff'];
  // Renvoie les pièces peintes (grilles de couleurs) + articulations, pour variants.js.
  O.build = (spec, ramps) => {
    const top = TOPS[spec.top] ? spec.top : 'puffer';
    const bottom = BOTTOMS[spec.bottom] ? spec.bottom : 'cargo';
    const shoes = SHOES[spec.shoeType] ? spec.shoeType : 'sneakers';
    const V = GS.Variants;
    const R = Object.assign({}, ramps);
    R.inr = ramps.inner || (top === 'robe' ? V.ramp('#18141c') : SHIRT);
    R.acc = V.ramp(ramps.accent || (top === 'hoodie' ? '#e8e6ee' : '#e8c048'));
    R.seam = U.mix(ramps.top[0], '#050307', 0.6);
    const out = { parts: {}, joints: null, cover: 0 };
    const S = SHOES[shoes];
    out.cover = S.cover || 0;
    const T = TOPS[top];
    const opt = { print: spec.print, printColor: spec.printColor, belt: !!spec.belt, bottom };
    if (!T.original) {
      const ext = T.ext || (bottom === 'skirt' ? 8 : 0);
      const sh = T.sh;
      out.parts.torso = { pivot: [14, 26], end: [14, 0], g: paintTop(top, R, opt) };
      out.parts.pocketF = { pivot: [14, 26], end: [14, 0], g: pocketArm(top, R, true, sh, ext) };
      out.parts.pocketB = { pivot: [14, 26], end: [14, 0], g: pocketArm(top, R, false, sh, ext) };
      const a = armParts(top, R);
      out.parts.armUpF = out.parts.armUpB = a.up;
      out.parts.armLoF = out.parts.armLoB = a.lo;
      // épaules plus proches du corps qu'avec la doudoune (repère de la fiche : +15 lignes)
      out.joints = { hip: [14, 41], neck: [14, 15], shoulderF: [sh[0], 19], shoulderB: [sh[1], 20] };
    } else if (bottom === 'skirt') out.skirtUnder = true;
    if (!BOTTOMS[bottom].original) {
      const lo = { stripe: spec.stripe, cuffs: spec.cuffs ? V.ramp(spec.cuffs) : null };
      const f = legParts(bottom, R, false, out.cover, lo);
      const b = legParts(bottom, R, true, out.cover, lo);
      out.parts.thighF = f.thigh;
      out.parts.shinF = f.shin;
      out.parts.thighB = b.thigh;
      out.parts.shinB = b.shin;
    }
    if (!S.original) out.parts.shoe = shoePart(shoes, R, spec);
    return out;
  };
})();
