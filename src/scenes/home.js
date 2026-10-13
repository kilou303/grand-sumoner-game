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
      GS.BG.draw('town', this.t, Math.sin(this.t * 0.15) * 12, 0);
      const team = GS.Save.teamUnits();
      const lead = team[0];
      // Chef d'équipe en grand
      if (lead) {
        const def = GS.UNIT[lead.id];
        GS.UI.rays(130, 150, def.fxColor || GS.EL[def.element].color, this.t, 12, 220, 0.08);
        R.ellipse(130, 252, 40, 6, 'rgba(0,0,0,0.45)');
        GS.Art.drawUnit(def, 130, 252, { scale: 2, anim: 'idle', t: this.t });
        R.panel(8, 26, 170, 34, { cut: 6 });
        GS.Icons.draw(def.element, 14, 31);
        F().draw(def.name, 28, 31, { color: '#ffffff', outline: '#04101a', scale: 2 });
        F().draw(def.title, 14, 48, { color: R.COL.cyan });
        GS.Icons.stars(def.rarity, 172 - def.rarity * 7, 31);
        F().draw('NV ' + lead.level, 172, 48, { color: '#ffe080', align: 'right' });
      }
      UI().topBar('ACCUEIL');
      F().draw('Puissance : ' + U.fmt(GS.Save.teamPower()), 8, 64, { color: '#ffe080', outline: '#04101a' });
      const x = 290;
      const w = 182;
      if (UI().button('QUÊTES', x, 28, w, 40, { scale: 2, color: '#ffd040', sub: 'Explorer et combattre', id: 'h_q' })) GS.go(new GS.QuestScene(this.lastArea()));
      if (UI().button('INVOCATION', x, 74, w, 36, { scale: 2, color: '#ff70d0', sub: 'Obtenir des héros', id: 'h_s' })) GS.go(new GS.SummonScene());
      if (UI().button('HÉROS', x, 116, 88, 30, { id: 'h_u', sub: GS.data.units.length + ' possédés' })) GS.go(new GS.UnitsScene());
      if (UI().button('ÉQUIPE', x + 94, 116, 88, 30, { id: 'h_t', sub: 'Formation' })) GS.go(new GS.TeamScene());
      const gift = GS.Save.canClaimGift();
      if (UI().button(gift ? 'CADEAU DU JOUR !' : 'Cadeau reçu', x, 152, w, 20, { id: 'h_g', disabled: !gift, color: '#60f080', why: 'Reviens demain !' })) {
        GS.Save.claimGift();
        GS.Audio.sfx('rare');
        GS.UI.toast('+300 cristaux  +1000 or', '#a0e0ff');
      }
      if (UI().button('OPTIONS', x, 178, 88, 18, { id: 'h_o', sfx: 'select' })) this.options = !this.options;
      const muted = GS.data.settings.muted;
      if (UI().button(muted ? 'SON : NON' : 'SON : OUI', x + 94, 178, 88, 18, { id: 'h_m', sfx: 'select' })) {
        GS.data.settings.muted = !muted;
        GS.Audio.setMuted(!muted);
        GS.Save.save();
      }
      const cleared = Object.keys(GS.data.cleared).length;
      const total = GS.AREAS.reduce((s, a) => s + a.stages.length, 0);
      R.panel(x, 204, w, 30, { cut: 5 });
      F().draw(`Progression : ${cleared}/${total} quêtes`, x + 8, 210, { color: '#e8fbff' });
      F().draw(`Victoires : ${GS.data.stats.wins}`, x + 8, 221, { color: R.COL.dim });
      if (this.options) this.drawOptions();
    }
    lastArea() {
      let a = 0;
      for (let i = 0; i < GS.AREAS.length; i++) if (GS.Save.areaUnlocked(i)) a = i;
      return a;
    }
    drawOptions() {
      R.fade(0.6, '#05030c');
      const ox = GS.W / 2 - 120;
      R.panel(ox, 60, 240, 130, { cut: 8 });
      F().draw('OPTIONS', GS.W / 2, 68, { color: R.COL.cyan, scale: 2, align: 'center' });
      F().draw('Clavier : flèches + Entrée, Échap = retour', GS.W / 2, 92, { color: '#ffffff', align: 'center' });
      F().draw('Sur la map : maintiens droite pour avancer', GS.W / 2, 102, { color: '#ffffff', align: 'center' });
      F().draw('M : couper le son', GS.W / 2, 112, { color: '#ffffff', align: 'center' });
      if (!this.confirmReset) {
        if (UI().button('EFFACER LA SAUVEGARDE', ox + 40, 128, 160, 16, { color: '#ff5060', id: 'o_r', sfx: 'select' })) this.confirmReset = true;
      } else {
        F().draw('Tout effacer ? Irréversible !', GS.W / 2, 126, { color: '#ff8090', align: 'center' });
        if (UI().button('OUI', ox + 40, 136, 76, 14, { color: '#ff5060', id: 'o_y' })) {
          GS.Save.reset();
          this.confirmReset = false;
          this.options = false;
          GS.UI.toast('Nouvelle partie !');
        }
        if (UI().button('NON', ox + 124, 136, 76, 14, { id: 'o_n', sfx: 'back' })) this.confirmReset = false;
      }
      if (UI().button('FERMER', GS.W / 2 - 50, 162, 100, 18, { id: 'o_c', key: 'back', sfx: 'back' })) {
        this.options = false;
        this.confirmReset = false;
      }
    }
  }
  GS.HomeScene = HomeScene;
})();
