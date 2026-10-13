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
    const accMap = {
      g: spec.frame || '#1a1820',
      G: '#0c0a12',
      B: spec.band || (accs.includes('headband') ? '#c02030' : '#16141c'),
      q: U.shade(skinRamp[2], -0.25),
      C: topRamp[1],
    };
    const stampAcc = (g, name, ox, oy) => {
      const a = ACC[name];
      if (!a) return;
      a.t.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.' || !accMap[ch]) return;
        const gx = ox + x;
        const gy = oy + y;
        if (gy >= 0 && gy < g.length && gx >= 0 && gx < g[0].length) g[gy][gx] = accMap[ch];
      }));
    };
    if (spec.head === 'hood') {
      Object.assign(parts, recolor(['head'], V.ramp(spec.hood || spec.jacket), { skin: skinRamp, eye: spec.eyes || '#ff3040' }));
      for (const a of accs) stampAcc(parts.head.g, a, -3, 2);
    } else {
      const H = GS.HEADS;
      // tête façon JUS : grille 20 x 18, cou en (10, 17), aplats nets (pas de bruit)
      const g = GS.Pix.grid(20, 18);
      GS.Pix.stamp(g, H.face, 0, 0);
      GS.Pix.stamp(g, H[spec.head] || H.short, 0, 0);
      if (accs.includes('elf')) GS.Pix.stamp(g, H.elf, 0, 0);
      // ombre portée des mèches sur le front (ombrage en aplats façon JUS)
      for (let y = g.h - 1; y > 0; y--) for (let x = 0; x < g.w; x++) if (g[y][x] === 'b' && '12345'.includes(g[y - 1][x])) g[y][x] = 'a';
      const hair = V.ramp(spec.hair || '#5a3a22');
      const metal = V.ramp(spec.metal || '#b8c4d8');
      const cmap = {
        1: hair[0], 2: hair[1], 3: hair[2], 4: hair[3], 5: hair[5],
        a: skinRamp[2], b: skinRamp[3], c: skinRamp[4],
        k: '#1a1020', e: spec.eyes || '#3070d0', w: '#ffffff', m: U.shade(skinRamp[2], -0.25),
        r: metal[3], s: metal[4], t: metal[1],
        M: '#e8e4dc', n: '#a8a49c',
      };
      const toColors = (grid) => {
        const t = [];
        for (let y = 0; y < grid.h; y++) t.push(grid[y].map((ch) => (ch === '.' ? null : cmap[ch] || '#ff00ff')));
        return t;
      };
      const hg = toColors(g);
      for (const a of accs) stampAcc(hg, a, 0, 0);
      parts.head = { pivot: [10, 17], end: [10, 17], g: hg };
      const back = H[spec.head + 'Back'];
      if (back) {
        // grille plus large, décalée vers l'arrière pour dépasser derrière l'épaule
        const gb = GS.Pix.grid(24, back.length);
        GS.Pix.stamp(gb, back, 0, 0);
        parts.hairBack = { pivot: [14, 17], end: [14, 17], g: toColors(gb) };
      }
    }
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
