'use strict';
// Vesper : sprite relevé sur son image de référence (art/reference/vesper_sprite.jpg),
// animé de façon modulaire comme Djegui et Azura (pièces découpées dans sa pose 3/4).
(function () {
  let rig = null;
  GS.Vesper = {
    rig: () => {
      if (!rig) {
        const art = GS.VESPER_ART;
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
