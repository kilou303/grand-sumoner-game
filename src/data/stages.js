'use strict';
// Zones et quêtes. Chaque vague : liste [ennemi, élément?].
(function () {
  GS.AREAS = [
    {
      id: 'street',
      name: 'Ruelles Nocturnes',
      bg: 'street',
      stages: [
        { name: 'Pluie Rouge', level: 1, waves: [[['larve'], ['larve']]] },
        { name: 'Racket', level: 2, waves: [[['voyou'], ['larve']], [['voyou'], ['voyou'], ['larve']]] },
        { name: 'Ça Rampe', level: 3, waves: [[['rampant'], ['larve']], [['rampant'], ['voyou'], ['rampant']]] },
        { name: 'Le Fléau Dévoreur', level: 4, boss: true, waves: [[['voyou'], ['rampant']], [['devoreur'], ['larve']]] },
      ],
    },
    {
      id: 'school',
      name: 'Lycée Abandonné',
      bg: 'school',
      stages: [
        { name: 'Couloirs Vides', level: 5, waves: [[['oeil'], ['oeil']], [['oeil'], ['gueule'], ['oeil']]] },
        { name: 'Bande du Préau', level: 6, waves: [[['cogneur'], ['voyou']], [['cogneur'], ['surineur'], ['voyou']]] },
        { name: 'Salle 4-B', level: 7, waves: [[['gueule'], ['oeil']], [['pendu'], ['gueule'], ['oeil']]] },
        { name: 'La Pendue du Lycée', level: 8, boss: true, waves: [[['pendu'], ['oeil'], ['gueule']], [['oeil'], ['pendue'], ['oeil']]] },
      ],
    },
    {
      id: 'subway',
      name: 'Métro Maudit',
      bg: 'subway',
      stages: [
        { name: 'Dernier Train', level: 9, waves: [[['chien'], ['chien']], [['chien'], ['surineur'], ['chien']]] },
        { name: 'Quai 13', level: 10, waves: [[['surineur'], ['cogneur']], [['chien'], ['cogneur'], ['surineur']]] },
        { name: 'Tunnel Sans Fin', level: 11, waves: [[['rampant'], ['chien']], [['gueule'], ['rampant'], ['chien']]] },
        { name: 'Mille-Pattes du Métro', level: 12, boss: true, waves: [[['chien'], ['gueule'], ['chien']], [['millepattes']]] },
      ],
    },
    {
      id: 'shrine',
      name: 'Sanctuaire Écarlate',
      bg: 'shrine',
      stages: [
        { name: 'Torii de Sang', level: 13, waves: [[['sectaire'], ['pendu']], [['sectaire'], ['oeil'], ['sectaire']]] },
        { name: 'Les Masques', level: 14, waves: [[['sectaire'], ['exorciste']], [['exorciste'], ['sectaire'], ['pendu']]] },
        { name: 'Exorcistes Déchus', level: 15, waves: [[['exorciste'], ['gueule']], [['exorciste'], ['sectaire'], ['exorciste']]] },
        { name: 'Vorgath, Roi des Fléaux', level: 16, boss: true, waves: [[['exorciste'], ['sectaire'], ['pendu']], [['vorgath']]] },
      ],
    },
  ];

  // Identifiant de quête "zone-index" et récompenses.
  GS.stageId = (a, s) => `${a}-${s}`;
  GS.stageRewards = (st) => ({
    gold: 120 + st.level * 70,
    xp: 40 + st.level * 32,
    firstGems: st.boss ? 150 : 50,
  });
  GS.stageScale = (level) => 1 + 0.13 * (level - 1);
})();
