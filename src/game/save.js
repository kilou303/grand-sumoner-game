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
    if (!d || d.v !== 1) {
      d = S.fresh();
      GS.data = d;
      // Héros de départ.
      for (const id of ['djegui', 'azura', 'toran', 'lina', 'pip']) S.addUnit(id);
      d.team = d.units.slice(0, 3).map((u) => u.uid);
      S.save();
    }
    GS.data = Object.assign(S.fresh(), d);
    GS.data.settings = Object.assign(S.fresh().settings, d.settings || {});
    // Nettoie les unités inconnues (si les données du jeu changent).
    GS.data.units = GS.data.units.filter((u) => GS.UNIT[u.id]);
    GS.data.team = GS.data.team.filter((uid) => S.unit(uid));
    if (!GS.data.team.length && GS.data.units.length) GS.data.team = [GS.data.units[0].uid];
    // Héros de départ ajoutés après la création de la sauvegarde.
    const missing = GS.UNITS.filter((u) => u.starter && !S.ownedById(u.id));
    for (const u of missing) S.addUnit(u.id);
    if (missing.length) S.save();
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

  S.stats = (u) => GS.unitStats(GS.UNIT[u.id], u.level, u.awaken);
  S.power = (u) => GS.unitPower(GS.UNIT[u.id], u.level, u.awaken);
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
