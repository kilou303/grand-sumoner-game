'use strict';
// Héros invocables (personnages originaux).
// Compétences : target = enemy | enemies | ally | allies | self ;
// anim = melee | thrust | spin | ranged | magic | support ; fx = effet visuel.
(function () {
  const e = (type, turns = 3, chance = 1, target) => ({ type, turns, chance, target });

  GS.UNITS = [
    // ============================================================ HÉROS PRINCIPAL
    {
      id: 'djegui',
      name: 'Djegui',
      title: "L'Ombre Écarlate",
      rarity: 5,
      element: 'dark',
      role: 'attaquant',
      starter: true,
      noGacha: true,
      fxColor: '#ff2a3a',
      lore: "Un gamin des quartiers, capuche toujours relevée. Depuis la nuit de l'Éclipse, ses yeux brillent de rouge et une force obscure dort dans ses poings.",
      rig: () => GS.Djegui.rig(),
      look: { hair: 'hood', body: 'coat', weapon: 'none', colors: { hair: '#e8e4f0', cape: '#e8e4f0', main: '#e8e4f0', skin: '#5a3426', eye: '#ff2a3a' } },
      attack: { hits: 3, anim: 'brawl', fx: 'punch' },
      skills: [
        { name: 'Poing Spectral', mp: 30, target: 'enemy', anim: 'brawl', fx: 'dark', power: 2.1, hits: 4, desc: "Rafale de coups chargés d'ombre rouge." },
        { name: 'Regard Écarlate', mp: 35, target: 'enemies', anim: 'magic', fx: 'gaze', power: 0.7, hits: 1, effects: [e('atkDown', 3, 0.7), e('defDown', 3, 0.5)], desc: 'Ses yeux rouges glacent les ennemis : ATQ↓ et DÉF↓.' },
      ],
      special: { name: 'Rafale Écarlate', target: 'enemy', anim: 'brawl', fx: 'dark', power: 3.9, hits: 6, crit: 0.2, desc: 'Enchaînement de 6 coups, uppercut final.' },
      overlimit: { name: "Éveil de l'Ombre", target: 'enemies', anim: 'power', fx: 'void', power: 5.6, hits: 6, delay: 30, desc: "L'aura rouge se libère : dégâts massifs sur tous les ennemis." },
    },

    // ============================================================ ★5
    {
      id: 'kaelen',
      name: 'Kaelen',
      title: 'Lame Solaire',
      rarity: 5,
      element: 'light',
      role: 'attaquant',
      lore: "Chevalier errant dont l'épée a absorbé un fragment de soleil. Il jure de ramener l'aube sur Astralis.",
      look: { hair: 'spiky', body: 'armor', weapon: 'sword', cape: 'cape', colors: { hair: '#fff2b8', metal: '#f4e4b0', main: '#2f4fb8', trim: '#ffd040', cape: '#e03848', eye: '#3aa0ff' } },
      attack: { hits: 2, anim: 'melee', fx: 'slash' },
      skills: [
        { name: 'Taille Radieuse', mp: 30, target: 'enemy', anim: 'melee', fx: 'light', power: 1.9, hits: 3, desc: 'Triple entaille de lumière sur un ennemi.' },
        { name: 'Serment du Héros', mp: 45, target: 'allies', anim: 'support', fx: 'buff', effects: [e('atkUp', 3)], desc: "Augmente l'ATQ de toute l'équipe (3 tours)." },
      ],
      special: { name: 'Éclat Solaire', target: 'enemy', anim: 'melee', fx: 'light', power: 3.6, hits: 5, crit: 0.2, desc: 'Combo de 5 coups lumineux, critiques fréquents.' },
      overlimit: { name: "Jugement de l'Aube", target: 'enemies', anim: 'magic', fx: 'pillars', power: 5.2, hits: 6, effects: [e('atkUp', 3, 1, 'allies')], desc: "Colonnes de lumière sur tous les ennemis + ATQ↑ à l'équipe." },
    },
    {
      id: 'nyx',
      name: 'Nyx',
      title: 'Faucheuse Astrale',
      rarity: 5,
      element: 'dark',
      role: 'vitesse',
      lore: 'Gardienne des âmes égarées entre les étoiles. Sa faux tranche même le temps.',
      look: { hair: 'long', body: 'coat', weapon: 'scythe', colors: { hair: '#6a44b8', main: '#2a2240', second: '#b03060', trim: '#d0b0ff', eye: '#ff3a7a', skin: '#f8dccc', metal: '#d8d0ff', accent: '#ff60c0' } },
      attack: { hits: 2, anim: 'melee', fx: 'slash' },
      skills: [
        { name: 'Faux Spectrale', mp: 35, target: 'enemies', anim: 'spin', fx: 'dark', power: 1.3, hits: 2, effects: [e('poison', 3, 0.5)], desc: 'Fauche tous les ennemis, 50% de poison.' },
        { name: "Pas d'Ombre", mp: 30, target: 'self', anim: 'support', fx: 'buff', effects: [e('spdUp', 3), e('critUp', 3)], desc: 'VIT↑ et CRITIQUE↑ pour soi (3 tours).' },
      ],
      special: { name: "Croissant d'Ombre", target: 'enemy', anim: 'melee', fx: 'dark', power: 3.9, hits: 4, effects: [e('defDown', 3)], desc: 'Coups de faux dévastateurs + DÉF↓.' },
      overlimit: { name: 'Éclipse Éternelle', target: 'enemies', anim: 'magic', fx: 'void', power: 5.4, hits: 5, delay: 25, desc: "Un trou noir engloutit l'ennemi et retarde ses tours." },
    },
    {
      id: 'ignara',
      name: 'Ignara',
      title: 'Reine des Braises',
      rarity: 5,
      element: 'fire',
      role: 'mage',
      lore: 'Héritière du royaume volcanique. Quand elle se met en colère, les montagnes entrent en éruption.',
      look: { hair: 'ponytail', body: 'robe', weapon: 'staff', colors: { hair: '#ff5a2a', main: '#b0203a', second: '#ffc050', trim: '#ffd060', eye: '#ffa020', accent: '#ff8030' } },
      attack: { hits: 1, anim: 'magic', fx: 'fire' },
      skills: [
        { name: 'Boule de Feu', mp: 30, target: 'enemy', anim: 'magic', fx: 'fire', power: 2.1, hits: 1, effects: [e('burn', 3, 0.6)], desc: 'Projectile ardent, 60% de brûlure.' },
        { name: 'Mur de Flammes', mp: 50, target: 'enemies', anim: 'magic', fx: 'fire', power: 1.45, hits: 2, effects: [e('burn', 3, 0.4)], desc: 'Embrase tous les ennemis, 40% de brûlure.' },
      ],
      special: { name: 'Météore', target: 'enemies', anim: 'magic', fx: 'meteor', power: 3.1, hits: 3, desc: "Fait pleuvoir des météores sur l'ennemi." },
      overlimit: { name: 'Supernova', target: 'enemies', anim: 'magic', fx: 'nova', power: 5.6, hits: 4, effects: [e('burn', 3, 1)], desc: 'Explosion stellaire : énormes dégâts et brûlure garantie.' },
    },
    {
      id: 'thalassa',
      name: 'Thalassa',
      title: 'Prêtresse des Marées',
      rarity: 5,
      element: 'water',
      role: 'soutien',
      lore: "Voix de l'océan, elle apaise les blessures et noie ses ennemis sous des vagues sacrées.",
      look: { hair: 'long', body: 'robe', weapon: 'spear', colors: { hair: '#62c0ff', main: '#f2f6ff', second: '#3a80d8', trim: '#40d0ff', eye: '#2a70d0', metal: '#c0f0ff', cape: '#3a80d8', accent: '#80f0ff' } },
      attack: { hits: 2, anim: 'thrust', fx: 'slash' },
      skills: [
        { name: 'Marée Curative', mp: 40, target: 'allies', anim: 'support', fx: 'heal', heal: 1.5, desc: "Soigne toute l'équipe." },
        { name: 'Lance Abyssale', mp: 30, target: 'enemy', anim: 'thrust', fx: 'water', power: 2.0, hits: 2, delay: 20, desc: 'Transperce un ennemi et retarde son tour.' },
      ],
      special: { name: 'Tsunami', target: 'enemies', anim: 'magic', fx: 'tsunami', power: 2.9, hits: 3, effects: [e('defDown', 3)], desc: 'Une vague géante frappe tous les ennemis + DÉF↓.' },
      overlimit: { name: 'Chant des Abysses', target: 'enemies', anim: 'magic', fx: 'tsunami', power: 4.0, hits: 4, heal: 2.2, effects: [e('regen', 3, 1, 'allies')], desc: "Dégâts massifs, soin complet et régénération pour l'équipe." },
    },
    {
      id: 'gaius',
      name: 'Gaïus',
      title: 'Titan de Jade',
      rarity: 5,
      element: 'earth',
      role: 'tank',
      lore: 'Dernier des géants de pierre. Son marteau a forgé les montagnes du continent.',
      look: { hair: 'mane', body: 'heavy', weapon: 'hammer', colors: { hair: '#3f8a3a', main: '#5f8a48', second: '#6a4a30', skin: '#c88a60', eye: '#50e070', metal: '#a0f0b0', trim: '#e0c060', boots: '#4a3828', accent: '#60ff90' } },
      attack: { hits: 1, anim: 'melee', fx: 'heavy' },
      skills: [
        { name: 'Séisme', mp: 40, target: 'enemies', anim: 'magic', fx: 'quake', power: 1.5, hits: 2, effects: [e('stun', 1, 0.25)], desc: 'Frappe le sol : tous les ennemis, 25% étourdissement.' },
        { name: 'Rempart de Jade', mp: 35, target: 'allies', anim: 'support', fx: 'shield', effects: [e('defUp', 3), e('taunt', 2, 1, 'self')], desc: "DÉF↑ pour l'équipe et attire les attaques." },
      ],
      special: { name: 'Poing Tellurique', target: 'enemy', anim: 'melee', fx: 'quake', power: 3.6, hits: 1, effects: [e('stun', 1, 0.5)], desc: 'Coup colossal, 50% étourdissement.' },
      overlimit: { name: 'Colère de Gaïa', target: 'enemies', anim: 'magic', fx: 'quake', power: 5.0, hits: 3, effects: [e('defUp', 3, 1, 'allies')], desc: 'Les montagnes se soulèvent + DÉF↑ équipe.' },
    },

    // ============================================================ ★4
    {
      id: 'rook',
      name: 'Rook',
      title: 'Chevalier de Fer',
      rarity: 4,
      element: 'earth',
      role: 'tank',
      lore: "Capitaine de la garde royale. Son armure n'a jamais été percée.",
      look: { hair: 'helmet', body: 'armor', weapon: 'sword', cape: 'cape', colors: { metal: '#b8c4d8', main: '#3a7a40', trim: '#e0c050', cape: '#2f6a38', eye: '#40a040' } },
      attack: { hits: 2, anim: 'melee', fx: 'slash' },
      skills: [
        { name: 'Coup de Bouclier', mp: 30, target: 'enemy', anim: 'melee', fx: 'heavy', power: 1.5, hits: 1, effects: [e('stun', 1, 0.35)], desc: '35% de chances d’étourdir.' },
        { name: 'Provocation', mp: 25, target: 'self', anim: 'support', fx: 'shield', effects: [e('taunt', 2), e('defUp', 3)], desc: 'Attire les attaques ennemies, DÉF↑.' },
      ],
      special: { name: 'Lame de Fer', target: 'enemy', anim: 'melee', fx: 'earth', power: 3.0, hits: 3, desc: 'Puissante série de coups.' },
      overlimit: { name: 'Forteresse', target: 'enemies', anim: 'spin', fx: 'quake', power: 4.0, hits: 3, effects: [e('defUp', 3, 1, 'allies')], desc: 'Onde de choc sur tous + DÉF↑ équipe.' },
    },
    {
      id: 'mira',
      name: 'Mira',
      title: 'Archère du Vent',
      rarity: 4,
      element: 'light',
      role: 'attaquant',
      lore: "Chasseresse des plaines célestes, elle ne rate jamais sa cible, même à mille pas.",
      look: { hair: 'bob', body: 'tunic', weapon: 'bow', colors: { hair: '#f4d468', main: '#f0eee0', second: '#7a5a38', trim: '#60c070', eye: '#40a0e0', boots: '#6a4a30' } },
      attack: { hits: 2, anim: 'ranged', fx: 'arrow' },
      skills: [
        { name: 'Flèche Perçante', mp: 30, target: 'enemy', anim: 'ranged', fx: 'arrow', power: 2.0, hits: 1, effects: [e('defDown', 3)], desc: 'Tir puissant qui réduit la DÉF.' },
        { name: 'Pluie de Flèches', mp: 45, target: 'enemies', anim: 'ranged', fx: 'arrows', power: 1.35, hits: 4, desc: 'Une volée de flèches sur tous les ennemis.' },
      ],
      special: { name: 'Tir Céleste', target: 'enemy', anim: 'ranged', fx: 'beam', power: 3.3, hits: 3, desc: 'Une flèche de lumière pure.' },
      overlimit: { name: 'Constellation', target: 'enemies', anim: 'ranged', fx: 'arrows', power: 4.3, hits: 8, desc: 'Des étoiles filantes criblent les ennemis.' },
    },
    {
      id: 'zeph',
      name: 'Zeph',
      title: 'Ninja Fantôme',
      rarity: 4,
      element: 'dark',
      role: 'vitesse',
      lore: "Membre d'un clan disparu. On dit qu'il frappe avant même d'avoir dégainé.",
      look: { hair: 'hood', body: 'coat', weapon: 'dagger', scarf: true, colors: { hair: '#3a3a5a', main: '#2c2c44', second: '#4a4a6a', cape: '#5a3a80', trim: '#a080ff', eye: '#c040ff', boots: '#20202c' } },
      attack: { hits: 3, anim: 'melee', fx: 'slash' },
      skills: [
        { name: 'Kunaï Empoisonné', mp: 25, target: 'enemy', anim: 'ranged', fx: 'kunai', power: 1.6, hits: 3, effects: [e('poison', 3, 0.8)], desc: '80% de chances d’empoisonner.' },
        { name: 'Danse des Ombres', mp: 40, target: 'enemy', anim: 'melee', fx: 'dark', power: 2.3, hits: 6, desc: 'Six coups éclair sur un ennemi.' },
      ],
      special: { name: 'Assassinat', target: 'enemy', anim: 'melee', fx: 'dark', power: 3.7, hits: 2, crit: 0.5, desc: 'Frappe vitale : 50% de critique en plus.' },
      overlimit: { name: 'Mille Lames', target: 'enemies', anim: 'spin', fx: 'blades', power: 4.2, hits: 10, desc: 'Une tempête de lames sur tous les ennemis.' },
    },
    {
      id: 'brann',
      name: 'Brann',
      title: 'Berserker Écarlate',
      rarity: 4,
      element: 'fire',
      role: 'attaquant',
      lore: 'Guerrier des terres du nord. Plus il est blessé, plus il frappe fort.',
      look: { hair: 'mane', body: 'heavy', weapon: 'axe', acc: 'headband', colors: { hair: '#d02828', main: '#7a3020', second: '#4a3a30', skin: '#e8a880', eye: '#ff8030', cape: '#202020', trim: '#c0a060', metal: '#d0d0d0' } },
      attack: { hits: 1, anim: 'melee', fx: 'heavy' },
      skills: [
        { name: 'Fendoir Ardent', mp: 30, target: 'enemy', anim: 'melee', fx: 'fire', power: 2.2, hits: 1, effects: [e('burn', 3, 0.5)], desc: '50% de brûlure.' },
        { name: 'Rage Sanguine', mp: 30, target: 'self', anim: 'support', fx: 'rage', effects: [e('atkUp', 3), e('critUp', 3)], desc: 'ATQ↑ et CRITIQUE↑ pour soi.' },
      ],
      special: { name: 'Tourbillon de Braise', target: 'enemies', anim: 'spin', fx: 'fire', power: 2.5, hits: 3, desc: 'Tournoie en enflammant tous les ennemis.' },
      overlimit: { name: 'Colère du Volcan', target: 'enemies', anim: 'magic', fx: 'meteor', power: 4.6, hits: 4, desc: 'Fait jaillir la lave sous les ennemis.' },
    },
    {
      id: 'coralie',
      name: 'Coralie',
      title: 'Duelliste des Flots',
      rarity: 4,
      element: 'water',
      role: 'vitesse',
      lore: "Escrimeuse pirate au sourire insolent. Sa rapière danse comme l'écume.",
      look: { hair: 'twintails', body: 'tunic', weapon: 'rapier', colors: { hair: '#40c8c8', main: '#2060a8', second: '#f0f0f0', trim: '#f0d060', eye: '#20a0a0', accent: '#ff6080', boots: '#3a2a20' } },
      attack: { hits: 3, anim: 'thrust', fx: 'slash' },
      skills: [
        { name: 'Estoc Glacé', mp: 25, target: 'enemy', anim: 'thrust', fx: 'water', power: 1.8, hits: 3, delay: 20, desc: 'Transperce et retarde le tour adverse.' },
        { name: 'Valse des Flots', mp: 40, target: 'allies', anim: 'support', fx: 'buff', effects: [e('spdUp', 3)], desc: "VIT↑ pour toute l'équipe." },
      ],
      special: { name: "Flèche d'Écume", target: 'enemy', anim: 'thrust', fx: 'water', power: 3.1, hits: 5, desc: 'Une rafale de coups d’estoc.' },
      overlimit: { name: 'Ballet Océanique', target: 'enemies', anim: 'magic', fx: 'tsunami', power: 4.1, hits: 5, desc: 'Une chorégraphie de vagues tranchantes.' },
    },

    // ============================================================ ★3
    {
      id: 'pip',
      name: 'Pip',
      title: 'Apprenti Pyromancien',
      rarity: 3,
      element: 'fire',
      role: 'mage',
      lore: "Jeune élève de l'académie de magie. Ses sorts explosent... parfois au bon endroit.",
      look: { hair: 'short', body: 'robe', weapon: 'staff', colors: { hair: '#8a5030', main: '#d86a20', second: '#f0d080', trim: '#ffe080', eye: '#a05020', accent: '#ff7020' } },
      attack: { hits: 1, anim: 'magic', fx: 'fire' },
      skills: [
        { name: 'Étincelle', mp: 25, target: 'enemy', anim: 'magic', fx: 'fire', power: 1.7, hits: 1, effects: [e('burn', 3, 0.3)], desc: '30% de brûlure.' },
        { name: 'Flammèches', mp: 40, target: 'enemies', anim: 'magic', fx: 'fire', power: 1.1, hits: 2, desc: 'Petites flammes sur tous les ennemis.' },
      ],
      special: { name: 'Grosse Boule de Feu', target: 'enemy', anim: 'magic', fx: 'fire', power: 2.7, hits: 1, desc: 'Une boule de feu (vraiment) grosse.' },
      overlimit: { name: 'Big Bang Junior', target: 'enemies', anim: 'magic', fx: 'nova', power: 3.5, hits: 3, desc: 'Explosion incontrôlée !' },
    },
    {
      id: 'lina',
      name: 'Lina',
      title: 'Novice du Temple',
      rarity: 3,
      element: 'light',
      role: 'soutien',
      lore: 'Prêtresse débutante, douce et courageuse. Sa prière soigne les cœurs.',
      look: { hair: 'bob', body: 'robe', weapon: 'staff', colors: { hair: '#f8e090', main: '#f8f4ec', second: '#e0a0c0', trim: '#f0c860', eye: '#e070a0', accent: '#ffe0f0' } },
      attack: { hits: 1, anim: 'magic', fx: 'light' },
      skills: [
        { name: 'Soin', mp: 25, target: 'ally', anim: 'support', fx: 'heal', heal: 2.2, desc: 'Soigne grandement un allié.' },
        { name: 'Prière', mp: 45, target: 'allies', anim: 'support', fx: 'heal', heal: 1.1, desc: "Soigne toute l'équipe." },
      ],
      special: { name: 'Lumière Sacrée', target: 'allies', anim: 'support', fx: 'heal', heal: 1.6, effects: [e('regen', 3)], desc: 'Soin de groupe + régénération.' },
      overlimit: { name: 'Miracle', target: 'allies', anim: 'support', fx: 'heal', heal: 2.5, revive: 0.4, desc: 'Ranime les alliés K.O. et soigne tout le monde.' },
    },
    {
      id: 'toran',
      name: 'Toran',
      title: 'Garde du Village',
      rarity: 3,
      element: 'earth',
      role: 'tank',
      lore: 'Fils de fermier devenu garde. Têtu comme un roc, fidèle comme un chien.',
      look: { hair: 'short', body: 'armor', weapon: 'spear', colors: { hair: '#5a3a22', metal: '#a0a8b8', main: '#6a8a40', trim: '#c0a060', eye: '#6a4a2a', cape: '#6a8a40' } },
      attack: { hits: 2, anim: 'thrust', fx: 'slash' },
      skills: [
        { name: 'Charge', mp: 25, target: 'enemy', anim: 'thrust', fx: 'earth', power: 1.8, hits: 1, desc: 'Charge lance en avant.' },
        { name: 'Garde Solide', mp: 25, target: 'self', anim: 'support', fx: 'shield', effects: [e('taunt', 2), e('defUp', 3)], desc: 'Attire les attaques, DÉF↑.' },
      ],
      special: { name: 'Lance Rocheuse', target: 'enemy', anim: 'thrust', fx: 'earth', power: 2.8, hits: 2, desc: 'Des pics de roche jaillissent.' },
      overlimit: { name: 'Muraille', target: 'enemies', anim: 'magic', fx: 'quake', power: 3.2, hits: 2, effects: [e('defUp', 3, 1, 'allies')], desc: 'Dégâts de zone + DÉF↑ équipe.' },
    },
    {
      id: 'sly',
      name: 'Sly',
      title: 'Voleur des Ruelles',
      rarity: 3,
      element: 'dark',
      role: 'vitesse',
      lore: 'Pickpocket au grand cœur. Il vole aux riches... et parfois aux monstres.',
      look: { hair: 'hood', body: 'tunic', weapon: 'dagger', colors: { hair: '#c08040', main: '#4a5a3a', second: '#3a3028', cape: '#3a4a30', trim: '#b09060', eye: '#a0e040', boots: '#2a2018' } },
      attack: { hits: 3, anim: 'melee', fx: 'slash' },
      skills: [
        { name: 'Vol à la Tire', mp: 20, target: 'enemy', anim: 'melee', fx: 'dark', power: 1.4, hits: 2, steal: true, desc: "Frappe et dérobe de l'or." },
        { name: 'Fumigène', mp: 35, target: 'enemies', anim: 'magic', fx: 'smoke', effects: [e('atkDown', 3)], desc: "Réduit l'ATQ de tous les ennemis." },
      ],
      special: { name: 'Coup Bas', target: 'enemy', anim: 'melee', fx: 'dark', power: 2.8, hits: 3, crit: 0.3, desc: 'Attaque sournoise, critique +30%.' },
      overlimit: { name: 'Grand Larcin', target: 'enemies', anim: 'spin', fx: 'blades', power: 3.4, hits: 6, steal: true, desc: 'Frappe tout le monde et rafle le butin.' },
    },
    {
      id: 'mael',
      name: 'Maël',
      title: 'Harponneur',
      rarity: 3,
      element: 'water',
      role: 'attaquant',
      lore: 'Pêcheur des côtes brumeuses. Il a déjà harponné un serpent de mer... selon lui.',
      look: { hair: 'short', body: 'tunic', weapon: 'spear', scarf: true, colors: { hair: '#2a3a5a', main: '#3a70a0', second: '#d8c8a0', trim: '#e0e0e0', cape: '#f0f0f0', eye: '#3060a0', skin: '#e8b890', boots: '#3a2a20' } },
      attack: { hits: 2, anim: 'thrust', fx: 'slash' },
      skills: [
        { name: 'Harpon', mp: 25, target: 'enemy', anim: 'ranged', fx: 'harpoon', power: 1.9, hits: 1, desc: 'Lance son harpon sur un ennemi.' },
        { name: 'Vague', mp: 40, target: 'enemies', anim: 'magic', fx: 'water', power: 1.2, hits: 2, desc: 'Une vague sur tous les ennemis.' },
      ],
      special: { name: 'Typhon', target: 'enemies', anim: 'magic', fx: 'tsunami', power: 2.6, hits: 3, desc: 'Une tempête marine.' },
      overlimit: { name: 'Marée Haute', target: 'enemies', anim: 'magic', fx: 'tsunami', power: 3.5, hits: 4, desc: 'La mer entière se soulève.' },
    },
    {
      id: 'elwin',
      name: 'Elwin',
      title: 'Ranger Sylvestre',
      rarity: 3,
      element: 'earth',
      role: 'attaquant',
      lore: 'Elfe protecteur des forêts. Il parle aux arbres, qui lui répondent rarement.',
      look: { hair: 'long', body: 'tunic', weapon: 'bow', acc: 'elf', colors: { hair: '#c8e870', main: '#3a7a3a', second: '#7a5a38', trim: '#c0e080', eye: '#40b040', boots: '#5a4028' } },
      attack: { hits: 2, anim: 'ranged', fx: 'arrow' },
      skills: [
        { name: 'Flèche Ronce', mp: 25, target: 'enemy', anim: 'ranged', fx: 'arrow', power: 1.8, hits: 1, effects: [e('poison', 3, 0.4)], desc: '40% de poison.' },
        { name: 'Volée', mp: 40, target: 'enemies', anim: 'ranged', fx: 'arrows', power: 1.15, hits: 3, desc: 'Plusieurs flèches sur tous les ennemis.' },
      ],
      special: { name: 'Tir Sylvestre', target: 'enemy', anim: 'ranged', fx: 'beam', power: 2.7, hits: 2, desc: 'Une flèche chargée de sève.' },
      overlimit: { name: 'Forêt Vivante', target: 'enemies', anim: 'magic', fx: 'quake', power: 3.4, hits: 3, desc: 'Les racines saisissent les ennemis.' },
    },
  ];

  GS.UNIT = {};
  for (const u of GS.UNITS) GS.UNIT[u.id] = u;

  // Statistiques au niveau donné (+6% par éveil).
  GS.unitStats = (def, level = 1, awaken = 0) => {
    const base = { 3: { hp: 1400, atk: 170, def: 80, mp: 120 }, 4: { hp: 1800, atk: 220, def: 100, mp: 150 }, 5: { hp: 2300, atk: 285, def: 125, mp: 200 } }[def.rarity];
    const role = GS.ROLES[def.role];
    const lv = 1 + 0.035 * (level - 1);
    const aw = 1 + 0.06 * awaken;
    return {
      hp: Math.round(base.hp * role.hp * lv * aw),
      atk: Math.round(base.atk * role.atk * lv * aw),
      def: Math.round(base.def * role.def * lv * aw),
      spd: Math.round(role.spd + awaken * 2 + (def.rarity - 3) * 3),
      mp: base.mp + awaken * 10,
    };
  };

  GS.unitPower = (def, level, awaken) => {
    const s = GS.unitStats(def, level, awaken);
    return Math.round(s.hp * 0.25 + s.atk * 2.2 + s.def * 1.5 + s.spd * 3);
  };
})();
