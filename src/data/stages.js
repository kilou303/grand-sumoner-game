'use strict';
// Zones et quêtes. Chaque vague : liste [ennemi, élément?].
(function () {
  GS.AREAS = [
    {
      id: 'plains',
      name: "Plaine d'Émeraude",
      bg: 'plains',
      stages: [
        { name: 'Premiers Pas', level: 1, waves: [[['slime'], ['slime']]] },
        { name: 'Gelées Sauvages', level: 2, waves: [[['slime'], ['slime', 'water']], [['slime', 'fire'], ['slime'], ['slime', 'water']]] },
        { name: 'Sous les Champignons', level: 3, waves: [[['mushroom'], ['slime']], [['mushroom'], ['mushroom'], ['slime', 'water']]] },
        { name: 'Le Roi Gelée', level: 4, boss: true, waves: [[['slime'], ['slime', 'fire']], [['kingSlime'], ['slime', 'water']]] },
      ],
    },
    {
      id: 'forest',
      name: 'Forêt Crépusculaire',
      bg: 'forest',
      stages: [
        { name: 'Hurlements', level: 5, waves: [[['wolf'], ['wolf']], [['wolf'], ['mushroom'], ['wolf']]] },
        { name: 'Ailes Noires', level: 6, waves: [[['bat'], ['bat']], [['bat'], ['mushroom'], ['bat']]] },
        { name: 'Camp Gobelin', level: 7, waves: [[['goblin'], ['goblin']], [['goblin'], ['goblinShaman'], ['goblin']]] },
        { name: 'Fenrak, Loup Alpha', level: 8, boss: true, waves: [[['wolf'], ['bat'], ['wolf']], [['wolf'], ['fenrak'], ['wolf']]] },
      ],
    },
    {
      id: 'volcano',
      name: 'Cratère Ardent',
      bg: 'volcano',
      stages: [
        { name: 'Flammes Errantes', level: 9, waves: [[['wisp'], ['wisp']], [['wisp'], ['wisp'], ['wisp']]] },
        { name: 'Gardien de Pierre', level: 10, waves: [[['wisp'], ['slime', 'fire']], [['wisp'], ['golem'], ['wisp']]] },
        { name: 'Rivière de Lave', level: 11, waves: [[['slime', 'fire'], ['golem']], [['golem', 'fire'], ['wisp'], ['golem']]] },
        { name: 'Ignir, Wyrm de Magma', level: 12, boss: true, waves: [[['wisp'], ['golem'], ['wisp']], [['ignir']]] },
      ],
    },
    {
      id: 'castle',
      name: 'Remparts Nocturnes',
      bg: 'castle',
      stages: [
        { name: 'Garde des Morts', level: 13, waves: [[['skeleton'], ['skeleton']], [['skeleton'], ['bat'], ['skeleton']]] },
        { name: 'Cercle Occulte', level: 14, waves: [[['darkMage'], ['skeleton']], [['darkMage'], ['bat'], ['darkMage']]] },
        { name: 'Chevaliers Déchus', level: 15, waves: [[['skeleton'], ['darkKnight']], [['darkKnight'], ['darkMage'], ['darkKnight']]] },
        { name: 'Vorgath, Seigneur Démon', level: 16, boss: true, waves: [[['darkKnight'], ['darkMage'], ['skeleton']], [['vorgath']]] },
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
