'use strict';
// Espace de noms global du jeu + utilitaires (maths, couleurs, easing, aléatoire).
window.GS = window.GS || {};

(function () {
  const U = (GS.U = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
  U.inRect = (px, py, x, y, w, h) => px >= x && py >= y && px < x + w && py < y + h;

  U.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Générateur pseudo-aléatoire déterministe (pour les décors).
  U.seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Formatage des nombres à la française (espace fine comme séparateur).
  U.fmt = (n) => {
    const s = String(Math.round(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // ---- Couleurs ----
  const rgbCache = new Map();
  U.hexToRgb = (hex) => {
    let c = rgbCache.get(hex);
    if (c) return c;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
    return c;
  };
  U.rgbToHex = (r, g, b) =>
    '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  U.mix = (a, b, t) => {
    const ca = U.hexToRgb(a);
    const cb = U.hexToRgb(b);
    return U.rgbToHex(U.lerp(ca[0], cb[0], t), U.lerp(ca[1], cb[1], t), U.lerp(ca[2], cb[2], t));
  };
  // amt > 0 éclaircit (vers un blanc chaud), amt < 0 assombrit (vers un violet nuit) : ombrage "pixel art".
  U.shade = (hex, amt) => (amt >= 0 ? U.mix(hex, '#fff8e8', amt) : U.mix(hex, '#1c1030', -amt));
  U.rgba = (hex, a) => {
    const c = U.hexToRgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };

  // ---- Easing ----
  U.Ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => --t * t * t + 1,
    outBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: (t) =>
      t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  };
})();
