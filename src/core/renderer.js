'use strict';
// Rendu : canvas basse résolution (480x270) agrandi en "pixel perfect", + primitives de dessin.
(function () {
  const U = GS.U;
  GS.W = 480;
  GS.H = 270;
  const R = (GS.R = {});

  R.init = () => {
    R.canvas = document.getElementById('game');
    R.canvas.width = GS.W;
    R.canvas.height = GS.H;
    R.ctx = R.canvas.getContext('2d');
    R.ctx.imageSmoothingEnabled = false;
    GS.ctx = R.ctx;
    window.addEventListener('resize', R.resize);
    window.addEventListener('orientationchange', () => setTimeout(R.resize, 200));
    R.resize();
  };

  R.resize = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let s = Math.min(vw / GS.W, vh / GS.H);
    // Échelle entière si on ne perd pas trop de place : pixels parfaitement nets.
    if (s >= 2 && Math.floor(s) / s > 0.85) s = Math.floor(s);
    R.scale = s;
    R.canvas.style.width = Math.floor(GS.W * s) + 'px';
    R.canvas.style.height = Math.floor(GS.H * s) + 'px';
  };

  // ------------------------------------------------------------ primitives
  R.rect = (x, y, w, h, c) => {
    const ctx = GS.ctx;
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  R.frame = (x, y, w, h, c) => {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const ctx = GS.ctx;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  };

  R.line = (x0, y0, x1, y1, c) => {
    const ctx = GS.ctx;
    ctx.fillStyle = c;
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 2000; i++) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  // Disque "pixel" (par lignes horizontales).
  R.circle = (cx, cy, r, c) => {
    const ctx = GS.ctx;
    ctx.fillStyle = c;
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.max(0, r);
    const ri = Math.ceil(r);
    for (let y = -ri; y <= ri; y++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      if (w <= 0 && Math.abs(y) > r - 0.5) continue;
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };

  R.ellipse = (cx, cy, rx, ry, c) => {
    const ctx = GS.ctx;
    ctx.fillStyle = c;
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const t = 1 - (y * y) / (ry * ry);
      if (t < 0) continue;
      const w = Math.round(rx * Math.sqrt(t));
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };

  R.ring = (cx, cy, r, c, width = 1) => {
    const ctx = GS.ctx;
    ctx.strokeStyle = c;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2);
    ctx.stroke();
  };

  R.gradV = (x, y, w, h, c1, c2) => {
    const ctx = GS.ctx;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  R.gradH = (x, y, w, h, c1, c2) => {
    const ctx = GS.ctx;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  R.poly = (pts, fill, stroke) => {
    const ctx = GS.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Dessine un sprite (canvas) avec options : flip, alpha, échelle, rotation autour d'un point.
  R.sprite = (img, x, y, o = {}) => {
    const ctx = GS.ctx;
    if (!img) return;
    const sx = o.scale || 1;
    const sy = o.scaleY || sx;
    if (!o.flip && !o.rot && sx === 1 && sy === 1 && o.alpha === undefined) {
      ctx.drawImage(img, Math.round(x), Math.round(y));
      return;
    }
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= U.clamp(o.alpha, 0, 1);
    const px = o.px !== undefined ? o.px : 0;
    const py = o.py !== undefined ? o.py : 0;
    ctx.translate(Math.round(x + px * sx), Math.round(y + py * sy));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.flip ? -sx : sx, sy);
    ctx.drawImage(img, -px, -py);
    ctx.restore();
  };

  // ------------------------------------------------------------ interface "HUD" (style du jeu)
  R.COL = {
    panel: 'rgba(6,34,46,0.88)',
    panelSolid: '#082a36',
    border: '#3ee0f0',
    borderDim: '#1a7c8c',
    text: '#e8fbff',
    cyan: '#6ff4ff',
    gold: '#ffd75a',
    dim: '#7aa8b4',
    red: '#ff5060',
    green: '#60f080',
  };

  // Panneau à coins coupés (comme l'interface de la capture). cut = taille du biseau.
  R.panel = (x, y, w, h, o = {}) => {
    const ctx = GS.ctx;
    const cut = o.cut !== undefined ? o.cut : 6;
    x = Math.round(x) + 0.5;
    y = Math.round(y) + 0.5;
    w = Math.round(w) - 1;
    h = Math.round(h) - 1;
    const pts = [
      [x + cut, y],
      [x + w, y],
      [x + w, y + h - cut],
      [x + w - cut, y + h],
      [x, y + h],
      [x, y + cut],
    ];
    if (o.skew) {
      pts[1][0] += o.skew;
      pts[2][0] += o.skew * ((h - cut) / h);
    }
    ctx.save();
    R.poly(pts, o.fill || R.COL.panel, null);
    ctx.lineWidth = 1;
    ctx.strokeStyle = o.border || R.COL.border;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.stroke();
    if (o.inner !== false) {
      ctx.strokeStyle = o.innerColor || 'rgba(62,224,240,0.25)';
      ctx.beginPath();
      ctx.moveTo(x + cut + 2, y + 2);
      ctx.lineTo(x + w - 2, y + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 2, y + h - 2);
      ctx.lineTo(x + w - cut - 2, y + h - 2);
      ctx.stroke();
    }
    if (o.glow) {
      ctx.globalAlpha = o.glow;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  };

  // Jauge avec dégradé, reflet et (optionnel) valeur "fantôme" qui descend lentement.
  R.bar = (x, y, w, h, ratio, c1, c2, o = {}) => {
    ratio = U.clamp(ratio, 0, 1);
    R.rect(x, y, w, h, o.bg || 'rgba(0,10,20,0.85)');
    if (o.ghost !== undefined && o.ghost > ratio) {
      R.rect(x + 1, y + 1, Math.round((w - 2) * U.clamp(o.ghost, 0, 1)), h - 2, o.ghostColor || '#ffffff');
    }
    const fw = Math.round((w - 2) * ratio);
    if (fw > 0) {
      R.gradH(x + 1, y + 1, fw, h - 2, c1, c2);
      R.rect(x + 1, y + 1, fw, 1, 'rgba(255,255,255,0.45)');
    }
    if (o.frame !== false) R.frame(x, y, w, h, o.frame || 'rgba(120,220,240,0.6)');
    if (o.segments) {
      for (let i = 1; i < o.segments; i++) R.rect(x + Math.round((w * i) / o.segments), y + 1, 1, h - 2, 'rgba(0,0,0,0.35)');
    }
  };

  R.fade = (a, c = '#000') => {
    if (a <= 0) return;
    const ctx = GS.ctx;
    ctx.save();
    ctx.globalAlpha = U.clamp(a, 0, 1);
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, GS.W, GS.H);
    ctx.restore();
  };
})();
