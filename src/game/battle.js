'use strict';
// Logique de combat : combattants, ordre des tours (vitesse), dégâts, statuts, IA.
(function () {
  const U = GS.U;
  const B = (GS.Battle = {});

  // Une "unité de tour" vaut 100 de CT pour une vitesse de 100.
  const TURN = 10000;

  class Fighter {
    constructor(o) {
      Object.assign(this, o);
      this.hp = this.maxHp;
      this.statuses = [];
      this.alive = true;
      this.ct = 0;
      // visuel
      this.x = this.homeX;
      this.y = this.homeY;
      this.offX = 0;
      this.offY = 0;
      this.sx = 1;
      this.sy = 1;
      this.rot = 0;
      this.alpha = 1;
      this.flash = 0;
      this.flashColor = '#ffffff';
      this.weaponRot = this.idleRot();
      this.hpGhost = 1;
      this.shownHp = this.hp;
      this.charging = null;
      this.ko = 0;
      this.flip = false;
      this.jump = 0;
    }
    get isHero() {
      return this.side === 'hero';
    }
    idleRot() {
      return this.isHero ? 0.35 : -0.35;
    }
    has(t) {
      return this.statuses.some((s) => s.type === t);
    }
    status(t) {
      return this.statuses.find((s) => s.type === t);
    }
    effAtk() {
      let m = 1;
      if (this.has('atkUp')) m += 0.3;
      if (this.has('atkDown')) m -= 0.3;
      if (this.enraged) m += 0.25;
      return this.atk * m;
    }
    effDef() {
      let m = 1;
      if (this.has('defUp')) m += 0.45;
      if (this.has('defDown')) m -= 0.35;
      return this.def * m;
    }
    effSpd() {
      return this.spd * (this.has('spdUp') ? 1.3 : 1);
    }
    critRate() {
      return (this.isHero ? 0.1 : 0.05) + (this.has('critUp') ? 0.25 : 0);
    }
    turnLen() {
      return TURN / this.effSpd();
    }
    // Centre du corps (pour viser les effets).
    get cx() {
      return this.x + this.offX;
    }
    get cy() {
      return this.y + this.offY - this.h * 0.45;
    }
    get topY() {
      return this.y + this.offY - this.h;
    }
  }
  B.Fighter = Fighter;

  // ------------------------------------------------------------ création
  B.heroFighter = (u, slot) => {
    const def = GS.UNIT[u.id];
    const st = GS.Save.stats(u);
    const sp = GS.HeroArt.build(def.id, def.look);
    const pos = B.HERO_POS[slot];
    return new Fighter({
      side: 'hero',
      slot,
      uid: u.uid,
      def,
      name: def.name,
      element: def.element,
      maxHp: st.hp,
      atk: st.atk,
      def: st.def,
      spd: st.spd,
      maxMp: st.mp,
      mp: Math.round(st.mp * 0.3),
      sp: 0,
      sl: 0,
      sprite: sp,
      h: 30,
      homeX: pos[0],
      homeY: pos[1],
    });
  };

  B.enemyFighter = (key, el, level, slot, pos) => {
    const def = GS.ENEMIES[key](el);
    const k = GS.stageScale(level);
    let sprite;
    if (def.art[0] === 'm') sprite = GS.MonsterArt.build(key + (el || '') + JSON.stringify(def.art[2] || {}), def.art[1], def.art[2] || {});
    else sprite = GS.MonsterArt.buildHumanoid(key, def.art[1], def.art[2] || 1);
    const f = new Fighter({
      side: 'enemy',
      slot,
      key,
      def,
      name: def.name,
      element: def.element,
      boss: !!def.boss,
      maxHp: Math.round(def.hp * k),
      atk: Math.round(def.atk * k),
      def: Math.round(def.def * k),
      spd: def.spd,
      maxMp: 0,
      mp: 0,
      sp: 0,
      sl: 0,
      sprite,
      h: sprite.h - 4,
      homeX: pos[0],
      homeY: pos[1],
    });
    if (sprite.flying) f.fly = true;
    return f;
  };

  // Positions (pieds) : diagonale façon RPG tactique vu de côté.
  B.HERO_POS = [
    [112, 138],
    [84, 150],
    [56, 162],
  ];
  // Positions des ennemis selon leur nombre (et la présence d'un boss).
  B.enemyPositions = (wave) => {
    const bossIdx = wave.findIndex(([k]) => GS.ENEMIES[k]().boss);
    if (bossIdx >= 0) {
      const others = [
        [256, 136],
        [352, 172],
      ];
      let j = 0;
      return wave.map((_, i) => (i === bossIdx ? [306, 162] : others[j++]));
    }
    return {
      1: [[300, 152]],
      2: [
        [284, 142],
        [322, 160],
      ],
      3: [
        [272, 136],
        [304, 152],
        [338, 168],
      ],
    }[wave.length];
  };

  // ------------------------------------------------------------ ordre des tours
  B.initCT = (fighters) => {
    for (const f of fighters) f.ct = f.turnLen() * (f.isHero ? U.rand(0.2, 0.7) : U.rand(0.5, 1.0));
  };

  B.next = (fighters) => {
    const alive = fighters.filter((f) => f.alive);
    let best = alive[0];
    for (const f of alive) if (f.ct < best.ct) best = f;
    const d = best.ct;
    for (const f of alive) f.ct -= d;
    return best;
  };

  // Prédit les n prochains acteurs (pour la frise des tours).
  B.predict = (fighters, n, current) => {
    const sim = fighters.filter((f) => f.alive).map((f) => ({ f, ct: f.ct + (f === current ? f.turnLen() : 0) }));
    const out = [];
    if (!sim.length) return out;
    for (let i = 0; i < n; i++) {
      let best = sim[0];
      for (const s of sim) if (s.ct < best.ct) best = s;
      out.push(best.f);
      const d = best.ct;
      for (const s of sim) s.ct -= d;
      best.ct = best.f.turnLen();
    }
    return out;
  };

  // ------------------------------------------------------------ dégâts
  B.damage = (att, tgt, ab, frac) => {
    const atk = att.effAtk();
    const def = Math.max(0, tgt.effDef());
    let dmg = atk * (ab.power || 1) * frac * (300 / (300 + def));
    const elem = GS.elemMult(ab.element || att.element, tgt.element);
    dmg *= elem;
    const crit = Math.random() < att.critRate() + (ab.crit || 0);
    if (crit) dmg *= 1.6;
    dmg *= U.rand(0.93, 1.07);
    if (tgt.isHero && tgt.guard) dmg *= 0.5;
    return { dmg: Math.max(1, Math.round(dmg)), crit, elem };
  };

  B.heal = (src, ab, tgt) => Math.round(src.effAtk() * (ab.heal || 1) * U.rand(0.95, 1.05) + tgt.maxHp * 0.04);

  // Applique un statut (rafraîchit la durée s'il existe déjà).
  B.addStatus = (tgt, eff, src) => {
    if (!tgt.alive) return false;
    let chance = eff.chance === undefined ? 1 : eff.chance;
    if (tgt.boss && eff.type === 'stun') chance *= 0.4;
    if (Math.random() > chance) return false;
    const cur = tgt.status(eff.type);
    const power = eff.type === 'burn' ? src.effAtk() * 0.35 : eff.type === 'poison' ? src.effAtk() * 0.25 + Math.min(tgt.maxHp * 0.03, 400) : 0;
    if (cur) {
      cur.turns = Math.max(cur.turns, eff.turns || 3);
      cur.power = Math.max(cur.power || 0, power);
    } else tgt.statuses.push({ type: eff.type, turns: eff.turns || 3, power });
    return true;
  };

  // Décompte des statuts au début du tour. Renvoie les événements (dégâts, soins...).
  B.tickStatuses = (f) => {
    const ev = [];
    for (const s of f.statuses) {
      if (s.type === 'burn' || s.type === 'poison') ev.push({ type: s.type, amount: Math.max(1, Math.round(s.power)) });
      if (s.type === 'regen') ev.push({ type: 'regen', amount: Math.round(f.maxHp * 0.08) });
    }
    return ev;
  };

  B.decayStatuses = (f) => {
    for (const s of f.statuses) if (s.type !== 'stun') s.turns--;
    f.statuses = f.statuses.filter((s) => s.turns > 0);
  };

  // ------------------------------------------------------------ IA
  // Choisit une cible héros (provocation prioritaire, puis préférence pour les PV bas).
  B.pickHero = (heroes) => {
    const alive = heroes.filter((h) => h.alive);
    const taunt = alive.find((h) => h.has('taunt'));
    if (taunt && Math.random() < 0.85) return taunt;
    const w = alive.map((h) => 1 + (1 - h.hp / h.maxHp) * 1.5);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < alive.length; i++) {
      r -= w[i];
      if (r <= 0) return alive[i];
    }
    return alive[0];
  };

  B.enemyChoice = (f, heroes, enemies) => {
    if (f.charging) {
      const ab = f.charging;
      return { ab, targets: heroes.filter((h) => h.alive), release: true };
    }
    const skills = f.def.skills.filter((s) => {
      if (s.target === 'allies' && s.heal) return enemies.some((e) => e.alive && e.hp < e.maxHp * 0.7);
      return true;
    });
    let tot = skills.reduce((a, s) => a + (s.w || 1), 0);
    let r = Math.random() * tot;
    let ab = skills[0];
    for (const s of skills) {
      r -= s.w || 1;
      if (r <= 0) {
        ab = s;
        break;
      }
    }
    if (ab.charge) return { ab, charge: true, targets: [] };
    let targets;
    if (ab.target === 'heroes') targets = heroes.filter((h) => h.alive);
    else if (ab.target === 'self') targets = [f];
    else if (ab.target === 'allies') targets = enemies.filter((e) => e.alive);
    else targets = [B.pickHero(heroes)];
    return { ab, targets };
  };

  // Choix automatique pour un héros (mode AUTO).
  B.autoChoice = (f, heroes, enemies) => {
    const foes = enemies.filter((e) => e.alive);
    const allies = heroes.filter((h) => h.alive);
    const def = f.def;
    // cible : la plus faible face à notre élément, sinon la plus basse en PV
    const scoreFoe = (e) => GS.elemMult(def.element, e.element) * 2 - e.hp / e.maxHp + (e.boss ? 0.3 : 0);
    const foe = foes.slice().sort((a, b) => scoreFoe(b) - scoreFoe(a))[0];
    const hurt = allies.filter((a) => a.hp < a.maxHp * 0.55).length;
    const dead = heroes.some((h) => !h.alive);
    const pick = (ab) => {
      if (ab.target === 'enemy') return [foe];
      if (ab.target === 'enemies') return foes;
      if (ab.target === 'ally') return [allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
      if (ab.target === 'allies') return allies;
      return [f];
    };
    const useful = (ab) => {
      if (ab.heal && !ab.power) return hurt >= (ab.target === 'allies' ? 2 : 1) || (ab.revive && dead);
      if (!ab.power && ab.effects) {
        // buff : seulement s'il n'est pas déjà actif
        return !ab.effects.every((e) => (e.target === 'self' || ab.target === 'self' ? f : allies[0]).has(e.type));
      }
      return true;
    };
    if (f.sl >= 100 && useful(def.overlimit)) return { type: 'overlimit', ab: def.overlimit, targets: pick(def.overlimit) };
    if (f.sp >= 100 && useful(def.special)) return { type: 'special', ab: def.special, targets: pick(def.special) };
    const sk = def.skills.filter((s) => s.mp <= f.mp && useful(s));
    if (sk.length && Math.random() < 0.6) {
      const heal = sk.find((s) => s.heal);
      const ab = heal || U.choice(sk);
      return { type: 'skill', ab, targets: pick(ab) };
    }
    return { type: 'attack', ab: B.basic(f), targets: [foe] };
  };

  B.basic = (f) => {
    const a = f.def.attack;
    return { name: 'Attaque', target: 'enemy', anim: a.anim, fx: a.fx, power: 1, hits: a.hits, basic: true };
  };
})();
