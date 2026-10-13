'use strict';
// Police bitmap 5x7 (majuscules, chiffres, ponctuation, accents français).
// Le texte est mis en cache sous forme de canvas pour un rendu rapide.
(function () {
  const F = (GS.Font = {});

  const G = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
    B: '####.|#...#|#...#|####.|#...#|#...#|####.',
    C: '.###.|#...#|#....|#....|#....|#...#|.###.',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
    E: '#####|#....|#....|####.|#....|#....|#####',
    F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
    H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
    J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
    K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
    L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
    N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
    O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....',
    Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
    R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.',
    T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
    X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
    1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
    2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
    3: '####.|....#|....#|.###.|....#|....#|####.',
    4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
    5: '#####|#....|####.|....#|....#|#...#|.###.',
    6: '..##.|.#...|#....|####.|#...#|#...#|.###.',
    7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
    8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
    '.': '.|.|.|.|.|.|#',
    ',': '..|..|..|..|..|.#|#.',
    '!': '#|#|#|#|#|.|#',
    '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
    ':': '.|#|.|.|.|#|.',
    ';': '..|.#|..|..|..|.#|#.',
    "'": '#|#|.|.|.|.|.',
    '"': '#.#|#.#|...|...|...|...|...',
    '-': '....|....|....|####|....|....|....',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
    '=': '....|....|####|....|####|....|....',
    '/': '....#|....#|...#.|..#..|.#...|#....|#....',
    '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
    '(': '..#|.#.|#..|#..|#..|.#.|..#',
    ')': '#..|.#.|..#|..#|..#|.#.|#..',
    '<': '...#|..#.|.#..|#...|.#..|..#.|...#',
    '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
    _: '.....|.....|.....|.....|.....|.....|#####',
    '#': '.#.#.|#####|.#.#.|.#.#.|.#.#.|#####|.#.#.',
    '*': '...#...|..###..|#######|.#####.|..###..|.##.##.|.#...#.',
    '♥': '.....|.#.#.|#####|#####|.###.|..#..|.....',
    '◆': '..#..|.###.|#####|#####|.###.|..#..|.....',
    '▶': '#...|##..|###.|####|###.|##..|#...',
    '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|.....',
    '↓': '.....|..#..|..#..|..#..|#.#.#|.###.|..#..',
    '×': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',
    '·': '.|.|.|#|.|.|.',
  };
  // Accents : liste de pixels relatifs au centre du glyphe (dx, dy). dy < 0 : au-dessus.
  const ACC = {
    acute: [[1, -3], [0, -2]],
    grave: [[-1, -3], [0, -2]],
    circ: [[0, -3], [-1, -2], [1, -2]],
    uml: [[-1, -2], [1, -2]],
    ced: [[0, 7], [-1, 8]],
  };
  const ACCENTED = {
    É: ['E', 'acute'],
    È: ['E', 'grave'],
    Ê: ['E', 'circ'],
    Ë: ['E', 'uml'],
    À: ['A', 'grave'],
    Â: ['A', 'circ'],
    Ä: ['A', 'uml'],
    Î: ['I', 'circ'],
    Ï: ['I', 'uml'],
    Ô: ['O', 'circ'],
    Ö: ['O', 'uml'],
    Ù: ['U', 'grave'],
    Û: ['U', 'circ'],
    Ü: ['U', 'uml'],
    Ç: ['C', 'ced'],
  };

  const TOP = 3; // lignes réservées au-dessus pour les accents
  const CELL_H = 12;
  F.LINE = 10;

  // Construit la table des glyphes : bitmap + largeur.
  const glyphs = {};
  const parse = (str) => str.split('|');
  for (const ch of Object.keys(G)) {
    const rows = parse(G[ch]);
    glyphs[ch] = { rows, w: rows[0].length, px: [] };
  }
  for (const ch of Object.keys(ACCENTED)) {
    const [base, acc] = ACCENTED[ch];
    const b = glyphs[base];
    glyphs[ch] = { rows: b.rows, w: b.w, acc: ACC[acc] };
  }
  for (const ch in glyphs) {
    const g = glyphs[ch];
    const px = [];
    g.rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push([x, y + TOP]);
    });
    if (g.acc) {
      const cx = Math.floor(g.w / 2);
      g.acc.forEach(([dx, dy]) => px.push([cx + dx, dy + TOP]));
    }
    g.px = px;
  }
  const charOf = (c) => (glyphs[c] ? c : null);

  F.width = (text, scale = 1) => {
    text = String(text).toUpperCase();
    let w = 0;
    for (const c of text) {
      if (c === ' ') {
        w += 3;
        continue;
      }
      const k = charOf(c);
      if (!k) {
        w += 4;
        continue;
      }
      w += glyphs[k].w + 1;
    }
    return Math.max(0, w - 1) * scale;
  };

  // Canvas d'un texte (blanc, coloré ensuite). Cache LRU simple.
  const cache = new Map();
  const renderText = (text, color, outline, shadow) => {
    const key = text + '\u0001' + color + '\u0001' + outline + '\u0001' + shadow;
    let c = cache.get(key);
    if (c) return c;
    const pad = outline || shadow ? 1 : 0;
    const w = F.width(text) + pad * 2 + (shadow ? 1 : 0);
    const h = CELL_H + pad * 2 + (shadow ? 1 : 0);
    c = GS.Pix.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const draw = (ox, oy, col) => {
      ctx.fillStyle = col;
      let x = pad + ox;
      for (const ch of text) {
        if (ch === ' ') {
          x += 3;
          continue;
        }
        const k = charOf(ch);
        if (!k) {
          x += 4;
          continue;
        }
        const g = glyphs[k];
        for (const [px, py] of g.px) ctx.fillRect(x + px, pad + oy + py, 1, 1);
        x += g.w + 1;
      }
    };
    if (shadow) draw(1, 1, shadow);
    if (outline) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) draw(dx, dy, outline);
    }
    draw(0, 0, color);
    c.pad = pad;
    if (cache.size > 600) cache.clear();
    cache.set(key, c);
    return c;
  };

  // opts : color, scale, align ('left'|'center'|'right'), outline (couleur), shadow (couleur), alpha
  F.draw = (text, x, y, o = {}) => {
    text = String(text).toUpperCase();
    if (!text) return 0;
    const scale = o.scale || 1;
    const outline = o.outline === undefined ? null : o.outline;
    const shadow = o.shadow === undefined ? null : o.shadow;
    const c = renderText(text, o.color || '#ffffff', outline, shadow);
    const w = F.width(text) * scale;
    let dx = x;
    if (o.align === 'center') dx = x - w / 2;
    else if (o.align === 'right') dx = x - w;
    const ctx = GS.ctx;
    const pad = c.pad;
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    if (alpha <= 0) return w;
    if (alpha < 1) {
      ctx.save();
      ctx.globalAlpha *= alpha;
    }
    ctx.drawImage(c, Math.round(dx - pad * scale), Math.round(y - (TOP + pad) * scale), c.width * scale, c.height * scale);
    if (alpha < 1) ctx.restore();
    return w;
  };

  // Découpe un texte en lignes tenant dans maxW pixels.
  F.wrap = (text, maxW, scale = 1) => {
    const out = [];
    for (const para of String(text).split('\n')) {
      const words = para.split(' ');
      let line = '';
      for (const wd of words) {
        const t = line ? line + ' ' + wd : wd;
        if (F.width(t, scale) > maxW && line) {
          out.push(line);
          line = wd;
        } else line = t;
      }
      out.push(line);
    }
    return out;
  };

  F.drawWrapped = (text, x, y, maxW, o = {}) => {
    const lines = F.wrap(text, maxW, o.scale || 1);
    const lh = o.lineHeight || F.LINE * (o.scale || 1);
    lines.forEach((l, i) => F.draw(l, x, y + i * lh, o));
    return lines.length * lh;
  };
})();
