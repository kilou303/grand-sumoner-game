'use strict';
// Sauvegarde du joueur (localStorage) : cristaux, or, héros, équipe, progression.
(function () {
  const KEY = 'astral_summoners_save_v1';
  const S = (GS.Save = {});

  const today = () => new Date().toISOString().slice(0, 10);

  S.fresh = () => ({
    v: 1,
    gems: 3000,
    gold: 3000,
    units: [],
    nextUid: 1,
    team: [],
    cleared: {},
    pity: 0,
    totalPulls: 0,
    firstMulti: true,
    lastGift: null,
    items: [],
    nextItemUid: 1,
    shop: null,
    settings: { muted: false, speed: 1, auto: false },
    stats: { battles: 0, wins: 0 },
  });

  S.load = () => {
    let d = null;
    try {
      d = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (err) {
      d = null;
    }
    let kit = !d || d.v !== 1 || !d.items;
    if (!d || d.v !== 1) {
      d = S.fresh();
      GS.data = d;
      // Héros de départ.
      for (const id of ['djegui', 'azura', 'toran', 'lina', 'pip']) S.addUnit(id);
      d.team = d.units.slice(0, 3).map((u) => u.uid);
      S.save();
    }
    GS.data = Object.assign(S.fresh(), d);
    GS.data.items = GS.data.items.filter((it) => GS.EQUIPS[it.id]);
    GS.data.settings = Object.assign(S.fresh().settings, d.settings || {});
    // Nettoie les unités inconnues (si les données du jeu changent).
    GS.data.units = GS.data.units.filter((u) => GS.UNIT[u.id]);
    GS.data.team = GS.data.team.filter((uid) => S.unit(uid));
    if (!GS.data.team.length && GS.data.units.length) GS.data.team = [GS.data.units[0].uid];
    // Héros de départ ajoutés après la création de la sauvegarde.
    const missing = GS.UNITS.filter((u) => u.starter && !S.ownedById(u.id));
    for (const u of missing) S.addUnit(u.id);
    // Équipement de départ (nouvelle partie ou sauvegarde d'avant l'équipement), porté par le chef.
    if (kit) {
      const lead = S.teamUnits()[0];
      for (const id of ['couteau', 'blouson', 'bracelet']) {
        const it = GS.Equip.add(id);
        if (lead) GS.Equip.equip(lead, it.uid);
      }
    }
    if (missing.length || kit) S.save();
    return GS.data;
  };

  S.save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(GS.data));
    } catch (err) {
      /* stockage indisponible : on continue sans sauvegarder */
    }
  };

  S.reset = () => {
    try {
      localStorage.removeItem(KEY);
    } catch (err) {
      /* ignore */
    }
    S.load();
  };

  S.unit = (uid) => GS.data.units.find((u) => u.uid === uid);
  S.ownedById = (id) => GS.data.units.find((u) => u.id === id);
  S.teamUnits = () => GS.data.team.map(S.unit).filter(Boolean);

  // Ajoute un héros ; un doublon donne un éveil (+stats), ou de l'or si l'éveil est au max.
  S.addUnit = (id) => {
    const owned = S.ownedById(id);
    if (owned) {
      if (owned.awaken < 5) {
        owned.awaken++;
        return { unit: owned, isNew: false, awakened: true };
      }
      const gold = 1500 * GS.UNIT[id].rarity;
      GS.data.gold += gold;
      return { unit: owned, isNew: false, awakened: false, gold };
    }
    const u = { uid: GS.data.nextUid++, id, level: 1, xp: 0, awaken: 0 };
    GS.data.units.push(u);
    return { unit: u, isNew: true };
  };

  S.maxLevel = (u) => GS.RARITY[GS.UNIT[u.id].rarity].maxLv;
  S.xpNeed = (lv) => 30 + lv * 22;

  // Ajoute de l'XP, renvoie le nombre de niveaux gagnés.
  S.addXp = (u, xp) => {
    let gained = 0;
    const max = S.maxLevel(u);
    u.xp += xp;
    while (u.level < max && u.xp >= S.xpNeed(u.level)) {
      u.xp -= S.xpNeed(u.level);
      u.level++;
      gained++;
    }
    if (u.level >= max) u.xp = 0;
    return gained;
  };

  S.trainCost = (u) => 60 + u.level * 45;

  // Passifs d'un héros : innés (débloqués selon le niveau) puis ceux de son équipement.
  S.passivesOf = (u) => {
    const def = GS.UNIT[u.id];
    const out = (def.passives || []).map((id, i) => ({ id, src: 'innate', need: GS.Passives.UNLOCK[i], locked: u.level < GS.Passives.UNLOCK[i] }));
    const eq = GS.Equip.of(u);
    for (const sl of GS.SLOTS) if (eq[sl.id]) out.push({ id: GS.EQUIPS[eq[sl.id].id].passive, src: sl.id, item: eq[sl.id] });
    return out;
  };
  S.activePassives = (u) => S.passivesOf(u).filter((p) => !p.locked).map((p) => p.id);

  // Stats finales : base (niveau, éveil) + équipement, puis bonus en % des passifs.
  S.stats = (u) => {
    const st = GS.unitStats(GS.UNIT[u.id], u.level, u.awaken);
    for (const it of Object.values(GS.Equip.of(u))) if (it) for (const [k, v] of Object.entries(GS.Equip.stats(it))) st[k] += v;
    const m = GS.Passives.mods(S.activePassives(u));
    const g = (k) => m[k] || 0;
    st.hp = Math.round(st.hp * (1 + g('hp')));
    st.atk = Math.round(st.atk * (1 + g('atk')));
    st.def = Math.round(st.def * (1 + g('def')));
    st.spd += g('spd');
    st.mp += g('mp');
    return st;
  };
  S.power = (u) => {
    const s = S.stats(u);
    return Math.round(s.hp * 0.25 + s.atk * 2.2 + s.def * 1.5 + s.spd * 3 + S.activePassives(u).length * 40);
  };
  S.teamPower = () => S.teamUnits().reduce((s, u) => s + S.power(u), 0);

  S.canClaimGift = () => GS.data.lastGift !== today();
  S.claimGift = () => {
    if (!S.canClaimGift()) return 0;
    GS.data.lastGift = today();
    GS.data.gems += 300;
    GS.data.gold += 1000;
    S.save();
    return 300;
  };

  // Une quête est accessible si la précédente est terminée.
  S.stageUnlocked = (a, s) => {
    if (a === 0 && s === 0) return true;
    if (s > 0) return !!GS.data.cleared[GS.stageId(a, s - 1)];
    const prev = GS.AREAS[a - 1];
    return !!GS.data.cleared[GS.stageId(a - 1, prev.stages.length - 1)];
  };
  S.areaUnlocked = (a) => S.stageUnlocked(a, 0);
})();
