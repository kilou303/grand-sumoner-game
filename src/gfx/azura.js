'use strict';
// Azura : sprite relevé sur son image de référence (art/reference/azura_sprite.jpg),
// animé de façon modulaire comme Djegui (pièces découpées dans sa pose 3/4).
(function () {
  let rig = null;
  GS.Azura = {
    rig: () => {
      if (!rig) {
        const art = GS.AZURA_ART;
        rig = new GS.ModRig.Char({
          art,
          joints: art.joints,
          hipF: 4,
          hipB: -5,
          outline: 'A',
        });
      }
      return rig;
    },
  };
})();
