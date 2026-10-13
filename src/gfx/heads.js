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

  // ------------------------------------------------------------ accessoires de tête
  // Même grille que le visage (g monture, G verre fumé, B bandeau, q cicatrice, C col).
  GS.HEAD_ACC_T = {
    glasses: T(['', '', '', '', '', '', '', '', '.......gggg.gggg', '...ggggg..ggg..g', '.......g..g.g..g', '.......gggg.gggg']),
    shades: T(['', '', '', '', '', '', '', '', '.......GGGG.GGGG', '...ggggGGGGgGGGG', '.......GGGG.GGGG', '........GG...GG']),
    blindfold: T(['', '', '', '', '', '', '', '', '...BBBBBBBBBBBBBB', '.BBBBBBBBBBBBBBBB', 'BB.BBBBBBBBBBBBBB', 'B', 'B']),
    headband: T(['', '', '', '', '', '', '..BBBBBBBBBBBBBBBB', '.BBBBBBBBBBBBBBBBB', 'B', 'BB']),
    scar: T(['', '', '', '', '', '', '', '..........q', '.........q', '..........q', '.........q', '..........q']),
    collar: T(['', '', '', '', '', '', '', '', '', '', '', '', '', '.....CCCCCCCCCCCC', '....CCCCCCCCCCCCC', '....CCCCCCCCCCCCC', '.....CCCCCCCCCCC', '.....CCCCCCCCCCC']),
  };
})();
