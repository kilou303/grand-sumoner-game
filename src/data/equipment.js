'use strict';
// Équipements : 3 pièces par héros (arme, armure, accessoire). Chaque pièce donne des stats
// fixes (selon sa rareté et son niveau de forge) et un passif de même rareté.
(function () {
  GS.SLOTS = [
    { id: 'weapon', name: 'Arme', icon: 'sword' },
    { id: 'armor', name: 'Armure', icon: 'armor' },
    { id: 'acc', name: 'Accessoire', icon: 'ring' },
  ];
  GS.SLOT = {};
  for (const s of GS.SLOTS) GS.SLOT[s.id] = s;

  // Stats fixes par emplacement et par rang de rareté (commun -> légendaire).
  GS.EQUIP_STATS = {
    weapon: [{ atk: 25 }, { atk: 50 }, { atk: 85 }, { atk: 130 }],
    armor: [{ hp: 180, def: 8 }, { hp: 360, def: 16 }, { hp: 600, def: 28 }, { hp: 950, def: 45 }],
    acc: [{ spd: 2, mp: 10 }, { spd: 3, mp: 20 }, { spd: 5, mp: 30 }, { spd: 7, mp: 45 }],
  };

  const E = (GS.EQUIPS = {});
  const add = (id, name, slot, rarity, passive) => (E[id] = { id, name, slot, rarity, passive });
  // armes
  add('couteau', 'Couteau Rouillé', 'weapon', 'common', 'atk0');
  add('batte', 'Batte Cloutée', 'weapon', 'common', 'crit0');
  add('lame_courbe', 'Lame Courbe', 'weapon', 'rare', 'crit1');
  add('poing_am', 'Poing Américain', 'weapon', 'rare', 'critdmg1');
  add('tuyau_beni', 'Tuyau Béni', 'weapon', 'rare', 'vs_dark1');
  add('katana_maudit', 'Katana Maudit', 'weapon', 'epic', 'drain2');
  add('lance_marees', 'Lance des Marées', 'weapon', 'epic', 'vs_fire2');
  add('hache_berserk', 'Hache Sanglante', 'weapon', 'epic', 'killsp');
  add('epee_aube', "Épée de l'Aube", 'weapon', 'legendary', 'atk3');
  add('faux_eclipse', "Faux de l'Éclipse", 'weapon', 'legendary', 'berserk');
  // armures
  add('blouson', 'Blouson Usé', 'armor', 'common', 'hp0');
  add('gilet', 'Gilet Rembourré', 'armor', 'common', 'def0');
  add('veste_renf', 'Veste Renforcée', 'armor', 'rare', 'def1');
  add('kimono', 'Kimono Sacré', 'armor', 'rare', 'resist1');
  add('cotte_epines', "Cotte d'Épines", 'armor', 'rare', 'thorns1');
  add('armure_jade', 'Armure de Jade', 'armor', 'epic', 'regen2');
  add('manteau_exo', "Manteau d'Exorciste", 'armor', 'epic', 'res_dark2');
  add('egide', 'Égide Céleste', 'armor', 'legendary', 'def3');
  add('cuirasse_phenix', 'Cuirasse du Phénix', 'armor', 'legendary', 'phenix');
  // accessoires
  add('bracelet', 'Bracelet Porte-Bonheur', 'acc', 'common', 'spd0');
  add('pendentif', 'Pendentif de Prière', 'acc', 'common', 'mpregen0');
  add('bague_mana', 'Bague de Mana', 'acc', 'rare', 'mpregen1');
  add('plume', 'Plume de Corbeau', 'acc', 'rare', 'dodge1');
  add('piece_or', "Pièce d'Or Maudite", 'acc', 'rare', 'gold1');
  add('talisman', 'Talisman de Sang', 'acc', 'epic', 'sp2');
  add('oeil_chat', 'Œil de Chat', 'acc', 'epic', 'crit2');
  add('couronne', 'Couronne du Roi Fléau', 'acc', 'legendary', 'transcend');
  add('amulette', 'Amulette Bénie', 'acc', 'legendary', 'benediction');
})();
