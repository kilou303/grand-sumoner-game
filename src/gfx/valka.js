'use strict';
// Valka : sprite relevé sur son image de référence (art/reference/valka_sprite.jpg),
// animé de façon modulaire comme Djegui et Azura (pièces découpées dans sa pose de garde).
// Vue de l'autre trois-quarts : bras arrière devant le torse, bras avant derrière ; au repos
// elle garde la garde de son image.
(function () {
  // modèle pour le créateur de perso (tête, corps et jambes recolorables, voir variants.js)
  GS.REF_BASES = GS.REF_BASES || {};
  GS.REF_BASES.valka = { name: 'Valka', label: "débardeur et épaulières, cheveux courts", art: GS.VALKA_ART, hipF: 4, hipB: -5, backArm: 'front' };
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
