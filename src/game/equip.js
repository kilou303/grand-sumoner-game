'use strict';
// Inventaire d'équipement : équiper, forger (+1 à +5), vendre, butin, boutique du jour,
// invocation d'équipement. Un objet possédé : { uid, id, lvl }. Un héros : u.eq = { weapon, armor, acc }.
(function () {
  const U = GS.U;
  const P = GS.Passives;
  const Q = (GS.Equip = {});

  Q.MAX_LVL = 5;
  Q.rank = (id) => P.RARITY[GS.EQUIPS[id].rarity].rank;
  Q.color = (id) => P.RARITY[GS.EQUIPS[id].rarity].color;

  // Stats fixes d'un objet possédé (+20% par niveau de forge).
  Q.stats = (it) => {
    const def = GS.EQUIPS[it.id];
    const base = GS.EQUIP_STATS[def.slot][Q.rank(it.id)];
    const k = 1 + 0.2 * (it.lvl || 0);
    const out = {};
    for (const [s, v] of Object.entries(base)) out[s] = Math.round(v * k);
    return out;
  };
  Q.statText = (it) => {
    const N = { atk: 'ATQ', hp: 'PV', def: 'DÉF', spd: 'VIT', mp: 'MP' };
    return Object.entries(Q.stats(it))
      .map(([s, v]) => `${N[s]} +${U.fmt(v)}`)
      .join('  ');
  };
  Q.label = (it) => GS.EQUIPS[it.id].name + (it.lvl ? ' +' + it.lvl : '');

  // ------------------------------------------------------------ inventaire
  Q.items = () => GS.data.items;
  Q.item = (uid) => GS.data.items.find((i) => i.uid === uid);
  Q.add = (id) => {
    const it = { uid: GS.data.nextItemUid++, id, lvl: 0 };
    GS.data.items.push(it);
    return it;
  };
  // Héros qui porte l'objet (ou null).
  Q.owner = (uid) => GS.data.units.find((u) => u.eq && Object.values(u.eq).includes(uid)) || null;
  // Objets portés par un héros, par emplacement.
  Q.of = (u) => {
    const out = {};
    for (const s of GS.SLOTS) out[s.id] = u.eq && u.eq[s.id] ? Q.item(u.eq[s.id]) || null : null;
    return out;
  };
  Q.equip = (u, uid) => {
    const it = Q.item(uid);
    if (!it) return;
    const prev = Q.owner(uid);
    if (prev) for (const k of Object.keys(prev.eq)) if (prev.eq[k] === uid) delete prev.eq[k];
    u.eq = u.eq || {};
    u.eq[GS.EQUIPS[it.id].slot] = uid;
    GS.Save.save();
  };
  Q.unequip = (u, slot) => {
    if (u.eq) delete u.eq[slot];
    GS.Save.save();
  };

  // ------------------------------------------------------------ forge
  Q.upgradeCost = (it) => (Q.rank(it.id) + 1) * 400 * ((it.lvl || 0) + 1);
  Q.upgrade = (it) => {
    const cost = Q.upgradeCost(it);
    if ((it.lvl || 0) >= Q.MAX_LVL || GS.data.gold < cost) return false;
    GS.data.gold -= cost;
    it.lvl = (it.lvl || 0) + 1;
    GS.Save.save();
    return true;
  };
  Q.sellValue = (it) => Math.round([100, 300, 800, 2000][Q.rank(it.id)] * (1 + (it.lvl || 0) * 0.5));
  Q.sell = (it) => {
    const own = Q.owner(it.uid);
    if (own) for (const k of Object.keys(own.eq)) if (own.eq[k] === it.uid) delete own.eq[k];
    GS.data.items = GS.data.items.filter((i) => i !== it);
    GS.data.gold += Q.sellValue(it);
    GS.Save.save();
  };

  // ------------------------------------------------------------ tirages
  // Tire une rareté selon des poids { common, rare, epic, legendary }, puis un objet.
  Q.rollRarity = (w) => {
    let r = Math.random() * P.TIERS.reduce((s, t) => s + (w[t] || 0), 0);
    for (const t of P.TIERS) {
      r -= w[t] || 0;
      if (r <= 0) return t;
    }
    return 'common';
  };
  Q.pick = (rarity, rng = Math.random) => {
    const ids = Object.keys(GS.EQUIPS).filter((id) => GS.EQUIPS[id].rarity === rarity);
    return ids[Math.floor(rng() * ids.length)];
  };
  Q.roll = (w) => Q.pick(Q.rollRarity(w));

  // Butin des quêtes : plus le niveau est haut, plus c'est rare ; les boss lâchent toujours.
  Q.dropWeights = (level, boss) => ({
    common: Math.max(10, 60 - level * 3),
    rare: 30,
    epic: 6 + level * (boss ? 2 : 1),
    legendary: boss ? 3 + level * 0.5 : 0.3 + level * 0.12,
  });
  Q.dropChance = (boss) => (boss ? 1 : 0.14);

  // Invocation d'équipement.
  Q.SUMMON = { cost1: 30, cost10: 300, rates: { common: 35, rare: 40, epic: 20, legendary: 5 } };
  Q.summon = (count) => {
    const d = GS.data;
    const cost = count === 10 ? Q.SUMMON.cost10 : Q.SUMMON.cost1 * count;
    if (d.gems < cost) return null;
    d.gems -= cost;
    const rar = [];
    for (let i = 0; i < count; i++) rar.push(Q.rollRarity(Q.SUMMON.rates));
    // x10 : au moins un Épique
    if (count === 10 && !rar.some((r) => r === 'epic' || r === 'legendary')) rar[9] = 'epic';
    const res = rar.map((r) => Q.add(Q.pick(r)));
    GS.Save.save();
    return res;
  };

  // ------------------------------------------------------------ boutique du jour
  Q.PRICE = [600, 1800, 5000, 15000];
  Q.REFRESH_GEMS = 50;
  const today = () => new Date().toISOString().slice(0, 10);
  const makeStock = (seed) => {
    const rng = U.seeded(seed);
    const out = [];
    for (const s of GS.SLOTS) {
      for (let k = 0; k < 2; k++) {
        const x = rng() * 100;
        const rarity = x < 2 ? 'legendary' : x < 15 ? 'epic' : x < 50 ? 'rare' : 'common';
        const ids = Object.keys(GS.EQUIPS).filter((id) => GS.EQUIPS[id].slot === s.id && GS.EQUIPS[id].rarity === rarity);
        out.push({ id: ids[Math.floor(rng() * ids.length)], sold: false });
      }
    }
    return out;
  };
  Q.shop = () => {
    const d = GS.data;
    const day = today();
    if (!d.shop || d.shop.day !== day) {
      d.shop = { day, n: 0, stock: makeStock(hash(day)) };
      GS.Save.save();
    }
    return d.shop;
  };
  Q.price = (id) => Q.PRICE[Q.rank(id)];
  Q.buy = (i) => {
    const sh = Q.shop();
    const s = sh.stock[i];
    if (!s || s.sold || GS.data.gold < Q.price(s.id)) return null;
    GS.data.gold -= Q.price(s.id);
    s.sold = true;
    const it = Q.add(s.id);
    GS.Save.save();
    return it;
  };
  Q.refresh = () => {
    const d = GS.data;
    if (d.gems < Q.REFRESH_GEMS) return false;
    d.gems -= Q.REFRESH_GEMS;
    const sh = Q.shop();
    sh.n++;
    sh.stock = makeStock(hash(sh.day) + sh.n * 7919);
    GS.Save.save();
    return true;
  };
  const hash = (s) => {
    let h = 7;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 1000003;
    return h;
  };
})();
