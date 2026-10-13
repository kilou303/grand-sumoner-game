'use strict';
// Petites icônes pixel art (éléments, cristal, or...).
(function () {
  const Pix = GS.Pix;
  const I = (GS.Icons = {});

  const T = {
    fire: { t: ['....a....', '...aa....', '...aaa.a.', '..aabaaa.', '.aabbbaa.', '.abbcbba.', '.abcccba.', '..abcba..', '...aaa...'], p: { a: '#ff5020', b: '#ff9a30', c: '#fff080' } },
    water: { t: ['....a....', '....a....', '...aaa...', '..aabaa..', '..abbba..', '.aabbbaa.', '.abbcbba.', '.abbbbba.', '..aaaaa..'], p: { a: '#2a70f0', b: '#50b0ff', c: '#e0f8ff' } },
    earth: { t: ['.......aa', '.....aaba', '...aabbba', '..abbbbba', '.abbbcba.', '.abbcba..', '.abcba...', '.aca.....', 'c........'], p: { a: '#2a9a30', b: '#70d050', c: '#d0ff90' } },
    light: { t: ['....a....', '.a..a..a.', '..abbba..', '..bbcbb..', 'aabcccbaa', '..bbcbb..', '..abbba..', '.a..a..a.', '....a....'], p: { a: '#f0b020', b: '#ffe050', c: '#ffffff' } },
    dark: { t: ['...aaa...', '..aab....', '.aab.....', '.abb.....', '.abb.....', '.abb.....', '.aabb...a', '..aabbbba', '...aaaa..'], p: { a: '#8a40e0', b: '#c080ff', c: '#ffffff' } },
    gem: { t: ['..aaaaa..', '.abcccba.', 'abbcccbba', 'aaaaaaaaa', '.abbcbba.', '..abcba..', '...aba...', '....a....'], p: { a: '#2a90ff', b: '#70d0ff', c: '#e8ffff' } },
    gold: { t: ['..aaaa..', '.abbbba.', 'abbcbbba', 'abcbbbba', 'abbbbbba', 'abbbbcba', '.abbbba.', '..aaaa..'], p: { a: '#c08010', b: '#ffd040', c: '#fff8c0' } },
    star: { t: ['...a...', '...a...', '..aba..', 'aabbbaa', '.abbba.', '.ab.ba.', 'a.....a'], p: { a: '#ffc020', b: '#fff080' } },
    sword: { t: ['......a', '.....ab', '....ab.', 'c..ab..', '.cab...', '.cc....', 'c..c...'], p: { a: '#c8d0e0', b: '#ffffff', c: '#e0a040' } },
    heart: { t: ['.aa.aa.', 'abbabba', 'abbbbba', '.abbba.', '..aba..', '...a...'], p: { a: '#e02040', b: '#ff6080' } },
    sound: { t: ['...a....', '..aa..a.', 'aaaa...a', 'aaaa.a.a', 'aaaa...a', '..aa..a.', '...a....'], p: { a: '#e8fbff' } },
    mute: { t: ['...a....', '..aa....', 'aaaa.a.a', 'aaaa..a.', 'aaaa.a.a', '..aa....', '...a....'], p: { a: '#ff7080' } },
    lock: { t: ['.aaa.', 'a...a', 'a...a', 'bbbbb', 'bbcbb', 'bbcbb', 'bbbbb'], p: { a: '#a0a8b8', b: '#e0b040', c: '#5a3a10' } },
    crown: { t: ['a..a..a', 'aa.a.aa', 'abababa', 'bbbbbbb', 'acacaca'], p: { a: '#ffd040', b: '#e0a020', c: '#ff4060' } },
  };

  const cache = {};
  I.get = (name, outline = true) => {
    const k = name + outline;
    if (cache[k]) return cache[k];
    const d = T[name];
    if (!d) return null;
    cache[k] = Pix.render(Pix.fromTemplate(d.t), d.p, { outline });
    return cache[k];
  };

  I.draw = (name, x, y, scale = 1) => {
    const c = I.get(name);
    if (!c) return;
    GS.ctx.drawImage(c, Math.round(x), Math.round(y), c.width * scale, c.height * scale);
  };

  // Étoiles de rareté.
  I.stars = (n, x, y, o = {}) => {
    const c = I.get('star');
    const sp = o.spacing || c.width;
    const t = o.t || 0;
    for (let i = 0; i < n; i++) {
      const dy = o.bounce ? Math.round(Math.sin(t * 6 + i * 0.8) * 1) : 0;
      GS.ctx.drawImage(c, Math.round(x + i * sp), Math.round(y + dy));
    }
    return n * sp;
  };
})();
