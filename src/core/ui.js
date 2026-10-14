'use strict';
// Gestion des scènes (avec fondus) et widgets d'interface en mode immédiat.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const I = () => GS.Input;

  // ------------------------------------------------------------ scènes
  const SC = (GS.Scenes = { current: null, next: null, fade: 0, fadeDir: 0, time: 0 });

  GS.go = (scene, instant = false) => {
    if (instant || !SC.current) {
      if (SC.current && SC.current.exit) SC.current.exit();
      SC.current = scene;
      scene.enter && scene.enter();
      SC.fade = instant ? 0 : 1;
      SC.fadeDir = -1;
      return;
    }
    SC.next = scene;
    SC.fadeDir = 1;
  };

  SC.update = (dt) => {
    SC.time += dt;
    if (SC.fadeDir > 0) {
      SC.fade += dt * 5;
      if (SC.fade >= 1) {
        SC.fade = 1;
        if (SC.current && SC.current.exit) SC.current.exit();
        SC.current = SC.next;
        SC.next = null;
        SC.current.enter && SC.current.enter();
        SC.fadeDir = -1;
      }
    } else if (SC.fadeDir < 0) {
      SC.fade -= dt * 4;
      if (SC.fade <= 0) {
        SC.fade = 0;
        SC.fadeDir = 0;
      }
    }
    if (SC.current && SC.fadeDir <= 0) SC.current.update && SC.current.update(dt);
  };

  SC.draw = () => {
    if (SC.current) SC.current.draw && SC.current.draw(GS.ctx);
    GS.UI.drawToasts();
    if (SC.fade > 0) R.fade(SC.fade, '#05030c');
  };

  // ------------------------------------------------------------ widgets
  const UI = (GS.UI = {});
  const anim = {};

  // Bouton : renvoie true si cliqué. o : {color, disabled, icon, sub, scale, key, id, selected}
  UI.button = (label, x, y, w, h, o = {}) => {
    const inp = I();
    const id = o.id || label + x + '_' + y;
    const st = anim[id] || (anim[id] = { hover: 0, press: 0 });
    const over = !o.disabled && inp.over(x, y, w, h);
    st.hover = U.approach(st.hover, over || o.selected ? 1 : 0, 0.15);
    const pressed = over && inp.down;
    const oy = pressed ? 1 : 0;
    const col = o.disabled ? '#5a6870' : o.color || R.COL.border;
    const fill = o.disabled ? 'rgba(20,26,30,0.9)' : o.fill || (st.hover > 0 ? U.rgba(U.mix('#06222e', col, 0.25 * st.hover), 0.92) : R.COL.panel);
    R.panel(x, y + oy, w, h, { cut: o.cut !== undefined ? o.cut : Math.min(6, h / 3), border: col, fill, glow: st.hover * 0.35 });
    const tc = o.disabled ? '#8a98a0' : o.textColor || '#ffffff';
    const sc = o.scale || 1;
    let tx = x + w / 2;
    if (o.icon) {
      const ic = GS.Icons.get(o.icon);
      const tw = F().width(label, sc) + ic.width + 3;
      GS.ctx.drawImage(ic, Math.round(x + w / 2 - tw / 2), Math.round(y + oy + h / 2 - ic.height / 2 - (o.sub ? 4 : 0)));
      tx = x + w / 2 + (ic.width + 3) / 2;
    }
    const ty = y + oy + Math.round(h / 2 - (7 * sc) / 2) - (o.sub ? 4 : 0);
    F().draw(label, tx, ty, { color: tc, align: 'center', scale: sc, outline: '#06121a' });
    if (o.sub) F().draw(o.sub, x + w / 2, ty + 9 * sc + 1, { color: o.subColor || R.COL.cyan, align: 'center', outline: '#06121a' });
    let clicked = !o.disabled && inp.clicked(x, y, w, h);
    if (o.key && inp.hit(o.key)) clicked = !o.disabled;
    if (clicked) {
      inp.consume();
      GS.Audio.sfx(o.sfx || 'confirm');
    } else if (o.disabled && inp.clicked(x, y, w, h)) {
      inp.consume();
      GS.Audio.sfx('error');
      if (o.why) UI.toast(o.why);
    }
    return clicked;
  };

  // Petite barre du haut : cristaux / or + bouton retour éventuel.
  UI.topBar = (title, o = {}) => {
    R.gradV(0, 0, GS.W, 18, 'rgba(4,16,24,0.95)', 'rgba(4,16,24,0.7)');
    R.rect(0, 18, GS.W, 1, R.COL.borderDim);
    let back = false;
    if (o.back) back = UI.button('◀ RETOUR', 3, 2, 60, 14, { key: 'back', sfx: 'back', cut: 4 });
    if (title) F().draw(title, o.back ? 70 : 6, 6, { color: R.COL.cyan, outline: '#04101a' });
    UI.currency(GS.W - 4, 5);
    return back;
  };

  UI.currency = (right, y) => {
    const d = GS.data;
    const gw = Math.max(40, F().width(U.fmt(d.gold)) + 16);
    const cw = Math.max(40, F().width(U.fmt(d.gems)) + 16);
    let x = right - gw;
    R.panel(x, y - 3, gw, 13, { cut: 3, border: '#c0a040', fill: 'rgba(10,8,2,0.8)', inner: false });
    GS.Icons.draw('gold', x + 2, y - 1);
    F().draw(U.fmt(d.gold), x + gw - 3, y, { color: '#ffe080', align: 'right' });
    x -= cw + 4;
    R.panel(x, y - 3, cw, 13, { cut: 3, border: '#40a0ff', fill: 'rgba(2,8,16,0.8)', inner: false });
    GS.Icons.draw('gem', x + 2, y - 2);
    F().draw(U.fmt(d.gems), x + cw - 3, y, { color: '#a0e0ff', align: 'right' });
  };

  // Cadre aux couleurs de la rareté (★5 = arc-en-ciel animé, ★6 = écarlate pulsant).
  UI.rarityColor = (r, t = 0, off = 0) => (r >= 6 ? GS.mythic(t, off) : r === 5 ? GS.rainbow(t, off) : (GS.RARITY[r] || GS.RARITY[3]).color);

  UI.spriteOf = (def) => GS.HeroArt.build(def.id, def.look);

  // Dessine un héros (corps + arme au repos) aux pieds (x, y).
  UI.drawHero = (def, x, y, o = {}) => {
    const sp = UI.spriteOf(def);
    const sc = o.scale || 1;
    const ctx = GS.ctx;
    const bob = o.bob ? Math.round(Math.sin(o.bob * 3) * 0.6 + 0.5) * sc : 0;
    const left = Math.round(x - sp.foot.x * sc);
    const top = Math.round(y - sp.foot.y * sc);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    const img = o.silhouette ? sp.dark : sp.body;
    if (o.flip) {
      ctx.translate(Math.round(x), 0);
      ctx.scale(-1, 1);
      ctx.translate(-Math.round(x), 0);
    }
    // La tête "respire" (décalage d'1 px), le corps reste fixe.
    const split = 14 + sp.body.pad;
    ctx.drawImage(img, 0, 0, img.width, split, left, top + bob, img.width * sc, split * sc);
    ctx.drawImage(img, 0, split, img.width, img.height - split, left, top + split * sc, img.width * sc, (img.height - split) * sc);
    if (sp.weapon) {
      const isBow = def.look.weapon === 'bow';
      ctx.save();
      ctx.translate(left + sp.hand.x * sc, top + sp.hand.y * sc);
      ctx.rotate(isBow ? 0 : o.weaponRot !== undefined ? o.weaponRot : 0.35);
      ctx.drawImage(o.silhouette ? sp.weaponDark : sp.weapon, -sp.grip[0] * sc, -sp.grip[1] * sc, sp.weapon.width * sc, sp.weapon.height * sc);
      ctx.restore();
    }
    ctx.restore();
  };

  // Portrait (tête) recadré.
  UI.portrait = (def, x, y, w, h, scale = 2, o = {}) => {
    const sp = UI.spriteOf(def);
    const ctx = GS.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const img = o.dark ? sp.dark : sp.body;
    const fx = o.focusX !== undefined ? o.focusX : 15;
    const fy = o.focusY !== undefined ? o.focusY : 12;
    ctx.drawImage(img, Math.round(x + w / 2 - fx * scale), Math.round(y + h / 2 - fy * scale), img.width * scale, img.height * scale);
    ctx.restore();
  };

  // Carte de héros (collection, équipe, résultats d'invocation).
  UI.unitCard = (x, y, w, h, def, o = {}) => {
    const t = GS.Scenes.time;
    const col = UI.rarityColor(def.rarity, t, x + y);
    const el = GS.EL[def.element];
    R.rect(x, y, w, h, o.selected ? U.shade(el.dark, -0.1) : '#0c1a24');
    R.gradV(x + 1, y + 1, w - 2, h - 2, U.rgba(el.dark, 0.9), 'rgba(6,10,20,0.95)');
    R.frame(x, y, w, h, col);
    if (o.selected) R.frame(x + 1, y + 1, w - 2, h - 2, '#ffffff');
    // carte Mythique : double cadre rouge et noir qui pulse
    const mythic = def.rarity >= 6;
    if (mythic && !o.selected) R.frame(x + 1, y + 1, w - 2, h - 2, U.rgba('#ff2a3a', 0.35 + Math.sin(t * 5) * 0.25));
    if (GS.Art.char(def).rig) GS.Art.portrait(def, x + 1, y + 1, w - 2, h - 10, o.scale || 1, { focusY: 12 });
    else UI.portrait(def, x + 1, y + 1, w - 2, h - 10, (o.scale || 1) * 2, { focusY: 17 });
    GS.Icons.draw(def.element, x + 2, y + 2);
    R.rect(x + 1, y + h - 9, w - 2, 8, 'rgba(0,0,0,0.6)');
    if (o.level !== undefined) F().draw('NV' + o.level, x + 3, y + h - 8, { color: '#ffffff' });
    const st = GS.Icons.get(mythic ? 'starRed' : 'star');
    if (o.stars !== false) {
      const n = def.rarity;
      const step = n >= 6 ? 4 : 5;
      const sx = x + w - 2 - n * step - 2;
      for (let i = 0; i < n; i++) GS.ctx.drawImage(st, sx + i * step, y + h - 9);
    }
    if (o.awaken) F().draw('+' + o.awaken, x + w - 3, y + 3, { color: '#ffe060', align: 'right', outline: '#000' });
    if (o.tag) {
      R.rect(x + w - F().width(o.tag) - 5, y + 2, F().width(o.tag) + 4, 9, o.tagColor || '#ff3060');
      F().draw(o.tag, x + w - 3, y + 3, { color: '#ffffff', align: 'right' });
    }
    if (o.inTeam) {
      R.rect(x + 1, y + 12, 18, 9, '#2a90ff');
      F().draw('ÉQ', x + 3, y + 13, { color: '#ffffff' });
    }
  };

  // Notifications.
  const toasts = [];
  UI.toast = (text, color = '#ffffff') => {
    toasts.push({ text, color, t: 0 });
    if (toasts.length > 3) toasts.shift();
  };
  UI.drawToasts = () => {
    for (let i = 0; i < toasts.length; i++) {
      const ts = toasts[i];
      ts.t += GS.dt || 0.016;
      const a = ts.t < 0.2 ? ts.t / 0.2 : ts.t > 2.2 ? (2.6 - ts.t) / 0.4 : 1;
      const w = F().width(ts.text) + 16;
      const y = 24 + i * 16;
      GS.ctx.save();
      GS.ctx.globalAlpha = U.clamp(a, 0, 1);
      R.panel(GS.W / 2 - w / 2, y, w, 14, { cut: 4 });
      F().draw(ts.text, GS.W / 2, y + 4, { color: ts.color, align: 'center' });
      GS.ctx.restore();
    }
    for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t > 2.6) toasts.splice(i, 1);
  };

  // Rayons lumineux tournants (fond d'invocation / bannière).
  UI.rays = (cx, cy, color, t, n = 12, len = 300, alpha = 0.15) => {
    const ctx = GS.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = t * 0.3 + (i / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - 0.08) * len, cy + Math.sin(a - 0.08) * len);
      ctx.lineTo(cx + Math.cos(a + 0.08) * len, cy + Math.sin(a + 0.08) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
})();
