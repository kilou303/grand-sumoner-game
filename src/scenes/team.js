'use strict';
// Composition de l'équipe : 3 emplacements (le 1er est le chef, qu'on dirige sur la map).
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;
  const CW = 46;
  const CH = 56;

  class TeamScene {
    constructor(back) {
      this.back = back || (() => new GS.HomeScene());
    }
    enter() {
      this.t = 0;
      this.slot = 0;
      this.scroll = 0;
      GS.Audio.music('home');
    }
    update(dt) {
      this.t += dt;
      const inp = GS.Input;
      this.scroll -= inp.dragY + inp.wheel * 20;
      const cols = 9;
      const rows = Math.ceil(GS.data.units.length / cols);
      this.scroll = U.clamp(this.scroll, 0, Math.max(0, rows * (CH + 4) - 80));
    }
    assign(uid) {
      const team = GS.data.team;
      const cur = team.indexOf(uid);
      if (cur >= 0) {
        // échange de places
        const other = team[this.slot];
        team[cur] = other;
        team[this.slot] = uid;
      } else if (this.slot < team.length) team[this.slot] = uid;
      else team.push(uid);
      GS.data.team = team.filter((x) => x !== undefined && GS.Save.unit(x));
      GS.Save.save();
      GS.Audio.sfx('confirm');
    }
    draw(ctx) {
      GS.BG.draw('subway', this.t, this.t * 4, 0);
      R.fade(0.35, '#05030c');
      if (UI().topBar('ÉQUIPE', { back: true })) {
        GS.go(this.back());
        return;
      }
      const team = GS.data.team;
      for (let i = 0; i < 3; i++) {
        const x = 30 + i * 150;
        const sel = this.slot === i;
        R.panel(x, 26, 130, 120, { cut: 8, border: sel ? '#ffe060' : R.COL.border, glow: sel ? 0.25 : 0 });
        F().draw(i === 0 ? 'CHEF' : 'EMPLACEMENT ' + (i + 1), x + 6, 32, { color: i === 0 ? '#ffd040' : R.COL.dim });
        const u = GS.Save.unit(team[i]);
        if (u) {
          const def = GS.UNIT[u.id];
          R.ellipse(x + 65, 128, 24, 4, 'rgba(0,0,0,0.4)');
          GS.Art.drawUnit(def, x + 65, 128, { anim: 'stance', t: this.t + i });
          F().draw(def.name, x + 65, 132, { color: '#ffffff', align: 'center' });
          GS.Icons.draw(def.element, x + 112, 30);
        } else F().draw('Vide', x + 65, 80, { color: '#6a7880', align: 'center' });
        if (GS.Input.clicked(x, 26, 130, 120)) {
          GS.Input.consume();
          this.slot = i;
          GS.Audio.sfx('select');
        }
      }
      F().draw('Puissance : ' + U.fmt(GS.Save.teamPower()), 30, 152, { color: '#ffe080' });
      const cur = GS.Save.unit(team[this.slot]);
      if (cur && team.length > 1 && UI().button('RETIRER', 400, 148, 66, 14, { id: 't_rm', sfx: 'back', cut: 4 })) {
        GS.data.team.splice(this.slot, 1);
        GS.Save.save();
      }
      F().draw('Choisis un emplacement puis un héros', 150, 152, { color: R.COL.dim });
      // liste des héros
      const list = GS.data.units.slice().sort((a, b) => GS.UNIT[b.id].rarity - GS.UNIT[a.id].rarity || b.level - a.level);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 164, GS.W, GS.H - 164);
      ctx.clip();
      list.forEach((u, i) => {
        const x = 12 + (i % 9) * (CW + 6);
        const y = 166 + Math.floor(i / 9) * (CH + 4) - this.scroll;
        const def = GS.UNIT[u.id];
        UI().unitCard(x, y, CW, CH, def, { level: u.level, stars: false, inTeam: team.includes(u.uid), selected: team[this.slot] === u.uid });
        if (GS.Input.clicked(x, y, CW, CH) && !GS.Input.dragging && y > 160) {
          GS.Input.consume();
          this.assign(u.uid);
        }
      });
      ctx.restore();
    }
  }
  GS.TeamScene = TeamScene;
})();
