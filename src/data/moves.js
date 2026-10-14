'use strict';
// Bibliothèque de coups (animation modulaire, voir src/gfx/modrig.js) et styles de combat.
//
// Pose : angles en radians (0 = vers le bas, positif = vers l'avant), [arrière, avant] ;
//   legs : a (cuisse), k (flexion du genou), toe (pied) ; arms : a (bras), e (coude),
//   hand ('pocket' = garde de l'image d'origine) ; lean (buste), twist (épaules), tilt (tête),
//   x / y (décalage en pixels), squash, sway (bas du vêtement), swap (bras arrière devant),
//   mirror (perso retourné : vrille).
// Coup : { poses, seq: [[pose, durée (s), courbe?], ...], hit: segment au bout duquel il touche,
//   kind: 'punch' | 'kick' | 'head' | 'gun' (effet), react: réaction de la cible ('high' touchée
//   en haut, 'low' pliée en deux, 'launch' envoyée en l'air, 'bounce' écrasée au sol),
//   shot: coup de feu au moment de l'impact }.
// Courbes : 'inout', 'back' (dépasse un peu la pose), 'in', 'out', 'lin', 'snap' ; par défaut
// 'back' pour un segment très court (frappe) et 'inout' sinon. Créer ou retoucher un coup :
// tools/mouvements.html.
(function () {
  const PK = { a: 0, e: 0, hand: 'pocket' };
  const PP = [PK, PK];
  // poing arrière en garde devant la poitrine, garde des jambes
  const GB = { a: 0.5, e: 1.9, hand: 'fist' };
  const GL = [{ a: -0.4, k: 0.3 }, { a: 0.3, k: 0.4 }];

  const MOVES = (GS.MOVES = {
    // coups existants (src/gfx/modrig.js) : seulement leur effet en combat
    jab: { kind: 'punch', react: 'high' },
    cross: { kind: 'punch', react: 'high' },
    uppercut: { kind: 'punch', react: 'launch' },
    kick: { kind: 'kick', react: 'low' },
    airKick: { kind: 'kick', react: 'bounce' },

    // ------------------------------------------------------------ poings et coudes
    elbow: {
      kind: 'punch',
      react: 'high',
      poses: {
        elbowWind: { lean: -0.05, x: -2, twist: -0.2, legs: [{ a: -0.45, k: 0.35 }, { a: 0.32, k: 0.45 }], arms: [PK, { a: -0.4, e: 2.5 }] },
        elbowHit: { lean: 0.32, x: 5, twist: 0.3, sway: 2, legs: [{ a: -0.7, k: 0.15 }, { a: 0.55, k: 0.5 }], arms: [PK, { a: 1.35, e: 2.7 }] },
      },
      seq: [['guard', 0], ['elbowWind', 0.08], ['elbowHit', 0.05], ['elbowHit', 0.08], ['guard', 0.13]],
      hit: 2,
    },
    backfist: {
      kind: 'punch',
      react: 'high',
      poses: {
        bfWind: { twist: 0.4, lean: 0.05, legs: GL, arms: [PK, { a: 0.3, e: 2.3 }] },
        bfHit: { twist: -0.1, lean: 0.25, x: 4, legs: [{ a: -0.6, k: 0.15 }, { a: 0.5, k: 0.5 }], arms: [PK, { a: 1.45, e: -0.35 }] },
      },
      seq: [['guard', 0], ['bfWind', 0.07], ['bfHit', 0.05], ['bfHit', 0.07], ['guard', 0.13]],
      hit: 2,
    },
    slam: {
      kind: 'punch',
      react: 'bounce',
      poses: {
        slamUp: { backArm: 'front', lean: -0.2, y: -2, legs: [{ a: -0.3, k: 0.2 }, { a: 0.3, k: 0.3 }], arms: [{ a: 3.0, e: 0.2, hand: 'fist' }, { a: 3.0, e: 0.2 }] },
        slamHit: { backArm: 'front', lean: 0.5, x: 4, squash: -0.08, legs: [{ a: -0.6, k: 0.8 }, { a: 0.6, k: 1.0 }], arms: [{ a: 1.2, e: 0.1, hand: 'fist' }, { a: 1.1, e: 0.1 }] },
      },
      seq: [['guard', 0], ['slamUp', 0.12], ['slamHit', 0.05], ['slamHit', 0.1], ['guard', 0.16]],
      hit: 2,
    },

    // ------------------------------------------------------------ genou, tête, épaule
    knee: {
      kind: 'kick',
      react: 'low',
      poses: {
        kneeWind: { lean: 0.1, x: 1, legs: [{ a: -0.2, k: 0.2 }, { a: 0.6, k: 1.6 }], arms: [{ a: 0.9, e: 1.2, hand: 'fist' }, { a: 1.1, e: 1.0 }] },
        kneeHit: { lean: -0.1, x: 5, legs: [{ a: -0.15, k: 0.1 }, { a: 1.5, k: 2.4 }], arms: [{ a: 1.3, e: 0.6, hand: 'fist' }, { a: 1.3, e: 0.4 }] },
      },
      seq: [['guard', 0], ['kneeWind', 0.08], ['kneeHit', 0.05], ['kneeHit', 0.08], ['guard', 0.13]],
      hit: 2,
    },
    headbutt: {
      kind: 'head',
      react: 'high',
      poses: {
        hbWind: { lean: -0.25, tilt: -0.2, x: -2, legs: GL, arms: [{ a: 0.8, e: 1.6, hand: 'fist' }, { a: 0.9, e: 1.4 }] },
        hbHit: { lean: 0.45, tilt: 0.35, x: 6, hx: 2, legs: [{ a: -0.7, k: 0.2 }, { a: 0.5, k: 0.5 }], arms: [{ a: 1.2, e: 0.8, hand: 'fist' }, { a: 1.2, e: 0.7 }] },
      },
      seq: [['guard', 0], ['hbWind', 0.1], ['hbHit', 0.05], ['hbHit', 0.08], ['guard', 0.14]],
      hit: 2,
    },
    shoulder: {
      kind: 'head',
      react: 'launch',
      poses: {
        shWind: { twist: 0.5, lean: 0.15, x: -3, squash: -0.05, legs: [{ a: -0.6, k: 0.8 }, { a: 0.5, k: 0.9 }], arms: [{ a: 0.4, e: 1.8, hand: 'fist' }, { a: 0.3, e: 1.6 }] },
        shHit: { twist: 1.0, lean: 0.55, x: 10, sway: -2, legs: [{ a: -1.0, k: 0.1 }, { a: 0.7, k: 0.6 }], arms: [{ a: 0.6, e: 1.9, hand: 'fist' }, { a: 0.2, e: 1.7 }] },
      },
      seq: [['guard', 0], ['shWind', 0.12], ['shHit', 0.06], ['shHit', 0.1], ['guard', 0.16]],
      hit: 2,
    },

    // ------------------------------------------------------------ jambes
    sweep: {
      kind: 'kick',
      react: 'low',
      poses: {
        sweepWind: { lean: 0.25, squash: -0.06, legs: [{ a: -0.9, k: 1.5 }, { a: 0.3, k: 1.6 }], arms: PP },
        sweepHit: { lean: 0.35, x: 2, squash: -0.1, legs: [{ a: -1.0, k: 1.8 }, { a: 1.45, k: 0.0, toe: -0.3 }], arms: PP },
      },
      seq: [['guard', 0], ['sweepWind', 0.08], ['sweepHit', 0.06], ['sweepHit', 0.08], ['guard', 0.15]],
      hit: 2,
    },
    roundhouse: {
      kind: 'kick',
      react: 'high',
      poses: {
        rhWind: { twist: 0.4, lean: -0.05, legs: [{ a: -0.35, k: 0.3 }, { a: 0.9, k: 2.0 }], arms: PP },
        rhHit: { lean: -0.55, x: 3, sway: -2, tilt: -0.1, legs: [{ a: -0.15, k: 0.1 }, { a: 2.25, k: 0.25, toe: -0.7 }], arms: PP },
      },
      seq: [['guard', 0], ['rhWind', 0.08], ['rhHit', 0.05], ['rhHit', 0.09], ['guard', 0.15]],
      hit: 2,
    },
    spinKick: {
      kind: 'kick',
      react: 'launch',
      poses: {
        spinWind: { twist: 0.8, lean: 0.1, legs: [{ a: -0.3, k: 0.3 }, { a: 0.3, k: 0.4 }], arms: PP },
        spinBack: { mirror: true, lean: -0.1, legs: [{ a: -0.2, k: 0.2 }, { a: 0.5, k: 1.2 }], arms: PP },
        spinHit: { lean: -0.45, x: 4, sway: -2, legs: [{ a: -0.2, k: 0.1 }, { a: 1.85, k: 0.0, toe: -0.6 }], arms: PP },
      },
      seq: [['guard', 0], ['spinWind', 0.06], ['spinBack', 0.06, 'snap'], ['spinHit', 0.05], ['spinHit', 0.1], ['guard', 0.15]],
      hit: 3,
    },
    axeKick: {
      kind: 'kick',
      react: 'bounce',
      poses: {
        axeUp: { lean: -0.35, legs: [{ a: -0.1, k: 0.1 }, { a: 2.7, k: 0.05, toe: -0.3 }], arms: PP },
        axeHit: { lean: 0.25, x: 4, squash: -0.04, legs: [{ a: -0.3, k: 0.3 }, { a: 0.9, k: 0.0, toe: 0.2 }], arms: PP },
      },
      seq: [['guard', 0], ['axeUp', 0.12], ['axeHit', 0.05, 'in'], ['axeHit', 0.08], ['guard', 0.14]],
      hit: 2,
    },

    // ------------------------------------------------------------ pistolet (gun-kata)
    pistolWhip: {
      kind: 'punch',
      react: 'high',
      poses: {
        pwUp: { lean: -0.1, twist: 0.2, legs: GL, arms: [GB, { a: 2.6, e: 0.4 }] },
        pwHit: { lean: 0.3, x: 4, legs: [{ a: -0.6, k: 0.2 }, { a: 0.5, k: 0.5 }], arms: [GB, { a: 1.0, e: 0.2 }] },
      },
      seq: [['guard', 0], ['pwUp', 0.08], ['pwHit', 0.05], ['pwHit', 0.08], ['guard', 0.13]],
      hit: 2,
    },
    spinShot: {
      kind: 'gun',
      react: 'high',
      shot: true,
      poses: {
        ssBack: { mirror: true, lean: 0.05, legs: [{ a: -0.3, k: 0.3 }, { a: 0.4, k: 0.5 }], arms: [GB, { a: 0.6, e: 0.4 }] },
        ssAim: { lean: 0.0, x: 2, twist: 0.2, legs: [{ a: -0.55, k: 0.3 }, { a: 0.45, k: 0.4 }], arms: [{ a: 0.8, e: 1.7, hand: 'fist' }, { a: 1.57, e: 0.0 }], wr: 0 },
      },
      seq: [['guard', 0], ['spinWind', 0.06], ['ssBack', 0.06, 'snap'], ['ssAim', 0.05], ['ssAim', 0.1], ['guard', 0.14]],
      hit: 3,
    },

    // ------------------------------------------------------------ réactions de la cible
    hurtLow: {
      poses: {
        // pliée en deux
        hurtLow: { lean: 0.5, x: -5, tilt: 0.4, squash: -0.05, sway: -2, legs: [{ a: -0.25, k: 0.75 }, { a: 0.15, k: 0.85 }], arms: [{ a: 0.1, e: 1.2, hand: 'fist' }, { a: 0.25, e: -1.4 }] },
      },
      seq: [['hurtLow', 0], ['hurtLow', 0.22], ['guard', 0.2]],
    },
    hurtAir: {
      poses: {
        // envoyée en l'air, cambrée, jambes repliées
        hurtAir: { lean: -0.5, tilt: -0.35, sway: 2, legs: [{ a: 0.5, k: 1.4 }, { a: 0.9, k: 1.2 }], arms: [{ a: -0.9, e: 0.3, hand: 'fist' }, { a: -0.6, e: 0.4 }] },
      },
      seq: [['hurtAir', 0], ['hurtAir', 1]],
    },
  });
  GS.ModRig.addMoves(MOVES);

  // ------------------------------------------------------------ styles de combat
  // Enchaînement d'un style pour n coups : les coups de la liste dans l'ordre, puis le coup final.
  GS.STYLES = {
    rue: { moves: ['jab', 'cross', 'elbow', 'knee', 'headbutt'], finish: 'uppercut' },
    boxe: { moves: ['jab', 'cross', 'jab', 'backfist', 'cross'], finish: 'uppercut' },
    karate: { moves: ['jab', 'kick', 'cross', 'roundhouse', 'backfist'], finish: 'spinKick' },
    capoeira: { moves: ['sweep', 'roundhouse', 'kick', 'spinKick', 'axeKick'], finish: 'airKick' },
    gunkata: { moves: ['jab', 'pistolWhip', 'spinShot', 'cross', 'knee'], finish: 'spinShot' },
    cheffe: { moves: ['jab', 'cross', 'elbow', 'headbutt', 'knee'], finish: 'shoulder' },
  };
  GS.comboOf = (style, n) => {
    const st = GS.STYLES[style] || GS.STYLES.rue;
    if (n <= 1) return [st.finish];
    const out = [];
    for (let i = 0; i < n - 1; i++) out.push(st.moves[i % st.moves.length]);
    out.push(st.finish);
    return out;
  };
})();
