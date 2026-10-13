'use strict';
// Sprites des personnages "chibi" (28x34 px), composés de calques :
// cheveux arrière -> cape -> corps/tenue -> tête -> cheveux avant -> accessoire.
// Tous regardent vers la droite ; les ennemis humanoïdes sont retournés.
(function () {
  const Pix = GS.Pix;
  const H = (GS.HeroArt = {});

  H.W = 28;
  H.H = 34;
  // Position de la main avant (où l'arme est tenue), en coordonnées de grille.
  H.HAND = { x: 21, y: 22 };

  // ---------------------------------------------------------------- TÊTE
  const HEAD = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '..........ssssssss..........',
    '........ssssssssssss........',
    '.......ssssssssssssss.......',
    '......ssssssssssssssss......',
    '......ssssssssssssssss......',
    '......ssssssssssssssss......',
    '......sssssssppsssppss......',
    '......sssssssewsssewss......',
    '......ssssssseessseess......',
    '......ttssssssssssssss......',
    '.......tsssssssssmssss......',
    '...........tsssssssss.......',
    '.............ttt............',
  ];

  // ---------------------------------------------------------------- CHEVEUX
  const HAIR = {};

  HAIR.spiky = {
    front: [
      '............................',
      '..............h.............',
      '.......h.....hh.....h.......',
      '........hh..hhhh...hh.......',
      '....hh..hhhhhhhhhhhhh.......',
      '.....hhhhhhhhhhhhhhhhh......',
      '..hhhhhhhhhhhhiihhhhhhh.....',
      '....hhhhhhhhhiihhhhhhhhh....',
      '...hhhhhhhhhhhhhhhhhhhhhh...',
      '.hhhhhhhhhhhhhhhhhhhhhhhhh..',
      '...jhhhhhhhhhhhhjhhhjhhhh...',
      '..jjhhhhhhh.j....j...jh.....',
      '....jhhhhh..................',
      '...jjjhhh...................',
      '......jhh...................',
      '.......jh...................',
    ],
  };

  HAIR.short = {
    front: [
      '............................',
      '............................',
      '............................',
      '...........hhhh.............',
      '.........hhhhhhhhh..........',
      '.......hhhhhhhhhhhhh........',
      '......hhhhhhhiihhhhhh.......',
      '.....hhhhhhhiihhhhhhhh......',
      '.....hhhhhhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhhhhhhh....',
      '.....jhhhhhhhjhhhjhhhhh.....',
      '.....jhhhhh.j...j...jh......',
      '......jhhh..................',
      '......jjhh..................',
      '.......jh...................',
    ],
  };

  HAIR.long = {
    back: [
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '....hhhhhhh.................',
      '...hhhhhhhh.................',
      '...hhhhhhhh.................',
      '...hhhhhhhh.................',
      '...hhhhhhhh.................',
      '..hhhhhhhh..................',
      '..hhhhhhhh..................',
      '..hhhhhhhh..................',
      '..hhhhhhhh..................',
      '..hhhhhhhh..................',
      '..jhhhhhhh..................',
      '..jhhhhhhh..................',
      '..jhhhhhh...................',
      '..jjhhhhh...................',
      '...jhhhhh...................',
      '...jhhhhh...................',
      '...jjhhhh...................',
      '....jhhhh...................',
      '....jjhhh...................',
      '.....jjh....................',
      '......j.....................',
    ],
    front: [
      '............................',
      '............................',
      '............................',
      '...........hhhhh............',
      '........hhhhhhhhhh..........',
      '......hhhhhhhhhhhhhh........',
      '.....hhhhhhhiihhhhhhh.......',
      '....hhhhhhhiihhhhhhhhh......',
      '....hhhhhhhhhhhhhhhhhhh.....',
      '....hhhhhhhhhhhhhhhhhhhh....',
      '....hhhhhhhhhjhhhhhjhhhh....',
      '....hhhhhhh.j.....j..hhh....',
      '....hhhhhh............hh....',
      '....hhhhh.............hh....',
      '....jhhhh.............jh....',
      '....jhhh..............j.....',
    ],
  };

  HAIR.ponytail = {
    back: [
      '............................',
      '............................',
      '............................',
      '............................',
      '..hhh.......................',
      '.hhhhh......................',
      'hhhhhhh.....................',
      'hhhhhh......................',
      'jhhhhh......................',
      'jhhhh.......................',
      'jjhhh.......................',
      '.jhhh.......................',
      '.jjhh.......................',
      '..jhh.......................',
      '..jjh.......................',
      '...jh.......................',
      '...j........................',
    ],
    front: [
      '............................',
      '............................',
      '............................',
      '...........hhhh.............',
      '.........hhhhhhhhh..........',
      '......ghhhhhhhhhhhhh........',
      '.....gghhhhhhiihhhhhh.......',
      '.....hhhhhhhiihhhhhhhh......',
      '.....hhhhhhhhhhhhhhhhhh.....',
      '.....hhhhhhhhhhhhhhhhhhh....',
      '.....jhhhhhhhhjhhhhjhhhh....',
      '.....jhhhhh.j......j.hh.....',
      '......jhhh............h.....',
      '......jjhh..................',
      '.......jh...................',
    ],
  };

  HAIR.mane = {
    back: [
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '..h.........................',
      '.hhh........................',
      'hhhhh.......................',
      '.hhhhh......................',
      'hhhhhh......................',
      '.hhhhh......................',
      'jhhhhh......................',
      '.jhhhh......................',
      '..jhhh......................',
      '.jjhhh......................',
      '...jhh......................',
      '....jh......................',
    ],
    front: [
      '............................',
      '.........h.....h............',
      '........hh....hh..h.........',
      '.....h.hhhh..hhh.hh.........',
      '.....hhhhhhhhhhhhhhhh.......',
      '...hhhhhhhhhhhhhhhhhhh......',
      '....hhhhhhhhhhiihhhhhhh.....',
      '..hhhhhhhhhhhiihhhhhhhhh....',
      '...hhhhhhhhhhhhhhhhhhhhhh...',
      '..hhhhhhhhhhhhhhhhhhhhhhh...',
      '...hhhhhhhhhhhhjhhhjhhhhh...',
      '..jhhhhhhhh.j....j...jhh....',
      '...jhhhhhh..................',
      '..jjhhhhh...................',
      '...jjhhh....................',
      '....jjh.....................',
    ],
  };

  HAIR.bob = {
    front: [
      '............................',
      '............................',
      '............................',
      '...........hhhhh............',
      '........hhhhhhhhhh..........',
      '......hhhhhhhhhhhhhh........',
      '.....hhhhhhhiihhhhhhh.......',
      '....hhhhhhhiihhhhhhhhh......',
      '....hhhhhhhhhhhhhhhhhhh.....',
      '....hhhhhhhhhhhhhhhhhhhh....',
      '....hhhhhhhhhjhhhhjhhhhh....',
      '....hhhhhhh.j.....j..hhh....',
      '....hhhhhh............hh....',
      '....hhhhhh............hh....',
      '....jhhhhh............jh....',
      '....jjhhhh............jj....',
      '.....jjjj...................',
    ],
  };

  HAIR.twintails = {
    back: [
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '..hhh.......................',
      '.hhhhh......................',
      '.hhhhh......................',
      '.hhhhh......................',
      '..hhhh......................',
      '..hhhh......................',
      '..hhhhh.....................',
      '...hhhh.....................',
      '...hhhh.....................',
      '...jhhh.....................',
      '...jhhh.....................',
      '...jjhh.....................',
      '....jhh.....................',
      '....jjh.....................',
      '.....j......................',
    ],
    front: HAIR.bob.front.slice(0, 15).map((r, i) => (i === 5 ? '....zz' + r.slice(6) : i === 6 ? '...zZz' + r.slice(6) : r)),
  };

  // Capuche (utilise la couleur de cape 'x').
  HAIR.hood = {
    back: [
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '............................',
      '...yy.......................',
      '..yxxy......................',
      '..yxxxy.....................',
      '...yxxy.....................',
      '....yy......................',
    ],
    front: [
      '............................',
      '............................',
      '..........xxxxx.............',
      '........xxxxxxxxxx..........',
      '......xxxxxxxxxxxxxx........',
      '.....xxxxxxxxxxxxxxxx.......',
      '....xxxxxxxxxxxxxxxxxx......',
      '....xxxxxxxxxxxxxxxxxxx.....',
      '...yxxxxxxxxxxxxxxxxxxx.....',
      '...yxxxxxxxhhhhhhhhhhxxx....',
      '...yxxxxxxhhhhjhhhjhhhxx....',
      '...yxxxxxxhhh.........xx....',
      '...yxxxxxx............xx....',
      '...yyxxxxx............xy....',
      '....yxxxxx...........yy.....',
      '....yyxxxx..................',
      '.....yyyy...................',
    ],
  };

  // Casque de chevalier (métal 'r').
  HAIR.helmet = {
    front: [
      '............................',
      '..............x.............',
      '.............xx.............',
      '...........vrxrr............',
      '.........vvrrrrrrr..........',
      '.......vvrrrrrrrrrrr........',
      '......vrrrrrrrrrrrrrr.......',
      '.....vrrrrrrrrrrrrrrrr......',
      '.....rrrrrrrrrrrrrrrrrr.....',
      '.....rrrrrgggggggggggggr....',
      '.....urrrrrrrrrrrrrrrrrr....',
      '.....urrrrrr.........rrr....',
      '.....urrrrr...........rr....',
      '.....uurrrr...........ur....',
      '......uurrr...........uu....',
      '.......uuu..................',
    ],
  };

  // Crâne (squelettes) : remplace la tête.
  H.SKULL = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '..........rrrrrrrr..........',
    '........rrrrrrrrrrrr........',
    '.......rrrrrrrrrrrrrr.......',
    '......rrrrrrrrrrrrrrrr......',
    '......rrrrrrrrrrrrrrrr......',
    '......rrrrrrrrrrrrrrrr......',
    '......rrrrrrrooorrooor......',
    '......rrrrrrrozorrozor......',
    '......urrrrrrooorrooor......',
    '......uurrrrrrrrorrrrr......',
    '.......urrrrrrrrrrrrrr......',
    '...........urororor.........',
    '.............uuu............',
  ];

  // ---------------------------------------------------------------- ACCESSOIRES
  const ACC = {};
  ACC.horns = [
    '...g...................g....',
    '...gq.................qg....',
    '....gq...............qg.....',
    '....ggq.............qgg.....',
    '.....ggq...........qgg......',
    '......gg...........gg.......',
  ];
  ACC.crown = [
    '............................',
    '..........g..g..g...........',
    '..........gzggzggg..........',
    '..........ggggggqg..........',
  ];
  ACC.headband = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '.x..........................',
    '.xx.........................',
    'xxyxxxxxxxxxxxxxxxxxxxxx....',
    '.yy.........................',
    '..y.........................',
  ];
  ACC.ears = [
    '............................',
    '............................',
    '....h.............h.........',
    '....hh...........hh.........',
    '....hih.........hih.........',
    '....hhhh.......hhhh.........',
  ];

  ACC.elf = [
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '..s.........................',
    '..tss.......................',
    '...tsss.....................',
    '....ttss....................',
  ];

  // ---------------------------------------------------------------- CAPES (arrière)
  const CAPE = {};
  CAPE.cape = [
    '............................',
    '.........xxxxxxx............',
    '.......xxxxxxxxxx...........',
    '......xxxxxxxxxxx...........',
    '.....xxxxxxxxxxxx...........',
    '.....xxxxxxxxxxx............',
    '....yxxxxxxxxxxx............',
    '....yxxxxxxxxxx.............',
    '...yyxxxxxxxxxx.............',
    '...yxxxxxxxxxxx.............',
    '..yyxxxxxxxxxxx.............',
    '..yxxxxxxxxxxx..............',
    '.yyxxxxxxxxxxx..............',
    '.yxxyxxxyxxxx...............',
    '.y.yy.yyy.yy................',
  ];
  CAPE.scarf = [
    '............................',
    '............................',
    '...........xxxxx............',
    '.....xxxxxxxxxxyx...........',
    '...xxxxyxxyyy...............',
    '..xxyxyy....................',
    '.xxyy.y.....................',
    'xyy.........................',
    'y...........................',
  ];

  // ---------------------------------------------------------------- CORPS / TENUES
  // Lignes 17 à 33 de la grille.
  const BODY = {};

  BODY.tunic = [
    '...........dtttd............',
    '.........aaadddaaa..........',
    '........baaaadaaaaa.........',
    '........baaaadaaaaa.........',
    '........baaaadaaaabkk.......',
    '........saaaadaaab.kss......',
    '........sggggqgggg...ss.....',
    '.........aaabaaaab..........',
    '........aaabaaaaaab.........',
    '........aabbaaaabbb.........',
    '.........dd....dd...........',
    '.........dd.....dd..........',
    '........kkk.....kkk.........',
    '........kkk.....kkk.........',
    '.......kkkk.....kkkk........',
    '......nnnnn.....nnnnnn......',
  ];

  BODY.armor = [
    '...........dtttd............',
    '........vrrrdddrrrv.........',
    '.......vrrrrvrrrrrrv........',
    '.......urrraavarrrru........',
    '.......uuraaaaaaarbkk.......',
    '........saaaaaaaab.kss......',
    '........sggggqgggg...ss.....',
    '.........aaabaaaab..........',
    '........aaabarraaab.........',
    '........aabbarrabbb.........',
    '.........rr....rr...........',
    '.........dd.....dd..........',
    '........rrr.....rrr.........',
    '........rrr.....rrr.........',
    '.......urrr.....rrrr........',
    '......uuuuu.....uuuuuu......',
  ];

  BODY.robe = [
    '...........dtttd............',
    '.........aaagggaaa..........',
    '........baaaagaaaaa.........',
    '........baaaagaaaaa.........',
    '........baaaagaaaabkk.......',
    '........saaaagaaab.kss......',
    '........sddddzdddd...ss.....',
    '........aaaaagaaaab.........',
    '........aaaabgaaaab.........',
    '.......baaaabgaaaaab........',
    '.......baaabbgaaaaab........',
    '.......baaabbgaaaaaab.......',
    '......bbaaabbgaaaaaab.......',
    '......bbaabbbgaaaaaabb......',
    '......bbbbbbbbbbbbbbbb......',
    '.......nnnn.....nnnnn.......',
  ];

  BODY.coat = [
    '...........dtttd............',
    '.........aaadddaaa..........',
    '........baaaagaaaaa.........',
    '........baaaagaaaaa.........',
    '........baaaagaaaabkk.......',
    '........kaaaagaaab.kss......',
    '........kggggqgggg...ss.....',
    '........baaaddaaaab.........',
    '.......bbaaddddaaab.........',
    '.......bbaad..ddaaab........',
    '......bbbad....dbaab........',
    '......bbb.dd....ddbb........',
    '......bb.kkk.....kkkb.......',
    '.........kkk.....kkk........',
    '........kkkk.....kkkk.......',
    '.......nnnnn.....nnnnnn.....',
  ];

  BODY.heavy = [
    '...........tttttt...........',
    '........ssaaaaaaass.........',
    '.......ssssaaaaaasssk.......',
    '.......tsssaaaaaasssk.......',
    '.......tssaaaaaaaassskk.....',
    '.......kssaaaaaaaas.kss.....',
    '.......kkggggqggggg..ss.....',
    '........ddddddddddd.........',
    '........dddfddddddf.........',
    '........ddffdddddff.........',
    '.........dd....ddd..........',
    '.........dd.....dd..........',
    '........kkk.....kkk.........',
    '........kkk.....kkk.........',
    '.......kkkk.....kkkk........',
    '......nnnnn.....nnnnnn......',
  ];

  BODY.bones = [
    '.............uuu............',
    '..........rrrrrrrr..........',
    '........ur.rrrrr.ru.........',
    '........r..rrrrr..r.........',
    '........r..rrrrr..rrr.......',
    '........r...rrr...r.rrr.....',
    '........r..ggggg.....rr.....',
    '...........rr.rr............',
    '...........r...r............',
    '..........rr...rr...........',
    '..........r.....r...........',
    '..........r.....r...........',
    '.........rr.....rr..........',
    '.........r.......r..........',
    '........rrr......rrr........',
    '.......uuuu......uuuu.......',
  ];

  // ---------------------------------------------------------------- ARMES
  // Gabarits orientés vers le haut ; GRIP = point de prise (en bas).
  const WEAPONS = {};
  WEAPONS.sword = {
    grip: [2, 17],
    t: [
      '..v..',
      '.vrr.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      '.vru.',
      'ggzgg',
      'qgggq',
      '..k..',
      '..k..',
      '..k..',
      '..g..',
    ],
  };
  WEAPONS.greatsword = {
    grip: [3, 24],
    t: [
      '...v...',
      '..vrr..',
      '.vrrru.',
      '.vrzru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrrru.',
      '.vrzru.',
      '.vrrru.',
      'ggggggg',
      'qgzgzgq',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '..ggg..',
    ],
  };
  WEAPONS.rapier = {
    grip: [2, 18],
    t: [
      '..v..',
      '..v..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '..r..',
      '.ggg.',
      'g.z.g',
      'g...g',
      '.g.g.',
      '..k..',
      '..k..',
      '..g..',
    ],
  };
  WEAPONS.staff = {
    grip: [3, 17],
    t: [
      '..ggg..',
      '.gzZzg.',
      'gzZZzzg',
      'gzzzzzg',
      '.gzzzg.',
      '..gqg..',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...k...',
      '...g...',
    ],
  };
  WEAPONS.spear = {
    grip: [2, 19],
    t: [
      '..v..',
      '.vrr.',
      '.vru.',
      'vrrru',
      '.vru.',
      '.ggg.',
      '.xzx.',
      '..x..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..k..',
      '..g..',
    ],
  };
  WEAPONS.axe = {
    grip: [4, 17],
    t: [
      '.....g....',
      '..vvrgr...',
      '.vrrrgrr..',
      'vrrrrgrrr.',
      'vrrrrgrrru',
      'vrrrrgrrru',
      '.urrrgrru.',
      '..uurguu..',
      '.....k....',
      '.....k....',
      '.....k....',
      '.....k....',
      '.....k....',
      '.....k....',
      '.....k....',
      '.....k....',
      '.....k....',
      '.....g....',
    ],
  };
  WEAPONS.hammer = {
    grip: [4, 17],
    t: [
      '.ggggggg..',
      'grrrrrrrg.',
      'grrzrzrrg.',
      'grrrrrrrg.',
      'guuuuuuug.',
      '.ggggggg..',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....kk....',
      '....gg....',
    ],
  };
  WEAPONS.scythe = {
    grip: [9, 23],
    t: [
      '.....vvrrrr...',
      '...vrrrrrrrrg.',
      '.vrrruuuuurrgg',
      'vru.......kggz',
      'v.........kg..',
      '..........k...',
      '..........k...',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '.........k....',
      '........gzg...',
    ],
  };
  WEAPONS.dagger = {
    grip: [1, 9],
    t: ['.v.', 'vr.', 'vru', 'vru', 'vru', 'vru', 'gzg', '.k.', '.k.', '.g.'],
  };
  WEAPONS.bow = {
    grip: [2, 10],
    t: [
      '..gg...',
      '.g..W..',
      'g...W..',
      'g....W.',
      'g....W.',
      'g.....W',
      'g.....W',
      'k.....W',
      'k.....W',
      'k.....W',
      'k.....W',
      'k.....W',
      'k.....W',
      'k.....W',
      'g.....W',
      'g.....W',
      'g....W.',
      'g....W.',
      'g...W..',
      '.g..W..',
      '..gg...',
    ],
  };
  WEAPONS.tome = {
    grip: [3, 6],
    t: ['.aaaaaa', 'agggggg', 'agzZzgg', 'aggzggg', 'agggggg', 'abbbbbb', '...k...'],
  };
  WEAPONS.claw = {
    grip: [2, 6],
    t: ['v.v.v', 'r.r.r', 'r.r.r', 'urrru', '.kkk.', '..k..', '..k..'],
  };
  WEAPONS.none = null;

  H.WEAPONS = WEAPONS;

  // ---------------------------------------------------------------- CONSTRUCTION
  const cache = new Map();

  // def.look = { hair, body, cape, acc, weapon, head:'skull', colors:{...} }
  H.build = (key, look) => {
    if (cache.has(key)) return cache.get(key);
    const pal = Pix.charPalette(look.colors || {});
    const g = Pix.grid(H.W, H.H);
    const hair = HAIR[look.hair] || null;
    if (look.cape && CAPE[look.cape]) Pix.stamp(g, CAPE[look.cape], 0, look.cape === 'cape' ? 16 : 14);
    if (hair && hair.back) Pix.stamp(g, hair.back, 0, 0);
    Pix.stamp(g, BODY[look.body] || BODY.tunic, 0, 17);
    Pix.stamp(g, look.head === 'skull' ? H.SKULL : HEAD, 0, 0);
    if (hair && hair.front) Pix.stamp(g, hair.front, 0, 0);
    if (look.acc && ACC[look.acc]) Pix.stamp(g, ACC[look.acc], 0, look.acc === 'crown' ? 1 : 0);
    if (look.scarf) Pix.stamp(g, CAPE.scarf, 0, 14);
    const body = Pix.render(g, pal);

    let weapon = null;
    let grip = [0, 0];
    const wdef = WEAPONS[look.weapon];
    if (wdef) {
      weapon = Pix.render(Pix.fromTemplate(wdef.t), pal);
      grip = [wdef.grip[0] + weapon.pad, wdef.grip[1] + weapon.pad];
    }
    const pad = body.pad;
    const res = {
      body,
      white: Pix.silhouette(body, '#ffffff'),
      dark: Pix.silhouette(body, '#0a0614'),
      weapon,
      weaponWhite: weapon ? Pix.silhouette(weapon, '#ffffff') : null,
      weaponDark: weapon ? Pix.silhouette(weapon, '#0a0614') : null,
      grip,
      hand: { x: H.HAND.x + pad, y: H.HAND.y + pad },
      w: body.width,
      h: body.height,
      // pied : centre bas de la grille
      foot: { x: 13 + pad, y: H.H + pad - 1 },
      // visage (pour les portraits)
      face: { x: 2 + pad, y: 0 + pad, w: 26, h: 20 },
      look,
    };
    cache.set(key, res);
    return res;
  };
})();
