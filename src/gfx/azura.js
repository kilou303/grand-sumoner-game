'use strict';
// Azura : sprite relevé sur son image de référence (art/reference/azura_sprite.jpg),
// animé de façon modulaire comme Djegui (pièces découpées dans sa pose 3/4).
// Bras avant derrière le torse, comme les héros du créateur de perso.
(function () {
  // modèle pour le créateur de perso (tête, corps et jambes recolorables, voir variants.js)
  GS.REF_BASES = GS.REF_BASES || {};
  GS.REF_BASES.azura = { name: 'Azura', label: "tunique, queue de cheval", art: GS.AZURA_ART, hipF: 4, hipB: -5 };
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
          frontArm: 'under',
        });
      }
      return rig;
    },
  };
})();
