'use strict';
// Invocation (gacha) : bannières, animation du portail, révélation des héros, résultats.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;
  const RCOL = { 3: '#5aa8ff', 4: '#ffc83a', 5: '#ff70d0' };

  class SummonScene {
    enter() {
      this.t = 0;
      this.state = 'banner';
      this.bi = 0;
      this.fx = new GS.FXLayer();
      this.results = null;
      this.showRates = false;
      this.mode = this.mode || 'heroes';
      GS.Audio.music('summon');
    }

    get banner() {
      return GS.BANNERS[this.bi];
    }

    pull(n) {
      const res = GS.Gacha.pull(this.banner, n);
      if (!res) {
        GS.Audio.sfx('error');
        GS.UI.toast('Pas assez de cristaux ! Termine des quêtes.', '#ff8090');
        return;
      }
      this.results = res;
      this.best = Math.max(...res.map((r) => r.rarity));
      this.state = 'anim';
      this.at = 0;
      this.orbs = res.map((r, i) => ({ a: (i / res.length) * Math.PI * 2, r: 140 + Math.random() * 40, rar: r.rarity }));
      this.fx.clear();
      GS.Audio.sfx('summon_charge');
    }

    // Invocation d'équipement (rareté -> couleur des orbes : commun/rare 3, épique 4, légendaire 5).
    pullEquip(n) {
      const res = GS.Equip.summon(n);
      if (!res) {
        GS.Audio.sfx('error');
        GS.UI.toast('Pas assez de cristaux ! Termine des quêtes.', '#ff8090');
        return;
      }
      const rr = (it) => [3, 3, 4, 5][GS.Equip.rank(it.id)];
      this.eqResults = res;
      this.best = Math.max(...res.map(rr));
      this.state = 'anim';
      this.at = 0;
      this.orbs = res.map((it, i) => ({ a: (i / res.length) * Math.PI * 2, r: 140 + Math.random() * 40, rar: rr(it) }));
      this.fx.clear();
      GS.Audio.sfx('summon_charge');
    }

    update(dt) {
      this.t += dt;
      this.fx.update(dt);
      const inp = GS.Input;
      if (this.state === 'anim') {
        this.at += dt;
        for (const o of this.orbs) {
          o.a += dt * (1.2 + this.at);
          o.r = Math.max(0, o.r - dt * (50 + this.at * 60));
        }
        if (Math.random() < dt * 30) {
          const a = Math.random() * Math.PI * 2;
          const col = RCOL[this.best];
          this.fx.parts.push({ x: GS.W / 2 + Math.cos(a) * 160, y: 140 + Math.sin(a) * 90, vx: -Math.cos(a) * 160, vy: -Math.sin(a) * 90, g: 0, drag: 1, life: 1, max: 1, size: 2, color: col, shape: 'line', add: true, fade: true, shrink: false });
        }
        if (this.at > 2.6 || (this.at > 0.4 && inp.tapped())) {
          inp.consume();
          if (this.mode === 'equip') {
            this.state = 'eqresults';
            this.rt = 0;
            GS.Audio.sfx('summon_burst');
            if (this.best >= 4) setTimeout(() => GS.Audio.sfx('rare'), 300);
          } else this.startReveal(0);
        }
      } else if (this.state === 'reveal') {
        this.rt += dt;
        const r = this.results[this.ri];
        // étoiles une à une
        const nStars = Math.min(r.rarity, Math.floor((this.rt - 0.9) / 0.22) + 1);
        if (this.rt > 0.9 && nStars > this.starsShown) {
          this.starsShown = nStars;
          GS.Audio.sfx('star', 1 + nStars * 0.12);
        }
        if (inp.tapped() && this.rt > 0.5) {
          inp.consume();
          if (this.rt < 1.6) this.rt = 1.6 + r.rarity * 0.22;
          else if (this.ri + 1 < this.results.length) this.startReveal(this.ri + 1);
          else this.state = 'results';
        }
      }
    }

    startReveal(i) {
      this.state = 'reveal';
      this.ri = i;
      this.rt = 0;
      this.starsShown = 0;
      const r = this.results[i];
      GS.Audio.sfx('summon_burst');
      if (r.rarity >= 4) setTimeout(() => GS.Audio.sfx('rare'), 600);
      this.fx.groundRing(GS.W / 2, 210, { scheme: r.rarity === 5 ? 'blood' : r.rarity === 4 ? 'light' : 'water', r1: 110, dur: 0.9, h: 60 });
      for (let k = 0; k < 4; k++) this.fx.sparkle(GS.W / 2 + U.rand(-80, 80), U.rand(60, 180), { color: RCOL[r.rarity], size: U.rand(10, 22) });
    }

    // ---------------------------------------------------------------- rendu
    drawSky(color) {
      GS.BG.draw('shrine', this.t, this.t * 8, 0);
      R.fade(0.55, '#05030c');
      UI().rays(GS.W / 2, 150, color, this.t, 16, 400, 0.08);
    }

    draw(ctx) {
      if (this.state === 'banner') this.drawBanner(ctx);
      else if (this.state === 'anim') this.drawAnim(ctx);
      else if (this.state === 'reveal') this.drawReveal(ctx);
      else if (this.state === 'eqresults') this.drawEquipResults(ctx);
      else this.drawResults(ctx);
    }

    // Onglets HÉROS / ÉQUIPEMENT dans la barre du haut.
    drawModeTabs() {
      if (UI().button('HÉROS', 146, 2, 60, 14, { id: 's_mh', sfx: 'select', selected: this.mode === 'heroes', color: this.mode === 'heroes' ? '#ff70d0' : undefined, cut: 4 })) this.mode = 'heroes';
      if (UI().button('ÉQUIPEMENT', 210, 2, 76, 14, { id: 's_me', sfx: 'select', selected: this.mode === 'equip', color: this.mode === 'equip' ? '#c070ff' : undefined, cut: 4 })) this.mode = 'equip';
    }

    drawEquipBanner() {
      const col = '#c070ff';
      this.drawSky(col);
      if (UI().topBar('INVOCATION', { back: true })) {
        GS.go(new GS.HomeScene());
        return;
      }
      this.drawModeTabs();
      const x = 40;
      const y = 26;
      const w = 400;
      const h = 168;
      R.panel(x, y, w, h, { cut: 10, border: col, glow: 0.2 + Math.sin(this.t * 3) * 0.1 });
      R.gradV(x + 2, y + 2, w - 4, h - 4, U.rgba(col, 0.25), 'rgba(5,3,12,0.4)');
      F().draw('Arsenal Maudit', x + 14, y + 10, { color: '#ffffff', outline: '#000', scale: 2 });
      F().draw('Armes, armures et accessoires à passifs', x + 14, y + 30, { color: col, outline: '#000' });
      const r = GS.Equip.SUMMON.rates;
      F().draw(`Légendaire ${r.legendary}% · Épique ${r.epic}% · Rare ${r.rare}% · Commun ${r.common}%`, x + 14, y + 48, { color: '#e8fbff', outline: '#000' });
      F().draw('x10 : Épique ou mieux garanti', x + 14, y + 60, { color: '#ffd040', outline: '#000' });
      F().draw('3 pièces par héros, chacune avec son passif', x + 14, y + 72, { color: R.COL.dim, outline: '#000' });
      const show = ['epee_aube', 'faux_eclipse', 'cuirasse_phenix', 'couronne'];
      show.forEach((id, i) => {
        const cx = x + 64 + i * 92;
        UI().rays(cx, y + 112, GS.Equip.color(id), this.t + i, 8, 40, 0.12);
        GS.UI.itemIcon(id, cx - 15, y + 96 + Math.round(Math.sin(this.t * 2 + i) * 2), { size: 30 });
        F().wrap(GS.EQUIPS[id].name, 88).slice(0, 2).forEach((l, k) => F().draw(l, cx, y + 132 + k * 9, { color: GS.Equip.color(id), outline: '#000', align: 'center' }));
      });
      const g = GS.data.gems;
      const S = GS.Equip.SUMMON;
      if (UI().button('INVOQUER x1', 60, 210, 170, 40, { id: 'se_1', icon: 'gem', sub: S.cost1 + ' cristaux', disabled: g < S.cost1, why: 'Pas assez de cristaux !' })) this.pullEquip(1);
      if (UI().button('INVOQUER x10', 250, 210, 170, 40, { id: 'se_10', icon: 'gem', color: '#ffd040', sub: S.cost10 + ' cristaux · Épique garanti', disabled: g < S.cost10, why: 'Pas assez de cristaux !' })) this.pullEquip(10);
    }

    drawEquipResults() {
      this.rt = (this.rt || 0) + (GS.dt || 0.016);
      this.drawSky('#c070ff');
      this.fx.draw(GS.ctx);
      F().draw('ÉQUIPEMENTS OBTENUS', GS.W / 2, 10, { color: '#ffffff', outline: '#000', scale: 2, align: 'center' });
      const res = this.eqResults;
      const n = res.length;
      const cols = Math.min(5, n);
      const cw = 82;
      const ch = 90;
      const x0 = GS.W / 2 - (cols * (cw + 6)) / 2 + 3;
      res.forEach((it, i) => {
        if (this.rt < i * 0.08) return;
        const def = GS.EQUIPS[it.id];
        const col = GS.Passives.RARITY[def.rarity].color;
        const x = x0 + (i % cols) * (cw + 6);
        const y = 32 + Math.floor(i / cols) * (ch + 6);
        R.panel(x, y, cw, ch, { cut: 6, border: col, glow: GS.Equip.rank(it.id) >= 3 ? 0.3 : 0 });
        GS.UI.itemIcon(it.id, x + cw / 2 - 13, y + 6, { size: 26 });
        F().wrap(def.name, cw - 6).slice(0, 2).forEach((l, k) => F().draw(l, x + cw / 2, y + 36 + k * 9, { color: col, align: 'center' }));
        F().draw(GS.Passives.RARITY[def.rarity].name, x + cw / 2, y + 56, { color: R.COL.dim, align: 'center' });
        F().draw(GS.UI.fitText(GS.PASSIVES[def.passive].name, cw - 6), x + cw / 2, y + 70, { color: GS.Passives.color(def.passive, this.t), align: 'center' });
      });
      const S = GS.Equip.SUMMON;
      if (UI().button('OK', 140, 232, 90, 26, { id: 're_ok', key: 'confirm' })) this.state = 'banner';
      if (UI().button('ENCORE x' + n, 250, 232, 110, 26, { id: 're_again', color: '#ffd040', disabled: GS.data.gems < (n === 10 ? S.cost10 : S.cost1), why: 'Pas assez de cristaux !' })) this.pullEquip(n);
      if (UI().button('ÉQUIPER ▶', 370, 232, 100, 26, { id: 're_eq', sfx: 'select' })) {
        GS.go(new GS.EquipScene(null, () => {
          const sc = new SummonScene();
          sc.mode = 'equip';
          return sc;
        }));
      }
      UI().currency(GS.W - 6, 8);
    }

    drawBanner() {
      if (this.mode === 'equip') {
        this.drawEquipBanner();
        return;
      }
      const b = this.banner;
      this.drawSky(b.color);
      if (UI().topBar('INVOCATION', { back: true })) {
        GS.go(new GS.HomeScene());
        return;
      }
      this.drawModeTabs();
      // carte de bannière
      const x = 40;
      const y = 26;
      const w = 400;
      const h = 168;
      R.panel(x, y, w, h, { cut: 10, border: b.color, glow: 0.2 + Math.sin(this.t * 3) * 0.1 });
      R.gradV(x + 2, y + 2, w - 4, h - 4, U.rgba(b.color, 0.25), 'rgba(5,3,12,0.4)');
      F().draw(b.name, x + 14, y + 10, { color: '#ffffff', outline: '#000', scale: 2 });
      F().draw(b.sub, x + 14, y + 30, { color: b.color, outline: '#000' });
      const show = b.show.map((id) => GS.UNIT[id]);
      show.forEach((def, i) => {
        const cx = x + w - 70 - (show.length - 1 - i) * 74;
        UI().rays(cx, y + 110, GS.EL[def.element].color, this.t + i, 8, 70, 0.12);
        GS.Art.drawUnit(def, cx, y + h - 16, { scale: show.length > 1 ? 1 : 2, anim: 'stance', t: this.t + i });
        F().draw(def.name, cx, y + h - 12, { color: '#ffffff', outline: '#000', align: 'center' });
      });
      F().draw('Taux : ★5 5%  ·  ★4 22%  ·  ★3 73%', x + 14, y + 48, { color: '#e8fbff', outline: '#000' });
      const left = GS.Gacha.PITY - GS.data.pity;
      F().draw(`★5 garanti dans ${left} invocations`, x + 14, y + 60, { color: '#ffd040', outline: '#000' });
      if (GS.data.firstMulti) F().draw('1re invocation x10 : ★5 GARANTI !', x + 14, y + 74, { color: GS.rainbow(this.t), outline: '#000' });
      F().draw('Doublon = ÉVEIL (+6% stats)', x + 14, y + 88, { color: R.COL.dim, outline: '#000' });
      // flèches de bannière
      if (UI().button('<', 6, 96, 28, 28, { id: 's_prev', sfx: 'select', key: 'left' })) this.bi = (this.bi + GS.BANNERS.length - 1) % GS.BANNERS.length;
      if (UI().button('>', 446, 96, 28, 28, { id: 's_next', sfx: 'select', key: 'right' })) this.bi = (this.bi + 1) % GS.BANNERS.length;
      GS.BANNERS.forEach((bb, i) => R.rect(GS.W / 2 - GS.BANNERS.length * 6 + i * 12, 198, 8, 3, i === this.bi ? '#ffffff' : '#5a6070'));
      // boutons d'invocation
      const g = GS.data.gems;
      if (UI().button('INVOQUER x1', 60, 210, 170, 40, { id: 's_1', icon: 'gem', sub: GS.Gacha.COST1 + ' cristaux', disabled: g < GS.Gacha.COST1, why: 'Pas assez de cristaux !' })) this.pull(1);
      if (UI().button('INVOQUER x10', 250, 210, 170, 40, { id: 's_10', icon: 'gem', color: '#ffd040', sub: GS.Gacha.COST10 + ' cristaux · ★4 garanti', disabled: g < GS.Gacha.COST10, why: 'Pas assez de cristaux !' })) this.pull(10);
    }

    drawAnim(ctx) {
      const col = RCOL[this.best];
      this.drawSky(col);
      const cx = GS.W / 2;
      const cy = 150;
      const k = Math.min(1, this.at / 1.2);
      // cercle magique
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = col;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.6 - i * 0.15;
        ctx.lineWidth = 2 - i * 0.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 60, (70 + i * 18) * k, (20 + i * 5) * k, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = this.at * 1.5 + (i / 12) * Math.PI * 2;
        R.rect(cx + Math.cos(a) * 80 * k - 1, cy + 60 + Math.sin(a) * 22 * k - 1, 3, 3, '#ffffff');
      }
      // orbes
      for (const o of this.orbs) {
        const x = cx + Math.cos(o.a) * o.r;
        const y = cy + Math.sin(o.a) * o.r * 0.5;
        const c = this.at > 1.2 ? RCOL[o.rar] : '#c0d8ff';
        ctx.globalAlpha = 0.4;
        R.circle(x, y, 6, c);
        ctx.globalAlpha = 1;
        R.circle(x, y, 3, '#ffffff');
      }
      // colonne de lumière qui grandit
      if (this.at > 1.6) {
        const p = Math.min(1, (this.at - 1.6) / 0.8);
        const g = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = p;
        ctx.fillRect(cx - 30 * p, 0, 60 * p, cy + 60);
      }
      ctx.restore();
      this.fx.draw(ctx);
      if (this.at > 2.2) R.fade((this.at - 2.2) / 0.4, '#ffffff');
      F().draw('Touche pour passer', GS.W / 2, 252, { color: R.COL.dim, align: 'center' });
    }

    drawReveal(ctx) {
      const r = this.results[this.ri];
      const def = GS.UNIT[r.id];
      const col = r.rarity === 5 ? GS.rainbow(this.t) : RCOL[r.rarity];
      this.drawSky(RCOL[r.rarity]);
      const cx = GS.W / 2;
      // colonne
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(cx - 50, 0, cx + 50, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, U.rgba(RCOL[r.rarity], 0.5));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 50, 0, 100, 212);
      ctx.restore();
      this.fx.draw(ctx, true);
      // silhouette puis révélation
      const sil = this.rt < 0.7;
      GS.Art.drawUnit(def, cx, 212, { scale: 2, anim: this.rt < 0.7 ? 'idle' : 'stance', t: this.t, silhouette: sil ? '#ffffff' : false, flash: !sil ? Math.max(0, 1 - (this.rt - 0.7) * 3) : 0 });
      this.fx.draw(ctx, false);
      if (this.rt > 0.7) {
        const p = Math.min(1, (this.rt - 0.7) / 0.3);
        ctx.save();
        ctx.globalAlpha = p;
        R.panel(20, 30, 170, 74, { cut: 8, border: RCOL[r.rarity] });
        GS.Icons.draw(def.element, 28, 38);
        F().draw(def.name, 44, 38, { color: '#ffffff', outline: '#000', scale: 2 });
        F().draw(def.title, 28, 58, { color: col, outline: '#000' });
        F().draw(`${GS.EL[def.element].name} · ${GS.ROLES[def.role].name}`, 28, 70, { color: R.COL.dim });
        const st = GS.Icons.get('star');
        for (let i = 0; i < this.starsShown; i++) ctx.drawImage(st, 28 + i * 9, 84, st.width, st.height);
        if (r.isNew) F().draw('NOUVEAU !', 186, 84, { color: '#ff5080', outline: '#000', align: 'right' });
        else if (r.awakened) F().draw('ÉVEIL +1 !', 186, 84, { color: '#ffe060', outline: '#000', align: 'right' });
        else if (r.gold) F().draw('+' + r.gold + ' OR', 186, 84, { color: '#ffd040', outline: '#000', align: 'right' });
        ctx.restore();
      }
      F().draw(`${this.ri + 1} / ${this.results.length}`, GS.W - 10, 8, { color: '#ffffff', outline: '#000', align: 'right' });
      if (UI().button('PASSER', GS.W - 80, 238, 72, 22, { id: 'sk', sfx: 'select' })) this.state = 'results';
      if (this.rt > 1.4) F().draw('Touche pour continuer', GS.W / 2, 250, { color: '#ffffff', outline: '#000', align: 'center', alpha: Math.sin(this.t * 5) > -0.3 ? 1 : 0.3 });
    }

    drawResults(ctx) {
      this.drawSky('#3ea8ff');
      F().draw('RÉSULTATS', GS.W / 2, 10, { color: '#ffffff', outline: '#000', scale: 2, align: 'center' });
      const n = this.results.length;
      const cols = Math.min(5, n);
      const cw = 70;
      const ch = 86;
      const x0 = GS.W / 2 - (cols * (cw + 6)) / 2 + 3;
      this.results.forEach((r, i) => {
        const def = GS.UNIT[r.id];
        const x = x0 + (i % cols) * (cw + 6);
        const y = 34 + Math.floor(i / cols) * (ch + 6);
        const tag = r.isNew ? 'NEW' : r.awakened ? 'ÉVEIL' : r.gold ? 'OR' : null;
        UI().unitCard(x, y, cw, ch, def, { tag, tagColor: r.isNew ? '#ff3060' : '#c09020' });
        F().draw(def.name, x + cw / 2, y + ch - 20, { color: '#ffffff', outline: '#000', align: 'center' });
      });
      if (UI().button('OK', 140, 232, 90, 26, { id: 'r_ok', key: 'confirm' })) this.state = 'banner';
      if (UI().button('ENCORE x' + n, 250, 232, 110, 26, { id: 'r_again', color: '#ffd040', disabled: GS.data.gems < (n === 10 ? GS.Gacha.COST10 : GS.Gacha.COST1), why: 'Pas assez de cristaux !' })) this.pull(n);
      if (UI().button('HÉROS', 370, 232, 100, 26, { id: 'r_units', sfx: 'select' })) GS.go(new GS.UnitsScene(() => new SummonScene()));
      UI().currency(GS.W - 6, 8);
    }
  }
  GS.SummonScene = SummonScene;
})();
