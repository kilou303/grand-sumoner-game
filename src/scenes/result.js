'use strict';
// Écran de fin de quête : récompenses, expérience, montées de niveau.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;

  class ResultScene {
    constructor(res) {
      this.res = res;
    }
    enter() {
      this.t = 0;
      this.fx = new GS.FXLayer();
      this.played = {};
      GS.Audio.music(this.res.win ? 'home' : null);
    }
    update(dt) {
      this.t += dt;
      this.fx.update(dt);
      if (this.res.win && Math.random() < dt * 6) this.fx.sparkle(U.rand(20, GS.W - 20), U.rand(20, 120), { color: U.choice(['#ffd040', '#ff70d0', '#60c8ff']), size: U.rand(6, 14) });
    }
    draw() {
      const area = GS.AREAS[this.res.ai];
      GS.BG.draw(area.bg, this.t, this.t * 6, 0);
      R.fade(0.55, '#05030c');
      this.fx.draw(GS.ctx);
      if (this.res.win) this.drawWin();
      else this.drawLoss();
    }
    drawWin() {
      const r = this.res;
      const p = Math.min(1, this.t / 0.4);
      F().draw('VICTOIRE !', GS.W / 2, 14 + (1 - U.Ease.outBack(p)) * -40, { color: GS.rainbow(this.t), outline: '#000', scale: 3, align: 'center' });
      const st = area(r).stages[r.si];
      F().draw(`${r.ai + 1}-${r.si + 1}  ${st.name}`, GS.W / 2, 42, { color: '#ffffff', outline: '#000', align: 'center' });
      // récompenses
      R.panel(20, 56, 170, 116, { cut: 6 });
      F().draw('RÉCOMPENSES', 30, 63, { color: R.COL.cyan });
      const lines = [
        ['gold', 'Or (quête)', r.gold],
        ['gold', 'Or ramassé', r.loot.gold + r.stolen],
        ['gem', 'Cristaux ramassés', r.loot.gems],
        ['gem', r.first ? '1re victoire !' : 'Cristaux (déjà gagnés)', r.gems],
      ];
      lines.forEach(([ic, label, v], i) => {
        const y = 78 + i * 18;
        if (this.t < 0.4 + i * 0.25) return;
        if (!this.played['l' + i]) {
          this.played['l' + i] = true;
          if (v > 0) GS.Audio.sfx(ic === 'gem' ? 'star' : 'coin');
        }
        GS.Icons.draw(ic, 30, y - 2);
        F().draw(label, 44, y, { color: '#e8fbff' });
        F().draw('+' + U.fmt(v), 180, y, { color: ic === 'gem' ? '#a0e0ff' : '#ffe080', align: 'right' });
      });
      F().draw(`XP +${r.xp} par héros`, 30, 156, { color: '#c0ff90' });
      // expérience des héros
      const k = U.clamp((this.t - 1.4) / 1.4, 0, 1);
      r.ups.forEach((up, i) => {
        const u = GS.Save.unit(up.uid);
        if (!u) return;
        const def = GS.UNIT[u.id];
        const x = 204 + i * 92;
        R.panel(x, 56, 86, 150, { cut: 6, border: up.gained ? '#ffe060' : R.COL.border });
        GS.Art.drawUnit(def, x + 43, 150, { anim: 'victory', t: this.t, scale: 1 });
        F().draw(def.name, x + 43, 156, { color: '#ffffff', align: 'center' });
        // niveau affiché pendant l'animation
        const lvShown = k < 1 ? up.before.level + Math.floor(up.gained * k) : u.level;
        F().draw('NV ' + lvShown, x + 43, 168, { color: '#ffe080', align: 'center' });
        const ratio = lvShown >= GS.Save.maxLevel(u) ? 1 : k < 1 ? (up.gained ? (k * up.gained) % 1 : (up.before.xp + (u.xp - up.before.xp) * k) / GS.Save.xpNeed(lvShown)) : u.xp / GS.Save.xpNeed(u.level);
        R.bar(x + 8, 180, 70, 5, ratio, '#60d0ff', '#c0f8ff', { frame: false });
        if (up.gained && k >= 1) {
          F().draw('NIVEAU +' + up.gained + ' !', x + 43, 192, { color: GS.rainbow(this.t, i * 40), outline: '#000', align: 'center' });
          if (!this.played['u' + i]) {
            this.played['u' + i] = true;
            GS.Audio.sfx('levelup');
            this.fx.burst(x + 43, 120, { n: 24, color: ['#ffe060', '#ffffff'], speed: 90, life: 0.7, shape: 'star', size: 3 });
          }
        }
      });
      const next = r.si + 1 < area(r).stages.length ? [r.ai, r.si + 1] : r.ai + 1 < GS.AREAS.length ? [r.ai + 1, 0] : null;
      if (next && GS.Save.stageUnlocked(...next)) {
        if (UI().button('QUÊTE SUIVANTE ▶', 300, 220, 170, 26, { id: 'r_next', color: '#ffd040', key: 'confirm' })) GS.go(new GS.BattleScene(...next));
      }
      if (UI().button('REJOUER', 204, 220, 90, 26, { id: 'r_again' })) GS.go(new GS.BattleScene(r.ai, r.si));
      if (UI().button('QUÊTES', 20, 220, 80, 26, { id: 'r_q', sfx: 'back' })) GS.go(new GS.QuestScene(r.ai));
      if (UI().button('ACCUEIL', 106, 220, 80, 26, { id: 'r_h', sfx: 'back' })) GS.go(new GS.HomeScene());
    }
    drawLoss() {
      const r = this.res;
      F().draw('DÉFAITE...', GS.W / 2, 40, { color: '#ff5060', outline: '#000', scale: 3, align: 'center' });
      R.panel(90, 80, 300, 90, { cut: 8 });
      F().draw('Conseils', GS.W / 2, 88, { color: R.COL.cyan, align: 'center' });
      const tips = ["Invoque de nouveaux héros dans l'onglet INVOCATION.", 'Entraîne tes héros (onglet HÉROS) avec ton or.', 'Exploite les faiblesses : Feu > Terre > Eau > Feu.', 'Garde le SPÉCIAL et l\'OVERLIMIT pour le boss !'];
      tips.forEach((tp, i) => F().draw('· ' + tp, 104, 104 + i * 14, { color: '#e8fbff' }));
      if (UI().button('RÉESSAYER', 90, 190, 140, 26, { id: 'l_retry', color: '#ffd040', key: 'confirm' })) GS.go(new GS.BattleScene(r.ai, r.si));
      if (UI().button('HÉROS', 250, 190, 140, 26, { id: 'l_units' })) GS.go(new GS.UnitsScene());
      if (UI().button('RETOUR AUX QUÊTES', 90, 224, 300, 22, { id: 'l_q', sfx: 'back' })) GS.go(new GS.QuestScene(r.ai));
    }
  }
  const area = (r) => GS.AREAS[r.ai];
  GS.ResultScene = ResultScene;
})();
