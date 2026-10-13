'use strict';
// Démarrage : initialisation et boucle principale.
(function () {
  function boot() {
    GS.R.init();
    GS.Input.init();
    GS.Save.load();
    GS.Audio.setMuted(!!GS.data.settings.muted);
    GS.go(new GS.TitleScene(), true);
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      GS.dt = dt;
      GS.Input.beginFrame();
      GS.Scenes.update(dt);
      GS.Scenes.draw();
      GS.Input.endFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  window.addEventListener('load', boot);
})();
