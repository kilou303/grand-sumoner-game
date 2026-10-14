'use strict';
// Tout Puissant : sprites relevés sur sa planche (art/reference/tout_puissant_sheet.png),
// animés de façon modulaire (pièces relevées sur la pose 3/4 tournée vers la droite).
// Bâton dans la main avant ; bras avant derrière le torse (seul Djegui le garde devant).
(function () {
  const Pix = GS.Pix;
  const T = (GS.ToutPuissant = {});
  const cache = {};

  // Image fixe de la planche (repos, tour complet, marche, attaques, portraits, grand portrait).
  T.frame = (name, flip) => {
    const key = name + (flip ? '_f' : '');
    if (cache[key]) return cache[key];
    const art = GS.TOUTPUISSANT_ART;
    const rows = art.frames[name];
    if (!rows) return null;
    let cv = Pix.render(Pix.fromTemplate(rows), art.pal, { outlineColor: '#050307' });
    if (flip) cv = Pix.flip(cv);
    cache[key] = cv;
    return cv;
  };

  // Effet relevé (orbe galaxie, tourbillon, colonne de lumière, boule d'énergie, croissant) :
  // sans contour, à dessiner de préférence en mode additif ('lighter').
  T.fx = (name, flip) => {
    const key = 'fx:' + name + (flip ? '_f' : '');
    if (cache[key]) return cache[key];
    const art = GS.TOUTPUISSANT_ART;
    const rows = art.fx[name];
    if (!rows) return null;
    let cv = Pix.render(Pix.fromTemplate(rows), art.pal, { outline: false });
    if (flip) cv = Pix.flip(cv);
    cache[key] = cv;
    return cv;
  };

  // Animations génériques -> versions avec arme (bâton).
  const ARMED = { idle: 'aidle', stance: 'astance', walk: 'awalk', run: 'arun', victory: 'avictory', cast: 'castStaff', hurt: 'ahurt', ko: 'ako', jump: 'ajump', land: 'aland' };

  // Squelette : articulations dans le repère du relevé (idle1, tourné vers la droite).
  let rig = null;
  T.rig = () => {
    if (!rig) {
      const art = GS.TOUTPUISSANT_ART;
      rig = new GS.ModRig.Char({
        art,
        weapon: art.weapon,
        joints: art.joints,
        hipF: art.hipF,
        hipB: art.hipB,
        outline: 'k',
        animMap: ARMED,
        headLift: 0,
        frontArm: 'under',
        // vraies vues de la tête (profil, dos) de la planche, sans le col ni le bâton ; deux
        // lignes de cheveux doublées pour rattraper la taille de la tête de face
        views: {
          head: {
            side: GS.ModRig.cutView(art.frames.side, 0, 17, [10, 18], { x1: 15, drop: 'Cci', dup: [3, 7] }),
            back: GS.ModRig.cutView(art.frames.back, 0, 17, [10, 18], { x1: 17, drop: 'CciN', dup: [3, 7] }),
          },
        },
      });
    }
    return rig;
  };
})();
