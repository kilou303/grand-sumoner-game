'use strict';
// Effets visuels de combat : particules, entailles, anneaux, colonnes de lumière, projectiles,
// nombres de dégâts... Chaque effet a update(dt) -> bool (vivant) et draw(ctx).
(function () {
  const U = GS.U;
  const R = GS.R;

  class FXLayer {
    constructor() {
      this.items = [];
      this.parts = [];
      this.pops = [];
    }

    clear() {
      this.items = [];
      this.parts = [];
      this.pops = [];
    }

    add(item) {
      item.t = 0;
      item.done = false;
      this.items.push(item);
      return item;
    }

    update(dt) {
      for (const it of this.items) {
        it.t += dt;
        if (it.update ? it.update(dt) === false : it.t >= it.dur) it.done = true;
        else if (it.dur && it.t >= it.dur) it.done = true;
      }
      this.items = this.items.filter((i) => !i.done);
      for (const p of this.parts) {
        p.life -= dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.floor && p.y > p.floor) {
          p.y = p.floor;
          p.vy *= -0.4;
          p.vx *= 0.6;
        }
      }
      this.parts = this.parts.filter((p) => p.life > 0);
      for (const p of this.pops) {
        p.t += dt;
        if (p.t < 0) continue;
        p.vy += 260 * dt;
        p.y += p.vy * dt;
        if (p.y > p.y0) {
          p.y = p.y0;
          p.vy = p.bounce ? -p.vy * 0.3 : 0;
          p.bounce = false;
        }
      }
      this.pops = this.pops.filter((p) => p.t < p.dur);
    }

    draw(ctx, behind = false) {
      for (const it of this.items) if (!!it.behind === behind) it.draw(ctx, it);
      if (behind) return;
      ctx.save();
      for (const p of this.parts) {
        const a = U.clamp(p.life / p.max, 0, 1);
        ctx.globalAlpha = p.fade ? a : 1;
        ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        const s = Math.max(1, Math.round(p.size * (p.shrink ? a : 1)));
        ctx.fillStyle = p.color;
        if (p.shape === 'star' && s >= 2) {
          ctx.fillRect(Math.round(p.x) - s, Math.round(p.y), s * 2 + 1, 1);
          ctx.fillRect(Math.round(p.x), Math.round(p.y) - s, 1, s * 2 + 1);
        } else if (p.shape === 'line') {
          const l = Math.max(2, Math.hypot(p.vx, p.vy) * 0.03);
          const ang = Math.atan2(p.vy, p.vx);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(ang);
          ctx.fillRect(-l, 0, l * 2, Math.max(1, s * 0.5));
          ctx.restore();
        } else ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
      ctx.restore();
    }

    drawPops() {
      for (const p of this.pops) {
        if (p.t < 0) continue;
        const a = p.t > p.dur - 0.25 ? (p.dur - p.t) / 0.25 : 1;
        const sc = p.scale * (p.t < 0.08 ? 1.6 : 1);
        GS.Font.draw(p.text, p.x, p.y - 8 * sc, { color: p.color, outline: p.outline || '#1a0a14', scale: sc, align: 'center', alpha: a });
        if (p.label) GS.Font.draw(p.label, p.x, p.y - 8 * sc - 10, { color: p.labelColor || '#ffe060', outline: '#1a0a14', align: 'center', alpha: a });
      }
    }

    // ---------------------------------------------------------- particules
    burst(x, y, o = {}) {
      const n = o.n || 12;
      const cols = Array.isArray(o.color) ? o.color : [o.color || '#ffffff'];
      for (let i = 0; i < n; i++) {
        const ang = (o.angle !== undefined ? o.angle : 0) + (o.spread !== undefined ? (Math.random() - 0.5) * o.spread : Math.random() * Math.PI * 2);
        const sp = (o.speed || 120) * (0.4 + Math.random() * 0.8);
        const life = (o.life || 0.5) * (0.6 + Math.random() * 0.6);
        this.parts.push({
          x: x + (Math.random() - 0.5) * (o.jitter || 0),
          y: y + (Math.random() - 0.5) * (o.jitterY !== undefined ? o.jitterY : o.jitter || 0),
          vx: Math.cos(ang) * sp + (o.vx || 0),
          vy: Math.sin(ang) * sp + (o.vy || 0),
          g: o.gravity || 0,
          drag: o.drag || 0.94,
          life,
          max: life,
          size: o.size || 2,
          color: cols[Math.floor(Math.random() * cols.length)],
          shape: o.shape || 'square',
          add: o.add !== false,
          fade: o.fade !== false,
          shrink: o.shrink !== false,
          floor: o.floor,
        });
      }
    }

    // Nombre flottant (dégâts / soins).
    pop(x, y, text, o = {}) {
      this.pops.push({
        x: x + (o.dx || 0),
        y: y,
        y0: y,
        vy: -110,
        t: -(o.delay || 0),
        dur: o.dur || 0.9,
        text: String(text),
        color: o.color || '#ffffff',
        outline: o.outline,
        scale: o.scale || 1,
        bounce: true,
        label: o.label,
        labelColor: o.labelColor,
      });
    }

    // ---------------------------------------------------------- formes
    slash(x, y, o = {}) {
      const color = o.color || '#ffffff';
      const r = o.r || 18;
      const ang = o.angle || 0;
      const dir = o.dir || 1;
      return this.add({
        dur: o.dur || 0.22,
        draw: (ctx, it) => {
          const p = it.t / it.dur;
          const sweep = Math.PI * 1.1;
          const a0 = ang - (sweep / 2) * dir;
          const a1 = a0 + sweep * Math.min(1, p * 2.2) * dir;
          const fade = 1 - Math.max(0, (p - 0.45) / 0.55);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade;
          for (let k = 0; k < 3; k++) {
            ctx.strokeStyle = k === 0 ? color : k === 1 ? U.shade(color, 0.5) : '#ffffff';
            ctx.lineWidth = (o.width || 4) - k * 1.3;
            ctx.beginPath();
            ctx.ellipse(x, y, r - k, (r - k) * (o.flat || 0.55), o.tilt || 0, Math.min(a0, a1), Math.max(a0, a1));
            ctx.stroke();
          }
          ctx.restore();
        },
      });
    }

    // Trait d'estoc (coup droit).
    thrust(x, y, o = {}) {
      const color = o.color || '#ffffff';
      const len = o.len || 34;
      const dir = o.dir || 1;
      return this.add({
        dur: 0.18,
        draw: (ctx, it) => {
          const p = it.t / it.dur;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1 - p;
          const l = len * (0.4 + p);
          R.rect(dir > 0 ? x - l * 0.3 : x - l * 0.7, y - 1, l, 3, color);
          R.rect(dir > 0 ? x - l * 0.2 : x - l * 0.6, y, l * 0.8, 1, '#ffffff');
          ctx.restore();
        },
      });
    }

    ring(x, y, o = {}) {
      return this.add({
        dur: o.dur || 0.4,
        behind: o.behind,
        draw: (ctx, it) => {
          const p = U.Ease.outCubic(it.t / it.dur);
          const r = U.lerp(o.r0 || 2, o.r1 || 30, p);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1 - it.t / it.dur;
          ctx.strokeStyle = o.color || '#ffffff';
          ctx.lineWidth = o.width || 2;
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * (o.flat || 1), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        },
      });
    }

    flash(x, y, o = {}) {
      return this.add({
        dur: o.dur || 0.15,
        draw: (ctx, it) => {
          const p = it.t / it.dur;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1 - p;
          R.circle(x, y, (o.r || 14) * (0.6 + p * 0.6), o.color || '#ffffff');
          R.circle(x, y, (o.r || 14) * 0.5 * (1 - p), '#ffffff');
          ctx.restore();
        },
      });
    }

    // Colonne de lumière verticale.
    pillar(x, y, o = {}) {
      const color = o.color || '#ffe060';
      const w = o.w || 16;
      return this.add({
        dur: o.dur || 0.7,
        draw: (ctx, it) => {
          const p = it.t / it.dur;
          const ww = w * (p < 0.2 ? p / 0.2 : 1 - (p - 0.2) * 0.9);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = p < 0.8 ? 1 : (1 - p) / 0.2;
          const g = ctx.createLinearGradient(x - ww, 0, x + ww, 0);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(0.5, color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - ww, 0, ww * 2, y + 4);
          R.rect(x - ww * 0.2, 0, Math.max(1, ww * 0.4), y + 4, '#ffffff');
          ctx.restore();
        },
      });
    }

    // Cercle magique au sol (ellipse + runes tournantes).
    magicCircle(x, y, o = {}) {
      const color = o.color || '#60f0ff';
      const r = o.r || 16;
      return this.add({
        dur: o.dur || 0.8,
        behind: true,
        draw: (ctx, it) => {
          const p = it.t / it.dur;
          const grow = U.Ease.outBack(Math.min(1, p * 3));
          const a = p > 0.75 ? (1 - p) / 0.25 : 1;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          const rr = r * grow;
          ctx.beginPath();
          ctx.ellipse(x, y, rr, rr * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x, y, rr * 0.7, rr * 0.7 * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
          const n = 6;
          for (let i = 0; i < n; i++) {
            const ang = it.t * 2 + (i / n) * Math.PI * 2;
            R.rect(x + Math.cos(ang) * rr * 0.85 - 1, y + Math.sin(ang) * rr * 0.85 * 0.35 - 1, 2, 2, '#ffffff');
          }
          ctx.globalAlpha = a * 0.25;
          R.ellipse(x, y, rr * 0.7, rr * 0.25, color);
          ctx.restore();
        },
      });
    }

    // Projectile de (x0,y0) à (x1,y1). kind : orb | arrow | kunai | harpoon | bullet | rock
    projectile(x0, y0, x1, y1, o = {}) {
      const color = o.color || '#ffffff';
      const dur = o.dur || 0.3;
      const self = this;
      const arc = o.arc || 0;
      return this.add({
        dur,
        x: x0,
        y: y0,
        update(dt) {
          const p = Math.min(1, this.t / dur);
          const nx = U.lerp(x0, x1, p);
          const ny = U.lerp(y0, y1, p) - Math.sin(p * Math.PI) * arc;
          this.ang = Math.atan2(ny - this.y, nx - this.x);
          this.x = nx;
          this.y = ny;
          if (o.trail !== false && Math.random() < 0.9)
            self.burst(this.x, this.y, { n: 1, color: [color, U.shade(color, 0.5)], speed: 10, life: 0.25, size: o.size || 2 });
          return this.t < dur;
        },
        draw(ctx) {
          const s = o.size || 3;
          if (o.kind === 'arrow' || o.kind === 'kunai' || o.kind === 'harpoon' || o.kind === 'bullet') {
            ctx.save();
            ctx.translate(Math.round(this.x), Math.round(this.y));
            ctx.rotate(this.ang || 0);
            const l = o.kind === 'harpoon' ? 18 : o.kind === 'kunai' ? 6 : o.kind === 'bullet' ? 9 : 12;
            R.rect(-l, 0, l, 1, o.kind === 'kunai' ? '#c0c8d8' : o.kind === 'bullet' ? '#fff4c0' : '#c8a070');
            R.rect(0, -1, 3, 3, '#e8f0ff');
            if (o.kind === 'arrow') R.rect(-l, -1, 2, 3, '#ffffff');
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.6;
            R.rect(-l, -1, l + 3, 3, color);
            ctx.restore();
          } else if (o.sprite) {
            // sprite relevé sur une planche (orbe d'énergie...) qui tourne sur lui-même
            const cv = o.sprite;
            ctx.save();
            ctx.translate(Math.round(this.x), Math.round(this.y));
            if (o.spin) ctx.rotate(o.spin * this.t);
            ctx.globalCompositeOperation = o.add === false ? 'source-over' : 'lighter';
            ctx.drawImage(cv, -Math.round(cv.width / 2), -Math.round(cv.height / 2));
            ctx.restore();
          } else if (o.kind === 'rock') {
            R.rect(this.x - 2, this.y - 2, 5, 4, '#8a7058');
            R.rect(this.x - 1, this.y - 2, 2, 1, '#b09878');
          } else {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            R.circle(this.x, this.y, s + 1, color);
            R.circle(this.x, this.y, s * 0.5, '#ffffff');
            ctx.restore();
          }
        },
      });
    }

    // Sprite d'effet relevé sur une planche (orbe galaxie, tourbillon, colonne...) :
    // apparaît, peut grossir / tourner / se déplacer, puis s'efface.
    // o : dur, scale, grow, spin, vx, vy, flip, add (mélange additif, par défaut oui),
    //     anchor ('center' ou 'bottom' : posé au sol), behind, alpha.
    sprite(cv, x, y, o = {}) {
      return this.add({
        dur: o.dur || 0.5,
        behind: !!o.behind,
        draw: (ctx, it) => {
          if (!cv) return;
          const p = Math.min(1, it.t / it.dur);
          const s = (o.scale || 1) * (o.grow ? 1 + (p - 0.5) * o.grow : 1);
          const w = cv.width * s;
          const h = cv.height * s;
          ctx.save();
          ctx.globalCompositeOperation = o.add === false ? 'source-over' : 'lighter';
          ctx.globalAlpha = (o.alpha || 1) * (p < 0.12 ? p / 0.12 : p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1);
          ctx.translate(Math.round(x + (o.vx || 0) * it.t), Math.round(y + (o.vy || 0) * it.t));
          if (o.spin) ctx.rotate(o.spin * it.t);
          if (o.flip) ctx.scale(-1, 1);
          ctx.drawImage(cv, Math.round(-w / 2), Math.round(o.anchor === 'bottom' ? -h : -h / 2), Math.round(w), Math.round(h));
          ctx.restore();
        },
      });
    }

    // Éclair zigzag.
    bolt(x, y, o = {}) {
      const segs = [];
      let cx = x + (Math.random() - 0.5) * 10;
      for (let yy = 0; yy < y; yy += 8) {
        const nx = cx + (Math.random() - 0.5) * 12;
        segs.push([cx, yy, nx, yy + 8]);
        cx = nx;
      }
      return this.add({
        dur: o.dur || 0.25,
        draw: (ctx, it) => {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1 - it.t / it.dur;
          for (const s of segs) {
            R.line(s[0], s[1], s[2], s[3], o.color || '#c0e0ff');
            R.line(s[0] + 1, s[1], s[2] + 1, s[3], '#ffffff');
          }
          ctx.restore();
        },
      });
    }

    // Pics de roche jaillissant du sol.
    spikes(x, y, o = {}) {
      const n = o.n || 5;
      const list = [];
      for (let i = 0; i < n; i++) list.push([x + (i - (n - 1) / 2) * (o.gap || 7) + (Math.random() - 0.5) * 3, 8 + Math.random() * (o.h || 14), Math.random() * 0.1]);
      const col = o.color || '#9a8060';
      return this.add({
        dur: o.dur || 0.6,
        draw: (ctx, it) => {
          for (const [sx, h, d] of list) {
            const p = U.clamp((it.t - d) / 0.12, 0, 1);
            const fall = it.t > it.dur - 0.2 ? (it.dur - it.t) / 0.2 : 1;
            const hh = Math.round(h * p * fall);
            for (let k = 0; k < hh; k++) {
              const w = Math.max(0, Math.round((k / h) * 4));
              R.rect(sx - w, y - hh + k, w * 2 + 1, 1, k < 2 ? U.shade(col, 0.4) : col);
              R.rect(sx - w, y - hh + k, 1, 1, U.shade(col, -0.4));
            }
          }
        },
      });
    }

    // Vague qui traverse l'écran (tsunami).
    wave(x0, x1, y, o = {}) {
      const color = o.color || '#3ea8ff';
      const self = this;
      return this.add({
        dur: o.dur || 0.8,
        update() {
          const p = this.t / this.dur;
          const x = U.lerp(x0, x1, U.Ease.inOutQuad(Math.min(1, p)));
          if (Math.random() < 0.8) self.burst(x, y - 30 + Math.random() * 30, { n: 2, color: ['#ffffff', color], speed: 60, life: 0.4, gravity: 200, angle: -Math.PI / 2, spread: 1.5 });
          this.x = x;
          return this.t < this.dur;
        },
        draw(ctx) {
          const x = this.x || x0;
          ctx.save();
          ctx.globalAlpha = 0.85;
          for (let i = 0; i < 46; i++) {
            const h = 46 - i * 0.9 + Math.sin(i * 0.5 + this.t * 20) * 3;
            const xx = x - i * 2;
            R.rect(xx, y - h, 2, h, i < 3 ? '#ffffff' : i < 8 ? U.shade(color, 0.4) : color);
          }
          ctx.restore();
        },
      });
    }

    // Grand anneau d'explosion + onde (nova).
    nova(x, y, o = {}) {
      const color = o.color || '#ff8030';
      return this.add({
        dur: o.dur || 0.9,
        draw: (ctx, it) => {
          const p = it.t / it.dur;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1 - p;
          R.circle(x, y, 10 + p * 90, U.shade(color, -0.2));
          R.circle(x, y, 6 + p * 60, color);
          R.circle(x, y, 3 + p * 30 * (1 - p), '#ffffff');
          ctx.restore();
        },
      });
    }

    // Orbe sombre qui aspire puis explose (trou noir).
    voidOrb(x, y, o = {}) {
      const self = this;
      return this.add({
        dur: o.dur || 0.9,
        update() {
          if (this.t < 0.6 && Math.random() < 0.9) {
            const a = Math.random() * Math.PI * 2;
            const d = 30 + Math.random() * 20;
            self.parts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, vx: -Math.cos(a) * d * 2.5, vy: -Math.sin(a) * d * 1.5, g: 0, drag: 0.98, life: 0.4, max: 0.4, size: 2, color: Math.random() < 0.5 ? '#b464ff' : '#ff60c0', shape: 'square', add: true, fade: true, shrink: true });
          }
          return this.t < this.dur;
        },
        draw(ctx) {
          const p = this.t / this.dur;
          const r = p < 0.65 ? 4 + p * 18 : (1 - p) * 40;
          R.circle(x, y, r + 2, '#b464ff');
          R.circle(x, y, r, '#0a0010');
        },
      });
    }
  }

  // ------------------------------------------------------------ effets façon Grand Summoners
  // Palettes de dégradé (cœur -> bord) pour les croissants et flammes.
  const SCHEMES = {
    fire: ['#ffffff', '#fff2a0', '#ffb030', '#ff5a1a', '#c01810'],
    blood: ['#ffffff', '#ffd0d8', '#ff4a5a', '#d0102a', '#5a0418'],
    light: ['#ffffff', '#fffbe0', '#ffe060', '#ffb020', '#a06010'],
    water: ['#ffffff', '#d8f8ff', '#60c8ff', '#2070e0', '#103080'],
    earth: ['#ffffff', '#f0ffd0', '#a8e060', '#50a030', '#205010'],
    dark: ['#ffffff', '#f0d8ff', '#c070ff', '#7020d0', '#200840'],
    white: ['#ffffff', '#ffffff', '#e0f0ff', '#a0c8ff', '#4060a0'],
  };
  FXLayer.SCHEMES = SCHEMES;
  const scheme = (o) => SCHEMES[o.scheme] || SCHEMES.fire;

  // Croissant de coup (traînée de frappe) : arc épais effilé aux extrémités, dégradé lumineux.
  FXLayer.prototype.crescent = function (x, y, o = {}) {
    const cols = scheme(o);
    const r = o.r || 22;
    const thick = o.thick || r * 0.45;
    const ang = o.angle || 0;
    const span = o.span || 2.4;
    const dir = o.dir || 1;
    const flat = o.flat || 0.7;
    const tilt = o.tilt || 0;
    return this.add({
      dur: o.dur || 0.26,
      draw: (ctx, it) => {
        const p = it.t / it.dur;
        const reveal = Math.min(1, p / 0.35);
        const fade = p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55;
        const grow = 1 + p * 0.25;
        const a0 = ang - (span / 2) * dir;
        const a1 = a0 + span * reveal * dir;
        const N = 18;
        const layers = [
          [cols[4], 1.0, 0.55],
          [cols[3], 0.8, 0.85],
          [cols[2], 0.55, 1],
          [cols[1], 0.32, 1],
          [cols[0], 0.14, 1],
        ];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.scale(1, flat);
        ctx.globalCompositeOperation = 'lighter';
        for (const [col, th, al] of layers) {
          ctx.globalAlpha = fade * al;
          ctx.fillStyle = col;
          ctx.beginPath();
          for (let i = 0; i <= N; i++) {
            const u = i / N;
            const a = a0 + (a1 - a0) * u;
            ctx.lineTo(Math.cos(a) * r * grow, Math.sin(a) * r * grow);
          }
          for (let i = N; i >= 0; i--) {
            const u = i / N;
            const a = a0 + (a1 - a0) * u;
            // effilé : épaisseur max au milieu, plus épais vers la fin du geste
            const w = thick * th * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (0.6 + 0.4 * u);
            ctx.lineTo(Math.cos(a) * (r * grow - w), Math.sin(a) * (r * grow - w));
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      },
    });
  };

  // Étincelle étoilée (rayons fins + halo), comme les impacts roses de la planche.
  FXLayer.prototype.sparkle = function (x, y, o = {}) {
    const n = o.rays || 8;
    const size = o.size || 16;
    const color = o.color || '#ff5a9a';
    const rays = [];
    for (let i = 0; i < n; i++) rays.push([(i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, size * (0.5 + Math.random() * 0.6)]);
    const rot = (Math.random() - 0.5) * 0.6;
    return this.add({
      dur: o.dur || 0.32,
      draw: (ctx, it) => {
        const p = it.t / it.dur;
        const sc = p < 0.25 ? U.Ease.outBack(p / 0.25) : 1 - (p - 0.25) * 0.4;
        const a = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot + p * 0.5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * 0.35;
        R.circle(0, 0, size * 0.45 * sc, color);
        ctx.globalAlpha = a;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (const [ra, rl] of rays) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ra) * rl * sc, Math.sin(ra) * rl * sc);
          ctx.stroke();
        }
        ctx.strokeStyle = '#ffffff';
        for (const [ra, rl] of rays) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ra) * rl * sc * 0.5, Math.sin(ra) * rl * sc * 0.5);
          ctx.stroke();
        }
        R.circle(0, 0, 2 * sc, '#ffffff');
        ctx.restore();
      },
    });
  };

  // Onde au sol : anneau aplati qui s'élargit + rayons de lumière montants.
  FXLayer.prototype.groundRing = function (x, y, o = {}) {
    const cols = scheme(o);
    const r0 = o.r0 || 6;
    const r1 = o.r1 || 40;
    const streaks = [];
    for (let i = 0; i < (o.streaks === undefined ? 10 : o.streaks); i++) streaks.push([Math.random() * Math.PI * 2, 0.6 + Math.random() * 0.4]);
    return this.add({
      dur: o.dur || 0.5,
      behind: o.behind,
      draw: (ctx, it) => {
        const p = U.Ease.outCubic(it.t / it.dur);
        const r = U.lerp(r0, r1, p);
        const a = 1 - it.t / it.dur;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const [col, w, al] of [[cols[3], 4, 0.5], [cols[2], 2, 0.9], [cols[0], 1, 1]]) {
          ctx.globalAlpha = a * al;
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * 0.26, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const [sa, sh] of streaks) {
          const sx = x + Math.cos(sa) * r;
          const syy = y + Math.sin(sa) * r * 0.26;
          const h = (o.h || 26) * sh * (1 - p * 0.5);
          const g = ctx.createLinearGradient(0, syy - h, 0, syy);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, cols[2]);
          ctx.globalAlpha = a * 0.7;
          ctx.fillStyle = g;
          ctx.fillRect(Math.round(sx), syy - h, 1, h);
        }
        ctx.restore();
      },
    });
  };

  // Traits de vitesse horizontaux.
  FXLayer.prototype.speedLines = function (x, y, o = {}) {
    const dir = o.dir || 1;
    const lines = [];
    for (let i = 0; i < (o.n || 10); i++) lines.push([(Math.random() - 0.5) * (o.h || 40), 10 + Math.random() * 30, Math.random() * 0.1]);
    return this.add({
      dur: o.dur || 0.25,
      draw: (ctx, it) => {
        const p = it.t / it.dur;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - p;
        for (const [dy, l, d] of lines) {
          const q = U.clamp((p - d) / (1 - d), 0, 1);
          const xx = x - dir * (q * 40 + l);
          R.rect(dir > 0 ? xx : xx - l, y + dy, l, 1, o.color || '#ffffff');
        }
        ctx.restore();
      },
    });
  };

  // Nuage de poussière (course, atterrissage).
  FXLayer.prototype.dust = function (x, y, o = {}) {
    const n = o.n || 6;
    for (let i = 0; i < n; i++) {
      const life = 0.4 + Math.random() * 0.3;
      this.parts.push({ x: x + (Math.random() - 0.5) * (o.w || 10), y: y - Math.random() * 3, vx: (o.vx || 0) + (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 20, g: 0, drag: 0.9, life, max: life, size: 3 + Math.random() * 3, color: o.color || '#b8b0c8', shape: 'square', add: false, fade: true, shrink: true });
    }
  };

  // Gerbe de flammes.
  FXLayer.prototype.flame = function (x, y, o = {}) {
    const cols = scheme(o);
    const n = o.n || 18;
    for (let i = 0; i < n; i++) {
      const life = 0.3 + Math.random() * 0.4;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 1.6);
      const sp = 40 + Math.random() * (o.speed || 90);
      this.parts.push({ x: x + (Math.random() - 0.5) * (o.w || 10), y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: -60, drag: 0.92, life, max: life, size: 2 + Math.random() * 4, color: cols[1 + Math.floor(Math.random() * 3)], shape: 'square', add: true, fade: true, shrink: true });
    }
  };

  // Impact complet : éclair, étincelle, anneau et éclats.
  FXLayer.prototype.impact = function (x, y, o = {}) {
    const cols = scheme(o);
    const big = o.big ? 1.6 : 1;
    this.flash(x, y, { color: cols[2], r: 10 * big, dur: 0.12 });
    this.sparkle(x, y, { color: o.spark || cols[2], size: 14 * big, rays: 8 });
    this.ring(x, y, { color: cols[2], r0: 3, r1: 18 * big, dur: 0.22, width: 2 });
    this.burst(x, y, { n: Math.round(10 * big), color: [cols[1], cols[2], cols[3]], speed: 140 * big, life: 0.35, shape: 'line' });
  };

  GS.FXLayer = FXLayer;
})();
