'use strict';
// Valka : sprite relevé sur son image de référence (art/reference/valka_sprite.jpg),
// animé de façon modulaire comme Djegui et Azura (pièces découpées dans sa pose de garde).
// Vue de l'autre trois-quarts : bras arrière devant le torse, bras avant derrière ; au repos
// elle garde la garde de son image.
(function () {
  let rig = null;
  GS.Valka = {
    rig: () => {
      if (!rig) {
        const art = GS.VALKA_ART;
        rig = new GS.ModRig.Char({
          art,
          joints: art.joints,
          hipF: 4,
          hipB: -5,
          outline: 'A',
          frontArm: 'under',
          backArm: 'front',
        });
      }
      return rig;
    },
  };
})();
