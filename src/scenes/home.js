'use strict';
// Écran d'accueil (hub) : chef d'équipe en vedette + menus.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;

  class HomeScene {
    enter() {
      this.t = 0;
      this.options = false;
      this.confirmReset = false;
      GS.Audio.music('home');
    }
    update(dt) {
      this.t += dt;
      if (GS.Input.hit('KeyM')) {
        GS.data.settings.muted = !GS.data.settings.muted;
        GS.Audio.setMuted(GS.data.settings.muted);
        GS.Save.save();
      }
    }
    draw(ctx) {
      GS.BG.draw('town', this.t, Math.sin(this.t * 0.15) * 8, 0);
      const team = GS.Save.teamUnits();
      const lead = team[0];
      // Chef d'équipe
      if (lead) {
        const def = GS.UNIT[lead.id];
        GS.UI.rays(96, 120, GS.EL[def.element].color, this.t, 10, 160, 0.08);
        R.ellipse(96, 178, 30, 5, 'rgba(0,0,0,0.4)');
        GS.Art.drawUnit(def, 96, 178, { scale: 2, anim: 'idle', t: this.t });
        R.panel(20, 186, 152, 24, { cut: 6 });
        GS.Icons.draw(def.element, 26, 191);
        F().draw(def.name, 40, 191, { color: '#ffffff', outline: '#04101a', scale: 1 });
        F().draw(def.title, 40, 200, { color: R.COL.cyan });
        GS.Icons.stars(def.rarity, 166 - def.rarity * 7, 190);
        F().draw('NV ' + lead.level, 166, 200, { color: '#ffe080', align: 'right' });
      }
      // Barre du haut
      UI().topBar('ACCUEIL');
      F().draw('Puissance : ' + U.fmt(GS.Save.teamPower()), 6, 24, { color: '#ffe080', outline: '#04101a' });
      // Menus
      const x = 222;
      if (UI().button('QUÊTES', x, 30, 150, 34, { scale: 2, color: '#ffd040', sub: 'Partir au combat', id: 'h_q' })) GS.go(new GS.QuestScene(this.lastArea()));
      if (UI().button('INVOCATION', x, 70, 150, 30, { scale: 2, color: '#ff70d0', sub: 'Obtenir des héros', id: 'h_s' })) GS.go(new GS.SummonScene());
      if (UI().button('HÉROS', x, 106, 72, 26, { id: 'h_u', sub: GS.data.units.length + ' possédés' })) GS.go(new GS.UnitsScene());
      if (UI().button('ÉQUIPE', x + 78, 106, 72, 26, { id: 'h_t', sub: 'Formation' })) GS.go(new GS.TeamScene());
      const gift = GS.Save.canClaimGift();
      if (UI().button(gift ? 'CADEAU DU JOUR !' : 'Cadeau reçu', x, 138, 150, 18, { id: 'h_g', disabled: !gift, color: '#60f080', why: 'Reviens demain !' })) {
        GS.Save.claimGift();
        GS.Audio.sfx('rare');
        GS.UI.toast('+300 cristaux  +1000 or', '#a0e0ff');
      }
      if (UI().button('OPTIONS', x, 162, 72, 16, { id: 'h_o', sfx: 'select' })) this.options = !this.options;
      const muted = GS.data.settings.muted;
      if (UI().button(muted ? 'SON : NON' : 'SON : OUI', x + 78, 162, 72, 16, { id: 'h_m', sfx: 'select' })) {
        GS.data.settings.muted = !muted;
        GS.Audio.setMuted(!muted);
        GS.Save.save();
      }
      const cleared = Object.keys(GS.data.cleared).length;
      const total = GS.AREAS.reduce((s, a) => s + a.stages.length, 0);
      F().draw(`Progression : ${cleared}/${total} quêtes`, x, 186, { color: R.COL.dim });
      F().draw(`Victoires : ${GS.data.stats.wins}`, x, 196, { color: R.COL.dim });
      if (this.options) this.drawOptions();
    }
    lastArea() {
      let a = 0;
      for (let i = 0; i < GS.AREAS.length; i++) if (GS.Save.areaUnlocked(i)) a = i;
      return a;
    }
    drawOptions() {
      R.fade(0.6, '#05030c');
      R.panel(92, 50, 200, 110, { cut: 8 });
      F().draw('OPTIONS', GS.W / 2, 58, { color: R.COL.cyan, scale: 2, align: 'center' });
      F().draw('Clavier : flèches + Entrée, Échap = retour', GS.W / 2, 80, { color: '#ffffff', align: 'center' });
      F().draw('M : couper le son', GS.W / 2, 90, { color: '#ffffff', align: 'center' });
      if (!this.confirmReset) {
        if (UI().button('EFFACER LA SAUVEGARDE', 112, 106, 160, 16, { color: '#ff5060', id: 'o_r', sfx: 'select' })) this.confirmReset = true;
      } else {
        F().draw('Tout effacer ? Irréversible !', GS.W / 2, 104, { color: '#ff8090', align: 'center' });
        if (UI().button('OUI', 112, 114, 76, 14, { color: '#ff5060', id: 'o_y' })) {
          GS.Save.reset();
          this.confirmReset = false;
          this.options = false;
          GS.UI.toast('Nouvelle partie !');
        }
        if (UI().button('NON', 196, 114, 76, 14, { id: 'o_n', sfx: 'back' })) this.confirmReset = false;
      }
      if (UI().button('FERMER', 142, 136, 100, 16, { id: 'o_c', key: 'back', sfx: 'back' })) {
        this.options = false;
        this.confirmReset = false;
      }
    }
  }
  GS.HomeScene = HomeScene;
})();
