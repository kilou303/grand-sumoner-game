'use strict';
// Têtes (coiffure + visage) des héros au format de Djegui, vue 3/4 vers la droite.
// Proportions façon sprites de combat JUS (Jump Ultimate Stars) : tête de la taille de celle
// de Djegui (~4 têtes de haut), contour net, ombrage en aplats, mèches en blocs avec reflet.
// Grille 20 x 18, cou (pivot) en (10, 17).
// Lettres : 1-5 cheveux (sombre -> reflet), a/b/c peau (ombre -> clair), k cils/pupille,
// e iris, w reflet de l'œil, m bouche, r/s/t métal (casque), M/n masque.
(function () {
  const HEADS = (GS.HEADS = {});
  const W = 20;
  // complète chaque ligne à la largeur de la grille
  const T = (rows) => rows.map((r) => (r.length >= W ? r.slice(0, W) : r + '.'.repeat(W - r.length)));
  const blank = (n, w = W) => Array(n).fill('.'.repeat(w));

  // Visage commun : front, yeux (proche x8-9, lointain x13-14), nez en x17, menton pointu.
  HEADS.face = T([
    '',
    '',
    '',
    '.......bbbbbb',
    '.....bbbbbbbbbb',
    '....bbbbbbbbbbbb',
    '...abbbbbbbbbbbbb',
    '...abbbbbbbbbbbbb',
    '...abbbbbbbbbbbbb',
    '...abbbbkkbbbkkbb',
    '...aabbbewbbbebbb',
    '...aabbbbbbbbbbbbb',
    '....abbbbbbbbbbbb',
    '....aabbbbbbbmmbb',
    '.....aabbbbbbbbb',
    '......aaabbbbbb',
    '........aabbb',
    '.........aab',
  ]);

  // ------------------------------------------------------------ coiffures (sur le visage)
  HEADS.short = T([
    '',
    '......23333332',
    '....233344443332',
    '...23344455444332',
    '..2334445554443332',
    '..2333444444433332',
    '..23333433334333332',
    '..23332.3332332.332',
    '..2332...23...2..32',
    '..232............2',
    '..22',
    '...2',
  ]);
  HEADS.spiky = T([
    '.....2....3....2',
    '..2..32..343..23..2',
    '..32.332.3443.233.32',
    '..2333443444433433',
    '.233444555444443332',
    '..23334444444433332',
    '.2333334333334333322',
    '..2333.3323332.3332',
    '.2.233..23..32..232',
    '...23............2',
    '..22',
  ]);
  HEADS.buzz = T([
    '',
    '',
    '......2323232',
    '....232323232323',
    '...23232323232323',
    '...23232323232323',
    '...232.........232',
    '...2............2',
  ]);
  HEADS.bob = T([
    '',
    '......23333332',
    '....233344443332',
    '...23344455444332',
    '..2334445554443332',
    '.233334444444433332',
    '.233334333343334332',
    '.23333333.3333.3332',
    '.233332..33...3.232',
    '.23332..........232',
    '.2333...........232',
    '.2333...........232',
    '.23332..........22',
    '.22332',
    '..2222',
  ]);
  HEADS.long = T([
    '',
    '......23333332',
    '....233344443332',
    '...23344455444332',
    '..2334445554443332',
    '.233334444444433332',
    '.233334333343334332',
    '.23333333.3333.3332',
    '.233332..33...3.232',
    '.23332..........232',
    '.2333...........232',
    '.2333...........232',
    '.23333..........232',
    '.23333..........22',
    '.233332',
    '.23333',
    '..2332',
    '..222',
  ]);
  HEADS.ponytail = T([
    '',
    '......23333332',
    '...2233344443332',
    '..233344455444332',
    '.23334445554443332',
    '.23333444444433332',
    '.233334333333343332',
    '.2333.3333332..332',
    '.233...233.....232',
    '.23.............2',
    '.2',
  ]);
  HEADS.twintails = T([
    '',
    '......23333332',
    '....233344443332',
    '...23344455444332',
    '..2334445554443332',
    '.233334444444433332',
    '.233334333343334332',
    '.23333333.3333.3332',
    '.233332..33...3.232',
    '.23332..........232',
    '.2332...........22',
    '..22',
  ]);
  HEADS.mane = T([
    '..2...2....2...2',
    '.232.232..232.232',
    '.2332233323332332.2',
    '23334433344433343322',
    '.2334455444554443332',
    '23344445544444433332',
    '.2333334333333433332',
    '2333333.3332333.3332',
    '.23333..23...32..232',
    '23332............2',
    '.2332',
    '2333',
    '.233',
    '..32',
    '...2',
  ]);
  // Casquette (visière vers l'avant) : la couleur des "cheveux" colore la casquette.
  HEADS.cap = T([
    '',
    '',
    '......33333333',
    '....334444444333',
    '...33445554443333',
    '...33444443333332222',
    '..123333333333322222',
    '..1222....1.....12',
    '..122',
    '...2',
  ]);
  // Casque (chevalier) : couvre le crâne, visière ouverte.
  HEADS.helmet = T([
    '',
    '.......rsssr',
    '.....rrssssssr',
    '....rrsssssssssrt',
    '...rssssssssssssrt',
    '...rssssssssssssrrt',
    '..trrrrrrrrrrrrrrrt',
    '..trrs........srrt',
    '..trs..........srt',
    '..trs...........rt',
    '..ttrs..........rt',
    '...trs.........tt',
    '...ttr',
    '....tt',
  ]);
  // Capuche + masque blanc de sectaire.
  HEADS.mask = T([
    '',
    '........2333',
    '......23333332',
    '....233344433322',
    '...23334443333332',
    '..2333444333333333',
    '..23333MMMMMM33332',
    '..2333MMMMMMMMn332',
    '..233MMMMMMMMMMn32',
    '..233MMkkMMMkkMn32',
    '..233MMkkMMMkkMn32',
    '..233MMMMMMMMMMn32',
    '..233MMMMnnnMMMn32',
    '..2333MMMMMMMMn332',
    '...2333nMMMMMn332',
    '...23333nnnnn3332',
    '....2333333333332',
    '.....23333333332',
  ]);
  // Oreille d'elfe (accessoire), côté nuque.
  HEADS.elf = T(['', '', '', '', '', '', '', '', '.b', '.ab', '..abb', '...aab']);

  // ------------------------------------------------------------ mèches arrière
  // Dessinées derrière le dos. Grille 24 de large, cou en (14, 17) : 4 px de plus vers l'arrière
  // que la tête, pour dépasser derrière l'épaule.
  const BW = 24;
  // rows : [y, x0, x1] ; ombrage : bord sombre, coeur moyen, reflet sur une colonne
  const strand = (rows, hi) => {
    const out = blank(rows[rows.length - 1][0] + 1, BW).map((r) => r.split(''));
    for (const [y, x0, x1] of rows) {
      for (let x = x0; x <= x1; x++) out[y][x] = x === x0 || x === x1 ? '2' : x === x0 + hi && y % 5 !== 0 ? '4' : '3';
    }
    return out.map((r) => r.join(''));
  };
  const taper = (y0, y1, x0, w0, w1, drift = 0) => {
    const rows = [];
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0);
      const w = Math.round(w0 + (w1 - w0) * t);
      const x = Math.round(x0 + drift * t);
      rows.push([y, x, x + w - 1]);
    }
    return rows;
  };
  HEADS.longBack = strand(taper(7, 31, 4, 6, 3, 2), 2);
  HEADS.ponytailBack = strand([[3, 3, 5], [4, 2, 6]].concat(taper(5, 22, 1, 5, 2, 3)), 2);
  HEADS.twintailsBack = strand([[7, 4, 6], [8, 3, 7]].concat(taper(9, 24, 2, 6, 3, 2)), 2);

  // ------------------------------------------------------------ peintre de mèches
  // Coiffures dessinées par mèches effilées, ombrées en aplats : bord côté dos sombre (2), cœur
  // (3), côté face éclairé (4), reflet (5). Grille en caractères, convertie en gabarit.
  const sheet = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
  const rowsOf = (c) => c.map((r) => r.join(''));
  const set = (c, x, y, ch) => {
    if (y >= 0 && y < c.length && x >= 0 && x < c[0].length) c[y][x] = ch;
  };
  // Mèche de la base (x0, y0, largeur w0) à la pointe (x1, y1) ; o.bend courbe la mèche,
  // o.hi pose un reflet, o.tone décale les tons (mèches du fond plus sombres).
  const lock = (c, x0, y0, x1, y1, w0, o = {}) => {
    const n = Math.abs(y1 - y0);
    const dir = y1 < y0 ? -1 : 1;
    const d = o.tone || 0;
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(1, n);
      const y = y0 + dir * i;
      const cx = x0 + (x1 - x0) * Math.pow(t, o.bend || 1);
      const hw = (w0 / 2) * Math.pow(1 - t, o.taper || 0.85) + 0.35;
      const a = Math.round(cx - hw);
      const b = Math.round(cx + hw) - 1;
      for (let x = a; x <= b; x++) {
        const u = (x - a) / Math.max(1, b - a);
        let k = x === a && b > a ? 2 : u < (o.split || 0.4) ? 3 : 4;
        if (o.hi && b - a >= 3 && x === b - 1 && t > 0.12 && t < 0.62) k = 5;
        set(c, x, y, String(Math.max(1, Math.min(5, k - d))));
      }
    }
  };
  // Calotte en aplats (rangées [y, x0, x1]) : bord sombre au dos, reflet en haut côté face.
  const cap = (c, list, oy = 0) => {
    for (const [y, x0, x1] of list)
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / Math.max(1, x1 - x0);
        set(c, x, y + oy, x === x0 ? '2' : u < 0.35 ? '3' : u > 0.55 && y <= 3 ? '5' : '4');
      }
  };
  // Liste de rangées -> gabarit, avec `up` lignes au-dessus du crâne et décalage `x`.
  const tpl = (c, up = 0, x = 0) => {
    const t = rowsOf(c);
    t.up = up;
    t.x = x;
    return t;
  };

  // Crinière haute en flamme : mèches dressées qui partent en arrière, front dégagé.
  {
    const up = 10;
    const c = sheet(20, 18 + up);
    cap(c, [[1, 6, 13], [2, 4, 15], [3, 3, 16], [4, 2, 10], [5, 2, 7], [6, 2, 5], [7, 2, 4], [8, 2, 4], [9, 2, 3]], up);
    lock(c, 4, up + 4, 1, up - 4, 4, { tone: 1 });
    lock(c, 7, up + 3, 3, 3, 7, { tone: 1, bend: 1.3 });
    lock(c, 10, up + 2, 6, 0, 8, { hi: true, bend: 1.4 });
    lock(c, 13, up + 2, 11, 2, 6, { hi: true, bend: 1.2 });
    lock(c, 15, up + 3, 15, up - 4, 3, {});
    HEADS.flame = tpl(c, up);
  }
  // Banane (pompadour) : gros rouleau au-dessus du front, côtés plaqués.
  {
    const up = 4;
    const c = sheet(20, 18 + up);
    cap(c, [[1, 6, 13], [2, 4, 15], [3, 3, 15], [4, 2, 9], [5, 2, 6], [6, 2, 5], [7, 2, 4], [8, 2, 4], [9, 2, 3]], up);
    // rouleau : ovale éclairé par-dessus, creux sombre dessous
    const roll = [[0, 9, 15], [1, 7, 18], [2, 6, 19], [3, 6, 19], [4, 7, 19], [5, 9, 18], [6, 11, 17]];
    for (const [y, x0, x1] of roll)
      for (let x = x0; x <= x1; x++) {
        const k = x === x0 || y === 6 ? 2 : y <= 1 || (y === 2 && x > 12) ? (x > 14 && y < 3 ? 5 : 4) : y >= 5 ? 3 : x < x0 + 3 ? 3 : 4;
        set(c, x, y + 1, String(k));
      }
    // mèches peignées vers l'arrière
    for (const [x, y] of [[8, 5], [7, 6], [6, 7], [11, 5], [10, 6], [9, 7], [5, 8]]) set(c, x, y, '3');
    HEADS.pompadour = tpl(c, up);
  }
  // Crête (iroquoise) : côtés rasés, rangée de pointes du front à la nuque.
  {
    const up = 6;
    const c = sheet(20, 18 + up);
    // côtés rasés : aplat sombre à reflets réguliers
    for (const [y, x0, x1] of [[2, 5, 14], [3, 3, 16], [4, 2, 16], [5, 2, 15], [6, 2, 6], [7, 2, 5], [8, 2, 4]])
      for (let x = x0; x <= x1; x++) set(c, x, y + up, x === x0 ? '1' : (x + y) % 3 === 0 ? '3' : '2');
    for (let y = 4; y <= 5; y++) for (let x = 7; x <= 15; x++) if (c[y + up][x] !== '.') set(c, x, y + up, '.');
    lock(c, 4, up + 4, 1, up - 2, 4, { tone: 1 });
    lock(c, 7, up + 2, 5, 0, 5, { tone: 1 });
    lock(c, 10, up + 2, 9, 0, 5, { hi: true });
    lock(c, 13, up + 2, 13, 1, 4, { hi: true });
    lock(c, 15, up + 3, 17, up - 1, 3, {});
    HEADS.crest = tpl(c, up);
  }
  // Afro : gros volume arrondi, bord festonné, boucles régulières (pas de bruit).
  {
    const up = 5;
    const ox = 3;
    const c = sheet(26, 18 + up);
    const cx = 9.5 + ox;
    const cy = 4 + up;
    const rx = 11.5;
    const ry = 9.5;
    for (let y = 0; y < c.length; y++)
      for (let x = 0; x < 26; x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        let d = nx * nx + ny * ny;
        // feston : petites bosses le long du bord
        const ang = Math.atan2(ny, nx);
        if (d > 0.82 && Math.cos(ang * 14) < -0.2) continue;
        if (d > 1) continue;
        // ligne du front et des tempes (le visage reste dégagé)
        const fx = x - ox;
        const fy = y - up;
        if (fx >= 5 && fy >= 5) continue;
        if (fx >= 3 && fy >= 10) continue;
        if (fx >= 15 && fy >= 3) continue;
        // volume éclairé du haut et de la face
        const lit = -nx * 0.45 + ny * 0.75;
        let k = lit > 0.42 ? 2 : lit > 0 ? 3 : lit > -0.5 ? 4 : 5;
        if (d > 0.78) k = Math.min(k, 3);
        // boucles : motif régulier de petits creux
        if (k >= 4 && (x * 3 + y * 5) % 7 === 0) k = 3;
        set(c, x, y, String(k));
      }
    HEADS.afro = tpl(c, up, -ox);
  }
  // Cheveux plaqués en arrière : calotte lisse, traits de peigne, front dégagé.
  {
    const c = sheet(20, 18);
    cap(c, [[1, 6, 13], [2, 4, 15], [3, 3, 16], [4, 2, 12], [5, 2, 8], [6, 2, 6], [7, 2, 5], [8, 2, 4], [9, 2, 4], [10, 2, 3]]);
    for (const [x, y] of [[13, 2], [12, 3], [11, 4], [10, 4], [9, 5], [15, 3], [14, 4], [8, 6], [7, 6], [6, 7], [11, 2], [10, 3], [8, 4]]) set(c, x, y, x > 12 && y < 4 ? '4' : '3');
    for (const [x, y] of [[8, 2], [9, 2], [10, 2], [13, 3]]) set(c, x, y, '5');
    HEADS.slick = tpl(c);
  }
  // Mèche sur le côté : courts, longue mèche balayée vers l'avant qui tombe devant l'œil lointain.
  {
    const c = sheet(20, 18);
    cap(c, [[1, 6, 13], [2, 4, 15], [3, 3, 16], [4, 2, 17], [5, 2, 17], [6, 2, 6], [7, 2, 4], [8, 2, 4], [9, 2, 3], [10, 2, 3]]);
    lock(c, 8, 4, 9, 7, 3, { tone: 1 });
    lock(c, 11, 4, 16, 11, 7, { hi: true, bend: 0.8 });
    lock(c, 15, 4, 18, 9, 3, {});
    HEADS.sidepart = tpl(c);
  }
  // Longs en pointes : frange en pics, mèches latérales effilées (+ mèches arrière en pointes).
  {
    const c = sheet(20, 18);
    cap(c, [[1, 6, 13], [2, 4, 15], [3, 3, 16], [4, 2, 17], [5, 2, 17], [6, 2, 18]]);
    for (const [x0, x1, y1, w] of [[6, 6, 9, 3], [9, 9, 9, 3], [12, 13, 8, 3], [15, 16, 9, 3], [17, 18, 8, 2]]) lock(c, x0, 5, x1, y1, w, { tone: x0 < 8 ? 1 : 0 });
    lock(c, 3, 5, 2, 15, 4, { tone: 1 });
    lock(c, 5, 6, 5, 13, 3, {});
    HEADS.spikyLong = tpl(c);
  }

  // ------------------------------------------------------------ traits du visage
  // Gabarits posés sur le visage (même grille). Lettres : k trait, e iris, E iris lumineux, w reflet, m bouche,
  // W dents, h sourcil/barbe (cheveux sombres), j barbe (cheveux), u barbe naissante, b peau
  // (efface). Les sourcils et la barbe ne se posent que sur la peau (les mèches les cachent).
  GS.FACE_T = {
    eyes: {
      normal: { label: 'Normaux', t: T(['', '', '', '', '', '', '', '', '', '........kk...kk', '........ew...e']) },
      sharp: { label: 'Perçants', t: T(['', '', '', '', '', '', '', '', '', '.......kkk...kkk', '........ek...ke']) },
      closed: { label: 'Fermés', t: T(['', '', '', '', '', '', '', '', '', '........bb...bb', '.......kkk...kk']) },
      round: { label: 'Ronds', t: T(['', '', '', '', '', '', '', '', '', '........kk...kk', '........ew...ew', '........ee...e']) },
      glow: { label: 'Lueur', t: T(['', '', '', '', '', '', '', '', '', '........kk...kk', '........eE...E']) },
    },
    brows: {
      none: { label: 'Aucun', t: [] },
      thin: { label: 'Fins', t: T(['', '', '', '', '', '', '', '', '.......hhh...hhh']) },
      thick: { label: 'Épais', t: T(['', '', '', '', '', '', '', '.......hh....hh', '.......hhh...hhh']) },
      angry: { label: 'Froncés', t: T(['', '', '', '', '', '', '', '.......h.......hh', '........hh..hh']) },
      worried: { label: 'Inquiets', t: T(['', '', '', '', '', '', '', '.........h..h', '.......hh....hh']) },
    },
    mouth: {
      neutral: { label: 'Neutre', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '', '.............mm']) },
      smile: { label: 'Sourire', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '...............m', '............mm']) },
      grin: { label: 'Dents', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '', '............kWWk', '.............kk']) },
      open: { label: 'Cri', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '', '.............kk', '.............km']) },
      frown: { label: 'Moue', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '', '.............mm', '............m']) },
      smirk: { label: 'Rictus', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '...............m', '.............mm']) },
    },
    beard: {
      none: { label: 'Aucune', t: [] },
      stubble: { label: 'Naissante', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '....u...........', '....uu.......uu', '.....uuuuuuuuuu', '......uuuuuuuu', '........uuuu', '.........uu']) },
      goatee: { label: 'Bouc', t: T(['', '', '', '', '', '', '', '', '', '', '', '', '............jjjj', '', '............hjj', '...........hjjj', '.........hjjj', '.........hj']) },
      full: { label: 'Barbe', t: T(['', '', '', '', '', '', '', '', '', '', '...hh', '...hhj', '....hjj.....jjjj', '....hjjj.......j', '.....hjjjjjjjjj', '......hjjjjjjjj', '.......hhjjjjj', '.........hjj']) },
    },
  };

  // ------------------------------------------------------------ accessoires de tête
  // Même grille que le visage (g monture, G verre fumé, B bandeau, q cicatrice, C col,
  // E cache-œil, v/V/Y masque de bouche, z boucle d'oreille).
  GS.HEAD_ACC_T = {
    glasses: T(['', '', '', '', '', '', '', '', '.......gggg.gggg', '...ggggg..ggg..g', '.......g..g.g..g', '.......gggg.gggg']),
    shades: T(['', '', '', '', '', '', '', '', '.......GGGG.GGGG', '...ggggGGGGgGGGG', '.......GGGG.GGGG', '........GG...GG']),
    blindfold: T(['', '', '', '', '', '', '', '', '...BBBBBBBBBBBBBB', '.BBBBBBBBBBBBBBBB', 'BB.BBBBBBBBBBBBBB', 'B', 'B']),
    headband: T(['', '', '', '', '', '', '..BBBBBBBBBBBBBBBB', '.BBBBBBBBBBBBBBBBB', 'B', 'BB']),
    scar: T(['', '', '', '', '', '', '', '..........q', '.........q', '..........q', '.........q', '..........q']),
    collar: T(['', '', '', '', '', '', '', '', '', '', '', '', '', '.....CCCCCCCCCCCC', '....CCCCCCCCCCCCC', '....CCCCCCCCCCCCC', '.....CCCCCCCCCCC', '.....CCCCCCCCCCC']),
    eyepatch: T(['', '', '', '', '...............g', '..............g', '.............g', '..g.........g', '...gg..EEEEg', '.....ggEEEE', '.......EEEE', '........EE']),
    mouthMask: T(['', '', '', '', '', '', '', '', '', '', '', '...vvvVVVVVVVVVVY', '...vvVVVVVVVVVVVY', '....vVVVVVVvVVVY', '....vvVVVVVVVVY', '.....vvVVVVVVV', '.......vvVVVV', '.........vV']),
    earrings: T(['', '', '', '', '', '', '', '', '', '', '', '', '', '....z', '...z.z', '....z']),
  };

  // Accessoires du cou, ancrés au cou de la tête (point a du gabarit -> pivot de la tête).
  // o/O anneau (devant, par-dessus), p/P anneau (derrière, seulement dans le vide) ;
  // x/X/y écharpe (ombre, base, lumière).
  GS.NECK_ACC_T = {
    halo: {
      a: [10, 1],
      t: ['...pppPPPPPPPPppp...', '.pp..............pp.', 'o..................O', 'oo................OO', '.ooo............OOO.', '...ooooOOOOOOOOOO...'],
    },
    scarf: {
      a: [8, 0],
      t: ['.xXXXXXXXXyy.', 'xxXXXXXXXXXyy', 'xXXxXXXXyXXyy', '.xxxXXXXXXyy.', '..xxxxxxxx...'],
    },
  };
  // Pans arrière (derrière le dos), grille des mèches arrière (24 de large, cou en (14, 17)).
  GS.BACK_ACC_T = {
    scarf: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '.........xXXy', '........xXXXy', '.......xXXXy', '......xXXXy', '.....xxXXy', '.....xXXXy', '....xXXXy', '....xXXy', '...xxXy', '...xXXy', '...x.x'],
  };
  // Mèches arrière des longs en pointes.
  {
    const c = sheet(24, 30);
    lock(c, 7, 6, 4, 27, 7, { tone: 1, taper: 1.1 });
    lock(c, 5, 8, 1, 23, 4, { tone: 1, taper: 1.1 });
    lock(c, 10, 9, 9, 25, 4, { taper: 1.1 });
    HEADS.spikyLongBack = rowsOf(c);
  }
})();
