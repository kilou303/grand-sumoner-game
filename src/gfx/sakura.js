'use strict';
// Sakura : sprite relevé sur son image de référence (art/reference/sakura_sprite.jpg),
// animé de façon modulaire comme Djegui et Azura (pièces découpées dans sa pose 3/4).
(function () {
  let rig = null;
  GS.Sakura = {
    rig: () => {
      if (!rig) {
        const art = GS.SAKURA_ART;
        rig = new GS.ModRig.Char({
          art,
          joints: art.joints,
          hipF: 5,
          hipB: -4,
          outline: 'A',
        });
      }
      return rig;
    },
  };
})();
