'use strict';
// Collection de héros : grille, fiche détaillée, entraînement (or -> niveaux).
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;
  const UI = () => GS.UI;
  const COLS = 7;
  const CW = 60;
  const CH = 72;

  const sorted = () =>
    GS.data.units.slice().sort((a, b) => {
      const da = GS.UNIT[a.id];
      const db = GS.UNIT[b.id];
      return db.rarity - da.rarity || b.level - a.level || da.name.localeCompare(db.name);
    });

  class UnitsScene {
    constructor(back) {
      this.back = back || (() => new GS.HomeScene());
    }
    enter() {
      this.t = 0;
      this.scroll = 0;
      this.detail = null;
      GS.Audio.music('home');
    }
    update(dt) {
      this.t += dt;
      const inp = GS.Input;
      if (!this.detail) {
        this.scroll -= inp.dragY + inp.wheel * 30;
        const rows = Math.ceil(GS.data.units.length / COLS);
        this.scroll = U.clamp(this.scroll, 0, Math.max(0, rows * (CH + 6) - 200));
      }
    }
    draw(ctx) {
      GS.BG.draw('town', this.t, 0, 0);
      R.fade(0.5, '#05030c');
      if (this.detail) {
        this.drawDetail(ctx);
        return;
      }
      const list = sorted();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 22, GS.W, GS.H - 22);
      ctx.clip();
      const x0 = (GS.W - COLS * (CW + 6)) / 2 + 3;
      list.forEach((u, i) => {
        const def = GS.UNIT[u.id];
        const x = x0 + (i % COLS) * (CW + 6);
        const y = 28 + Math.floor(i / COLS) * (CH + 6) - this.scroll;
        if (y > GS.H || y + CH < 22) return;
        UI().unitCard(x, y, CW, CH, def, { level: u.level, awaken: u.awaken, inTeam: GS.data.team.includes(u.uid) });
        if (GS.Input.clicked(x, y, CW, CH) && !GS.Input.dragging) {
          GS.Input.consume();
          GS.Audio.sfx('select');
          this.detail = u;
        }
      });
      ctx.restore();
      if (UI().topBar(`HÉROS (${list.length}/${GS.UNITS.length})`, { back: true })) GS.go(this.back());
    }

    drawDetail(ctx) {
      const u = this.detail;
      const def = GS.UNIT[u.id];
      const st = GS.Save.stats(u);
      const el = GS.EL[def.element];
      // héros en grand
      UI().rays(96, 150, el.color, this.t, 12, 200, 0.1);
      R.ellipse(96, 232, 36, 6, 'rgba(0,0,0,0.45)');
      GS.Art.drawUnit(def, 96, 232, { scale: 2, anim: 'idle', t: this.t });
      if (UI().topBar(def.name, { back: true })) {
        this.detail = null;
        return;
      }
      const x = 196;
      R.panel(x, 24, 280, 242, { cut: 8, border: UI().rarityColor(def.rarity, this.t) });
      GS.Icons.draw(def.element, x + 8, 31);
      F().draw(def.name, x + 22, 30, { color: '#ffffff', outline: '#000', scale: 2 });
      F().draw(def.title, x + 8, 48, { color: UI().rarityColor(def.rarity, this.t), outline: '#000' });
      GS.Icons.stars(def.rarity, x + 272 - def.rarity * 7, 30);
      F().draw(`${el.name} · ${GS.ROLES[def.role].name} · Éveil ${u.awaken}/5`, x + 8, 60, { color: R.COL.dim });
      // niveau
      const max = GS.Save.maxLevel(u);
      F().draw(`NV ${u.level}/${max}`, x + 8, 74, { color: '#ffe080' });
      R.bar(x + 72, 75, 120, 5, u.level >= max ? 1 : u.xp / GS.Save.xpNeed(u.level), '#60d0ff', '#c0f8ff', { frame: false });
      F().draw('Puissance ' + U.fmt(GS.Save.power(u)), x + 272, 74, { color: '#ffe080', align: 'right' });
      // stats
      const S = [
        ['PV', st.hp, '#60f080'],
        ['ATQ', st.atk, '#ff7060'],
        ['DÉF', st.def, '#60a0ff'],
        ['VIT', st.spd, '#ffe060'],
        ['MP', st.mp, '#c080ff'],
      ];
      S.forEach(([n, v, c], i) => {
        const sx = x + 8 + i * 54;
        F().draw(n, sx, 88, { color: c });
        F().draw(U.fmt(v), sx, 98, { color: '#ffffff' });
      });
      // capacités
      const abl = [
        ['ATTAQUE', `${def.attack.hits} coup(s)`, '#a0b0c0'],
        ['COMP. 1', def.skills[0], '#3ee0f0'],
        ['COMP. 2', def.skills[1], '#3ee0f0'],
        ['SPÉCIAL', def.special, '#80f0ff'],
        ['OVERLIMIT', def.overlimit, GS.rainbow(this.t)],
      ];
      let y = 110;
      for (const [label, ab, c] of abl) {
        F().draw(label, x + 8, y, { color: c });
        if (typeof ab === 'string') {
          F().draw(ab, x + 74, y, { color: '#e8fbff' });
          y += 12;
          continue;
        }
        F().draw(ab.name + (ab.mp ? `  (MP ${ab.mp})` : ''), x + 74, y, { color: '#ffffff' });
        let d = ab.desc || '';
        while (d && F().width(d) > 196) d = d.slice(0, -2);
        if (d !== (ab.desc || '')) d = d.trimEnd() + '…';
        F().draw(d.replace('…', '...'), x + 74, y + 9, { color: R.COL.dim });
        y += 22;
      }
      // histoire
      const lore = F().wrap(def.lore || '', 264);
      lore.slice(0, 2).forEach((l, i) => F().draw(l, x + 8, 222 + i * 9, { color: '#c8b8e8' }));
      // entraînement
      const cost = GS.Save.trainCost(u);
      const canTrain = u.level < max && GS.data.gold >= cost;
      if (UI().button(u.level >= max ? 'NIVEAU MAX' : `ENTRAÎNER +1 NV  (${U.fmt(cost)} or)`, x + 8, 244, 190, 18, { id: 'd_train', icon: 'gold', disabled: !canTrain, why: u.level >= max ? 'Niveau maximum atteint' : "Pas assez d'or" })) {
        GS.data.gold -= cost;
        u.level++;
        u.xp = 0;
        GS.Save.save();
        GS.Audio.sfx('levelup');
      }
      const inTeam = GS.data.team.includes(u.uid);
      if (UI().button(inTeam ? 'DANS L\'ÉQUIPE' : 'ÉQUIPER', x + 204, 244, 68, 18, { id: 'd_team', disabled: inTeam || GS.data.team.length >= 3, why: inTeam ? 'Déjà dans l\'équipe' : 'Équipe complète (va dans ÉQUIPE)' })) {
        GS.data.team.push(u.uid);
        GS.Save.save();
      }
    }
  }
  GS.UnitsScene = UnitsScene;
})();
