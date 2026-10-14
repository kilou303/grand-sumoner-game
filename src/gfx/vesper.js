'use strict';
// Vesper : sprite relevé sur son image de référence (art/reference/vesper_sprite.jpg),
// animé de façon modulaire comme Djegui et Azura (pièces découpées dans sa pose 3/4).
// Bras avant derrière le torse et pistolet du créateur de perso (GS.Variants.WEAPONS).
(function () {
  // modèle pour le créateur de perso (tête, corps et jambes recolorables, voir variants.js)
  GS.REF_BASES = GS.REF_BASES || {};
  GS.REF_BASES.vesper = { name: 'Vesper', label: "armure, cheveux longs", art: GS.VESPER_ART, hipF: 4, hipB: -5 };
  let rig = null;
  GS.Vesper = {
    weapon: { weapon: 'pistol', gem: '#2ee1d5', blade: '#4a5060' },
    rig: () => {
      if (!rig) {
        const art = GS.VESPER_ART;
        const V = GS.Variants;
        const pal = Object.assign({}, art.pal);
        const weapon = V.weapon(GS.Vesper.weapon, V.paletteKeys(pal));
        rig = new GS.ModRig.Char({
          art: Object.assign({}, art, { pal }),
          joints: art.joints,
          weapon,
          hipF: 4,
          hipB: -5,
          outline: 'A',
          frontArm: 'under',
          animMap: V.animMapFor(GS.Vesper.weapon),
        });
      }
      return rig;
    },
  };
})();
