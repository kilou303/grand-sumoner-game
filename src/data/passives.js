'use strict';
// Passifs (façon Grand Summoners) : bonus permanents des héros et des ennemis.
// Un héros a jusqu'à 5 passifs innés (le 1er est unique, les suivants se débloquent avec le
// niveau) + le passif de chacune de ses 3 pièces d'équipement. Les ennemis ont des passifs
// fixes selon leur type, les boss un passif unique en plus.
//
// Effets (fx), tous cumulables :
//   atk, def, hp (%)        spd, mp (valeurs)       crit, critDmg (%)
//   dmg (% dégâts infligés)  dmgTaken (% dégâts subis en moins, négatif = en plus)
//   boss (% contre les boss) lowHp (% sous 50% PV)   fullHp (% à PV max)
//   vs_<élément> (% contre)  res_<élément> (% subis en moins)
//   regen (% PV / tour)      mpRegen (MP / tour)     sp, sl (% de remplissage des jauges)
//   drain (% vol de vie)     thorns (% renvoyés)     dodge (% esquive)  guts (survit 1 fois)
//   resist (% résiste aux altérations)  affl (% chance d'altération en plus)  heal (% soins)
//   killHeal (% PV par ennemi vaincu)   killSp (jauge SP par ennemi vaincu)
//   ct (agit plus tôt au début du combat)  gold (% or des quêtes)  start: [[statut, tours]]
(function () {
  const P = (GS.Passives = {});

  P.RARITY = {
    common: { name: 'Commun', color: '#b4bcc8', rank: 0 },
    rare: { name: 'Rare', color: '#5aa8ff', rank: 1 },
    epic: { name: 'Épique', color: '#c070ff', rank: 2 },
    legendary: { name: 'Légendaire', color: '#ffc83a', rank: 3 },
    unique: { name: 'Unique', color: '#ff70d0', rank: 4 },
  };
  P.TIERS = ['common', 'rare', 'epic', 'legendary'];
  // Niveau requis pour chacun des 5 passifs innés.
  P.UNLOCK = [1, 1, 10, 20, 30];
  P.MAX = 5;

  const D = (GS.PASSIVES = {});
  const add = (id, name, rarity, fx) => (D[id] = { id, name, rarity, fx });

  // ------------------------------------------------------------ génériques (héros, équipement)
  const tiers = (base, names, key, vals) => names.forEach((n, i) => n && add(base + i, n, P.TIERS[i], { [key]: vals[i] }));
  tiers('atk', ['Force', 'Puissance', 'Vigueur Héroïque', 'Force Titanesque'], 'atk', [0.05, 0.1, 0.15, 0.22]);
  tiers('def', ['Robustesse', 'Cuirasse', 'Forteresse', 'Égide Divine'], 'def', [0.06, 0.12, 0.18, 0.26]);
  tiers('hp', ['Endurance', 'Vitalité', 'Constitution', 'Cœur Immortel'], 'hp', [0.06, 0.12, 0.18, 0.26]);
  tiers('spd', ['Agilité', 'Célérité', 'Vitesse du Vent'], 'spd', [3, 6, 10]);
  tiers('crit', ['Précision', 'Œil Aiguisé', 'Instinct Mortel'], 'crit', [0.03, 0.06, 0.1]);
  tiers('critdmg', [null, 'Frappe Lourde', 'Coup Fatal'], 'critDmg', [0, 0.2, 0.35]);
  tiers('boss', [null, 'Chasseur', 'Tueur de Géants'], 'boss', [0, 0.12, 0.22]);
  tiers('dodge', ['Pas Léger', 'Insaisissable', 'Danse des Ombres'], 'dodge', [0.05, 0.1, 0.15]);
  tiers('resist', ['Volonté', 'Esprit Clair', "Âme d'Acier"], 'resist', [0.15, 0.3, 0.5]);
  tiers('mpregen', ['Méditation', 'Flux Mystique', 'Source Infinie'], 'mpRegen', [3, 6, 10]);
  tiers('sp', [null, 'Ardeur', 'Fougue'], 'sp', [0, 0.15, 0.3]);
  tiers('sl', [null, 'Éveil Latent', 'Transcendance'], 'sl', [0, 0.12, 0.25]);
  tiers('drain', [null, 'Soif', 'Vampirisme'], 'drain', [0, 0.05, 0.1]);
  tiers('regen', [null, 'Récupération', 'Régénération'], 'regen', [0, 0.03, 0.05]);
  tiers('gold', [null, 'Fortune', 'Trésorier'], 'gold', [0, 0.1, 0.2]);
  tiers('heal', [null, 'Main Bénie', 'Grâce Divine'], 'heal', [0, 0.2, 0.35]);
  add('thorns1', 'Épines', 'rare', { thorns: 0.15 });
  add('killheal1', 'Festin', 'rare', { killHeal: 0.1 });
  add('killsp', 'Élan', 'epic', { killSp: 20 });
  add('ct1', 'Initiative', 'rare', { ct: 0.3 });
  add('affl2', 'Malédiction', 'epic', { affl: 0.3 });
  add('fullhp1', 'Assurance', 'rare', { fullHp: 0.15 });
  add('guts', 'Ténacité', 'legendary', { guts: 1 });
  add('berserk', 'Berserk', 'legendary', { lowHp: 0.4, atk: 0.1 });
  add('phenix', 'Flamme du Phénix', 'legendary', { guts: 1, regen: 0.03 });
  add('benediction', 'Bénédiction', 'legendary', { start: [['atkUp', 2], ['defUp', 2]], hp: 0.08 });
  add('transcend', 'Transcendance Céleste', 'legendary', { sl: 0.3, sp: 0.2 });
  const EL = {
    fire: ['Briseur de Flammes', 'Ignifuge'],
    water: ['Assèche-Flots', 'Imperméable'],
    earth: ['Fend-Roc', 'Enraciné'],
    light: ['Voile-Lumière', 'Ombrageux'],
    dark: ['Chasse-Ombre', 'Lumineux'],
  };
  for (const [el, [vs, res]] of Object.entries(EL)) {
    add('vs_' + el + '1', vs, 'rare', { ['vs_' + el]: 0.15 });
    add('vs_' + el + '2', vs + ' +', 'epic', { ['vs_' + el]: 0.25 });
    add('res_' + el + '1', res, 'rare', { ['res_' + el]: 0.15 });
    add('res_' + el + '2', res + ' +', 'epic', { ['res_' + el]: 0.25 });
  }

  // ------------------------------------------------------------ uniques des héros
  const U = (id, name, fx) => add('u_' + id, name, 'unique', fx);
  U('djegui', "Œil de l'Éclipse", { dmg: 0.15, lowHp: 0.25, crit: 0.05 });
  U('azura', 'Houle Intérieure', { spd: 10, dodge: 0.1, sp: 0.2 });
  U('kaelen', 'Fragment Solaire', { atk: 0.15, start: [['atkUp', 2]] });
  U('nyx', 'Faux du Temps', { ct: 0.5, critDmg: 0.3 });
  U('ignara', 'Cœur Volcanique', { dmg: 0.2, affl: 0.25 });
  U('thalassa', 'Bénédiction des Marées', { heal: 0.3, regen: 0.03 });
  U('gaius', 'Peau de Jade', { dmgTaken: 0.15, thorns: 0.2 });
  U('rook', 'Rempart de Fer', { def: 0.2, dmgTaken: 0.1 });
  U('mira', 'Œil du Faucon', { crit: 0.12, critDmg: 0.1 });
  U('zeph', 'Pas Fantôme', { dodge: 0.15, ct: 0.2 });
  U('brann', 'Furie Écarlate', { lowHp: 0.35, atk: 0.05 });
  U('coralie', 'Riposte des Flots', { thorns: 0.15, spd: 6 });
  U('pip', 'Étincelle', { affl: 0.2, dmg: 0.05 });
  U('lina', 'Prière Novice', { heal: 0.2, resist: 0.1 });
  U('toran', 'Garde Vigilante', { def: 0.12, start: [['defUp', 2]] });
  U('sly', 'Doigts Agiles', { gold: 0.15, spd: 5 });
  U('mael', 'Harpon Lesté', { boss: 0.15, atk: 0.05 });
  U('elwin', 'Instinct Sylvestre', { regen: 0.03, crit: 0.04 });
  U('kenji', "L'Œil Voilé", { crit: 0.15, critDmg: 0.25 });
  U('yuna', 'Lame Pourpre', { drain: 0.1, killSp: 15 });
  U('malik', "Poings d'Acier", { def: 0.15, thorns: 0.15 });
  U('iris', 'Pare-Feu', { resist: 0.3, mpRegen: 5 });
  U('dante', 'Pacte Maudit', { dmg: 0.2, dmgTaken: -0.1 });
  U('leo', 'Coup de Circuit', { critDmg: 0.3, crit: 0.03 });
  U('nina', 'Loi de la Rue', { gold: 0.1, affl: 0.1 });

  // Passifs innés de chaque héros (l'unique d'abord). ★5 : 5, ★4 : 4, ★3 : 3.
  GS.HERO_PASSIVES = {
    djegui: ['u_djegui', 'atk2', 'critdmg2', 'killsp', 'guts'],
    azura: ['u_azura', 'dodge1', 'spd2', 'drain1', 'vs_fire2'],
    kaelen: ['u_kaelen', 'boss2', 'crit2', 'atk2', 'sl2'],
    nyx: ['u_nyx', 'affl2', 'crit2', 'spd2', 'dodge1'],
    ignara: ['u_ignara', 'atk2', 'mpregen2', 'vs_earth2', 'sl2'],
    thalassa: ['u_thalassa', 'hp2', 'resist2', 'mpregen2', 'res_fire2'],
    gaius: ['u_gaius', 'hp2', 'def2', 'resist2', 'guts'],
    kenji: ['u_kenji', 'atk2', 'boss2', 'dodge1', 'sl2'],
    yuna: ['u_yuna', 'spd2', 'crit2', 'atk2', 'guts'],
    rook: ['u_rook', 'hp1', 'thorns1', 'resist1'],
    mira: ['u_mira', 'critdmg1', 'boss1', 'spd1'],
    zeph: ['u_zeph', 'ct1', 'crit1', 'spd1'],
    brann: ['u_brann', 'drain1', 'atk1', 'killheal1'],
    coralie: ['u_coralie', 'dodge1', 'crit1', 'sp1'],
    malik: ['u_malik', 'hp1', 'resist1', 'def1'],
    iris: ['u_iris', 'heal1', 'hp1', 'sp1'],
    dante: ['u_dante', 'drain1', 'crit1', 'vs_light1'],
    pip: ['u_pip', 'atk0', 'mpregen0'],
    lina: ['u_lina', 'hp0', 'resist0'],
    toran: ['u_toran', 'hp0', 'def0'],
    sly: ['u_sly', 'crit0', 'dodge0'],
    mael: ['u_mael', 'atk0', 'vs_fire1'],
    elwin: ['u_elwin', 'spd0', 'atk0'],
    leo: ['u_leo', 'atk0', 'hp0'],
    nina: ['u_nina', 'spd0', 'crit0'],
  };
  for (const u of GS.UNITS) u.passives = (GS.HERO_PASSIVES[u.id] || []).slice(0, P.MAX);

  // ------------------------------------------------------------ ennemis
  add('e_carapace', 'Carapace', 'common', { def: 0.15 });
  add('e_thick', 'Peau Épaisse', 'common', { hp: 0.15 });
  add('e_swift', 'Vif', 'common', { spd: 8 });
  add('e_thug', 'Bagarreur', 'common', { atk: 0.1 });
  add('e_frenzy', 'Frénésie', 'rare', { lowHp: 0.3 });
  add('e_venom', 'Venimeux', 'rare', { affl: 0.3 });
  add('e_regen', 'Chair Maudite', 'rare', { regen: 0.04 });
  add('e_ward', 'Sceau Protecteur', 'rare', { resist: 0.3 });
  add('b_devoreur', 'Faim Insatiable', 'unique', { drain: 0.2, killHeal: 0.2 });
  add('b_pendue', 'Lamentations', 'unique', { dodge: 0.15, affl: 0.3 });
  add('b_mille', 'Mille Carapaces', 'unique', { dmgTaken: 0.2, thorns: 0.1 });
  add('b_vorgath', 'Roi des Fléaux', 'unique', { dmg: 0.15, resist: 0.5, guts: 1 });
  GS.ENEMY_PASSIVES = {
    larve: ['e_thick'],
    rampant: ['e_swift', 'e_frenzy'],
    oeil: ['dodge1', 'e_venom'],
    gueule: ['e_thick', 'drain1'],
    chien: ['e_swift', 'e_frenzy'],
    pendu: ['e_regen', 'e_carapace'],
    voyou: ['e_thug'],
    cogneur: ['e_thug', 'e_carapace'],
    surineur: ['dodge1', 'e_venom'],
    sectaire: ['e_ward', 'heal1'],
    exorciste: ['crit1', 'e_ward', 'vs_dark1'],
    devoreur: ['b_devoreur', 'e_thick', 'e_frenzy'],
    pendue: ['b_pendue', 'e_regen', 'resist1'],
    millepattes: ['b_mille', 'e_swift', 'e_carapace'],
    vorgath: ['b_vorgath', 'e_regen', 'e_frenzy', 'crit1'],
  };

  // ------------------------------------------------------------ calcul
  // Additionne les effets d'une liste d'identifiants de passifs.
  P.mods = (ids) => {
    const m = { start: [] };
    for (const id of ids || []) {
      const p = D[id];
      if (!p) continue;
      for (const [k, v] of Object.entries(p.fx)) {
        if (k === 'start') m.start.push(...v);
        else m[k] = (m[k] || 0) + v;
      }
    }
    return m;
  };
  // Valeur d'un effet (0 si absent).
  P.get = (m, k) => (m && m[k]) || 0;

  // ------------------------------------------------------------ description
  const pct = (v) => Math.round(v * 100) + '%';
  const sgn = (v) => (v >= 0 ? '+' : '-');
  const ELN = (el) => GS.EL[el].name;
  const LABEL = {
    atk: (v) => `ATQ ${sgn(v)}${pct(Math.abs(v))}`,
    def: (v) => `DÉF ${sgn(v)}${pct(Math.abs(v))}`,
    hp: (v) => `PV ${sgn(v)}${pct(Math.abs(v))}`,
    spd: (v) => `VIT +${v}`,
    mp: (v) => `MP +${v}`,
    crit: (v) => `Critique +${pct(v)}`,
    critDmg: (v) => `Dégâts critiques +${pct(v)}`,
    dmg: (v) => `Dégâts +${pct(v)}`,
    dmgTaken: (v) => (v >= 0 ? `Dégâts subis -${pct(v)}` : `Dégâts subis +${pct(-v)}`),
    boss: (v) => `Dégâts aux boss +${pct(v)}`,
    lowHp: (v) => `Dégâts +${pct(v)} sous 50% PV`,
    fullHp: (v) => `Dégâts +${pct(v)} à PV max`,
    regen: (v) => `Régénère ${pct(v)} PV/tour`,
    mpRegen: (v) => `+${v} MP/tour`,
    sp: (v) => `Jauge SP +${pct(v)}`,
    sl: (v) => `Jauge OL +${pct(v)}`,
    drain: (v) => `Vol de vie ${pct(v)}`,
    thorns: (v) => `Renvoie ${pct(v)} des dégâts`,
    dodge: (v) => `Esquive ${pct(v)}`,
    guts: () => 'Survit une fois à un coup fatal',
    resist: (v) => `Résiste aux altérations ${pct(v)}`,
    affl: (v) => `Altérations +${pct(v)}`,
    heal: (v) => `Soins +${pct(v)}`,
    killHeal: (v) => `Ennemi vaincu : soigne ${pct(v)} PV`,
    killSp: (v) => `Ennemi vaincu : jauge SP +${v}`,
    ct: (v) => `Agit plus tôt (+${pct(v)})`,
    gold: (v) => `Or des quêtes +${pct(v)}`,
  };
  const describe = (fx) => {
    const out = [];
    for (const [k, v] of Object.entries(fx)) {
      if (k === 'start') out.push('Début : ' + v.map(([s, t]) => `${GS.STATUS[s].short} (${t} t.)`).join(' '));
      else if (k.startsWith('vs_')) out.push(`Dégâts contre ${ELN(k.slice(3))} +${pct(v)}`);
      else if (k.startsWith('res_')) out.push(`Dégâts de ${ELN(k.slice(4))} subis -${pct(v)}`);
      else if (LABEL[k]) out.push(LABEL[k](v));
    }
    return out.join(' · ');
  };
  P.desc = (id) => {
    const p = D[id];
    if (!p) return '';
    return p.desc || (p.desc = describe(p.fx));
  };
  P.color = (id, t = 0) => {
    const p = D[id];
    if (!p) return '#ffffff';
    return p.rarity === 'unique' ? GS.rainbow(t) : P.RARITY[p.rarity].color;
  };
})();
