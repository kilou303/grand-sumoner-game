'use strict';
// Sprites des monstres (dessinés tournés vers la gauche).
// Palette : a = principal, b = ombre, c = clair, W = blanc, o = sombre, R = yeux, Z/z = lueur.
(function () {
  const U = GS.U;
  const Pix = GS.Pix;
  const M = (GS.MonsterArt = {});

  const pal = (main, extra = {}) =>
    Object.assign(
      {
        a: main,
        b: U.shade(main, -0.3),
        c: U.shade(main, 0.35),
        W: '#ffffff',
        o: '#24142e',
        R: '#ff3048',
        Z: '#fff0a0',
        z: '#ffb020',
        m: U.shade(main, -0.55),
        d: '#5a4a6a',
        f: U.shade('#5a4a6a', 0.3),
        g: '#f0c040',
        q: '#b08020',
      },
      extra
    );

  const DEFS = (M.DEFS = {});

  DEFS.slime = {
    colors: () => pal('#58c860'),
    t: [
      '........aaaa........',
      '......aaaaaaaa......',
      '.....acWcaaaaaa.....',
      '....acWWcaaaaaaa....',
      '...aacccaaaaaaaaa...',
      '...aaaaaaaaaaaaaa...',
      '..aaoWaaoWaaaaaaab..',
      '..aaooaaooaaaaaaab..',
      '.aaaaaaaaaaaaaaaabb.',
      '.aaaammmaaaaaaaaabb.',
      '.baaaaaaaaaaaaaaabb.',
      'bbaaaaaaaaaaaaaaabbb',
      'bbbaaaaaaaaaaaaabbbb',
      '.bbbbbbbbbbbbbbbbbb.',
    ],
  };

  DEFS.kingslime = {
    colors: () => pal('#60a0f0'),
    t: [
      '.....g..g..g........',
      '.....gZggZggg.......',
      '.....ggggggqg.......',
      '......aaaaaaa.......',
      '.....aaaaaaaaaa.....',
      '....acWcaaaaaaaa....',
      '...acWWcaaaaaaaaa...',
      '..aacccaaaaaaaaaaa..',
      '..aaaaaaaaaaaaaaaab.',
      '.aaoWaaoWaaaaaaaaab.',
      '.aaooaaooaaaaaaaaab.',
      '.aaaaaaaaaaaaaaaaabb',
      'aaaammmmaaaaaaaaaabb',
      'baaaaaaaaaaaaaaaaabb',
      'bbaaaaaaaaaaaaaaabbb',
      'bbbbaaaaaaaaaaaabbbb',
      '.bbbbbbbbbbbbbbbbbb.',
    ],
  };

  DEFS.wolf = {
    colors: () => pal('#8a90a8', { c: '#e0e4f0' }),
    t: [
      '.......a..a.......................',
      '......aaa.aa......................',
      '......aaaaaa......................',
      '.....aaaaaaaa..................b..',
      '....aaRaaaaaaa................bab.',
      '..aaaaaaaaaaaaa..............baab.',
      'oaaaaaaaaaaaaaaab...........baab..',
      '.ccaaaaaaaaaaaaaaaaaaaaaaabbaab...',
      '..cWcWaaaaaaaaaaaaaaaaaaaaaaab....',
      '...cccaaaaaaaaaaaaaaaaaaaaaaab....',
      '......ccaaaaaaaaaaaaaaaaaaaabb....',
      '.......cccaaaaaaaaaaaaaaaaabb.....',
      '........ccaaaabbbbbbbbbaaaabb.....',
      '........baaab.........baaab.......',
      '.......baab..b........baab.bb.....',
      '.......bab..bb.........bab..bb....',
      '......bab...bb.........bab...b....',
      '......bab...b..........bab...bb...',
      '.....ooo...oo.........ooo....oo...',
    ],
  };

  DEFS.bat = {
    colors: () => pal('#6a4a90'),
    t: [
      'a..........aa..........a',
      'aa........aaaa........aa',
      'aaa......aRaaRa......aaa',
      'aaaa....aaaaaaaa....aaaa',
      'aaaaa...aaWaaWaa...aaaaa',
      '.aaaaaaaaaaaaaaaaaaaaaa.',
      '..aaaaaaaaaaaaaaaaaaaa..',
      '...aab.aab.aaaa.baa.baa.',
      '...ab..ab...aa...ba..ba.',
      '...b...b..........b...b.',
    ],
  };

  DEFS.golem = {
    colors: () => pal('#8a7a68', { Z: '#80f0ff', z: '#40c0f0' }),
    t: [
      '..........bbbbbbb.............',
      '........bbaaaaaaabb...........',
      '.......baaaaaaaaaab...........',
      '.......baZZaaZZaaab...........',
      '.......baaaaaaaaaab...........',
      '........baaaaaaaab............',
      '....bbbbbaaaaaaabbbbbb........',
      '...baaaaaaaaaaaaaaaaaab.......',
      '..baaaaaaaaaaaaaaaaaaaab......',
      '..baaacaaaaazzaaaaacaaab......',
      '.baaaabaaaazZZzaaaabaaaab.....',
      '.baaab.baaaazzaaaab.baaab.....',
      '.baaab.baaaaaaaaaab.baaab.....',
      'baaaab.baaaaaaaaaab.baaaab....',
      'baaab..bbaaaaaaaabb..baaab....',
      'baaab...baaaaaaaab...baaab....',
      'bcccb...bbbbbbbbbb...bcccb....',
      'bcccb...baaab.baaab..bcccb....',
      '.bbb....baaab.baaab...bbb.....',
      '........baaab.baaab...........',
      '.......bbaaab.baaabb..........',
      '.......baaaab.baaaab..........',
      '.......bbbbbb.bbbbbb..........',
    ],
  };

  DEFS.mushroom = {
    colors: () => pal('#d04848', { c: '#f8e8d0', d: '#c8b090' }),
    t: [
      '......aaaaaa......',
      '....aaWaaaaaaa....',
      '...aaWWaaaWWaaa...',
      '..aaaaaaaaaWWaaa..',
      '.aaWWaaaaaaaaaaaa.',
      '.aaWWaaaaaWaaaaaa.',
      'aaaaaaaaaaaaaaaaab',
      'bbbbbbbbbbbbbbbbbb',
      '....cccccccccc....',
      '....coccocccccc...',
      '....coccoccccc....',
      '....ccccccccccc...',
      '....ccmmmccccc....',
      '....cccccccccc....',
      '...dcccccccccd....',
      '...dd.......dd....',
    ],
  };

  DEFS.wisp = {
    colors: () => pal('#ff7020', { c: '#ffd040' }),
    t: [
      '.......a........',
      '......aa........',
      '.....aaa..a.....',
      '....aaaa.aa.....',
      '...aaacaaaa.....',
      '...aacccaaa.a...',
      '..aacccccaaaa...',
      '..accWWcccaa....',
      '.aaccWWccccaa...',
      '.acccccccccaa...',
      '.acWoccWocca....',
      '.accccccccca....',
      '..acccmmccaa....',
      '..aaccccccaa....',
      '...aaccccaa.....',
      '....aaaaaa......',
      '......aa........',
    ],
  };

  DEFS.dragon = {
    colors: () => pal('#c83828', { c: '#f8a040', d: '#7a2030', f: '#b04050', Z: '#fff080' }),
    t: [
      '...........................dd.....................',
      '..........................dffd....................',
      '.....g...g...............dfffd...........dd.......',
      '.....gg.gg..............dffffd.........ddfd.......',
      '......aaaa.............dfffffd.......ddfffd.......',
      '.....aaaaaa...........dffffffd.....ddffffd........',
      '....aaZaaaaa.........dffffffffd..ddfffffd.........',
      '..aaaaaaaaaaa.......dfffffffffddddffffffd.........',
      '.aaaaaaaaaaaab.....dffffffffffffffffffd...........',
      'oaaaaaaaaaaaab....dfffffffffffffffffd.............',
      '.WcWc.bbaaaaab...dffffffffffffffffd...............',
      '..........baaab..dfffffffffffffd..................',
      '.WcWc....baaaab.dd.dfffffffd......................',
      'aaaaab..baaaab......ddddddd.......................',
      '.bbbbbbbaaaab.....................................',
      '.......baaaab.....................................',
      '........baaaab....................................',
      '.........baaaaaaaaaaaaab..........................',
      '.........baacccaaaaaaaaaab........................',
      '........baacccccaaaaaaaaaab.......................',
      '........bacccccccaaaaaaaaaab......................',
      '........bacccccccaaaaaaaaaaab.....................',
      '........baccccccaaaaaaaaaaaaab....................',
      '.........bacccccaaaaaaaaaaaaaab..............bb...',
      '.........baccccaaaaaaaaaaaaaaabbb..........bbab...',
      '..........baacaaaaaaaaaaaaaaaaaabbbb....bbbaab....',
      '...........baaaabbbbbaaaaaaaaaaaaaaabbbbaaaab.....',
      '...........baaab....baaaab.bbaaaaaaaaaaaabb.......',
      '..........baaab.....baaab....bbbbbbbbbbbb.........',
      '..........baab......baab..........................',
      '.........baab......baab...........................',
      '........WbWb.......WbWb...........................',
    ],
  };

  const cache = new Map();
  // key = identifiant du cache, kind = DEFS, opts.colors = surcharge {a:...}, opts.scale
  M.build = (key, kind, opts = {}) => {
    const ck = key + '|' + kind;
    if (cache.has(ck)) return cache.get(ck);
    const def = DEFS[kind];
    let palette = def.colors();
    if (opts.main) palette = Object.assign(palette, pal(opts.main), opts.extra || {});
    else if (opts.extra) palette = Object.assign(palette, opts.extra);
    let body = Pix.render(Pix.fromTemplate(def.t), palette);
    const k = opts.scale || 1;
    if (k > 1) body = Pix.scale(body, k);
    const res = {
      body,
      white: Pix.silhouette(body, '#ffffff'),
      dark: Pix.silhouette(body, '#0a0614'),
      weapon: null,
      w: body.width,
      h: body.height,
      foot: { x: Math.round(body.width / 2), y: body.height - k },
      face: { x: 0, y: 0, w: Math.min(body.width, 26 * k), h: Math.min(body.height, 20 * k) },
      flying: kind === 'bat' || kind === 'wisp',
      scale: k,
    };
    cache.set(ck, res);
    return res;
  };

  // Ennemi humanoïde : sprite de héros retourné (et éventuellement agrandi).
  M.buildHumanoid = (key, look, scale = 1) => {
    const ck = 'h|' + key;
    if (cache.has(ck)) return cache.get(ck);
    const src = GS.HeroArt.build('enemy_' + key, look);
    let body = Pix.flip(src.body);
    let weapon = src.weapon ? Pix.flip(src.weapon) : null;
    if (scale > 1) {
      body = Pix.scale(body, scale);
      if (weapon) weapon = Pix.scale(weapon, scale);
    }
    const res = {
      body,
      white: Pix.silhouette(body, '#ffffff'),
      dark: Pix.silhouette(body, '#0a0614'),
      weapon,
      weaponWhite: weapon ? Pix.silhouette(weapon, '#ffffff') : null,
      grip: weapon ? [weapon.width - src.grip[0] * scale - scale, src.grip[1] * scale] : [0, 0],
      hand: { x: body.width - src.hand.x * scale - scale, y: src.hand.y * scale },
      w: body.width,
      h: body.height,
      foot: { x: body.width - src.foot.x * scale - scale, y: body.height - scale },
      face: { x: body.width - (src.face.x + src.face.w) * scale, y: 0, w: src.face.w * scale, h: src.face.h * scale },
      humanoid: true,
      flipped: true,
      scale,
    };
    cache.set(ck, res);
    return res;
  };
})();
