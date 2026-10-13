'use strict';
// Ennemis et boss. Stats de base multipliées par le niveau de la quête.
// art : ['m', type, {main, extra, scale}] (monstre) ou ['h', look, scale] (humanoïde).
(function () {
  const e = (type, turns = 3, chance = 1, target) => ({ type, turns, chance, target });

  const slimeCol = { earth: '#58c860', water: '#4c9cf0', fire: '#f05a3a', dark: '#9a5ae0', light: '#f0d050' };

  GS.ENEMIES = {
    slime: (el = 'earth') => ({
      name: 'Gelée',
      element: el,
      art: ['m', 'slime', { main: slimeCol[el] }],
      hp: 650,
      atk: 170,
      def: 35,
      spd: 86,
      skills: [
        { name: 'Rebond', anim: 'melee', fx: 'hit', power: 1.0, hits: 1, w: 3 },
        { name: 'Jet Gluant', anim: 'ranged', fx: el, power: 0.8, hits: 1, effects: [e('poison', 2, 0.5)], w: 1 },
      ],
    }),
    mushroom: () => ({
      name: 'Champitueur',
      element: 'earth',
      art: ['m', 'mushroom'],
      hp: 800,
      atk: 160,
      def: 50,
      spd: 80,
      skills: [
        { name: 'Coup de Tête', anim: 'melee', fx: 'hit', power: 1.0, hits: 1, w: 2 },
        { name: 'Spores', anim: 'magic', fx: 'smoke', target: 'heroes', power: 0.5, hits: 1, effects: [e('poison', 3, 0.6)], w: 1 },
      ],
    }),
    wolf: (el = 'earth') => ({
      name: 'Loup Gris',
      element: el,
      art: ['m', 'wolf'],
      hp: 900,
      atk: 210,
      def: 45,
      spd: 112,
      skills: [
        { name: 'Morsure', anim: 'melee', fx: 'bite', power: 1.0, hits: 2, w: 3 },
        { name: 'Hurlement', anim: 'support', fx: 'rage', target: 'self', effects: [e('atkUp', 3)], w: 1 },
      ],
    }),
    bat: () => ({
      name: 'Chiroptère',
      element: 'dark',
      art: ['m', 'bat'],
      hp: 600,
      atk: 190,
      def: 30,
      spd: 125,
      skills: [
        { name: 'Piqué', anim: 'melee', fx: 'bite', power: 0.9, hits: 2, w: 3 },
        { name: 'Ultrason', anim: 'magic', fx: 'dark', target: 'heroes', power: 0.55, hits: 1, w: 1 },
      ],
    }),
    goblin: () => ({
      name: 'Gobelin',
      element: 'earth',
      art: ['h', { hair: 'short', body: 'tunic', weapon: 'dagger', acc: 'elf', colors: { skin: '#80b050', hair: '#4a3020', main: '#7a5a38', second: '#5a4028', eye: '#ffe030', boots: '#3a2a18' } }, 1],
      hp: 950,
      atk: 220,
      def: 50,
      spd: 104,
      skills: [
        { name: 'Coup de Dague', anim: 'melee', fx: 'slash', power: 1.0, hits: 2, w: 3 },
        { name: 'Caillou', anim: 'ranged', fx: 'rock', power: 1.2, hits: 1, w: 1 },
      ],
    }),
    goblinShaman: () => ({
      name: 'Chaman Gobelin',
      element: 'fire',
      art: ['h', { hair: 'hood', body: 'robe', weapon: 'staff', acc: 'elf', colors: { skin: '#80b050', hair: '#4a3020', main: '#8a3030', cape: '#6a2828', second: '#e0c060', eye: '#ffe030', accent: '#ff6030' } }, 1],
      hp: 800,
      atk: 240,
      def: 40,
      spd: 96,
      skills: [
        { name: 'Flamme', anim: 'magic', fx: 'fire', power: 1.1, hits: 1, effects: [e('burn', 2, 0.4)], w: 2 },
        { name: 'Soin Tribal', anim: 'support', fx: 'heal', target: 'allies', heal: 1.2, w: 1 },
      ],
    }),
    wisp: () => ({
      name: 'Feu Follet',
      element: 'fire',
      art: ['m', 'wisp'],
      hp: 700,
      atk: 230,
      def: 35,
      spd: 115,
      skills: [
        { name: 'Brûlure', anim: 'melee', fx: 'fire', power: 1.0, hits: 1, effects: [e('burn', 2, 0.5)], w: 3 },
        { name: 'Explosion', anim: 'magic', fx: 'fire', target: 'heroes', power: 0.7, hits: 1, w: 1 },
      ],
    }),
    golem: (el = 'earth') => ({
      name: 'Golem',
      element: el,
      art: ['m', 'golem'],
      hp: 1900,
      atk: 240,
      def: 110,
      spd: 70,
      skills: [
        { name: 'Écrasement', anim: 'melee', fx: 'heavy', power: 1.3, hits: 1, w: 3 },
        { name: 'Éboulement', anim: 'magic', fx: 'quake', target: 'heroes', power: 0.8, hits: 2, w: 1 },
      ],
    }),
    skeleton: () => ({
      name: 'Squelette',
      element: 'dark',
      art: ['h', { head: 'skull', body: 'bones', weapon: 'sword', colors: { metal: '#e8e0d0', trim: '#806040', accent: '#ff3040' } }, 1],
      hp: 1000,
      atk: 250,
      def: 60,
      spd: 95,
      skills: [
        { name: "Coup d'Os", anim: 'melee', fx: 'slash', power: 1.0, hits: 2, w: 3 },
        { name: 'Cri Glaçant', anim: 'magic', fx: 'dark', target: 'heroes', power: 0.4, hits: 1, effects: [e('atkDown', 2, 0.5)], w: 1 },
      ],
    }),
    darkMage: () => ({
      name: 'Mage Noir',
      element: 'dark',
      art: ['h', { hair: 'hood', body: 'robe', weapon: 'staff', colors: { skin: '#9a90b0', hair: '#202030', main: '#2a1a3a', cape: '#3a2050', second: '#a040ff', trim: '#c080ff', eye: '#ff40a0', accent: '#c040ff' } }, 1],
      hp: 950,
      atk: 290,
      def: 50,
      spd: 100,
      skills: [
        { name: 'Orbe Maudit', anim: 'magic', fx: 'dark', power: 1.2, hits: 1, w: 2 },
        { name: 'Malédiction', anim: 'magic', fx: 'dark', target: 'heroes', power: 0.6, hits: 1, effects: [e('defDown', 2, 0.6)], w: 1 },
      ],
    }),
    darkKnight: () => ({
      name: 'Chevalier Noir',
      element: 'dark',
      art: ['h', { hair: 'helmet', body: 'armor', weapon: 'greatsword', cape: 'cape', colors: { metal: '#4a4a60', main: '#2a1a30', trim: '#a02040', cape: '#5a1020', eye: '#ff3040', accent: '#ff3040' } }, 1],
      hp: 1700,
      atk: 300,
      def: 100,
      spd: 92,
      skills: [
        { name: 'Taille Sombre', anim: 'melee', fx: 'dark', power: 1.15, hits: 2, w: 3 },
        { name: 'Garde Noire', anim: 'support', fx: 'shield', target: 'self', effects: [e('defUp', 3)], w: 1 },
      ],
    }),

    // ------------------------------------------------------------ BOSS
    kingSlime: () => ({
      name: 'Roi Gelée',
      element: 'water',
      boss: true,
      art: ['m', 'kingslime', { scale: 2 }],
      hp: 5200,
      atk: 220,
      def: 50,
      spd: 84,
      skills: [
        { name: 'Écrasement Royal', anim: 'melee', fx: 'heavy', power: 1.3, hits: 1, w: 3 },
        { name: 'Déluge Gluant', anim: 'magic', fx: 'water', target: 'heroes', power: 0.75, hits: 2, w: 2 },
        { name: 'Grand Saut', charge: true, anim: 'magic', fx: 'quake', target: 'heroes', power: 1.5, hits: 1, effects: [e('stun', 1, 0.3)], w: 1 },
      ],
    }),
    fenrak: () => ({
      name: 'Fenrak',
      element: 'dark',
      boss: true,
      art: ['m', 'wolf', { scale: 2, main: '#4a4060', extra: { R: '#ff2040', c: '#9088b0' } }],
      hp: 6000,
      atk: 245,
      def: 60,
      spd: 125,
      skills: [
        { name: 'Croc Lunaire', anim: 'melee', fx: 'bite', power: 1.0, hits: 3, w: 3 },
        { name: 'Hurlement Alpha', anim: 'support', fx: 'rage', target: 'allies', effects: [e('atkUp', 3)], w: 1 },
        { name: 'Ruée Sanglante', charge: true, anim: 'spin', fx: 'dark', target: 'heroes', power: 1.4, hits: 3, w: 1 },
      ],
    }),
    ignir: () => ({
      name: 'Ignir, Wyrm de Magma',
      element: 'fire',
      boss: true,
      art: ['m', 'dragon', { scale: 2 }],
      hp: 9000,
      atk: 270,
      def: 85,
      spd: 95,
      skills: [
        { name: 'Griffes Ardentes', anim: 'melee', fx: 'fire', power: 1.1, hits: 2, w: 3 },
        { name: 'Souffle de Feu', anim: 'magic', fx: 'fire', target: 'heroes', power: 0.9, hits: 2, effects: [e('burn', 3, 0.5)], w: 2 },
        { name: 'Cataclysme', charge: true, anim: 'magic', fx: 'meteor', target: 'heroes', power: 1.6, hits: 3, w: 1 },
      ],
    }),
    vorgath: () => ({
      name: 'Vorgath',
      element: 'dark',
      boss: true,
      art: ['h', { hair: 'mane', body: 'armor', weapon: 'greatsword', cape: 'cape', acc: 'horns', colors: { skin: '#9a8aa8', hair: '#2a1a3a', metal: '#3a3048', main: '#5a1030', trim: '#ffb030', cape: '#3a0a20', eye: '#ff2040', accent: '#ff2040', boots: '#1a1020' } }, 2],
      hp: 8000,
      atk: 290,
      def: 90,
      spd: 100,
      skills: [
        { name: 'Lame du Néant', anim: 'melee', fx: 'dark', power: 1.15, hits: 3, w: 3 },
        { name: 'Pluie Infernale', anim: 'magic', fx: 'void', target: 'heroes', power: 0.85, hits: 2, effects: [e('defDown', 2, 0.5)], w: 2 },
        { name: 'Apocalypse', charge: true, anim: 'magic', fx: 'nova', target: 'heroes', power: 1.7, hits: 4, w: 1 },
      ],
    }),
  };
})();
