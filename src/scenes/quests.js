'use strict';
// Sélection des quêtes : zones à gauche, quêtes de la zone à droite.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;

  class QuestScene {
    constructor(area = 0) {
      this.area = area;
    }
    enter() {
      this.t = 0;
      this.sel = this.firstOpen();
      GS.Audio.music('home');
    }
    firstOpen() {
      const a = GS.AREAS[this.area];
      for (let i = 0; i < a.stages.length; i++) if (GS.Save.stageUnlocked(this.area, i) && !GS.data.cleared[GS.stageId(this.area, i)]) return i;
      let last = 0;
      for (let i = 0; i < a.stages.length; i++) if (GS.Save.stageUnlocked(this.area, i)) last = i;
      return last;
    }
    update(dt) {
      this.t += dt;
    }
    draw() {
      const area = GS.AREAS[this.area];
      GS.BG.draw(area.bg, this.t, this.t * 12, 0);
      R.fade(0.45, '#05030c');
      if (UI().topBar('QUÊTES', { back: true })) {
        GS.go(new GS.HomeScene());
        return;
      }
      // zones
      GS.AREAS.forEach((a, i) => {
        const open = GS.Save.areaUnlocked(i);
        const done = a.stages.filter((_, j) => GS.data.cleared[GS.stageId(i, j)]).length;
        const y = 26 + i * 36;
        if (UI().button(open ? a.name : '???', 6, y, 150, 32, { id: 'area' + i, disabled: !open, selected: i === this.area, sub: open ? `${done}/${a.stages.length} terminées` : 'Verrouillée', why: 'Termine la zone précédente !', sfx: 'select' })) {
          this.area = i;
          this.sel = this.firstOpen();
        }
      });
      // quêtes
      area.stages.forEach((st, i) => {
        const open = GS.Save.stageUnlocked(this.area, i);
        const cleared = !!GS.data.cleared[GS.stageId(this.area, i)];
        const y = 26 + i * 40;
        const x = 164;
        const w = 310;
        const sel = i === this.sel;
        const col = st.boss ? '#ff5060' : R.COL.border;
        R.panel(x, y, w, 36, { cut: 6, border: open ? (sel ? '#ffe060' : col) : '#4a5860', fill: sel ? 'rgba(30,50,20,0.9)' : open ? R.COL.panel : 'rgba(10,14,18,0.9)', glow: sel ? 0.3 : 0 });
        if (!open) {
          GS.Icons.draw('lock', x + 10, y + 13);
          F().draw('Quête verrouillée', x + 24, y + 14, { color: '#6a7880' });
          return;
        }
        F().draw(`${this.area + 1}-${i + 1}  ${st.name}`, x + 8, y + 6, { color: '#ffffff', outline: '#04101a' });
        if (st.boss) F().draw('BOSS', x + w - 8, y + 6, { color: '#ff5060', outline: '#04101a', align: 'right' });
        F().draw('NV ' + st.level, x + 8, y + 20, { color: '#ffe080' });
        // éléments ennemis
        const els = [...new Set(st.waves.flat().map(([k, el]) => GS.ENEMIES[k](el).element))];
        els.forEach((el, j) => GS.Icons.draw(el, x + 44 + j * 11, y + 18));
        const rw = GS.stageRewards(st);
        F().draw(cleared ? 'Terminée' : `1re victoire : ${rw.firstGems}`, x + w - (cleared ? 8 : 20), y + 20, { color: cleared ? '#60f080' : '#a0e0ff', align: 'right' });
        if (!cleared) GS.Icons.draw('gem', x + w - 17, y + 18);
        if (cleared) GS.Icons.draw('star', x + w - 70, y + 18);
        if (GS.Input.clicked(x, y, w, 36)) {
          GS.Input.consume();
          if (this.sel === i) this.start(i);
          else {
            this.sel = i;
            GS.Audio.sfx('select');
          }
        }
      });
      // bas : équipe et lancement
      const st = area.stages[this.sel];
      const team = GS.Save.teamUnits();
      R.panel(164, 192, 310, 74, { cut: 6 });
      F().draw('ÉQUIPE', 172, 198, { color: R.COL.cyan });
      team.forEach((u, i) => {
        const def = GS.UNIT[u.id];
        UI().unitCard(172 + i * 46, 208, 42, 52, def, { level: u.level, stars: false });
      });
      F().draw('Puissance', 322, 200, { color: R.COL.dim });
      F().draw(U.fmt(GS.Save.teamPower()), 322, 210, { color: '#ffe080', scale: 1 });
      F().draw(`Conseillé : NV ${Math.max(1, st.level * 2 - 1)}`, 322, 222, { color: R.COL.dim });
      if (UI().button('COMBATTRE !', 322, 234, 146, 26, { id: 'q_go', color: '#ffd040', scale: 1, key: 'confirm' })) this.start(this.sel);
      if (UI().button('ÉQUIPE', 6, 172, 72, 22, { id: 'q_team', sfx: 'select' })) GS.go(new GS.TeamScene(() => new QuestScene(this.area)));
      if (UI().button('HÉROS', 84, 172, 72, 22, { id: 'q_units', sfx: 'select' })) GS.go(new GS.UnitsScene(() => new QuestScene(this.area)));
      F().draw('Clique deux fois sur une quête', 6, 204, { color: R.COL.dim });
      F().draw('pour la lancer directement.', 6, 214, { color: R.COL.dim });
    }
    start(i) {
      if (!GS.Save.stageUnlocked(this.area, i)) return;
      if (!GS.Save.teamUnits().length) {
        GS.UI.toast("Ajoute au moins un héros à l'équipe !");
        return;
      }
      GS.Audio.sfx('confirm');
      GS.go(new GS.BattleScene(this.area, i));
    }
  }
  GS.QuestScene = QuestScene;
})();
