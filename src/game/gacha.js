'use strict';
// Système d'invocation : bannières, taux, garantie (pitié) et bonus de première multi-invocation.
(function () {
  const U = GS.U;

  GS.BANNERS = [
    {
      id: 'astral',
      name: 'Invocation Astrale',
      sub: 'Tous les héros sont disponibles',
      featured: null,
      color: '#3ea8ff',
      show: ['ignara', 'thalassa', 'gaius'],
    },
    {
      id: 'aube',
      name: 'Aube Radieuse',
      sub: 'Taux de KAELEN augmenté !',
      featured: 'kaelen',
      color: '#ffd040',
      show: ['kaelen'],
    },
    {
      id: 'nuit',
      name: 'Nuit Éternelle',
      sub: 'Taux de NYX augmenté !',
      featured: 'nyx',
      color: '#b464ff',
      show: ['nyx'],
    },
  ];

  const G = (GS.Gacha = {});
  G.COST1 = 50;
  G.COST10 = 500;
  G.RATES = { 5: 0.05, 4: 0.22, 3: 0.73 };
  G.PITY = 60;

  const byRarity = (r) => GS.UNITS.filter((u) => u.rarity === r && !u.noGacha).map((u) => u.id);

  const rollRarity = (min = 3) => {
    const d = GS.data;
    if (d.pity + 1 >= G.PITY) return 5;
    const x = Math.random();
    if (x < G.RATES[5]) return 5;
    if (x < G.RATES[5] + G.RATES[4]) return 4;
    return Math.max(3, min);
  };

  const pickUnit = (banner, rarity) => {
    if (rarity === 5 && banner.featured && Math.random() < 0.5) return banner.featured;
    return U.choice(byRarity(rarity));
  };

  // Effectue `count` invocations. Renvoie null si pas assez de cristaux.
  G.pull = (banner, count) => {
    const d = GS.data;
    const cost = count === 10 ? G.COST10 : G.COST1 * count;
    if (d.gems < cost) return null;
    d.gems -= cost;
    const rarities = [];
    for (let i = 0; i < count; i++) rarities.push(rollRarity());
    if (count === 10) {
      // Garantie : au moins un ★4 ; première multi : un ★5 garanti.
      if (!rarities.some((r) => r >= 4)) rarities[9] = 4;
      if (d.firstMulti) {
        if (!rarities.includes(5)) rarities[9] = 5;
        d.firstMulti = false;
      }
    }
    const results = rarities.map((r) => {
      d.totalPulls++;
      d.pity = r === 5 ? 0 : d.pity + 1;
      const id = pickUnit(banner, r);
      const res = GS.Save.addUnit(id);
      return Object.assign({ id, rarity: r }, res);
    });
    // Ajoute automatiquement les nouveaux héros à une équipe incomplète.
    for (const r of results) {
      if (r.isNew && d.team.length < 3 && !d.team.includes(r.unit.uid)) d.team.push(r.unit.uid);
    }
    GS.Save.save();
    return results;
  };
})();
