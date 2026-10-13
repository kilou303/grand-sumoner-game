'use strict';
// Fléaux (créatures maudites façon jujutsu) générés procéduralement en pixel art :
// chair texturée, veines, yeux injectés de sang, gueules pleines de dents, bras griffus,
// tentacules. Chaque fléau a plusieurs images (respiration, clignements, tentacules).
(function () {
  const U = GS.U;
  const Pix = GS.Pix;
  const C = (GS.Curses = {});

  // ------------------------------------------------------------ peinture sur grille de couleurs
  class Paint {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.c = new Array(w * h).fill(null);
    }
    set(x, y, col) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.c[y * this.w + x] = col;
    }
    get(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.c[y * this.w + x];
    }
    // Ellipse ombrée (lumière en haut à gauche) + texture.
    blob(cx, cy, rx, ry, ramp, rng, o = {}) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const nx = (x + 0.5 - cx) / rx;
          const ny = (y + 0.5 - cy) / ry;
          const d = nx * nx + ny * ny;
          if (d > 1) continue;
          let l = 0.55 - nx * 0.35 - ny * 0.45 - d * 0.25 + (rng() - 0.5) * (o.noise || 0.22);
          const i = U.clamp(Math.floor(l * ramp.length), 0, ramp.length - 1);
          this.set(x, y, ramp[i]);
        }
      }
    }
    line(x0, y0, x1, y1, col, w = 1) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5) + 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = U.lerp(x0, x1, t);
        const y = U.lerp(y0, y1, t);
        for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) this.set(x + a - (w >> 1), y + b - (w >> 1), col);
      }
    }
    // Membre épais ombré entre deux points.
    limb(x0, y0, x1, y1, r, ramp) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const cx = U.lerp(x0, x1, t);
        const cy = U.lerp(y0, y1, t);
        const rr = U.lerp(r, r * 0.7, t);
        for (let y = Math.floor(cy - rr); y <= cy + rr; y++)
          for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            if (dx * dx + dy * dy > rr * rr) continue;
            const l = 0.5 - (dx / rr) * 0.3 - (dy / rr) * 0.4;
            this.set(x, y, ramp[U.clamp(Math.floor(l * ramp.length), 0, ramp.length - 1)]);
          }
      }
    }
    // Œil : sclère, iris qui regarde vers la gauche (les héros), pupille, reflet, veines.
    eye(cx, cy, r, iris, look = -0.4, closed = false) {
      if (closed) {
        for (let x = -r; x <= r; x++) this.set(cx + x, cy, '#2a0a10');
        return;
      }
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) {
          const d = x * x + y * y;
          if (d > r * r + 0.5) continue;
          this.set(cx + x, cy + y, d > (r - 0.8) * (r - 0.8) && r > 2 ? '#c8b8a8' : '#f2ead8');
        }
      if (r >= 3) {
        this.set(cx - r + 1, cy - 1, '#d03040');
        this.set(cx + r - 1, cy + 1, '#d03040');
      }
      const ir = Math.max(1, r * 0.62);
      const ix = cx + look * r * 0.5;
      for (let y = -ir; y <= ir; y++) for (let x = -ir; x <= ir; x++) if (x * x + y * y <= ir * ir) this.set(ix + x, cy + y, iris);
      const pr = Math.max(0.5, ir * 0.5);
      for (let y = -pr; y <= pr; y++) for (let x = -pr; x <= pr; x++) if (x * x + y * y <= pr * pr + 0.3) this.set(ix + x, cy + y, '#0a0408');
      this.set(ix - Math.max(1, Math.floor(ir * 0.5)), cy - Math.max(1, Math.floor(ir * 0.5)), '#ffffff');
    }
    // Gueule : intérieur sombre, gencives, rangées de dents.
    mouth(cx, cy, w, h, rng) {
      for (let y = -h; y <= h; y++)
        for (let x = -w; x <= w; x++) {
          const d = (x * x) / (w * w) + (y * y) / (h * h);
          if (d > 1) continue;
          this.set(cx + x, cy + y, d > 0.7 ? '#8a1020' : y > h * 0.3 ? '#3a0410' : '#1a0208');
        }
      // dents
      for (let x = -w + 1; x < w; x += 2) {
        const yt = cy - h * Math.sqrt(Math.max(0, 1 - (x * x) / (w * w))) + 1;
        const yb = cy + h * Math.sqrt(Math.max(0, 1 - (x * x) / (w * w))) - 1;
        const tl = 1 + Math.floor(rng() * 2.5);
        for (let k = 0; k < tl; k++) {
          this.set(cx + x, yt + k, k === tl - 1 ? '#c8c0a8' : '#f4eedc');
          this.set(cx + x + (k ? 0 : 1), yt, '#f4eedc');
          this.set(cx + x, yb - k, k === tl - 1 ? '#c8c0a8' : '#f4eedc');
        }
      }
      // langue
      this.set(cx, cy + 1, '#d04050');
      this.set(cx + 1, cy + 1, '#d04050');
    }
    veins(rng, ramp, n) {
      // lignes sombres sur la chair existante
      for (let i = 0; i < n; i++) {
        let x = rng() * this.w;
        let y = rng() * this.h;
        for (let k = 0; k < 10; k++) {
          if (this.get(Math.round(x), Math.round(y))) this.set(x, y, ramp[0]);
          x += (rng() - 0.5) * 3;
          y += (rng() - 0.3) * 2;
        }
      }
    }
    toCanvas() {
      // détourage sombre automatique
      const w = this.w + 2;
      const h = this.h + 2;
      const cv = Pix.makeCanvas(w, h);
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(w, h);
      const at = (x, y) => (x < 1 || y < 1 || x > this.w || y > this.h ? null : this.c[(y - 1) * this.w + (x - 1)]);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          let col = at(x, y);
          if (!col && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) col = '#0a0408';
          if (!col) continue;
          const [r, g, b] = U.hexToRgb(col);
          const o = (y * w + x) * 4;
          img.data[o] = r;
          img.data[o + 1] = g;
          img.data[o + 2] = b;
          img.data[o + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
      cv.pad = 1;
      return cv;
    }
  }
  C.Paint = Paint;

  const ramp = (base) => [U.shade(base, -0.65), U.shade(base, -0.45), U.shade(base, -0.25), base, U.shade(base, 0.22), U.shade(base, 0.42)];

  // ------------------------------------------------------------ types de fléaux
  // Chaque fonction dessine l'image `f` (0..3) d'une créature ; s = taille (1 normal, 2 boss).
  const TYPES = {};

  // Gueule : énorme masse de chair, bouche verticale pleine de dents, yeux partout.
  TYPES.maw = (P, rng, f, k, o) => {
    const R = ramp(o.flesh || '#8a6a78');
    const w = P.w;
    const h = P.h;
    const br = f % 2 ? 0.5 : 0;
    // bras griffus
    P.limb(w * 0.22, h * 0.55, w * 0.06, h * 0.86 + br, 2.4 * k, R);
    P.limb(w * 0.78, h * 0.55, w * 0.92, h * 0.86 + br, 2.4 * k, R);
    for (const sx of [w * 0.06, w * 0.92]) for (let c = -1; c <= 1; c++) P.line(sx, h * 0.86, sx + c * 2 * k, h * 0.96, '#e8e0cc');
    P.blob(w / 2, h * 0.52 - br, w * 0.36, h * 0.4 + br, R, rng);
    P.veins(rng, R, 10 * k);
    P.mouth(w * 0.42, h * 0.58, w * 0.17, h * 0.16 + (f === 2 ? 2 * k : 0), rng);
    const eyes = o.eyes || [[0.3, 0.26, 3], [0.55, 0.2, 4], [0.7, 0.34, 2], [0.22, 0.4, 2], [0.62, 0.42, 2]];
    eyes.forEach(([ex, ey, er], i) => P.eye(w * ex, h * ey - br, Math.round(er * k), o.iris || '#e8c020', -0.5, f === 3 && i % 2 === 0));
    // jambes courtes
    P.limb(w * 0.38, h * 0.85, w * 0.34, h - 1, 2.5 * k, R);
    P.limb(w * 0.6, h * 0.85, w * 0.64, h - 1, 2.5 * k, R);
  };

  // Rampant : corps bas et allongé, quatre longs membres osseux, tête pleine de dents.
  TYPES.crawler = (P, rng, f, k, o) => {
    const R = ramp(o.flesh || '#6a7a6a');
    const w = P.w;
    const h = P.h;
    const ph = (f / 4) * Math.PI * 2;
    const legs = [0.2, 0.42, 0.62, 0.84];
    legs.forEach((lx, i) => {
      const lift = Math.sin(ph + i * 1.7) * 2 * k;
      const kx = w * lx + (i % 2 ? 4 : -4) * k;
      P.limb(w * lx, h * 0.5, kx, h * 0.3 + lift, 1.6 * k, R);
      P.limb(kx, h * 0.3 + lift, w * lx - 3 * k, h - 1, 1.3 * k, R);
      P.line(w * lx - 3 * k, h - 1, w * lx - 5 * k, h - 1, '#e8e0cc');
    });
    P.blob(w * 0.58, h * 0.55, w * 0.34, h * 0.2, R, rng);
    P.veins(rng, R, 8 * k);
    // tête
    P.blob(w * 0.2, h * 0.5, w * 0.15, h * 0.22, R, rng);
    P.mouth(w * 0.15, h * 0.58, w * 0.08, h * 0.08 + (f === 1 ? 1 : 0), rng);
    P.eye(w * 0.2, h * 0.38, Math.round(2 * k), o.iris || '#ff3030', -0.6, f === 3);
    P.eye(w * 0.28, h * 0.42, Math.round(1.5 * k), o.iris || '#ff3030', -0.6);
    P.eye(w * 0.12, h * 0.42, Math.round(1.5 * k), o.iris || '#ff3030', -0.6);
    // épines dorsales
    for (let i = 0; i < 5; i++) P.line(w * (0.4 + i * 0.1), h * 0.38, w * (0.42 + i * 0.1), h * 0.26, '#e8e0cc');
  };

  // Grappe d'yeux flottante avec tentacules.
  TYPES.eyes = (P, rng, f, k, o) => {
    const R = ramp(o.flesh || '#7a4a6a');
    const w = P.w;
    const h = P.h;
    const ph = (f / 4) * Math.PI * 2;
    for (let t = 0; t < 5; t++) {
      let x = w * (0.28 + t * 0.11);
      let y = h * 0.55;
      for (let s = 0; s < 9; s++) {
        x += Math.sin(ph + s * 0.7 + t) * 1.2 * k;
        y += 1.6 * k;
        P.blob(x, y, (2.4 - s * 0.22) * k, (2.4 - s * 0.22) * k, R, rng, { noise: 0.1 });
      }
    }
    P.blob(w / 2, h * 0.38, w * 0.36, h * 0.28, R, rng);
    P.veins(rng, R, 8 * k);
    const eyes = [[0.5, 0.36, 6], [0.28, 0.3, 3], [0.7, 0.26, 3], [0.36, 0.5, 2], [0.66, 0.48, 2], [0.48, 0.16, 2], [0.2, 0.44, 2]];
    eyes.forEach(([ex, ey, er], i) => P.eye(w * ex, h * ey, Math.round(er * k), i === 0 ? o.iris || '#ff2040' : '#e8c020', -0.4, f === 2 && i > 0 && i % 2));
  };

  // Pendu : silhouette maigre et immense, cou interminable, tête pendante masquée.
  TYPES.hanged = (P, rng, f, k, o) => {
    const R = ramp(o.flesh || '#5a5466');
    const Cl = ramp(o.cloth || '#1a1420');
    const w = P.w;
    const h = P.h;
    const sw = Math.sin((f / 4) * Math.PI * 2) * 1.5 * k;
    // jambes
    P.limb(w * 0.45, h * 0.62, w * 0.38, h - 1, 1.6 * k, Cl);
    P.limb(w * 0.55, h * 0.62, w * 0.62, h - 1, 1.6 * k, Cl);
    // torse en lambeaux
    P.blob(w / 2, h * 0.5, w * 0.16, h * 0.16, Cl, rng);
    for (let i = 0; i < 6; i++) P.line(w * (0.36 + i * 0.05), h * 0.62, w * (0.35 + i * 0.05), h * (0.7 + rng() * 0.08), Cl[1]);
    // bras jusqu'au sol, griffes
    P.limb(w * 0.38, h * 0.38, w * 0.22 + sw, h * 0.66, 1.3 * k, R);
    P.limb(w * 0.22 + sw, h * 0.66, w * 0.18 + sw, h * 0.92, 1.1 * k, R);
    P.limb(w * 0.62, h * 0.38, w * 0.78 - sw, h * 0.66, 1.3 * k, R);
    P.limb(w * 0.78 - sw, h * 0.66, w * 0.82 - sw, h * 0.92, 1.1 * k, R);
    for (const cx of [w * 0.18 + sw, w * 0.82 - sw]) for (let c = -1; c <= 1; c++) P.line(cx, h * 0.92, cx + c * 1.5 * k, h * 0.98, '#e8e0cc');
    // long cou courbé et tête qui pend en avant
    let x = w / 2;
    let y = h * 0.36;
    for (let s = 0; s < 10; s++) {
      x -= 0.9 * k;
      y -= (s < 6 ? 1.6 : -0.6) * k;
      P.blob(x, y, 1.5 * k, 1.5 * k, R, rng, { noise: 0.1 });
    }
    P.blob(x - 2 * k, y + 3 * k, 5 * k, 6 * k, ramp('#e8e0d0'), rng, { noise: 0.15 });
    // masque : fentes et sourire
    P.line(x - 5 * k, y + 1 * k, x - 3 * k, y + 2 * k, '#0a0408');
    P.line(x - 1 * k, y + 1 * k, x + 1 * k, y + 2 * k, '#0a0408');
    P.set(x - 4 * k, y + 2 * k, o.iris || '#ff2040');
    P.set(x, y + 2 * k, o.iris || '#ff2040');
    P.line(x - 5 * k, y + 6 * k, x + 1 * k, y + 5 * k, '#3a0408');
  };

  // Chien maudit : corps décharné, côtes apparentes, yeux rouges.
  TYPES.hound = (P, rng, f, k, o) => {
    const R = ramp(o.flesh || '#3a3038');
    const w = P.w;
    const h = P.h;
    const ph = (f / 4) * Math.PI * 2;
    for (const [lx, side] of [[0.3, 0], [0.38, 1], [0.7, 0], [0.78, 1]]) {
      const sw = Math.sin(ph + side * Math.PI) * 1.5 * k;
      P.limb(w * lx, h * 0.55, w * lx + sw, h * 0.78, 1.6 * k, R);
      P.limb(w * lx + sw, h * 0.78, w * lx - 1 * k, h - 1, 1.2 * k, R);
    }
    P.blob(w * 0.56, h * 0.45, w * 0.3, h * 0.17, R, rng);
    for (let i = 0; i < 5; i++) P.line(w * (0.42 + i * 0.07), h * 0.36, w * (0.42 + i * 0.07), h * 0.56, U.shade(R[3], 0.3));
    // queue
    P.limb(w * 0.85, h * 0.4, w * 0.97, h * 0.22 + Math.sin(ph) * 2, 1.2 * k, R);
    // tête
    P.blob(w * 0.2, h * 0.36, w * 0.13, h * 0.16, R, rng);
    P.blob(w * 0.09, h * 0.42, w * 0.08, h * 0.08, R, rng);
    P.mouth(w * 0.11, h * 0.47, w * 0.06, h * 0.05 + (f === 1 ? 1 : 0), rng);
    P.eye(w * 0.2, h * 0.32, Math.round(1.5 * k), '#ff2020', -0.6);
    P.eye(w * 0.26, h * 0.3, Math.round(1.2 * k), '#ff2020', -0.6);
    P.line(w * 0.24, h * 0.2, w * 0.28, h * 0.1, R[1], Math.max(1, Math.round(k)));
  };

  // Larve à visage humain.
  TYPES.grub = (P, rng, f, k, o) => {
    const R = ramp(o.flesh || '#c8b090');
    const w = P.w;
    const h = P.h;
    const ph = (f / 4) * Math.PI * 2;
    for (let s = 6; s >= 0; s--) P.blob(w * (0.25 + s * 0.1), h * 0.62 + Math.sin(ph + s) * 1.2 * k, (4.5 - s * 0.25) * k, (4.5 - s * 0.25) * k, R, rng, { noise: 0.15 });
    for (let s = 0; s < 7; s++) P.line(w * (0.25 + s * 0.1), h * 0.5, w * (0.25 + s * 0.1), h * 0.74, R[1]);
    P.blob(w * 0.2, h * 0.46, w * 0.16, h * 0.24, R, rng);
    // visage humain grimaçant
    P.eye(w * 0.15, h * 0.4, Math.round(1.5 * k), '#202020', -0.5, f === 3);
    P.eye(w * 0.26, h * 0.4, Math.round(1.5 * k), '#202020', -0.5, f === 3);
    P.mouth(w * 0.2, h * 0.56, w * 0.07, h * 0.05, rng);
  };

  // ------------------------------------------------------------ construction
  C.SIZES = { maw: [38, 40], crawler: [52, 30], eyes: [34, 44], hanged: [34, 76], hound: [48, 30], grub: [44, 26] };
  const cache = {};
  // Renvoie un "sprite" compatible avec le combat : body (image courante), frames, foot...
  // Lignes de découpe (fractions de l'image, angle de la coupe) pour le gore :
  // les créatures regardent vers la gauche.
  const V = Math.PI / 2;
  const CUTS = {
    maw: [{ x: 0.5, y: 0.3, a: 0 }, { x: 0.2, y: 0.62, a: V }, { x: 0.8, y: 0.62, a: V }],
    crawler: [{ x: 0.3, y: 0.5, a: V, head: true }, { x: 0.82, y: 0.5, a: V }],
    eyes: [{ x: 0.5, y: 0.3, a: 0 }, { x: 0.5, y: 0.7, a: 0 }],
    hanged: [{ x: 0.5, y: 0.2, a: 0.1, head: true }, { x: 0.5, y: 0.72, a: 0 }],
    hound: [{ x: 0.3, y: 0.5, a: V, head: true }, { x: 0.84, y: 0.5, a: V }],
    grub: [{ x: 0.3, y: 0.5, a: V, head: true }, { x: 0.78, y: 0.5, a: V }],
  };

  C.build = (key, type, o = {}) => {
    const ck = key + type + JSON.stringify(o);
    if (cache[ck]) return cache[ck];
    const k = o.scale || 1;
    const [bw, bh] = C.SIZES[type];
    const w = Math.round(bw * k);
    const h = Math.round(bh * k);
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const rng = U.seeded((o.seed || 7) * 31 + f * 0 + type.length * 101);
      const P = new Paint(w, h);
      TYPES[type](P, rng, f, k, o);
      frames.push(P.toCanvas());
    }
    const body = frames[0];
    const res = {
      body,
      frames,
      white: Pix.silhouette(body, '#ffffff'),
      dark: Pix.silhouette(body, '#0a0614'),
      w: body.width,
      h: body.height,
      foot: { x: Math.round(body.width / 2), y: body.height - 1 },
      face: { x: 0, y: 0, w: body.width, h: Math.min(body.height, 30) },
      flying: type === 'eyes',
      scale: 1,
      curse: true,
      cutHints: CUTS[type],
    };
    cache[ck] = res;
    return res;
  };
})();
