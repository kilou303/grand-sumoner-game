'use strict';
// Djegui, personnage principal : sprites relevés sur sa fiche (art/reference/djegui_sheet.webp),
// animés de façon modulaire (pièces découpées dans la pose 3/4).
(function () {
  const Pix = GS.Pix;
  const D = (GS.Djegui = {});
  const cache = {};

  // Image fixe de la planche (portrait, pose de pouvoir, vues de face/dos...).
  D.frame = (name, flip) => {
    const key = name + (flip ? '_f' : '');
    if (cache[key]) return cache[key];
    const art = GS.DJEGUI_ART;
    const rows = art.frames[name];
    if (!rows) return null;
    let cv = Pix.render(Pix.fromTemplate(rows), art.pal, { outlineColor: '#050307' });
    if (flip) cv = Pix.flip(cv);
    cache[key] = cv;
    return cv;
  };

  // Squelette : articulations dans la pose 3/4 source (idle5 retournée).
  let rig = null;
  D.rig = () => {
    if (!rig) {
      rig = new GS.ModRig.Char({
        art: GS.DJEGUI_ART,
        joints: { hip: [14, 41], neck: [14, 15], shoulderF: [24, 19], shoulderB: [5, 20] },
        hipF: 4,
        hipB: -6,
        outline: 'C',
      });
    }
    return rig;
  };
})();
