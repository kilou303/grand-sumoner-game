'use strict';
// Héros au format de Djegui : on réutilise ses pièces (corps, bras, jambes, baskets) en
// recolorant chaque matière (veste, pantalon, chaussures, peau) tout en gardant la texture,
// on change la tête (coiffure + visage, ou capuche recolorée) et on ajoute une arme.
(function () {
  const U = GS.U;
  const V = (GS.Variants = {});

  // Dégradé de 6 teintes (sombre -> clair) autour d'une couleur de base.
  V.ramp = (base) => [U.shade(base, -0.62), U.shade(base, -0.42), U.shade(base, -0.2), base, U.shade(base, 0.28), U.shade(base, 0.55)];
  const sample = (ramp, t) => ramp[U.clamp(Math.round(t * (ramp.length - 1)), 0, ramp.length - 1)];
  const lum = (h) => {
    const [r, g, b] = U.hexToRgb(h);
    return 0.3 * r + 0.59 * g + 0.11 * b;
  };
  const warm = (h) => {
    const [r, g] = U.hexToRgb(h);
    return r > g + 18;
  };
  // Éclaircit en gardant teinte et saturation (reflets plus francs qu'un mélange vers le blanc).
  const lighten = (h, amt) => {
    const [r, g, b] = U.hexToRgb(h).map((v) => v / 255);
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) return U.shade(h, amt);
    const d = mx - mn;
    const sat = Math.min(1, (l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)) * 1.05);
    let hue = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
    const L = l + (1 - l) * amt;
    const k = (n) => (n + hue / 30) % 12;
    const a = sat * Math.min(L, 1 - L);
    const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return U.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  };
  const red = (h) => {
    const [r, g, b] = U.hexToRgb(h);
    return r > 120 && g < 70 && b < 80;
  };

  // ------------------------------------------------------------ armes (grand format)
  // Pointent vers le haut ; grip = point tenu par le poing.
  const WEAPONS = (V.WEAPONS = {
    sword: {
      grip: [3, 25],
      t: ['...L...', '..LLM..', '..LLM..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', 'GggzggG', '.GgggG.', '...k...', '...K...', '...k...', '...K...', '...k...', '..ggg..'],
    },
    greatsword: {
      grip: [4, 34],
      t: ['....L....', '...LLM...', '..LLLMD..', '..LLLMD..', '..LLzMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLLMD..', '..LLzMD..', '..LLLMD..', '..LLLMD..', 'GgggggggG', 'GggzgzggG', '....k....', '....K....', '....k....', '....K....', '....k....', '....K....', '....k....', '...ggg...'],
    },
    rapier: {
      grip: [3, 25],
      t: ['...L...', '...L...', '...L...', '...M...', '...L...', '...M...', '...L...', '...M...', '...L...', '...M...', '...L...', '...M...', '...L...', '...M...', '...L...', '...M...', '...L...', '...M...', '..ggg..', '.gzgzg.', 'g.....g', 'g.....g', '.g.k.g.', '...K...', '...k...', '...K...', '..ggg..'],
    },
    dagger: {
      grip: [2, 12],
      t: ['..L..', '.LLM.', '.LLM.', '.LMD.', '.LMD.', '.LMD.', '.LMD.', '.LMD.', 'GgzgG', '..k..', '..K..', '..k..', '..K..', '.ggg.'],
    },
    spear: {
      grip: [3, 34],
      t: ['...L...', '..LLM..', '..LLM..', '.LLLMD.', '..LMD..', '..LMD..', '..gzg..', '.ggggg.', '..xxx..', '...x...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...O...', '...o...', '...k...', '...k...', '...O...', '...o...', '...O...', '..ggg..'],
    },
    staff: {
      grip: [4, 26],
      t: ['...ggg...', '..gzZzg..', '.gzZZzzg.', '.gzZzzzg.', '.gzzzzzg.', '..gzzzg..', '...gqg...', '....o....', '....O....', '....o....', '....O....', '....o....', '....O....', '....o....', '....O....', '....o....', '....O....', '....o....', '....O....', '....o....', '....O....', '....o....', '....O....', '....o....', '....k....', '....k....', '....k....', '....O....', '....o....', '....O....', '....o....', '....O....', '....g....'],
    },
    axe: {
      grip: [6, 24],
      t: ['......g.......', '...LLMgML.....', '..LLLLgMMD....', '.LLLLLgMMMD...', 'LLLLLLgMMMMD..', 'LLLLLLgMMMMD..', 'LLLLLLgMMMMD..', '.LLLLLgMMMD...', '..DDDDgDDD....', '......o.......', '......O.......', '......o.......', '......O.......', '......o.......', '......O.......', '......o.......', '......O.......', '......o.......', '......O.......', '......o.......', '......k.......', '......k.......', '......k.......', '......O.......', '......k.......', '......g.......'],
    },
    hammer: {
      grip: [6, 24],
      t: ['..GGGGGGGGG..', '.GLLLLLLLLMG.', '.GLLLLzLLLMG.', '.GLLLLLLLLMG.', '.GMMMMMMMMDG.', '..GGGGGGGGG..', '......oo.....', '......OO.....', '......oo.....', '......OO.....', '......oo.....', '......OO.....', '......oo.....', '......OO.....', '......oo.....', '......OO.....', '......oo.....', '......OO.....', '......oo.....', '......kk.....', '......kk.....', '......kk.....', '......kk.....', '......OO.....', '......kk.....', '......gg.....'],
    },
    scythe: {
      grip: [13, 30],
      t: ['......LLLLLL.........', '...LLLLLMMMMMMg......', '.LLLMMMDDDDDMMgg.....', 'LLMMD........goz.....', 'LMD..........go......', 'L............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............O.......', '.............o.......', '.............k.......', '.............k.......', '.............k.......', '.............O.......', '.............o.......', '............gzg......'],
    },
    bat: {
      grip: [2, 26],
      t: ['.LLL.', 'LLLLM', 'LLLLM', 'LLLMM', 'LLLMM', 'LLLMD', 'LLLMD', '.LLMD', '.LLMD', '.LLM.', '.LLM.', '.LMM.', '.LMM.', '.LM..', '.LM..', '.LM..', '.LM..', '.LM..', '..M..', '..M..', '..M..', '..k..', '..K..', '..k..', '..K..', '..k..', '..K..', '.ggg.'],
    },
    pipe: {
      grip: [2, 24],
      t: ['.DDD.', 'DMLMD', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', '.MLM.', 'DMLMD', '.DDD.'],
    },
    katana: {
      grip: [3, 33],
      t: ['...L...', '...LL..', '...LM..', '...LM..', '..LLM..', '..LLM..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '..LMD..', '.ggggg.', '.gzgzg.', '..kWk..', '..WkW..', '..kWk..', '..WkW..', '..kWk..', '..WkW..', '..kWk..', '..WkW..', '...g...'],
    },
    // bâton à orbe : anneau lumineux autour d'une sphère noire, monture dorée, hampe bleue
    orbStaff: {
      grip: [4, 33],
      t: ['...ccc...', '..c...C..', '.c.....C.', 'c..vvv..C', 'c.vVvvv.C', 'c.vvvvv.C', 'c.vvvvv.C', 'c..vvv..C', '.c.....C.', '..c...C..', '...cgC...', '...gGg...', '...gGg...', '....g....', '....y....', '....Y....', '....y....', '....Y....', '....y....', '....Y....', '....y....', '....Y....', '....g....', '....y....', '....Y....', '....y....', '....Y....', '....y....', '....Y....', '....y....', '....k....', '....k....', '....k....', '....k....', '....Y....', '....y....', '....Y....', '....g....', '....y....', '....Y....', '....y....', '....Y....', '....y....', '...ggg...'],
    },
    bow: {
      grip: [3, 15],
      t: ['..oo.....', '.o..W....', 'o...W....', 'o....W...', 'O....W...', 'o.....W..', 'O.....W..', 'o......W.', 'O......W.', 'o......W.', 'O......W.', 'o......W.', 'O......W.', 'k......W.', 'k......W.', 'k......W.', 'k......W.', 'O......W.', 'o......W.', 'O......W.', 'o......W.', 'O......W.', 'o......W.', 'O.....W..', 'o.....W..', 'O....W...', 'o....W...', 'o...W....', '.o..W....', '..oo.....'],
    },
  });
  const WCOL = {
    L: '#f0f4ff',
    M: '#b8c4dc',
    D: '#6a7898',
    g: '#f0c040',
    G: '#a07018',
    k: '#4a2c20',
    K: '#2a1810',
    o: '#8a5a30',
    O: '#5a3818',
    x: '#c03040',
    W: '#f0f0f0',
    q: '#806020',
    c: '#2a90e0',
    C: '#a0f0ff',
    v: '#120e18',
    V: '#6a6080',
    y: '#3050c0',
    Y: '#203080',
  };

  // ------------------------------------------------------------ construction
  const chars = { next: 0x4e00 };
  const newKey = () => String.fromCharCode(chars.next++);

  // spec : head, hair/hood, skin, eyes, jacket (couleur du haut), pants, shoes, weapon...
  // + créateur de tenues (outfits.js) : top, bottom, shoeType (types), print,
  //   printColor, inner, accent, belt, gloves, sole, laces, socks, acc (liste d’accessoires).
  V.build = (spec) => {
    const base = GS.DJEGUI_ART;
    const pal = Object.assign({}, base.pal);
    const keys = {};
    const keyOf = (color) => {
      if (keys[color]) return keys[color];
      const k = newKey();
      pal[k] = color;
      keys[color] = k;
      return k;
    };
    const toKeys = (g) => g.map((row) => row.map((c) => (c ? keyOf(c) : '.')).join(''));
    // plage de luminosité de chaque matière (pour répartir le dégradé)
    const range = (names) => {
      let lo = 255;
      let hi = 0;
      for (const n of names) for (const row of base.parts[n].t) for (const ch of row) if (ch !== '.') {
        const L = lum(base.pal[ch]);
        if (L > 24) {
          lo = Math.min(lo, L);
          hi = Math.max(hi, L);
        }
      }
      return [lo, hi];
    };
    const JACKET = ['torso', 'pocketF', 'pocketB', 'armUpF', 'armLoF'];
    const PANTS = ['thighF', 'shinF', 'thighB', 'shinB'];
    // pièces de la fiche recolorées par luminosité (la texture est conservée) -> grilles de couleurs
    const recolor = (names, ramp, opts = {}) => {
      const [lo, hi] = range(names);
      const map = {};
      const out = {};
      for (const n of names) {
        const p = base.parts[n];
        out[n] = {
          pivot: p.pivot,
          end: p.end,
          g: p.t.map((row) =>
            [...row].map((ch) => {
              if (ch === '.') return null;
              if (map[ch] !== undefined) return map[ch];
              const c = base.pal[ch];
              const L = lum(c);
              let col = c;
              if (opts.skin && warm(c) && !red(c)) col = sample(opts.skin, (L - 20) / 80);
              else if (red(c)) col = opts.eye ? (L > 60 ? opts.eye : U.shade(opts.eye, -0.5)) : c;
              else if (L > 24 || opts.all) col = sample(ramp, (L - lo) / Math.max(1, hi - lo));
              map[ch] = col;
              return col;
            })
          ),
        };
      }
      return out;
    };
    const parts = {};
    const skinRamp = V.ramp(spec.skin || '#e8b890');
    const topRamp = V.ramp(spec.jacket || '#e0dce8');
    const pantsRamp = V.ramp(spec.pants || '#2c2832');
    const shoeRamp = V.ramp(spec.shoes || '#e0e0ea');
    Object.assign(parts, recolor(JACKET, topRamp));
    parts.armUpB = parts.armUpF;
    parts.armLoB = parts.armLoF;
    Object.assign(parts, recolor(PANTS, pantsRamp));
    Object.assign(parts, recolor(['shoe'], shoeRamp));
    Object.assign(parts, spec.gloves ? recolor(['fist'], V.ramp(spec.gloves), { all: true }) : recolor(['fist'], skinRamp, { skin: skinRamp }));
    // tenue : hauts / bas / chaussures peints (outfits.js)
    const fit = GS.Outfits.build(spec, {
      top: topRamp,
      skin: skinRamp,
      pants: pantsRamp,
      bottom: pantsRamp,
      shoe: shoeRamp,
      accent: spec.accent,
      inner: spec.inner ? V.ramp(spec.inner) : null,
      belt: spec.belt ? V.ramp(typeof spec.belt === 'string' ? spec.belt : '#2a2024') : null,
    });
    Object.assign(parts, fit.parts);
    // jupe sous la doudoune d'origine
    if (fit.skirtUnder) parts.torso = { pivot: parts.torso.pivot, end: parts.torso.end, g: GS.Outfits.addSkirt(parts.torso.g, pantsRamp, skinRamp) };
    // bottes / montantes sur le cargo d'origine : bas des tibias couleur chaussure
    if (fit.cover && !fit.parts.shinF) {
      for (const n of ['shinF', 'shinB']) {
        const g = parts[n].g;
        for (let y = g.length - fit.cover; y < g.length; y++) g[y] = g[y].map((c) => (c ? sample(shoeRamp, lum(c) / 140 + 0.15) : null));
      }
    }
    // tête
    const accs = [].concat(spec.acc || []);
    const ACC = GS.Outfits.HEAD_ACC;
    const NECK = GS.NECK_ACC_T;
    const haloR = V.ramp(spec.halo || '#40c8ff');
    const scarfR = V.ramp(spec.scarf || '#c02030');
    const maskR = V.ramp(spec.mask || '#24202c');
    const accMap = {
      g: spec.frame || '#1a1820',
      G: '#0c0a12',
      B: spec.band || (accs.includes('headband') ? '#c02030' : '#16141c'),
      q: U.shade(skinRamp[2], -0.25),
      C: topRamp[1],
      E: '#16121c',
      v: maskR[2],
      V: maskR[3],
      Y: maskR[4],
      z: spec.earring || '#f0c040',
      o: haloR[3],
      O: haloR[5],
      p: haloR[1],
      P: haloR[2],
      x: scarfR[2],
      X: scarfR[3],
      y: scarfR[4],
    };
    // p/P : seulement dans le vide (partie de l'anneau qui passe derrière le cou)
    const stampT = (g, rows, ox, oy) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || !accMap[ch]) return;
      const gx = ox + x;
      const gy = oy + y;
      if (gy < 0 || gy >= g.length || gx < 0 || gx >= g[0].length) return;
      if ((ch === 'p' || ch === 'P') && g[gy][gx]) return;
      g[gy][gx] = accMap[ch];
    }));
    const faceAccs = accs.filter((a) => ACC[a] && !ACC[a].neck);
    const neckAccs = accs.filter((a) => NECK[a]);
    // accessoires du cou : ancrés au pivot (cou) de la tête
    const stampNeck = (g, px, py) => {
      for (const a of neckAccs) stampT(g, NECK[a].t, px - NECK[a].a[0], py - NECK[a].a[1]);
    };
    // grille agrandie (marges à gauche/droite, lignes sous le cou pour les accessoires)
    const OX = 3;
    const DOWN = neckAccs.length ? 6 : 0;
    const padded = (src, w, h, ox, oy) => {
      const g = [];
      for (let y = 0; y < h; y++) g.push(new Array(w).fill(null));
      src.forEach((row, y) => row.forEach((c, x) => {
        if (c && y + oy < h && x + ox < w) g[y + oy][x + ox] = c;
      }));
      return g;
    };
    let toColors = null;
    if (spec.head === 'hood') {
      Object.assign(parts, recolor(['head'], V.ramp(spec.hood || spec.jacket || '#e0dce8'), { skin: skinRamp, eye: spec.eyes || '#ff3040' }));
      const h0 = parts.head;
      const hg = padded(h0.g, h0.g[0].length + OX * 2, h0.g.length + DOWN, OX, 0);
      for (const a of faceAccs) stampT(hg, ACC[a].t, OX - 3, 2);
      stampNeck(hg, h0.pivot[0] + OX, h0.pivot[1]);
      parts.head = { pivot: [h0.pivot[0] + OX, h0.pivot[1]], end: [h0.pivot[0] + OX, h0.pivot[1]], g: hg };
    } else {
      const H = GS.HEADS;
      const F = GS.FACE_T;
      const hairT = H[spec.head] || H.short;
      // tête façon JUS : visage 20 x 18, cou en (10, 17), aplats nets (pas de bruit) ;
      // les coiffures hautes (up) ou larges (x < 0) agrandissent la grille
      const up = hairT.up || 0;
      const g = GS.Pix.grid(20 + OX * 2, 18 + up + DOWN);
      GS.Pix.stamp(g, H.face, OX, up);
      // traits du visage : yeux et bouche remplacés, sourcils et barbe posés sur la peau
      const skinOnly = (t) => t.forEach((row, y) => [...row].forEach((ch, x) => {
        const gy = y + up;
        const gx = x + OX;
        if (ch !== '.' && gy < g.h && 'abc'.includes(g[gy][gx])) g[gy][gx] = ch;
      }));
      const eyes = F.eyes[spec.eyeShape] || F.eyes.normal;
      const mouth = F.mouth[spec.mouth] || F.mouth.neutral;
      for (let y = 9; y <= 11; y++) for (let x = 6; x <= 16; x++) if ('kew'.includes(g[y + up][x + OX])) g[y + up][x + OX] = 'b';
      for (let y = 12; y <= 14; y++) for (let x = 11; x <= 16; x++) if (g[y + up][x + OX] === 'm') g[y + up][x + OX] = 'b';
      GS.Pix.stamp(g, eyes.t, OX, up);
      GS.Pix.stamp(g, mouth.t, OX, up);
      skinOnly((F.brows[spec.brows] || F.brows.none).t);
      skinOnly((F.beard[spec.beard] || F.beard.none).t);
      GS.Pix.stamp(g, hairT, OX + (hairT.x || 0), 0);
      if (accs.includes('elf')) GS.Pix.stamp(g, H.elf, OX, up);
      // ombre portée des mèches sur le front (ombrage en aplats façon JUS)
      for (let y = g.h - 1; y > 0; y--) for (let x = 0; x < g.w; x++) if (g[y][x] === 'b' && '12345'.includes(g[y - 1][x])) g[y][x] = 'a';
      const hairBase = spec.hair || '#5a3a22';
      const hair = V.ramp(hairBase);
      const metal = V.ramp(spec.metal || '#b8c4d8');
      const eye = spec.eyes || '#3070d0';
      const cmap = {
        1: hair[0], 2: hair[1], 3: hair[2], 4: hair[3], 5: lighten(hairBase, 0.42),
        a: skinRamp[2], b: skinRamp[3], c: skinRamp[4],
        k: '#1a1020', e: eye, E: lighten(eye, 0.55), w: '#ffffff', m: U.shade(skinRamp[2], -0.25), W: '#f4f0ec',
        h: hair[0], j: hair[2], u: U.mix(skinRamp[2], hair[1], 0.35),
        r: metal[3], s: metal[4], t: metal[1],
        M: '#e8e4dc', n: '#a8a49c',
      };
      toColors = (grid) => {
        const t = [];
        for (let y = 0; y < grid.h; y++) t.push(grid[y].map((ch) => (ch === '.' ? null : cmap[ch] || '#ff00ff')));
        return t;
      };
      const hg = toColors(g);
      for (const a of faceAccs) stampT(hg, ACC[a].t, OX, up);
      stampNeck(hg, 10 + OX, 17 + up);
      parts.head = { pivot: [10 + OX, 17 + up], end: [10 + OX, 17 + up], g: hg };
    }
    // mèches arrière (+ pans de l'écharpe) : grille plus large, décalée vers l'arrière pour
    // dépasser derrière l'épaule, cou en (14, 17)
    const back = spec.head !== 'hood' && GS.HEADS[spec.head + 'Back'];
    const backAcc = accs.filter((a) => GS.BACK_ACC_T[a]);
    if (back || backAcc.length) {
      let gb = [];
      const h = Math.max(back ? back.length : 0, ...backAcc.map((a) => GS.BACK_ACC_T[a].length));
      if (back) {
        const pg = GS.Pix.grid(24, h);
        GS.Pix.stamp(pg, back, 0, 0);
        gb = toColors(pg);
      } else for (let y = 0; y < h; y++) gb.push(new Array(24).fill(null));
      for (const a of backAcc) stampT(gb, GS.BACK_ACC_T[a], 0, 0);
      parts.hairBack = { pivot: [14, 17], end: [14, 17], g: gb };
    }
    // liseré des pièces qui se recouvrent : très sombre, de la famille du haut
    pal.H = U.mix(topRamp[0], '#050307', 0.6);
    // conversion en palette
    const done = new Map();
    const out = {};
    for (const [n, p] of Object.entries(parts)) {
      if (!done.has(p)) done.set(p, { pivot: p.pivot, end: p.end, t: toKeys(p.g) });
      out[n] = done.get(p);
    }
    // arme
    let weapon = null;
    if (spec.weapon && WEAPONS[spec.weapon]) {
      const w = WEAPONS[spec.weapon];
      const wc = Object.assign({}, WCOL, { z: spec.gem || '#60f0ff', Z: '#ffffff' });
      if (spec.halo) Object.assign(wc, { c: U.shade(spec.halo, -0.2), C: U.shade(spec.halo, 0.45) });
      if (spec.shaft) Object.assign(wc, { y: spec.shaft, Y: U.shade(spec.shaft, -0.35) });
      if (spec.blade) Object.assign(wc, { L: U.shade(spec.blade, 0.5), M: spec.blade, D: U.shade(spec.blade, -0.4) });
      weapon = { grip: w.grip, t: w.t.map((row) => [...row].map((ch) => (ch === '.' ? '.' : keyOf(wc[ch] || '#ff00ff'))).join('')), kind: spec.weapon };
    }
    return { pal, parts: out, weapon, joints: fit.joints };
  };

  // Articulations par défaut (doudoune de la fiche).
  const JOINTS = { hip: [14, 41], neck: [14, 15], shoulderF: [24, 19], shoulderB: [5, 20] };
  // Personnage modulaire complet à partir d'une description.
  const makeChar = (art, spec, animMap) =>
    new GS.ModRig.Char({
      art,
      weapon: art.weapon,
      joints: art.joints || JOINTS,
      hipF: 4,
      hipB: -6,
      outline: 'H',
      animMap,
      headLift: spec.head === 'hood' ? 0 : 2,
      // bras avant derrière le torse (seul Djegui le garde devant)
      frontArm: spec.frontArm || 'under',
    });
  V.makeChar = makeChar;

  let ARMED_MAP = null;
  // Personnage modulaire à partir d'une description libre (ennemis humains).
  const specArt = {};
  // Nouvelle instance à chaque appel (chaque ennemi perd ses propres membres), art partagé.
  V.charSpec = (key, spec) => makeChar(specArt[key] || (specArt[key] = V.build(spec)), spec, spec.weapon ? ARMED_MAP : {});

  // ------------------------------------------------------------ personnages
  const chars2 = {};
  // Styles de combat : correspondance des animations génériques vers celles avec arme.
  const ARMED = (ARMED_MAP = { idle: 'aidle', stance: 'astance', walk: 'awalk', run: 'arun', victory: 'avictory', cast: 'castStaff', hurt: 'ahurt', ko: 'ako', jump: 'ajump', land: 'aland' });
  const BOW = Object.assign({}, ARMED, { cast: 'castStaff' });
  V.animMapFor = (spec) => (spec.weapon ? (spec.weapon === 'bow' ? BOW : ARMED) : {});
  V.char = (id) => {
    if (chars2[id]) return chars2[id];
    const spec = GS.UNIT[id].rigSpec;
    chars2[id] = makeChar(V.build(spec), spec, V.animMapFor(spec));
    return chars2[id];
  };
})();
