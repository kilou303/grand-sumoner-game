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
      const art = GS.DJEGUI_ART;
      const cut = GS.ModRig.cutView;
      rig = new GS.ModRig.Char({
        art,
        joints: { hip: [14, 41], neck: [14, 15], shoulderF: [24, 19], shoulderB: [5, 20] },
        hipF: 4,
        hipB: -6,
        outline: 'H',
        // vraies vues de profil et de dos de la planche (rotation du corps) ; le torse y a
        // les mains dans les poches
        views: {
          head: { side: cut(art.frames.side1, 0, 16, [10, 16]), back: cut(art.frames.back, 0, 16, [14, 16]) },
          torso: { side: cut(art.frames.side1, 16, 42, [9, 42]), back: cut(art.frames.back, 16, 42, [14, 42]), arms: true },
        },
      });
    }
    return rig;
  };
})();
