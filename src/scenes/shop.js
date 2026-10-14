'use strict';
// Boutique : 6 équipements du jour (2 par emplacement) achetés avec de l'or ; le stock
// se renouvelle chaque jour, ou tout de suite contre des cristaux. La forge est dans ÉQUIPEMENT.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;
  const P = GS.Passives;
  const Q = () => GS.Equip;

  class ShopScene {
    constructor(back) {
      this.back = back || (() => new GS.HomeScene());
    }
    enter() {
      this.t = 0;
      GS.Audio.music('home');
    }
    update(dt) {
      this.t += dt;
    }
    draw() {
      GS.BG.draw('street', this.t, 120, 0);
      R.fade(0.55, '#05030c');
      if (UI().topBar('BOUTIQUE', { back: true })) {
        GS.go(this.back());
        return;
      }
      const sh = Q().shop();
      F().draw('Stock du jour', 10, 26, { color: R.COL.cyan, scale: 2, outline: '#000' });
      F().draw('Renouvelé chaque jour · Forge et vente : menu ÉQUIPEMENT', 10, 44, { color: R.COL.dim });
      sh.stock.forEach((s, i) => {
        const x = 8 + (i % 3) * 156;
        const y = 56 + Math.floor(i / 3) * 96;
        this.card(s, i, x, y, 150, 90);
      });
      if (UI().button(`NOUVEAU STOCK  ${Q().REFRESH_GEMS}`, 8, 248, 150, 18, { id: 'sh_ref', icon: 'gem', color: '#40a0ff', disabled: GS.data.gems < Q().REFRESH_GEMS, why: 'Pas assez de cristaux !' })) {
        Q().refresh();
        GS.Audio.sfx('summon_burst');
      }
      if (UI().button('ÉQUIPEMENT ▶', 322, 248, 150, 18, { id: 'sh_eq', sfx: 'select' })) GS.go(new GS.EquipScene(null, () => new ShopScene(this.back)));
    }
    card(s, i, x, y, w, h) {
      const def = GS.EQUIPS[s.id];
      const col = P.RARITY[def.rarity].color;
      R.panel(x, y, w, h, { cut: 6, border: s.sold ? '#3a4a58' : col });
      UI().itemIcon(s.id, x + 5, y + 5, { size: 24 });
      F().draw(UI().fitText(def.name, w - 38), x + 33, y + 6, { color: s.sold ? '#5a6878' : col });
      F().draw(`${P.RARITY[def.rarity].name} · ${GS.SLOT[def.slot].name}`, x + 33, y + 16, { color: R.COL.dim });
      F().draw(Q().statText({ id: s.id, lvl: 0 }), x + 6, y + 33, { color: '#ffffff' });
      F().draw(GS.PASSIVES[def.passive].name, x + 6, y + 43, { color: P.color(def.passive, this.t) });
      F().wrap(P.desc(def.passive), w - 12).slice(0, 2).forEach((l, k) => F().draw(l, x + 6, y + 52 + k * 9, { color: '#c8d8e0' }));
      const price = Q().price(s.id);
      if (s.sold) {
        F().draw('VENDU', x + w / 2, y + h - 16, { color: '#5a6878', align: 'center' });
        return;
      }
      if (UI().button(U.fmt(price), x + 6, y + h - 20, w - 12, 15, { id: 'sh_b' + i, icon: 'gold', color: '#ffd040', disabled: GS.data.gold < price, why: "Pas assez d'or" })) {
        const it = Q().buy(i);
        if (it) {
          GS.Audio.sfx('coin');
          GS.UI.toast('Acheté : ' + def.name, col);
        }
      }
    }
  }
  GS.ShopScene = ShopScene;
})();
