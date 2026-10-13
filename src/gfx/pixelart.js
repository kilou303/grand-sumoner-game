'use strict';
// Moteur de pixel art : les sprites sont décrits par des gabarits texte (1 caractère = 1 pixel),
// composés en calques, colorés via une palette puis détourés automatiquement.
(function () {
  const U = GS.U;
  const Pix = (GS.Pix = {});

  Pix.OUTLINE = '#160c22';

  Pix.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w | 0);
    c.height = Math.max(1, h | 0);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return c;
  };

  Pix.grid = (w, h) => {
    const g = [];
    for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
    g.w = w;
    g.h = h;
    return g;
  };

  // Applique un gabarit sur la grille. Les '.' sont transparents.
  // opts.mirror : miroir horizontal du gabarit ; opts.map : remplacement de caractères.
  Pix.stamp = (grid, tpl, dx = 0, dy = 0, opts = {}) => {
    if (!tpl) return grid;
    const width = tpl.reduce((m, r) => Math.max(m, r.length), 0);
    for (let y = 0; y < tpl.length; y++) {
      const row = tpl[y];
      for (let x = 0; x < row.length; x++) {
        let ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        if (opts.map && opts.map[ch]) ch = opts.map[ch];
        const gx = (opts.mirror ? width - 1 - x : x) + dx;
        const gy = y + dy;
        if (gy < 0 || gy >= grid.h || gx < 0 || gx >= grid.w) continue;
        if (opts.under && grid[gy][gx] !== '.') continue;
        grid[gy][gx] = ch;
      }
    }
    return grid;
  };

  Pix.fromTemplate = (tpl) => {
    const w = tpl.reduce((m, r) => Math.max(m, r.length), 0);
    return Pix.stamp(Pix.grid(w, tpl.length), tpl);
  };

  // Transforme une grille en canvas. Ajoute 1px de marge pour le contour automatique.
  Pix.render = (grid, palette, opts = {}) => {
    const outline = opts.outline !== false;
    const pad = outline ? 1 : 0;
    const w = grid.w + pad * 2;
    const h = grid.h + pad * 2;
    const c = Pix.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const col = new Array(w * h).fill(null);
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        const ch = grid[y][x];
        if (ch === '.') continue;
        const hex = palette[ch] || '#ff00ff';
        col[(y + pad) * w + (x + pad)] = hex;
      }
    }
    const out = col.slice();
    if (outline) {
      const oc = opts.outlineColor || Pix.OUTLINE;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (col[y * w + x]) continue;
          let n = null;
          if (x > 0 && col[y * w + x - 1]) n = col[y * w + x - 1];
          else if (x < w - 1 && col[y * w + x + 1]) n = col[y * w + x + 1];
          else if (y > 0 && col[(y - 1) * w + x]) n = col[(y - 1) * w + x];
          else if (y < h - 1 && col[(y + 1) * w + x]) n = col[(y + 1) * w + x];
          if (n) out[y * w + x] = opts.selective === false ? oc : U.mix(n, oc, 0.8);
        }
      }
    }
    for (let i = 0; i < out.length; i++) {
      if (!out[i]) continue;
      const [r, g, b] = U.hexToRgb(out[i]);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    c.pad = pad;
    return c;
  };

  Pix.flip = (src) => {
    const c = Pix.makeCanvas(src.width, src.height);
    const ctx = c.getContext('2d');
    ctx.translate(src.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    c.pad = src.pad;
    return c;
  };

  // Silhouette pleine d'une couleur (flash de dégâts, ombre d'invocation...).
  Pix.silhouette = (src, color = '#ffffff') => {
    const c = Pix.makeCanvas(src.width, src.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    c.pad = src.pad;
    return c;
  };

  Pix.scale = (src, k) => {
    const c = Pix.makeCanvas(src.width * k, src.height * k);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, src.width * k, src.height * k);
    c.pad = (src.pad || 0) * k;
    return c;
  };

  // Construit une palette complète (ombres/reflets dérivés) à partir de couleurs de base.
  Pix.charPalette = (p) => {
    const skin = p.skin || '#f4c8a0';
    const hair = p.hair || '#6a4a3a';
    const main = p.main || '#4060c0';
    const second = p.second || U.shade(main, -0.4);
    const trim = p.trim || '#e8c050';
    const boots = p.boots || '#4a3040';
    const cape = p.cape || '#c03040';
    const metal = p.metal || '#c8d0e0';
    const accent = p.accent || '#60f0ff';
    return {
      s: skin,
      t: U.shade(skin, -0.18),
      h: hair,
      j: U.shade(hair, -0.3),
      i: U.shade(hair, 0.35),
      e: p.eye || '#3070d0',
      w: '#ffffff',
      p: '#24142e',
      m: U.shade(skin, -0.4),
      a: main,
      b: U.shade(main, -0.28),
      c: U.shade(main, 0.3),
      d: second,
      f: U.shade(second, -0.28),
      g: trim,
      q: U.shade(trim, -0.3),
      k: boots,
      n: U.shade(boots, -0.3),
      x: cape,
      y: U.shade(cape, -0.3),
      r: metal,
      u: U.shade(metal, -0.35),
      v: U.shade(metal, 0.35),
      z: accent,
      Z: U.shade(accent, 0.5),
      o: '#24142e',
      // couleurs fixes utiles
      W: '#ffffff',
      K: '#101018',
      R: '#e03040',
      Y: '#ffe060',
      B: '#60a0ff',
    };
  };
})();
