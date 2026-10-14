'use strict';
// Éléments (triangle Feu > Terre > Eau > Feu, Lumière <-> Ténèbres) et raretés.
(function () {
  GS.EL = {
    fire: { id: 'fire', name: 'Feu', color: '#ff6a3a', dark: '#a02818', light: '#ffc080', beats: 'earth' },
    water: { id: 'water', name: 'Eau', color: '#3ea8ff', dark: '#1848a0', light: '#a0e0ff', beats: 'fire' },
    earth: { id: 'earth', name: 'Terre', color: '#70d050', dark: '#2a7020', light: '#c8f0a0', beats: 'water' },
    light: { id: 'light', name: 'Lumière', color: '#ffe060', dark: '#b08820', light: '#fffbe0', beats: 'dark' },
    dark: { id: 'dark', name: 'Ténèbres', color: '#b464ff', dark: '#502080', light: '#e0c0ff', beats: 'light' },
  };
  GS.EL_ORDER = ['fire', 'water', 'earth', 'light', 'dark'];

  // Multiplicateur élémentaire de l'attaquant contre le défenseur.
  GS.elemMult = (atk, def) => {
    if (!atk || !def) return 1;
    if (GS.EL[atk].beats === def) return 1.5;
    if (GS.EL[def].beats === atk && atk !== 'light' && atk !== 'dark') return 0.75;
    return 1;
  };

  GS.RARITY = {
    3: { name: 'Rare', color: '#5aa8ff', glow: '#c8e4ff', maxLv: 40 },
    4: { name: 'Épique', color: '#ffc83a', glow: '#fff0b0', maxLv: 60 },
    5: { name: 'Légendaire', color: '#ff70d0', glow: '#ffffff', maxLv: 80, rainbow: true },
    // carte unique : Djegui, la plus rare et la plus puissante du jeu
    6: { name: 'Mythique', color: '#ff2a3a', glow: '#ffb0b8', maxLv: 100, mythic: true },
  };

  GS.ROLES = {
    attaquant: { name: 'Attaquant', hp: 1.0, atk: 1.12, def: 1.0, spd: 100 },
    mage: { name: 'Mage', hp: 0.85, atk: 1.22, def: 0.82, spd: 97 },
    tank: { name: 'Gardien', hp: 1.32, atk: 0.85, def: 1.38, spd: 88 },
    soutien: { name: 'Soutien', hp: 0.95, atk: 0.88, def: 1.0, spd: 105 },
    vitesse: { name: 'Assassin', hp: 0.86, atk: 1.02, def: 0.86, spd: 120 },
  };

  // Écarlate pulsant (★6 Mythique) : du rouge sang au rouge vif presque blanc.
  GS.mythic = (t, off = 0) => {
    const p = (Math.sin(t * 5 + off * 0.05) + 1) / 2;
    return `hsl(${352 + p * 6},100%,${42 + p * 26}%)`;
  };

  // Couleur arc-en-ciel animée (★5).
  GS.rainbow = (t, off = 0) => {
    const h = ((t * 120 + off) % 360 + 360) % 360;
    return `hsl(${h},100%,70%)`;
  };

  // Libellés des effets de statut.
  GS.STATUS = {
    burn: { name: 'Brûlure', short: 'BRÛ', color: '#ff7030', bad: true },
    poison: { name: 'Poison', short: 'PSN', color: '#a050e0', bad: true },
    stun: { name: 'Étourdi', short: 'ÉTO', color: '#ffe040', bad: true },
    atkUp: { name: 'ATQ +', short: 'ATQ↑', color: '#ff6060' },
    atkDown: { name: 'ATQ -', short: 'ATQ↓', color: '#806080', bad: true },
    defUp: { name: 'DÉF +', short: 'DÉF↑', color: '#60a0ff' },
    defDown: { name: 'DÉF -', short: 'DÉF↓', color: '#806080', bad: true },
    spdUp: { name: 'VIT +', short: 'VIT↑', color: '#60ffb0' },
    regen: { name: 'Régénération', short: 'RÉG', color: '#60f080' },
    taunt: { name: 'Provocation', short: 'PRO', color: '#ffa040' },
    critUp: { name: 'Critique +', short: 'CRI↑', color: '#ffe060' },
  };
})();
