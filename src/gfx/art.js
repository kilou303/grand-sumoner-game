'use strict';
// Accès unifié aux graphismes d'un héros : personnage modulaire (format de Djegui) ou ancien sprite.
(function () {
  const Pix = GS.Pix;
  const Art = (GS.Art = {});
  const chars = {};

  class CharArt {
    constructor(def) {
      this.def = def;
      this.rig = def.rig ? def.rig() : null;
      if (!this.rig) this.sp = GS.HeroArt.build(def.id, def.look);
      this.sil = new Map();
    }
    // Renvoie { canvas, foot, hand } pour une animation (nom) ou une pose explicite.
    frame(anim = 'idle', t = 0) {
      if (this.rig) {
        const f = typeof anim === 'string' ? this.rig.anim(anim, t) : this.rig.frame(anim);
        return Object.assign({}, f, { foot: GS.ModRig.FOOT, rig: true });
      }
      return { canvas: this.sp.body, foot: this.sp.foot, hand: this.sp.hand, weapon: this.sp.weapon, sp: this.sp };
    }
    silhouette(canvas, color) {
      const k = color;
      let m = this.sil.get(canvas);
      if (!m) {
        m = {};
        this.sil.set(canvas, m);
        if (this.sil.size > 300) this.sil.clear();
      }
      if (!m[k]) m[k] = Pix.silhouette(canvas, color);
      return m[k];
    }
    // Position de la tête dans l'image de repos (pour les portraits).
    face() {
      if (this.rig) {
        const f = this.rig.anim('idle', 0);
        return { x: f.head.x, y: f.head.y };
      }
      return { x: 15, y: 12 };
    }
    get height() {
      return this.rig ? 62 : 32;
    }
  }

  Art.char = (def) => chars[def.id] || (chars[def.id] = new CharArt(def));
  Art.CharArt = CharArt;
  // Graphismes propres à un combattant (le gore ne touche pas le perso des menus).
  Art.fresh = (def) => {
    const ca = Art.char(def);
    if (!ca.rig) return ca;
    const n = Object.create(CharArt.prototype);
    n.def = def;
    n.rig = ca.rig.clone();
    n.sil = new Map();
    return n;
  };

  // Dessine un héros, pieds en (x, y). o : scale, anim, t, pose, flip, alpha, silhouette, flash
  Art.drawUnit = (def, x, y, o = {}) => {
    const ca = Art.char(def);
    const ctx = GS.ctx;
    const sc = o.scale || 1;
    if (!ca.rig) {
      GS.UI.drawHero(def, x, y, { scale: sc * 2, bob: o.t, flip: o.flip, alpha: o.alpha, silhouette: o.silhouette });
      return;
    }
    const f = ca.frame(o.pose || o.anim || 'idle', o.t || 0);
    const img = o.silhouette ? ca.silhouette(f.canvas, o.silhouette === true ? '#0a0614' : o.silhouette) : f.canvas;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -f.foot.x * sc, -f.foot.y * sc, img.width * sc, img.height * sc);
    if (o.flash) {
      ctx.globalAlpha *= o.flash;
      const w = ca.silhouette(f.canvas, '#ffffff');
      ctx.drawImage(w, -f.foot.x * sc, -f.foot.y * sc, img.width * sc, img.height * sc);
    }
    ctx.restore();
  };

  // Portrait recadré sur la tête.
  Art.portrait = (def, x, y, w, h, scale = 2, o = {}) => {
    const ca = Art.char(def);
    if (!ca.rig) {
      GS.UI.portrait(def, x, y, w, h, scale, o);
      return;
    }
    const f = ca.frame('idle', 0);
    const fc = ca.face();
    const ctx = GS.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const img = o.dark ? ca.silhouette(f.canvas, '#0a0614') : f.canvas;
    const fy = o.focusY !== undefined ? o.focusY : 2;
    ctx.drawImage(img, Math.round(x + w / 2 - fc.x * scale), Math.round(y + h / 2 - (fc.y + fy) * scale), img.width * scale, img.height * scale);
    ctx.restore();
  };
})();
