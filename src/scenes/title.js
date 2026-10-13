'use strict';
// Écran titre.
(function () {
  const U = GS.U;
  const R = GS.R;
  const F = () => GS.Font;

  class TitleScene {
    enter() {
      this.t = 0;
      this.fx = new GS.FXLayer();
      GS.Audio.music('home');
    }
    update(dt) {
      this.t += dt;
      this.fx.update(dt);
      if (Math.random() < 0.08) {
        const x = U.rand(0, GS.W);
        this.fx.parts.push({ x, y: -4, vx: -60, vy: 90, g: 0, drag: 1, life: 1.6, max: 1.6, size: 2, color: '#ffffff', shape: 'line', add: true, fade: true, shrink: false });
      }
      if (GS.Input.tapped()) {
        GS.Input.consume();
        GS.Audio.unlock();
        GS.Audio.sfx('confirm');
        GS.go(new GS.HomeScene());
      }
    }
    draw(ctx) {
      GS.BG.draw('castle', this.t, Math.sin(this.t * 0.2) * 10, 0);
      R.fade(0.25, '#05030c');
      this.fx.draw(ctx);
      const lead = GS.UNIT.djegui || GS.UNITS[0];
      GS.UI.rays(GS.W / 2, 150, '#ff3048', this.t, 14, 260, 0.06);
      GS.Art.drawUnit(lead, GS.W / 2, 172, { scale: 2, anim: 'idle', t: this.t });
      const y = 28 + Math.sin(this.t * 2) * 2;
      F().draw('ASTRAL', GS.W / 2, y, { color: '#ffffff', outline: '#2a1050', scale: 4, align: 'center' });
      F().draw('SUMMONERS', GS.W / 2, y + 30, { color: GS.rainbow(this.t * 0.5), outline: '#2a1050', scale: 3, align: 'center' });
      F().draw("Chroniques d'Ether", GS.W / 2, y + 56, { color: '#c8b0ff', outline: '#05030c', align: 'center' });
      if (Math.sin(this.t * 4) > -0.3) F().draw('Touche pour commencer', GS.W / 2, 196, { color: '#ffffff', outline: '#05030c', align: 'center' });
      F().draw('v1.0', GS.W - 4, GS.H - 10, { color: '#6a6090', align: 'right' });
    }
  }
  GS.TitleScene = TitleScene;
})();
