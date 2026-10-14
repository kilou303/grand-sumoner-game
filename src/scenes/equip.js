'use strict';
// Menu Équipement : 3 pièces par héros (arme, armure, accessoire), liste des passifs
// (innés + équipement), inventaire, forge (+1 à +5) et vente.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;
  const P = GS.Passives;
  const Q = () => GS.Equip;

  // Coupe un texte trop large.
  const fit = (text, w) => {
    let t = text;
    while (t && F().width(t) > w) t = t.slice(0, -2);
    return t === text ? t : t.trimEnd() + '...';
  };

  // Icône d'un objet : cadre à la couleur de la rareté + icône de l'emplacement.
  GS.UI.itemIcon = (id, x, y, o = {}) => {
    const def = GS.EQUIPS[id];
    const col = P.RARITY[def.rarity].color;
    const s = o.size || 18;
    R.rect(x, y, s, s, 'rgba(6,10,20,0.95)');
    R.gradV(x + 1, y + 1, s - 2, s - 2, U.rgba(col, 0.35), 'rgba(6,10,20,0.9)');
    R.frame(x, y, s, s, col);
    const ic = GS.Icons.get(GS.SLOT[def.slot].icon);
    const k = s >= 24 ? 2 : 1;
    GS.ctx.drawImage(ic, Math.round(x + s / 2 - (ic.width * k) / 2), Math.round(y + s / 2 - (ic.height * k) / 2), ic.width * k, ic.height * k);
    if (o.lvl) F().draw('+' + o.lvl, x + s - 1, y + s - 8, { color: '#ffe060', outline: '#000', align: 'right' });
  };
  GS.UI.fitText = fit;

  // Liste des héros : l'équipe d'abord, puis les autres par rareté.
  const unitList = () => {
    const team = GS.Save.teamUnits();
    const rest = GS.data.units
      .filter((u) => !team.includes(u))
      .sort((a, b) => GS.UNIT[b.id].rarity - GS.UNIT[a.id].rarity || b.level - a.level);
    return team.concat(rest);
  };

  const TABS = [
    { id: 'passives', name: 'PASSIFS' },
    { id: 'weapon', name: 'ARME' },
    { id: 'armor', name: 'ARMURE' },
    { id: 'acc', name: 'ACCESSOIRE' },
  ];
  const ROW = 14;
  const LIST_Y = 42;
  const LIST_H = 222;

  class EquipScene {
    constructor(unit, back) {
      this.start = unit || null;
      this.back = back || (() => new GS.HomeScene());
    }
    enter() {
      this.t = 0;
      this.units = unitList();
      this.ui = Math.max(0, this.units.indexOf(this.start));
      this.tab = 'passives';
      this.sel = null;
      this.scroll = 0;
      this.confirmSell = false;
      GS.Audio.music('home');
    }
    get unit() {
      return this.units[this.ui];
    }
    setTab(tab) {
      this.tab = tab;
      this.scroll = 0;
      this.confirmSell = false;
      const cur = tab !== 'passives' ? Q().of(this.unit)[tab] : null;
      this.sel = cur ? cur.uid : null;
    }
    slotItems() {
      return Q()
        .items()
        .filter((it) => GS.EQUIPS[it.id].slot === this.tab)
        .sort((a, b) => Q().rank(b.id) - Q().rank(a.id) || (b.lvl || 0) - (a.lvl || 0) || GS.EQUIPS[a.id].name.localeCompare(GS.EQUIPS[b.id].name));
    }
    update(dt) {
      this.t += dt;
      const inp = GS.Input;
      if (this.tab !== 'passives' && inp.over(170, LIST_Y, 154, LIST_H)) {
        this.scroll -= inp.dragY + inp.wheel * 20;
        this.scroll = U.clamp(this.scroll, 0, Math.max(0, this.slotItems().length * ROW - LIST_H));
      }
    }

    draw(ctx) {
      GS.BG.draw('school', this.t, 0, 0);
      R.fade(0.55, '#05030c');
      if (UI().topBar('ÉQUIPEMENT', { back: true })) {
        GS.go(this.back());
        return;
      }
      if (!this.unit) return;
      this.drawHero(ctx);
      R.panel(170, 22, 306, 244, { cut: 8 });
      TABS.forEach((tb, i) => {
        if (UI().button(tb.name, 174 + i * 75, 25, 72, 14, { id: 'eq_tab' + i, sfx: 'select', selected: this.tab === tb.id, color: this.tab === tb.id ? '#ffd040' : undefined, cut: 4 })) this.setTab(tb.id);
      });
      if (this.tab === 'passives') this.drawPassives();
      else this.drawInventory();
    }

    // ---------------------------------------------------------------- héros
    drawHero() {
      const u = this.unit;
      const def = GS.UNIT[u.id];
      R.panel(4, 22, 162, 244, { cut: 8, border: UI().rarityColor(def.rarity, this.t) });
      if (UI().button('<', 8, 26, 16, 16, { id: 'eq_prev', sfx: 'select', key: 'left' })) this.switchUnit(-1);
      if (UI().button('>', 146, 26, 16, 16, { id: 'eq_next', sfx: 'select', key: 'right' })) this.switchUnit(1);
      GS.Icons.draw(def.element, 28, 30);
      F().draw(fit(def.name, 100), 85, 29, { color: '#ffffff', outline: '#000', align: 'center' });
      F().draw(`NV ${u.level} · ${this.ui + 1}/${this.units.length}`, 85, 38, { color: R.COL.dim, align: 'center' });
      UI().rays(85, 90, GS.EL[def.element].color, this.t, 10, 70, 0.07);
      R.ellipse(85, 118, 22, 4, 'rgba(0,0,0,0.45)');
      GS.Art.drawUnit(def, 85, 118, { anim: 'idle', t: this.t });
      // emplacements
      const eq = Q().of(u);
      GS.SLOTS.forEach((sl, i) => {
        const y = 122 + i * 24;
        const on = this.tab === sl.id;
        R.panel(8, y, 154, 22, { cut: 4, border: on ? '#ffd040' : R.COL.borderDim, fill: on ? 'rgba(40,30,4,0.85)' : undefined, inner: false });
        const it = eq[sl.id];
        if (it) UI().itemIcon(it.id, 10, y + 2, { lvl: it.lvl });
        else {
          R.frame(10, y + 2, 18, 18, '#3a4a58');
          GS.ctx.globalAlpha = 0.35;
          GS.Icons.draw(sl.icon, 15, y + 7);
          GS.ctx.globalAlpha = 1;
        }
        F().draw(sl.name, 32, y + 3, { color: R.COL.dim });
        F().draw(it ? fit(GS.EQUIPS[it.id].name, 126) : '- vide -', 32, y + 12, { color: it ? Q().color(it.id) : '#5a6a78' });
        if (GS.Input.clicked(8, y, 154, 22)) {
          GS.Input.consume();
          GS.Audio.sfx('select');
          this.setTab(sl.id);
        }
      });
      // stats : base -> finale
      const base = GS.unitStats(def, u.level, u.awaken);
      const st = GS.Save.stats(u);
      const S = [
        ['PV', 'hp', '#60f080'],
        ['ATQ', 'atk', '#ff7060'],
        ['DÉF', 'def', '#60a0ff'],
        ['VIT', 'spd', '#ffe060'],
        ['MP', 'mp', '#c080ff'],
      ];
      S.forEach(([n, k, c], i) => {
        const y = 198 + i * 10;
        F().draw(n, 12, y, { color: c });
        F().draw(U.fmt(st[k]), 92, y, { color: '#ffffff', align: 'right' });
        const d = st[k] - base[k];
        if (d) F().draw((d > 0 ? '+' : '') + U.fmt(d), 98, y, { color: d > 0 ? '#70ff90' : '#ff7080' });
      });
      F().draw('Puissance ' + U.fmt(GS.Save.power(u)), 85, 252, { color: '#ffe080', align: 'center' });
    }
    switchUnit(d) {
      this.ui = (this.ui + d + this.units.length) % this.units.length;
      this.setTab(this.tab);
    }

    // ---------------------------------------------------------------- passifs
    drawPassives() {
      const u = this.unit;
      const list = GS.Save.passivesOf(u);
      const innate = list.filter((p) => p.src === 'innate');
      const gear = list.filter((p) => p.src !== 'innate');
      const on = innate.filter((p) => !p.locked).length;
      F().draw(`PASSIFS INNÉS  ${on}/${innate.length}`, 176, 44, { color: R.COL.cyan });
      F().draw('max ' + P.MAX, 470, 44, { color: R.COL.dim, align: 'right' });
      const row = (p, y, icon) => {
        const def = GS.PASSIVES[p.id];
        const rar = P.RARITY[def.rarity];
        const col = p.locked ? '#5a6878' : P.color(p.id, this.t);
        let x = 178;
        if (icon) {
          GS.Icons.draw(icon, x, y);
          x += 11;
        }
        F().draw(def.name, x, y, { color: col });
        F().draw(rar.name.toUpperCase(), 470, y, { color: p.locked ? '#5a6878' : col, align: 'right' });
        if (p.locked) {
          GS.Icons.draw('lock', 470 - F().width(rar.name) - 12, y - 1);
          F().draw(fit(`Débloqué au NV ${p.need}`, 286), 186, y + 9, { color: '#7a8898' });
        } else F().draw(fit(P.desc(p.id), 286), 186, y + 9, { color: '#c8d8e0' });
      };
      innate.forEach((p, i) => row(p, 56 + i * 20));
      if (!innate.length) F().draw('Aucun passif inné', 178, 58, { color: R.COL.dim });
      R.rect(176, 158, 294, 1, R.COL.borderDim);
      F().draw(`ÉQUIPEMENT  ${gear.length}/3`, 176, 163, { color: R.COL.cyan });
      gear.forEach((p, i) => row(p, 175 + i * 20, GS.SLOT[p.src].icon));
      if (!gear.length) F().draw('Aucune pièce : choisis un emplacement.', 178, 177, { color: R.COL.dim });
      F().draw(`Passifs actifs : ${on + gear.length}`, 470, 252, { color: '#ffe080', align: 'right' });
    }

    // ---------------------------------------------------------------- inventaire
    drawInventory() {
      const ctx = GS.ctx;
      const u = this.unit;
      const items = this.slotItems();
      ctx.save();
      ctx.beginPath();
      ctx.rect(172, LIST_Y, 152, LIST_H);
      ctx.clip();
      items.forEach((it, i) => {
        const y = LIST_Y + i * ROW - this.scroll;
        if (y + ROW < LIST_Y || y > LIST_Y + LIST_H) return;
        const sel = it.uid === this.sel;
        const own = Q().owner(it.uid);
        if (sel) R.rect(173, y, 150, ROW - 1, 'rgba(255,208,64,0.18)');
        R.rect(174, y + 1, 2, ROW - 3, Q().color(it.id));
        F().draw(fit(Q().label(it), own ? 96 : 140), 179, y + 3, { color: Q().color(it.id) });
        if (own) F().draw(fit(GS.UNIT[own.id].name, 44), 321, y + 3, { color: own === u ? '#70ff90' : '#8a98a8', align: 'right' });
        if (GS.Input.clicked(172, Math.max(LIST_Y, y), 152, ROW) && !GS.Input.dragging) {
          GS.Input.consume();
          GS.Audio.sfx('select');
          this.sel = it.uid;
          this.confirmSell = false;
        }
      });
      ctx.restore();
      if (!items.length) {
        F().drawWrapped("Aucun objet. Gagne-en dans les quêtes, à l'invocation ou à la boutique.", 178, 48, 140, { color: R.COL.dim });
      }
      R.rect(325, 42, 1, 222, R.COL.borderDim);
      const it = this.sel ? Q().item(this.sel) : null;
      if (!it) {
        F().drawWrapped('Choisis un objet dans la liste.', 332, 48, 138, { color: R.COL.dim });
        return;
      }
      this.drawItem(it);
    }

    drawItem(it) {
      const u = this.unit;
      const def = GS.EQUIPS[it.id];
      const x = 330;
      UI().itemIcon(it.id, x, 44, { size: 26 });
      const name = F().wrap(Q().label(it), 110);
      name.slice(0, 2).forEach((l, i) => F().draw(l, x + 30, 45 + i * 9, { color: Q().color(it.id) }));
      F().draw(`${P.RARITY[def.rarity].name} · ${GS.SLOT[def.slot].name}`, x + 30, 63, { color: R.COL.dim });
      F().draw(`Forge +${it.lvl || 0}/${Q().MAX_LVL}`, x, 76, { color: '#ffe080' });
      F().drawWrapped(Q().statText(it), x, 86, 140, { color: '#ffffff' });
      F().draw(GS.PASSIVES[def.passive].name, x, 106, { color: P.color(def.passive, this.t) });
      const lines = F().wrap(P.desc(def.passive), 140);
      lines.slice(0, 3).forEach((l, i) => F().draw(l, x, 116 + i * 9, { color: '#c8d8e0' }));
      const own = Q().owner(it.uid);
      F().draw(own ? 'Porté par ' + GS.UNIT[own.id].name : 'Libre', x, 146, { color: own ? '#8ad0ff' : R.COL.dim });
      // actions
      const mine = own === u;
      if (mine) {
        if (UI().button('RETIRER', x, 158, 140, 18, { id: 'eq_rm', sfx: 'back' })) Q().unequip(u, def.slot);
      } else if (UI().button(own ? 'ÉQUIPER (reprendre)' : 'ÉQUIPER', x, 158, 140, 18, { id: 'eq_on', color: '#60f080' })) {
        Q().equip(u, it.uid);
        GS.Audio.sfx('buff');
      }
      const lvl = it.lvl || 0;
      const cost = Q().upgradeCost(it);
      const maxed = lvl >= Q().MAX_LVL;
      if (UI().button(maxed ? 'FORGE MAX' : `FORGER +1  ${U.fmt(cost)}`, x, 180, 140, 18, { id: 'eq_up', icon: maxed ? null : 'gold', color: '#ffd040', disabled: maxed || GS.data.gold < cost, why: maxed ? 'Niveau de forge maximum' : "Pas assez d'or" })) {
        Q().upgrade(it);
        GS.Audio.sfx('levelup');
      }
      const val = Q().sellValue(it);
      if (UI().button(this.confirmSell ? 'CONFIRMER LA VENTE ?' : `VENDRE  +${U.fmt(val)}`, x, 202, 140, 18, { id: 'eq_sell', icon: this.confirmSell ? null : 'gold', color: '#ff7080', sfx: 'select' })) {
        if (!this.confirmSell) this.confirmSell = true;
        else {
          Q().sell(it);
          GS.Audio.sfx('coin');
          GS.UI.toast(`+${U.fmt(val)} or`, '#ffe080');
          this.sel = null;
          this.confirmSell = false;
        }
      }
      // comparaison avec la pièce portée
      const cur = Q().of(u)[def.slot];
      if (cur && cur.uid !== it.uid) {
        F().draw('Porte : ' + fit(Q().label(cur), 104), x, 228, { color: R.COL.dim });
        F().draw(fit(GS.PASSIVES[GS.EQUIPS[cur.id].passive].name, 140), x, 238, { color: P.color(GS.EQUIPS[cur.id].passive, this.t) });
      }
    }
  }
  GS.EquipScene = EquipScene;
})();
