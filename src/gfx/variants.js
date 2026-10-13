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

  V.build = (spec) => {
    const base = GS.DJEGUI_ART;
    const pal = Object.assign({}, base.pal);
    const cache = {};
    const keyOf = (color) => {
      if (cache[color]) return cache[color];
      const k = newKey();
      pal[k] = color;
      cache[color] = k;
      return k;
    };
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
    const recolor = (names, ramp, opts = {}) => {
      const [lo, hi] = range(names);
      const map = {};
      const out = {};
      for (const n of names) {
        const p = base.parts[n];
        out[n] = Object.assign({}, p, {
          t: p.t.map((row) =>
            [...row]
              .map((ch) => {
                if (ch === '.') return ch;
                if (map[ch]) return map[ch];
                const c = base.pal[ch];
                const L = lum(c);
                let k = ch;
                if (opts.skin && warm(c) && !red(c)) k = keyOf(sample(opts.skin, (L - 20) / 80));
                else if (red(c)) k = opts.eye ? keyOf(L > 60 ? opts.eye : U.shade(opts.eye, -0.5)) : ch;
                else if (L > 24 || opts.all) k = keyOf(sample(ramp, (L - lo) / Math.max(1, hi - lo)));
                map[ch] = k;
                return k;
              })
              .join('')
          ),
        });
      }
      return out;
    };
    const parts = {};
    const skinRamp = V.ramp(spec.skin || '#e8b890');
    Object.assign(parts, recolor(JACKET, V.ramp(spec.jacket)));
    parts.armUpB = parts.armUpF;
    parts.armLoB = parts.armLoF;
    Object.assign(parts, recolor(PANTS, V.ramp(spec.pants || '#2c2832')));
    Object.assign(parts, recolor(['shoe'], V.ramp(spec.shoes || '#e0e0ea')));
    Object.assign(parts, recolor(['fist'], skinRamp, { skin: skinRamp }));
    // tête
    if (spec.head === 'hood') {
      Object.assign(parts, recolor(['head'], V.ramp(spec.hood || spec.jacket), { skin: skinRamp, eye: spec.eyes || '#ff3040' }));
    } else {
      const H = GS.HEADS;
      const g = GS.Pix.grid(24, 21);
      GS.Pix.stamp(g, H.face, 1, 2);
      GS.Pix.stamp(g, H[spec.head] || H.short, 1, 0);
      if (spec.acc === 'elf') GS.Pix.stamp(g, H.elf, 1, 2);
      const hair = V.ramp(spec.hair || '#5a3a22');
      const metal = V.ramp(spec.metal || '#b8c4d8');
      const cmap = {
        1: hair[0], 2: hair[1], 3: hair[2], 4: hair[3], 5: hair[5],
        a: skinRamp[2], b: skinRamp[3], c: skinRamp[4],
        k: '#1a1020', e: spec.eyes || '#3070d0', w: '#ffffff', m: U.shade(skinRamp[2], -0.25),
        r: metal[3], s: metal[4], t: metal[1],
        M: '#e8e4dc', n: '#a8a49c',
      };
      // texture : quelques pixels de cheveux décalés d'un ton (rendu proche de la fiche)
      const rng = U.seeded(spec.head.length * 97 + (spec.hair || '').length * 13);
      const tex = (ch) => {
        if (ch >= '2' && ch <= '4' && rng() < 0.22) return String.fromCharCode(ch.charCodeAt(0) + (rng() < 0.5 ? -1 : 1));
        return ch;
      };
      const toRows = (grid) => {
        const t = [];
        for (let y = 0; y < grid.h; y++) t.push(grid[y].map((ch) => (ch === '.' ? '.' : keyOf(cmap[tex(ch)] || '#ff00ff'))).join(''));
        return t;
      };
      parts.head = { pivot: [11, 19], end: [11, 19], t: toRows(g) };
      const back = H[spec.head + 'Back'];
      if (back) {
        // décalée vers l'arrière pour dépasser derrière l'épaule
        const gb = GS.Pix.grid(26, back.length);
        GS.Pix.stamp(gb, back, 1, 0);
        parts.hairBack = { pivot: [16, 19], end: [16, 19], t: toRows(gb) };
      }
    }
    // arme
    let weapon = null;
    if (spec.weapon && WEAPONS[spec.weapon]) {
      const w = WEAPONS[spec.weapon];
      const wc = Object.assign({}, WCOL, { z: spec.gem || '#60f0ff', Z: '#ffffff' });
      if (spec.blade) Object.assign(wc, { L: U.shade(spec.blade, 0.5), M: spec.blade, D: U.shade(spec.blade, -0.4) });
      weapon = { grip: w.grip, t: w.t.map((row) => [...row].map((ch) => (ch === '.' ? '.' : keyOf(wc[ch] || '#ff00ff'))).join('')), kind: spec.weapon };
    }
    return { pal, parts, weapon };
  };

  let ARMED_MAP = null;
  // Personnage modulaire à partir d'une description libre (ennemis humains).
  const specArt = {};
  // Nouvelle instance à chaque appel (chaque ennemi perd ses propres membres), art partagé.
  V.charSpec = (key, spec) => {
    const art = specArt[key] || (specArt[key] = V.build(spec));
    const ch = new GS.ModRig.Char({
      art,
      weapon: art.weapon,
      joints: { hip: [14, 41], neck: [14, 15], shoulderF: [24, 19], shoulderB: [5, 20] },
      hipF: 4,
      hipB: -6,
      outline: 'H',
      animMap: spec.weapon ? ARMED_MAP : {},
      headLift: spec.head === 'hood' ? 0 : 2,
    });
    return ch;
  };

  // ------------------------------------------------------------ personnages
  const chars2 = {};
  // Styles de combat : correspondance des animations génériques vers celles avec arme.
  const ARMED = (ARMED_MAP = { idle: 'aidle', stance: 'astance', walk: 'awalk', run: 'arun', victory: 'avictory', cast: 'castStaff', hurt: 'ahurt', ko: 'ako', jump: 'ajump', land: 'aland' });
  const BOW = Object.assign({}, ARMED, { cast: 'castStaff' });
  V.char = (id) => {
    if (chars2[id]) return chars2[id];
    const def = GS.UNIT[id];
    const spec = def.rigSpec;
    const art = V.build(spec);
    const animMap = spec.weapon ? (spec.weapon === 'bow' ? BOW : ARMED) : {};
    chars2[id] = new GS.ModRig.Char({
      art,
      weapon: art.weapon,
      joints: { hip: [14, 41], neck: [14, 15], shoulderF: [24, 19], shoulderB: [5, 20] },
      hipF: 4,
      hipB: -6,
      outline: 'H',
      animMap,
      headLift: spec.head === 'hood' ? 0 : 2,
    });
    return chars2[id];
  };
})();
