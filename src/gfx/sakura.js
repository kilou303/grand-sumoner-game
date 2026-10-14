'use strict';
// Sakura : sprite relevé sur son image de référence (art/reference/sakura_sprite.jpg),
// animé de façon modulaire comme Djegui et Azura (pièces découpées dans sa pose 3/4).
// Bras avant derrière le torse, comme les héros du créateur de perso.
(function () {
  // modèle pour le créateur de perso (tête, corps et jambes recolorables, voir variants.js)
  GS.REF_BASES = GS.REF_BASES || {};
  GS.REF_BASES.sakura = { name: 'Sakura', label: "uniforme, cheveux courts", art: GS.SAKURA_ART, hipF: 5, hipB: -4 };
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
          frontArm: 'under',
        });
      }
      return rig;
    },
  };
})();
