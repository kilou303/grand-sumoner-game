'use strict';
// Scène de niveau façon Grand Summoners : on avance sur la map (l'équipe suit, on ramasse des
// pièces), et au contact des monstres un combat au tour par tour dynamique se déclenche :
// ruées, enchaînements, effets, cut-in d'Overlimit. Les vagues s'enchaînent jusqu'au boss.
(function () {
  const U = GS.U;
  const R = GS.R;
  const B = GS.Battle;
  const E = U.Ease;
  const MR = GS.ModRig;
  const F = () => GS.Font;
  const I = () => GS.Input;
  const A = () => GS.Audio;

  const W = () => GS.W;
  const HUD_Y = 222;
  const CMD = { x: 182, y: 217, w: 94, h: 52 };
  const CMD_ITEMS = [
    { type: 'attack', label: 'ATTAQUE' },
    { type: 'skill', label: 'COMPÉTENCE' },
    { type: 'special', label: 'SPÉCIAL' },
    { type: 'overlimit', label: 'OVERLIMIT' },
  ];
  const TOPBTN = { auto: [168, 4, 30, 14], speed: [200, 4, 24, 14], pause: [226, 4, 20, 14] };
  // formation : décalages par rapport au point de rencontre
  const HERO_SLOT = [
    [-100, 216],
    [-150, 202],
    [-196, 230],
  ];
  const FOLLOW = [
    [0, 216],
    [-46, 202],
    [-88, 230],
  ];
  const COMBOS = {
    1: ['cross'],
    2: ['jab', 'cross'],
    3: ['jab', 'cross', 'kick'],
    4: ['jab', 'cross', 'uppercut', 'airKick'],
    5: ['jab', 'cross', 'jab', 'uppercut', 'airKick'],
    6: ['jab', 'cross', 'jab', 'cross', 'uppercut', 'airKick'],
  };
  const SCHEME_OF = { fire: 'fire', water: 'water', earth: 'earth', light: 'light', dark: 'dark' };

  class BattleScene {
    constructor(ai, si) {
      this.ai = ai;
      this.si = si;
      this.area = GS.AREAS[ai];
      this.stage = this.area.stages[si];
    }

    enter() {
      this.t = 0;
      this.co = new GS.Runner();
      this.fx = new GS.FXLayer();
      this.heroes = GS.Save.teamUnits().map((u, i) => {
        const f = B.heroFighter(u, i);
        f.art = GS.Art.fresh(f.def);
        f.rig = !!f.art.rig;
        if (!f.rig) f.sprite = scaledSprite(f.sprite, 2);
        f.anim = 'idle';
        f.at = Math.random();
        f.dir = 1;
        f.h = f.rig ? 58 : 60;
        f.x = FOLLOW[i][0] + 140;
        f.y = FOLLOW[i][1];
        f.homeX = f.x;
        f.homeY = f.y;
        f.vx = 0;
        return f;
      });
      // poses pré-calculées petit à petit (pas de saccade au premier coup)
      this.warm = [];
      const movesOf = (def) => [].concat(def.style ? GS.STYLES[def.style].moves.concat(GS.STYLES[def.style].finish) : [], ...[def.special, def.overlimit].concat(def.skills).map((ab) => (ab && ab.moves) || []));
      for (const h of this.heroes) if (h.rig) this.warmUp(h, ['idle', 'walk', 'run', 'stance', 'hurt', 'hurtLow', 'hurtAir', 'jab', 'cross', 'uppercut', 'kick', 'airKick', 'slashA', 'slashB', 'thrust', 'fire', 'cast', 'jump', 'land', 'victory'].concat(movesOf(h.def)));
      this.enemies = [];
      this.groups = [];
      this.pickups = [];
      this.mode = 'explore';
      this.wave = -1;
      this.cam = { x: 0, shake: 0 };
      this.hitstop = 0;
      this.dim = 0;
      this.screenFlash = 0;
      this.flashColor = '#ffffff';
      this.banner = null;
      this.abName = null;
      this.menu = null;
      this.command = null;
      this.active = null;
      this.focus = this.heroes[0];
      this.auto = !!GS.data.settings.auto;
      this.speed = GS.data.settings.speed || 1;
      this.paused = false;
      this.loot = { gold: 0, gems: 0, items: [] };
      this.stolen = 0;
      this.cutin = null;
      this.lastTarget = null;
      this.timeline = [];
      this.ended = false;
      this.hint = 0;
      this.buildLevel();
      A().music('battle');
      this.banner = { text: this.stage.name, sub: `${this.area.name} — Avance vers la droite !`, color: '#3ee0f0', t: 0, dur: 2.2 };
    }

    // ---------------------------------------------------------------- niveau
    buildLevel() {
      const n = this.stage.waves.length;
      let x = 470;
      const rng = U.seeded(this.ai * 100 + this.si * 7 + 3);
      const lvl = this.stage.level;
      let prev = 80;
      for (let i = 0; i < n; i++) {
        const wave = this.stage.waves[i];
        const boss = wave.some(([k]) => GS.ENEMIES[k]().boss);
        // pièces entre deux rencontres
        for (let px = prev + 60; px < x - 160; px += 34 + rng() * 26) {
          const gem = rng() < 0.12;
          this.pickups.push({ x: px, y: 204 + Math.round(rng() * 22), type: gem ? 'gem' : 'gold', amount: gem ? 5 : 8 + Math.round(lvl * 3 + rng() * 6), t: rng() * 6 });
        }
        if (boss) this.pickups.push({ x: x - 190, y: 214, type: 'chest', amount: 60 + lvl * 25, t: 0 });
        this.groups.push({ x, wave, boss, done: false });
        prev = x;
        x += 560;
      }
      this.levelLen = prev + 320;
      // sang et morceaux : les flaques restent au sol tout le niveau
      this.gore = new GS.Gore.Layer(this.levelLen + W() + 200);
      // ennemis de la première rencontre, déjà en place sur la map
      this.spawnGroup(0);
    }

    spawnGroup(i) {
      const g = this.groups[i];
      if (!g) return;
      const pos = B.enemyPositions(g.wave);
      this.enemies = g.wave.map(([k, el], j) => {
        const p = pos[j];
        const f = B.enemyFighter(k, el, this.stage.level, j, [g.x + (p[0] - 240) * 1.2 + 40, 196 + (p[1] - 136) * 0.9]);
        f.dir = -1;
        f.at = Math.random() * 3;
        if (f.rig) this.warmUp(f, ['stance', 'run', 'hurt', 'hurtLow', 'hurtAir', 'jab', 'cross', 'slashA', 'slashB', 'thrust', 'cast', 'jump']);
        return f;
      });
      for (const e of this.enemies) {
        e.homeY = U.clamp(e.homeY, 196, 232);
        e.y = e.homeY;
      }
      this.groupIdx = i;
    }

    get fighters() {
      return this.heroes.concat(this.enemies);
    }
    foesOf(f) {
      return f.isHero ? this.enemies : this.heroes;
    }
    alliesOf(f) {
      return f.isHero ? this.heroes : this.enemies;
    }
    leader() {
      return this.heroes.find((h) => h.alive) || this.heroes[0];
    }

    // ================================================================= exploration
    updateExplore(dt) {
      const inp = I();
      const lead = this.leader();
      let move = 0;
      if (!this.paused && !this.ended) {
        if (inp.held('right')) move = 1;
        else if (inp.held('left')) move = -1;
        if (inp.down && !inp.dragging && inp.y < HUD_Y - 4 && inp.y > 24) move = inp.x > W() * 0.4 ? 1 : -1;
        if (inp.down && U.inRect(inp.x, inp.y, W() - 58, HUD_Y + 4, 54, 42)) move = 1;
        if (inp.down && U.inRect(inp.x, inp.y, 4, HUD_Y + 4, 40, 42)) move = -1;
        if (this.auto) move = 1;
      }
      const target = move * (move > 0 ? 150 : 90);
      lead.vx = U.approach(lead.vx, target, dt * 600);
      lead.x = U.clamp(lead.x + lead.vx * dt, 20, this.levelLen);
      if (move) lead.dir = move;
      // les autres suivent en file
      this.heroes.forEach((h, i) => {
        if (h === lead || !h.alive) return;
        const slot = this.heroes.filter((x) => x.alive).indexOf(h);
        const tx = lead.x + FOLLOW[slot][0] * (lead.dir < 0 ? -1 : 1);
        const d = tx - h.x;
        h.vx = U.approach(h.vx, U.clamp(d * 4, -170, 170), dt * 700);
        h.x += h.vx * dt;
        h.y = U.approach(h.y, FOLLOW[slot][1], dt * 40);
        if (Math.abs(h.vx) > 8) h.dir = Math.sign(h.vx);
      });
      lead.y = U.approach(lead.y, FOLLOW[0][1], dt * 40);
      for (const h of this.heroes) {
        if (!h.alive) continue;
        const sp = Math.abs(h.vx);
        const anim = sp > 70 ? 'run' : sp > 6 ? 'walk' : 'idle';
        if (h.anim !== anim && !h.busy) {
          h.anim = anim;
        }
        h.at += dt * (anim === 'walk' ? Math.max(0.6, sp / 60) : 1);
        if (anim === 'run' && Math.random() < dt * 8) this.fx.dust(h.x - 8 * h.dir, h.y, { n: 1, vx: -30 * h.dir });
      }
      // caméra
      const cx = U.clamp(lead.x - 150, 0, Math.max(0, this.levelLen - W()));
      this.cam.x = U.lerp(this.cam.x, cx, Math.min(1, dt * 6));
      // ramassage
      for (const p of this.pickups) {
        if (p.taken) continue;
        p.t += dt;
        if (this.heroes.some((h) => h.alive && Math.abs(h.x - p.x) < 12)) this.collect(p);
      }
      // rencontre
      const g = this.groups[this.groupIdx];
      if (g && !g.done && lead.x > g.x - 150) {
        this.mode = 'battle';
        this.co.run(this.encounter(g));
      }
      // fin du niveau (sécurité)
      if (!g && !this.ended) {
        this.ended = true;
        this.co.run(this.victory());
      }
      this.hint += dt;
    }

    collect(p) {
      p.taken = true;
      p.tt = 0;
      if (p.type === 'gem') {
        this.loot.gems += p.amount;
        this.fx.pop(p.x, p.y - 14, '+' + p.amount, { color: '#80d8ff', label: 'CRISTAUX', labelColor: '#a0e0ff' });
        A().sfx('star', 1.2);
      } else {
        this.loot.gold += p.amount;
        this.fx.pop(p.x, p.y - 14, '+' + p.amount, { color: '#ffd040', label: p.type === 'chest' ? 'TRÉSOR !' : null });
        A().sfx('coin');
      }
      this.fx.sparkle(p.x, p.y - 6, { color: p.type === 'gem' ? '#60c8ff' : '#ffd040', size: p.type === 'chest' ? 22 : 10 });
      if (p.type === 'chest') {
        this.fx.burst(p.x, p.y - 8, { n: 26, color: ['#ffd040', '#fff4a0', '#ffffff'], speed: 120, gravity: 200, life: 0.7, shape: 'star', size: 3 });
        A().sfx('rare');
      }
    }

    // ================================================================= combat
    *encounter(g) {
      const n = this.stage.waves.length;
      this.wave = this.groupIdx;
      const lead = this.leader();
      for (const h of this.heroes) h.vx = 0;
      if (g.boss) A().music('boss');
      this.screenFlash = 0.6;
      this.flashColor = '#ffffff';
      A().sfx('charge');
      // caméra centrée sur la rencontre, l'équipe se met en formation
      const camTask = this.co.run(GS.tween(this.cam, { x: g.x - 240 }, 0.5, E.inOutQuad));
      const alive = this.heroes.filter((h) => h.alive);
      const moves = alive.map((h, i) => {
        h.homeX = g.x + HERO_SLOT[i][0];
        h.homeY = HERO_SLOT[i][1];
        h.dir = 1;
        return this.co.run(this.runTo(h, h.homeX, h.homeY, 220));
      });
      if (g.boss) {
        const boss = this.enemies.find((e) => e.boss);
        this.banner = { text: 'ATTENTION', sub: boss.name, color: '#ff3048', t: 0, dur: 2.0, warn: true };
      } else {
        this.banner = { text: 'RENCONTRE !', sub: `Vague ${this.wave + 1}/${n}`, color: '#ffd040', t: 0, dur: 1.4 };
      }
      yield moves.concat([camTask]);
      for (const h of alive) {
        h.anim = 'stance';
        h.at = 0;
      }
      yield g.boss ? 1.2 : 0.6;
      lead.anim = 'stance';
      if (this.wave === 0 || !this.ctInit) {
        B.initCT(this.fighters);
        this.ctInit = true;
        yield* this.startPassives(this.fighters);
      } else {
        B.initCT(this.enemies);
        yield* this.startPassives(this.enemies);
      }
      const res = yield* this.fightLoop();
      if (res === 'defeat') {
        yield* this.defeat();
        return;
      }
      g.done = true;
      yield 0.5;
      if (this.groupIdx + 1 >= this.groups.length) {
        yield* this.victory();
        return;
      }
      // retour à l'exploration
      this.banner = { text: 'VAGUE TERMINÉE', sub: 'Continue vers la droite →', color: '#60f080', t: 0, dur: 1.6 };
      for (const h of this.heroes) if (h.alive) h.anim = 'idle';
      this.spawnGroup(this.groupIdx + 1);
      this.mode = 'explore';
      this.hint = 0;
    }

    // Passifs de début de combat : statuts offerts et initiative.
    *startPassives(list) {
      let any = false;
      for (const f of list) {
        if (!f.alive) continue;
        if (f.p('ct')) f.ct *= Math.max(0.1, 1 - f.p('ct'));
        for (const [type, turns] of f.pm.start) {
          if (B.addStatus(f, { type, turns, chance: 1 }, f)) {
            any = true;
            this.fx.pop(f.cx, f.topY - 10, GS.STATUS[type].name, { color: GS.STATUS[type].color, dur: 1.1 });
          }
        }
      }
      if (any) {
        A().sfx('buff');
        yield 0.5;
      }
    }

    // Nom d'un passif qui se déclenche, au-dessus du combattant.
    passivePop(f, id, text) {
      this.fx.pop(f.cx, f.topY - 18, text || GS.PASSIVES[id].name, { color: GS.Passives.color(id, this.t), dur: 1.1 });
    }
    passiveWith(f, key) {
      return f.passives.find((id) => GS.PASSIVES[id] && GS.PASSIVES[id].fx[key]);
    }

    // Ennemi vaincu : effets « à l'élimination » et butin d'équipement.
    onKill(f, tgt) {
      if (f && f.alive && f !== tgt) {
        if (f.p('killHeal')) {
          const v = Math.min(Math.round(f.maxHp * f.p('killHeal')), f.maxHp - f.hp);
          if (v > 0) {
            f.hp += v;
            this.fx.pop(f.cx, f.topY, '+' + v, { color: '#70ff90' });
          }
        }
        if (f.p('killSp') && f.isHero) f.sp = Math.min(100, f.sp + f.p('killSp'));
      }
      if (tgt.isHero || tgt.dropDone) return;
      tgt.dropDone = true;
      if (Math.random() >= GS.Equip.dropChance(tgt.boss)) return;
      const id = GS.Equip.roll(GS.Equip.dropWeights(this.stage.level, tgt.boss));
      this.loot.items.push(id);
      const def = GS.EQUIPS[id];
      this.fx.pop(tgt.cx, tgt.topY - 22, def.name, { color: GS.Equip.color(id), label: 'ÉQUIPEMENT !', labelColor: '#ffffff', dur: 1.6 });
      this.fx.sparkle(tgt.cx, tgt.cy, { color: GS.Equip.color(id), size: 18 });
      A().sfx(GS.Equip.rank(id) >= 2 ? 'rare' : 'star');
    }

    *runTo(f, x, y, speed = 240) {
      const d = Math.hypot(x - f.x, y - f.y);
      if (d < 2) return;
      f.dir = x >= f.x ? 1 : -1;
      if (f.rig) {
        f.anim = 'run';
      }
      f.after = d > 40;
      yield* GS.tween(f, { x, y }, Math.max(0.12, d / speed), E.inOutQuad);
      f.after = false;
      f.dir = f.isHero ? 1 : -1;
      if (f.rig) f.anim = 'stance';
    }

    *fightLoop() {
      for (;;) {
        if (!this.enemies.some((e) => e.alive)) return 'win';
        if (!this.heroes.some((h) => h.alive)) return 'defeat';
        const f = B.next(this.fighters);
        this.active = f;
        if (f.isHero) this.focus = f;
        this.turnWeight = 1;
        yield* this.takeTurn(f);
        f.ct = f.turnLen() * this.turnWeight;
        this.active = null;
        yield 0.1;
      }
    }

    *takeTurn(f) {
      if (f.isHero) f.mp = Math.min(f.maxMp, f.mp + 5 + f.p('mpRegen'));
      for (const ev of B.tickStatuses(f)) {
        if (ev.type === 'regen') {
          const v = Math.min(ev.amount, f.maxHp - f.hp);
          f.hp += v;
          this.fx.pop(f.cx, f.topY, '+' + v, { color: '#70ff90' });
          this.fx.burst(f.cx, f.cy, { n: 10, color: ['#70ff90', '#d0ffd0'], speed: 30, vy: -30, life: 0.6 });
        } else {
          f.hp = Math.max(0, f.hp - ev.amount);
          f.flash = 0.8;
          f.flashColor = ev.type === 'burn' ? '#ff8030' : '#b060ff';
          this.fx.pop(f.cx, f.topY, ev.amount, { color: ev.type === 'burn' ? '#ff9a40' : '#d080ff' });
          if (ev.type === 'burn') this.fx.flame(f.cx, f.y, { scheme: 'fire', n: 12, w: 14 });
          else this.fx.burst(f.cx, f.cy, { n: 12, color: ['#a040e0', '#60f060'], speed: 40, vy: -40, life: 0.5 });
          A().sfx(ev.type === 'burn' ? 'fire' : 'debuff');
        }
        yield 0.35;
        if (f.hp <= 0) {
          f.alive = false;
          this.onKill(null, f);
          yield* this.koAnim(f);
          return;
        }
      }
      if (f.has('stun')) {
        f.statuses = f.statuses.filter((s) => s.type !== 'stun');
        this.fx.pop(f.cx, f.topY, 'ÉTOURDI', { color: '#ffe040' });
        yield 0.7;
        B.decayStatuses(f);
        return;
      }
      let cmd;
      if (f.isHero) {
        if (this.auto) {
          yield 0.15;
          cmd = B.autoChoice(f, this.heroes, this.enemies);
        } else cmd = yield* this.playerInput(f);
      } else {
        yield 0.25;
        cmd = B.enemyChoice(f, this.heroes, this.enemies);
      }
      if (!cmd) return;
      yield* this.perform(f, cmd);
      B.decayStatuses(f);
      for (const e of this.enemies) {
        if (e.boss && e.alive && !e.enraged && e.hp < e.maxHp * 0.5) {
          e.enraged = true;
          this.banner = { text: 'RAGE !', sub: e.name + ' devient furieux', color: '#ff3048', t: 0, dur: 1.4, warn: true };
          e.flash = 1;
          e.flashColor = '#ff2040';
          this.shake(4);
          A().sfx('dark');
          yield 1.2;
        }
      }
    }

    *playerInput(f) {
      this.menu = { f, state: 'main', idx: 0, sidx: 0, tidx: 0, pending: null };
      this.command = null;
      A().sfx('turn');
      while (!this.command) {
        if (this.auto) {
          this.menu = null;
          return B.autoChoice(f, this.heroes, this.enemies);
        }
        yield;
      }
      const c = this.command;
      this.command = null;
      this.menu = null;
      return c;
    }

    *perform(f, cmd) {
      const ab = cmd.ab;
      if (cmd.charge) {
        f.charging = ab;
        this.turnWeight = 0.6;
        this.showName(f, 'Concentration...', '#ff3048');
        this.banner = { text: '!! DANGER !!', sub: `${f.name} prépare ${ab.name}`, color: '#ff3048', t: 0, dur: 1.6, warn: true };
        A().sfx('charge');
        f.flash = 1;
        f.flashColor = '#ff2040';
        yield 1.4;
        return;
      }
      if (cmd.release) f.charging = null;
      if (cmd.type === 'skill') f.mp -= ab.mp;
      if (cmd.type === 'special') f.sp = 0;
      if (cmd.type === 'overlimit') f.sl = 0;
      let targets = cmd.targets.filter((t) => t && (t.alive || ab.revive));
      if (!targets.length && (ab.target === 'enemy' || !ab.target)) {
        const alive = this.foesOf(f).filter((e) => e.alive);
        if (!alive.length) return;
        targets = [alive[0]];
      }
      if (!ab.basic) this.showName(f, ab.name, cmd.type === 'overlimit' ? 'rainbow' : cmd.type === 'special' ? this.colOf(f) : null);
      if (cmd.type === 'overlimit') yield* this.cutIn(f, ab);
      else if (cmd.type === 'special' || cmd.release) yield* this.specialIntro(f);
      f.busy = true;
      const anim = ab.anim || 'melee';
      if (anim === 'brawl') yield* this.animBrawl(f, ab, targets);
      else if (anim === 'power') yield* this.animPower(f, ab, targets);
      else if (anim === 'melee' || anim === 'thrust') yield* this.animMelee(f, ab, targets, anim === 'thrust');
      else if (anim === 'spin') yield* this.animSpin(f, ab, targets);
      else if (anim === 'ranged') yield* this.animRanged(f, ab, targets);
      else if (anim === 'magic') yield* this.animMagic(f, ab, targets);
      else yield* this.animSupport(f, ab, targets);
      f.busy = false;
      if (f.rig && f.alive) {
        f.anim = 'stance';
        f.at = 0;
      }
      yield* this.afterEffects(f, ab, targets);
      if (f.isHero) {
        const g = { attack: [15, 25, 10], skill: [0, 12, 10], special: [0, 0, 25], overlimit: [0, 0, 0] }[cmd.type] || [0, 0, 0];
        f.mp = Math.min(f.maxMp, f.mp + g[0]);
        f.sp = Math.min(100, f.sp + g[1] * (1 + f.p('sp')));
        f.sl = Math.min(100, f.sl + g[2] * (1 + f.p('sl')));
      }
      this.dim = 0;
      yield 0.12;
    }

    *afterEffects(f, ab, targets) {
      const offensive = ab.target === 'enemy' || ab.target === 'enemies' || ab.target === 'heroes' || !ab.target;
      if (ab.heal) {
        let list = offensive ? this.alliesOf(f) : targets;
        if (ab.revive) {
          for (const h of this.alliesOf(f)) {
            if (!h.alive) {
              h.alive = true;
              h.ko = 0;
              // les morceaux se recollent
              h.gibbed = false;
              h.cuts = 0;
              if (h.rig) h.art.rig.heal();
              h.hp = Math.round(h.maxHp * ab.revive);
              h.statuses = [];
              h.ct = h.turnLen() * 0.5;
              if (h.rig) h.anim = 'stance';
              this.fx.pillar(h.x, h.y, { color: '#ffe0a0', w: 12 });
              this.fx.pop(h.cx, h.topY - 8, 'RANIMÉ', { color: '#ffe060' });
            }
          }
          list = this.alliesOf(f);
        }
        let i = 0;
        for (const t of list) {
          if (!t.alive) continue;
          const v = Math.min(B.heal(f, ab, t), t.maxHp - t.hp);
          t.hp += v;
          this.fx.pop(t.cx, t.topY, '+' + v, { color: '#70ff90', delay: i * 0.05 });
          this.fx.burst(t.cx, t.y - 4, { n: 14, color: ['#70ff90', '#e0ffe0', '#ffffff'], speed: 25, vy: -50, life: 0.8, jitter: 14, shape: 'star', size: 3 });
          i++;
        }
        A().sfx('heal');
      }
      for (const eff of ab.effects || []) {
        let list;
        if (eff.target === 'self') list = [f];
        else if (eff.target === 'allies') list = this.alliesOf(f).filter((a) => a.alive);
        else list = targets;
        let any = false;
        for (const t of list) {
          if (!t.alive) continue;
          t.resisted = false;
          const ok = B.addStatus(t, eff, f);
          if (t.resisted) this.passivePop(t, this.passiveWith(t, 'resist'), 'RÉSISTE !');
          if (ok) {
            any = true;
            const st = GS.STATUS[eff.type];
            this.fx.pop(t.cx, t.topY - 10, st.name, { color: st.color, dur: 1.1 });
            if (!st.bad) this.fx.burst(t.cx, t.y - 2, { n: 8, color: [st.color, '#ffffff'], speed: 20, vy: -60, life: 0.6, jitter: 12 });
          }
        }
        if (any) {
          A().sfx(GS.STATUS[eff.type].bad ? 'debuff' : 'buff');
          yield 0.25;
        }
      }
      if (ab.delay) {
        for (const t of targets) {
          if (!t.alive || t.side === f.side) continue;
          t.ct += (ab.delay / 100) * t.turnLen();
          this.fx.pop(t.cx, t.topY - 10, 'RETARD', { color: '#80c0ff' });
        }
      }
    }

    strike(f, tgt, ab, frac, o = {}) {
      if (!tgt || !tgt.alive) return null;
      const r = B.damage(f, tgt, ab, frac);
      if (r.miss) {
        this.fx.pop(tgt.cx + U.rand(-6, 6), tgt.topY + 4, 'ESQUIVE', { color: '#c0f0ff' });
        tgt.kx = (tgt.isHero ? -1 : 1) * 6;
        if (!o.silent) A().sfx('select');
        return r;
      }
      tgt.hp = Math.max(0, tgt.hp - r.dmg);
      // ténacité : survit une fois avec 1 PV
      if (tgt.hp <= 0 && tgt.gutsLeft > 0) {
        tgt.gutsLeft--;
        tgt.hp = 1;
        this.passivePop(tgt, this.passiveWith(tgt, 'guts'), 'TÉNACITÉ !');
      }
      // vol de vie et épines
      if (f.p('drain') && f.alive) {
        const v = Math.min(Math.round(r.dmg * f.p('drain')), f.maxHp - f.hp);
        if (v > 0) f.hp += v;
      }
      if (tgt.p('thorns') && f.alive && f !== tgt) {
        const v = Math.round(r.dmg * tgt.p('thorns'));
        if (v > 0) {
          f.hp = Math.max(1, f.hp - v);
          this.fx.pop(f.cx, f.topY, v, { color: '#c0a0ff', scale: 0.8 });
        }
      }
      tgt.flash = 1;
      tgt.flashColor = '#ffffff';
      tgt.kx = (tgt.isHero ? -1 : 1) * (r.crit ? 7 : 4) * (o.knock || 1);
      this.react(tgt, o.react || 'high');
      const big = r.crit || frac >= 0.5;
      let color = '#ffffff';
      let label = null;
      let labelColor;
      if (r.elem > 1) {
        color = '#ffb040';
        label = 'FAIBLE !';
        labelColor = '#ffd060';
      } else if (r.elem < 1) {
        color = '#a0a8b8';
        label = 'RÉSISTE';
        labelColor = '#a0a8b8';
      }
      if (r.crit) {
        color = '#ffe040';
        label = 'CRITIQUE !';
        labelColor = '#ff6040';
      }
      if (tgt.isHero) color = r.crit ? '#ff8060' : '#ff6070';
      this.fx.pop(tgt.cx + U.rand(-6, 6), tgt.topY + 4, r.dmg, { color, scale: r.crit ? 2 : big ? 1.5 : 1, label, labelColor });
      this.shake(r.crit ? 3 : big ? 2 : 1);
      this.hitstop = Math.max(this.hitstop, r.crit ? 0.1 : 0.045);
      if (!o.silent) A().sfx(r.crit ? 'crit' : 'hit');
      if (tgt.isHero) {
        tgt.sp = Math.min(100, tgt.sp + 5 * (1 + tgt.p('sp')));
        tgt.sl = Math.min(100, tgt.sl + 4 * (1 + tgt.p('sl')));
      }
      if (ab.steal && f.isHero && Math.random() < 0.6) {
        const g = U.randInt(20, 60) * (1 + Math.floor(this.stage.level / 4));
        this.stolen += g;
        this.fx.pop(tgt.cx, tgt.topY - 14, '+' + g + ' OR', { color: '#ffd040', dur: 1.2 });
        A().sfx('coin');
      }
      this.bleed(f, tgt, r, big);
      if (tgt.hp <= 0) {
        tgt.alive = false;
        if (f.isHero) f.sl = Math.min(100, f.sl + 10 * (1 + f.p('sl')));
        this.onKill(f, tgt);
        this.co.run(this.koAnim(tgt));
      } else if ((tgt.cuts || 0) < 2) {
        // coups violents : un membre peut être tranché
        const low = tgt.hp / tgt.maxHp < 0.5;
        const chance = r.crit ? 0.55 : big ? 0.3 : low ? 0.1 : 0;
        if (Math.random() < chance) this.sever(f, tgt);
      }
      return r;
    }

    shake(v) {
      this.cam.shake = Math.max(this.cam.shake, v);
    }

    // ---------------------------------------------------------------- gore
    hitDir(f, tgt) {
      return tgt.x >= f.x ? 1 : -1;
    }
    // Giclée de sang à chaque coup.
    bleed(f, tgt, r, big) {
      const cols = GS.Gore.Layer.bloodOf(tgt);
      const d = this.hitDir(f, tgt);
      const n = r.crit ? 30 : big ? 18 : 10;
      this.gore.spray(tgt.cx - d * 2, tgt.cy + U.rand(-6, 4) + (tgt.fly ? -16 : 0), tgt.y, cols, { n, speed: r.crit ? 180 : 125, angle: -Math.PI / 2 + d * 0.95, spread: 1.4, vx: d * 30 });
      A().sfx('splat');
    }
    // Membre tranché.
    sever(f, tgt) {
      const part = this.gore.dismember(tgt, this.hitDir(f, tgt));
      if (!part) return;
      A().sfx('sever');
      this.shake(3);
      this.hitstop = Math.max(this.hitstop, 0.09);
      const LBL = { head: 'DÉCAPITÉ !', arm: 'BRAS ARRACHÉ !', lo: 'AVANT-BRAS TRANCHÉ !', fist: 'MAIN TRANCHÉE !', leg: 'JAMBE ARRACHÉE !', knee: 'JAMBE TRANCHÉE !' };
      const label = LBL[part] || LBL[part.slice(0, -1)] || 'TRANCHÉ !';
      this.fx.pop(tgt.cx, tgt.topY - 16 - (tgt.slot % 2) * 11, label, { color: '#ff2a3a', dur: 1.1 });
    }
    colOf(f) {
      return f.def.fxColor || GS.EL[f.element].color;
    }
    schemeOf(f, ab) {
      if (f.def && f.def.fxColor) return 'blood';
      return SCHEME_OF[(ab && ab.element) || f.element] || 'fire';
    }
    showName(f, name, color) {
      this.abName = { name, color: color || (f.isHero ? '#3ee0f0' : '#ff5060'), t: 0, hero: f.isHero };
    }

    *specialIntro(f) {
      this.dim = 0.55;
      f.flash = 1;
      f.flashColor = GS.EL[f.element].light;
      const sc = this.schemeOf(f);
      this.fx.groundRing(f.x, f.y, { scheme: sc, r1: 34, dur: 0.45 });
      this.fx.burst(f.cx, f.cy, { n: 24, color: GS.FXLayer.SCHEMES[sc].slice(1, 4), speed: 120, life: 0.5 });
      A().sfx('charge');
      yield 0.45;
    }

    *cutIn(f, ab) {
      this.cutin = { f, ab, t: 0 };
      A().sfx('cutin');
      yield 1.55;
      this.cutin = null;
      this.screenFlash = 1;
      this.flashColor = '#ffffff';
      this.dim = 0.6;
    }

    // Mort : le combattant explose en morceaux (façon Happy Wheels), allié comme ennemi.
    *koAnim(f) {
      f.flash = 1;
      f.flashColor = '#ff4060';
      f.charging = null;
      A().sfx('gore');
      if (f.isHero) A().sfx('ko');
      this.gore.explode(f, f.boss ? 1.5 : 1, f.rig ? null : this.fighterImage(f));
      const cy = f.cy + (f.fly ? -16 : 0);
      this.fx.ring(f.cx, cy, { color: '#c01020', r0: 4, r1: f.boss ? 50 : 30, dur: 0.3, width: 2 });
      this.fx.burst(f.cx, cy, { n: 16, color: ['#8a0814', '#5a040c', '#c01020'], speed: 150, life: 0.45, add: false, gravity: 300 });
      this.shake(f.boss ? 7 : 4);
      this.hitstop = Math.max(this.hitstop, f.boss ? 0.2 : 0.07);
      if (f.boss) {
        this.screenFlash = 0.8;
        this.flashColor = '#ff2030';
      }
      f.ko = 1;
      f.gibbed = true;
      yield 0.3;
    }

    // ---------------------------------------------------------------- animations
    weaponOf(f) {
      return f.rig && f.art.rig.spec.weapon ? f.art.rig.spec.weapon.kind : null;
    }
    // Bouche du canon (pistolet) dans la pose courante, en coordonnées du monde.
    muzzleOf(f) {
      const d = this.dirOf(f);
      const fr = f.rig ? f.art.frame(f.anim, f.at) : null;
      if (!fr || !fr.muzzle) return { x: f.cx + d * 14, y: f.cy - 2 };
      const rs = f.rscale || 1;
      const s = f.dir < 0 || f.flip ? -1 : 1;
      return { x: f.x + f.offX + (f.kx || 0) + (fr.muzzle.x - fr.foot.x) * rs * s, y: f.y + f.offY - (f.jump || 0) + (fr.muzzle.y - fr.foot.y) * rs };
    }
    muzzleFlash(f) {
      const m = this.muzzleOf(f);
      this.fx.flash(m.x, m.y, { color: '#ffe080', r: 6 });
      this.fx.burst(m.x, m.y, { n: 5, color: ['#fff4c0', '#ffb040'], speed: 70, life: 0.12, jitter: 20, add: true });
      A().sfx('gun');
      return m;
    }
    // Coup de mêlée d'un héros modulaire selon son arme (au pistolet : aux poings).
    meleeMove(f, i, thrust) {
      const w = this.weaponOf(f);
      if (!w || w === 'pistol') return i % 2 ? 'cross' : 'jab';
      if (thrust || w === 'spear' || w === 'rapier') return 'thrust';
      return i % 2 ? 'slashB' : 'slashA';
    }
    dirOf(f) {
      return f.isHero ? 1 : -1;
    }
    elemColor(f, ab) {
      const el = GS.EL[ab.element || f.element];
      if (ab.fx === 'slash' || ab.fx === 'hit' || ab.fx === 'heavy' || ab.fx === 'bite' || ab.fx === 'punch') return f.isHero ? '#e8f8ff' : '#ffb0b0';
      return f.def.fxColor || el.color;
    }

    *dashTo(f, x, y, dur = 0.2) {
      A().sfx('dash');
      f.after = true;
      if (f.rig) {
        f.anim = 'run';
        this.fx.dust(f.x, f.y, { n: 5, vx: -40 * this.dirOf(f) });
      }
      yield* GS.tween(f, { x, y }, dur, E.inQuad);
      f.after = false;
      if (f.rig) {
        f.anim = 'stance';
        this.fx.dust(f.x + 6 * this.dirOf(f), f.y, { n: 4, vx: 30 * this.dirOf(f) });
      }
    }

    *dashBack(f) {
      f.after = true;
      if (f.rig) {
        f.anim = 'jump';
        f.at = 0;
      }
      yield* GS.tween(f, { x: f.homeX, y: f.homeY }, 0.24, E.outQuad);
      f.after = false;
      f.weaponRot = f.idleRot();
      f.flip = false;
      if (f.rig) {
        f.anim = 'stance';
        this.fx.dust(f.x, f.y, { n: 5 });
      }
    }

    // Enchaînement de coups de poing / pied (personnages modulaires).
    *animBrawl(f, ab, targets) {
      if (!f.rig) {
        yield* this.animMelee(f, ab, targets, false);
        return;
      }
      let tgt = targets[0];
      const d = this.dirOf(f);
      const hits = ab.hits || 1;
      // coups signature de la capacité, sinon enchaînement du style du héros (src/data/moves.js)
      const combo = ab.moves || (f.def.style ? GS.comboOf(f.def.style, hits) : COMBOS[Math.min(6, hits)] || COMBOS[3]);
      const finisher = ab === f.def.special || ab === f.def.overlimit;
      const reach = tgt.sprite.w * (tgt.boss ? 0.32 : 0.42) + 16;
      yield* this.dashTo(f, tgt.x - d * reach, tgt.y + 1, 0.2);
      const sc = this.schemeOf(f, ab);
      for (let i = 0; i < hits; i++) {
        if (!tgt.alive) {
          const alt = this.foesOf(f).filter((e) => e.alive);
          if (!alt.length) break;
          tgt = alt[0];
        }
        const move = combo[i % combo.length];
        const meta = GS.MOVES[move] || {};
        const last = i === hits - 1;
        f.anim = move;
        f.at = 0;
        const hitT = MR.HIT[move];
        yield hitT;
        A().sfx(meta.kind === 'kick' ? 'heavy' : 'slash', 1 + i * 0.06);
        if (meta.shot || (move === 'jab' && this.weaponOf(f) === 'pistol')) {
          const m = this.muzzleFlash(f);
          this.fx.projectile(m.x, m.y, tgt.cx, tgt.cy - (tgt.jump || 0), { color: this.elemColor(f, ab), kind: 'bullet', dur: 0.06, size: 1 });
        }
        // hauteur de l'impact selon le coup (la cible peut être en l'air)
        const react = meta.react || 'high';
        const hx = tgt.cx - d * 6;
        const hy = tgt.cy - (tgt.jump || 0) + (react === 'low' ? 5 : react === 'launch' || meta.kind === 'head' ? -8 : meta.kind === 'kick' ? -2 : 0);
        const big = react === 'launch' || react === 'bounce' || last;
        const up = react === 'launch';
        const down = react === 'bounce';
        if (last && finisher) this.finisher(tgt);
        this.fx.crescent(hx, hy, {
          r: big ? 26 : 18,
          angle: up ? -1.3 : down ? 1.25 : meta.kind === 'kick' ? 0.35 : 0.05,
          span: big ? 2.6 : 1.8,
          dir: up ? -1 : 1,
          scheme: sc,
          flat: up || down ? 0.9 : 0.5,
          tilt: move === 'cross' ? -0.2 : 0.15,
          dur: 0.22,
        });
        this.fx.impact(hx + d * 4, hy, { scheme: sc, big, spark: sc === 'blood' ? '#ff5a8a' : undefined });
        if (big) this.fx.speedLines(hx, hy, { dir: d, n: 12 });
        this.strike(f, tgt, ab, 1 / hits, { knock: big ? 1.6 : 1, react });
        const rest = MR.seqDur(move) - hitT;
        yield last ? rest : Math.min(rest, 0.12);
      }
      yield 0.1;
      yield* this.dashBack(f);
    }

    // ---------------------------------------------------------------- réactions
    // Réaction de la cible : 'high' touchée en haut, 'low' pliée en deux, 'launch' envoyée en
    // l'air (et reprise en l'air par les coups suivants), 'bounce' écrasée au sol puis rebond.
    react(tgt, kind) {
      if (!tgt.alive) return;
      const air = (tgt.jump || 0) > 1 || tgt.airTok;
      if (kind === 'launch' && !tgt.boss) this.co.run(this.launch(tgt, air ? 14 : 30));
      else if (kind === 'bounce' && !tgt.boss) this.co.run(this.bounce(tgt));
      if (!tgt.rig || tgt.busy) return;
      const inAir = (kind === 'launch' && !tgt.boss) || air;
      tgt.anim = inAir ? 'hurtAir' : kind === 'low' || kind === 'bounce' ? 'hurtLow' : 'hurt';
      tgt.at = 0;
      if (!inAir) this.backToStance(tgt, kind === 'low' ? 0.42 : 0.36);
    }
    backToStance(tgt, delay) {
      this.co.run(
        function* () {
          yield delay;
          if (tgt.alive && !tgt.busy && !tgt.airTok && /^a?hurt/.test(tgt.anim)) tgt.anim = 'stance';
        }.call(this)
      );
    }
    *launch(tgt, h) {
      const tok = (tgt.airTok = (tgt.airTok || 0) + 1);
      const top = Math.min(56, (tgt.jump || 0) + h);
      yield* GS.tween(tgt, { jump: top }, 0.22, E.outQuad);
      if (tgt.airTok !== tok) return;
      yield 0.1;
      if (tgt.airTok !== tok) return;
      yield* GS.tween(tgt, { jump: 0 }, 0.07 + top / 260, E.inQuad);
      if (tgt.airTok !== tok) return;
      yield* this.land(tgt, 7);
    }
    *bounce(tgt) {
      const tok = (tgt.airTok = (tgt.airTok || 0) + 1);
      if ((tgt.jump || 0) > 0) yield* GS.tween(tgt, { jump: 0 }, 0.09, E.inQuad);
      if (tgt.airTok !== tok) return;
      yield* this.land(tgt, 11);
    }
    // contact avec le sol : poussière, petit rebond, puis la cible se relève
    *land(tgt, h) {
      const tok = tgt.airTok;
      this.fx.dust(tgt.x, tgt.y, { n: 8 });
      this.shake(3);
      A().sfx('heavy', 0.8);
      if (tgt.rig && tgt.alive && !tgt.busy) {
        tgt.anim = 'hurtLow';
        tgt.at = 0;
      }
      yield* GS.tween(tgt, { jump: h }, 0.1, E.outQuad);
      yield* GS.tween(tgt, { jump: 0 }, 0.12, E.inQuad);
      if (tgt.airTok === tok) tgt.airTok = 0;
      this.backToStance(tgt, 0.25);
    }
    // Coup final d'un spécial : zoom sur la cible et ralenti.
    finisher(tgt) {
      this.slowmo = 0.5;
      this.zoom = { x: tgt.cx, y: tgt.cy - (tgt.jump || 0), t: 0, dur: 0.9, k: 1.4 };
      this.screenFlash = Math.max(this.screenFlash || 0, 0.35);
      this.flashColor = '#ffffff';
    }

    // Overlimit de Djegui : pose de pouvoir, aura rouge, explosion de ténèbres.
    *animPower(f, ab, targets) {
      if (!f.rig) {
        yield* this.animMagic(f, ab, targets);
        return;
      }
      const sc = this.schemeOf(f, ab);
      f.anim = 'power';
      f.at = 0;
      f.aura = 1;
      yield MR.HIT.power;
      A().sfx('dark');
      this.fx.groundRing(f.x + 6, f.y, { scheme: sc, r1: 70, dur: 0.7, h: 44 });
      this.shake(4);
      yield 0.35;
      const alive = () => targets.filter((t) => t.alive);
      const list = alive().length ? alive() : targets;
      const cx = list.reduce((s, t) => s + t.cx, 0) / list.length;
      const cy = list.reduce((s, t) => s + t.cy, 0) / list.length;
      // vague de ténèbres qui traverse jusqu'aux ennemis
      for (let k = 0; k < 6; k++) this.fx.flame(f.x + 20 + k * ((cx - f.x - 20) / 6), f.y, { scheme: sc, n: 8, speed: 70 });
      this.fx.voidOrb(cx, cy, { dur: 1.0 });
      yield 0.45;
      const hits = ab.hits || 4;
      for (let i = 0; i < hits; i++) {
        for (const t of alive()) {
          this.fx.crescent(t.cx + U.rand(-6, 6), t.cy + U.rand(-8, 8), { r: 22 + U.rand(0, 10), angle: U.rand(0, 6.28), span: 2.4, scheme: sc, flat: 0.7, tilt: U.rand(-1, 1), dur: 0.2 });
          this.fx.impact(t.cx, t.cy, { scheme: sc, spark: '#ff5a8a' });
          this.strike(f, t, ab, 1 / hits, { silent: i > 0 });
        }
        A().sfx('slash', 0.8 + i * 0.05);
        this.shake(4);
        yield 0.09;
      }
      this.fx.nova(cx, cy, { color: '#ff2a3a', dur: 0.8 });
      this.fx.groundRing(cx, list[0].y, { scheme: sc, r1: 80, dur: 0.6 });
      this.screenFlash = 0.7;
      this.flashColor = '#ff3048';
      A().sfx('explosion');
      yield 0.5;
      f.aura = 0;
    }

    *animMelee(f, ab, targets, thrust) {
      let tgt = targets[0];
      const d = this.dirOf(f);
      const hits = ab.hits || 1;
      const reach = tgt.sprite.w * (tgt.boss ? 0.32 : 0.4) + 14;
      yield* this.dashTo(f, tgt.x - d * reach, tgt.y + 1);
      const col = this.elemColor(f, ab);
      const sc = this.schemeOf(f, ab);
      const armed = !!(f.sprite && f.sprite.weapon) && !f.rig;
      for (let i = 0; i < hits; i++) {
        if (!tgt.alive) {
          const alt = this.foesOf(f).filter((e) => e.alive);
          if (!alt.length) break;
          tgt = alt[0];
        }
        if (f.rig) {
          const move = this.meleeMove(f, i, thrust);
          f.anim = move;
          f.at = 0;
          yield MR.HIT[move];
          A().sfx('slash', 1 + i * 0.05);
          if (move === 'thrust') {
            this.fx.thrust(tgt.cx - d * 8, tgt.cy, { color: this.elemColor(f, ab), dir: d, len: 44 });
            this.fx.speedLines(tgt.cx, tgt.cy, { dir: d, n: 8, h: 16 });
          } else if (move === 'slashA' || move === 'slashB') {
            this.fx.crescent(tgt.cx, tgt.cy, { r: 22 + (ab.power || 1) * 2, angle: move === 'slashA' ? 0.6 : -0.7, span: 2.6, dir: move === 'slashA' ? 1 : -1, scheme: sc, flat: 0.75, tilt: move === 'slashA' ? 0.3 : -0.3 });
          } else this.fx.crescent(tgt.cx - d * 6, tgt.cy, { r: 18, angle: 0.05, span: 1.8, scheme: sc, flat: 0.5 });
          this.hitFx(tgt, ab, f);
          this.strike(f, tgt, ab, 1 / hits);
          const rest = MR.seqDur(move) - MR.HIT[move];
          yield i === hits - 1 ? rest : Math.min(rest, 0.1);
          continue;
        } else if (thrust) {
          f.weaponRot = d * 1.45;
          yield* GS.tween(f, { offX: -4 * d }, 0.06);
          A().sfx('slash', 1.3);
          yield* GS.tween(f, { offX: 7 * d }, 0.04);
          this.fx.thrust(tgt.cx - d * 6, tgt.cy, { color: col, dir: d });
        } else if (armed) {
          const a0 = i % 2 === 0 ? -2.2 * d : 2.1 * d;
          const a1 = i % 2 === 0 ? 2.1 * d : -1.0 * d;
          yield* GS.tween(f, { weaponRot: a0, offX: -2 * d }, 0.06);
          A().sfx('slash', 1 + i * 0.05);
          yield* GS.tween(f, { weaponRot: a1, offX: 4 * d }, 0.05, E.outQuad);
          this.fx.crescent(tgt.cx, tgt.cy, { r: 18 + (ab.power || 1) * 2, angle: d > 0 ? 0.1 : Math.PI - 0.1, span: 2.2, dir: i % 2 ? -1 : 1, scheme: sc, flat: 0.6, tilt: i % 2 ? 0.5 : -0.4 });
        } else {
          yield* GS.tween(f, { offX: -6 * d, sy: 0.8, sx: 1.15 }, 0.08);
          yield* GS.tween(f, { offX: 8 * d, sy: 1.1, sx: 0.9 }, 0.06);
          if (ab.fx === 'bite') {
            this.fx.slash(tgt.cx, tgt.cy - 4, { color: '#ffffff', r: 9, angle: Math.PI / 2, dir: 1, flat: 1, width: 3 });
            this.fx.slash(tgt.cx, tgt.cy + 4, { color: '#ffffff', r: 9, angle: -Math.PI / 2, dir: 1, flat: 1, width: 3 });
          } else this.fx.crescent(tgt.cx, tgt.cy, { r: 16, angle: d > 0 ? 0 : Math.PI, span: 1.8, scheme: sc, flat: 0.6 });
        }
        this.hitFx(tgt, ab, f);
        this.strike(f, tgt, ab, 1 / hits);
        yield hits > 4 ? 0.04 : 0.08;
        f.sx = 1;
        f.sy = 1;
      }
      yield* GS.tween(f, { offX: 0 }, 0.08);
      yield 0.12;
      yield* this.dashBack(f);
    }

    *animSpin(f, ab, targets) {
      const d = this.dirOf(f);
      const alive = targets.filter((t) => t.alive);
      if (!alive.length) return;
      const cx = alive.reduce((s, t) => s + t.x, 0) / alive.length;
      const cy = alive.reduce((s, t) => s + t.y, 0) / alive.length;
      yield* this.dashTo(f, cx - d * 34, cy, 0.2);
      const hits = ab.hits || 3;
      const sc = this.schemeOf(f, ab);
      for (let i = 0; i < hits; i++) {
        f.flip = !f.flip;
        f.weaponRot = (i % 2 ? -2 : 2) * d;
        if (f.rig) {
          const blade = this.weaponOf(f) && this.weaponOf(f) !== 'pistol';
          f.anim = blade ? (i % 2 ? 'slashB' : 'slashA') : i % 2 ? 'kick' : 'cross';
          f.at = MR.HIT[f.anim] * 0.8;
        }
        A().sfx('slash', 0.9 + Math.random() * 0.3);
        for (const t of alive) {
          if (!t.alive) continue;
          this.fx.crescent(t.cx + U.rand(-4, 4), t.cy + U.rand(-4, 4), { r: 18, angle: Math.random() * 6, span: 2.2, dir: i % 2 ? 1 : -1, scheme: sc, flat: 0.6, tilt: U.rand(-1, 1) });
          this.hitFx(t, ab, f, true);
          this.strike(f, t, ab, 1 / hits, { silent: true });
        }
        A().sfx('hit');
        this.fx.groundRing(f.x, f.y, { scheme: sc, r0: 6, r1: 40, dur: 0.25, streaks: 4 });
        yield hits > 5 ? 0.06 : 0.11;
      }
      f.flip = false;
      yield 0.15;
      yield* this.dashBack(f);
    }

    *animRanged(f, ab, targets) {
      const d = this.dirOf(f);
      const gun = this.weaponOf(f) === 'pistol';
      if (f.rig) {
        const bow = this.weaponOf(f) === 'bow';
        f.anim = bow ? 'shoot' : gun ? 'fire' : 'cast';
        f.at = 0;
        yield bow ? MR.HIT.shoot : gun ? MR.HIT.fire : 0.12;
      }
      if (!gun) yield* GS.tween(f, { offX: -5 * d }, 0.1);
      const hits = ab.hits || 1;
      const col = this.elemColor(f, ab);
      const tasks = [];
      const kind = ab.fx === 'kunai' ? 'kunai' : ab.fx === 'harpoon' ? 'harpoon' : ab.fx === 'rock' ? 'rock' : ab.fx === 'bullet' ? 'bullet' : ab.fx === 'arrow' || ab.fx === 'arrows' || ab.fx === 'beam' ? 'arrow' : 'orb';
      if (ab.fx === 'beam') {
        const tgt = targets[0];
        A().sfx('light');
        const beam = this.fx.add({
          dur: 0.5,
          draw: (ctx, it) => {
            const p = it.t / it.dur;
            const w = 8 * (p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const x0 = f.cx + d * 10;
            const x1 = tgt.cx;
            R.rect(Math.min(x0, x1), tgt.cy - w / 2, Math.abs(x1 - x0), w, GS.EL[f.element].color);
            R.rect(Math.min(x0, x1), tgt.cy - w / 4, Math.abs(x1 - x0), Math.max(1, w / 2), '#ffffff');
            ctx.restore();
          },
        });
        for (let i = 0; i < hits; i++) {
          this.hitFx(tgt, ab, f);
          this.strike(f, tgt, ab, 1 / hits);
          yield 0.12;
        }
        yield* GS.until(() => beam.done);
      } else {
        for (let i = 0; i < hits; i++) {
          const list = ab.target === 'enemies' || ab.target === 'heroes' ? targets : [targets[0]];
          const m = gun ? this.muzzleFlash(f) : null;
          for (const t of list) {
            const rain = ab.fx === 'arrows';
            const sx = rain ? t.cx + U.rand(-30, 10) * d : m ? m.x : f.cx + d * 12;
            const sy = rain ? -10 : m ? m.y : f.cy - 2;
            const p = this.fx.projectile(sx, sy, t.cx + U.rand(-4, 4), t.cy + U.rand(-5, 5), { color: col, kind, dur: rain ? 0.28 : gun ? 0.12 : 0.2, arc: kind === 'rock' ? 18 : 0, size: gun ? 1 : 2 });
            tasks.push(
              this.co.run(
                function* () {
                  yield* GS.until(() => p.done);
                  if (!t.alive) {
                    const alt = this.foesOf(f).filter((e) => e.alive);
                    if (alt.length) this.strike(f, alt[0], ab, 1 / hits);
                    return;
                  }
                  this.hitFx(t, ab, f, true);
                  this.strike(f, t, ab, 1 / hits);
                }.call(this)
              )
            );
          }
          if (!gun) A().sfx('shoot');
          if (f.rig && this.weaponOf(f) === 'bow' && hits <= 4 && i < hits - 1) {
            f.anim = 'shoot';
            f.at = MR.HIT.shoot - 0.04;
          }
          // au pistolet : recul puis retour en joue entre deux tirs
          if (gun && i < hits - 1) {
            f.anim = 'fire';
            f.at = MR.HIT.fire;
          }
          yield hits > 4 ? 0.06 : 0.12;
        }
        yield tasks;
      }
      yield* GS.tween(f, { offX: 0 }, 0.12);
    }

    *castPose(f, color) {
      const d = this.dirOf(f);
      if (f.rig) {
        f.anim = 'cast';
        f.at = 0;
      }
      yield* GS.tween(f, { x: f.homeX + d * 8 }, 0.12);
      this.fx.magicCircle(f.x, f.y, { color, r: 20, dur: 1.0 });
      f.weaponRot = -0.2 * d;
      A().sfx('magic');
      for (let i = 0; i < 3; i++) {
        this.fx.burst(f.cx, f.cy - 4, { n: 6, color: [color, '#ffffff'], speed: 50, life: 0.3, jitter: 30, add: true });
        yield 0.1;
      }
    }

    *animMagic(f, ab, targets) {
      const col = f.def.fxColor || GS.EL[ab.element || f.element].color;
      yield* this.castPose(f, col);
      const hits = ab.hits || 1;
      const alive = () => targets.filter((t) => t.alive);
      const center = () => {
        const a = alive().length ? alive() : targets;
        return [a.reduce((s, t) => s + t.cx, 0) / a.length, a.reduce((s, t) => s + t.y, 0) / a.length, a.reduce((s, t) => s + t.cy, 0) / a.length];
      };
      const fxName = ab.fx;
      const d = this.dirOf(f);
      const sc = this.schemeOf(f, ab);
      if (fxName === 'tsunami') {
        A().sfx('water');
        const [cx, cy] = center();
        this.fx.wave(f.x + d * 10, cx + d * 80, cy + 4, { color: col, dur: 0.9 });
        for (let i = 0; i < hits; i++) {
          yield 0.6 / hits;
          for (const t of alive()) this.strike(f, t, ab, 1 / hits, { silent: i > 0 });
          this.shake(2);
        }
        yield 0.3;
      } else if (fxName === 'nova') {
        const [cx, , cy] = center();
        A().sfx('explosion');
        this.fx.nova(cx, cy, { color: col, dur: 1.0 });
        this.screenFlash = 0.7;
        this.flashColor = col;
        for (let i = 0; i < hits; i++) {
          this.fx.burst(cx, cy, { n: 30, color: [col, '#ffffff', U.shade(col, 0.5)], speed: 200, life: 0.6 });
          for (const t of alive()) this.strike(f, t, ab, 1 / hits, { silent: i > 0 });
          this.shake(5);
          yield 0.16;
        }
        yield 0.4;
      } else if (fxName === 'void') {
        const [cx, , cy] = center();
        A().sfx('dark');
        this.fx.voidOrb(cx, cy, { dur: 1.1 });
        yield 0.5;
        for (let i = 0; i < hits; i++) {
          for (const t of alive()) {
            t.kx = (cx - t.x) * 0.2;
            this.strike(f, t, ab, 1 / hits, { silent: i > 0 });
          }
          this.shake(3);
          yield 0.1;
        }
        this.fx.burst(cx, cy, { n: 40, color: ['#b464ff', '#ff60c0', '#ffffff'], speed: 220, life: 0.5 });
        A().sfx('explosion');
        yield 0.3;
      } else if (fxName === 'meteor') {
        for (let i = 0; i < hits; i++) {
          const list = alive();
          if (!list.length) break;
          const ps = list.map((t) => [this.fx.projectile(t.cx + 70 * d, -20, t.cx, t.y - 6, { color: '#ff7020', size: 5, dur: 0.32 }), t]);
          A().sfx('fire');
          yield* GS.until(() => ps.every(([p]) => p.done));
          for (const [, t] of ps) {
            this.fx.flash(t.cx, t.y - 6, { color: '#ff9030', r: 22, dur: 0.25 });
            this.fx.flame(t.cx, t.y, { scheme: 'fire', n: 20, w: 16 });
            this.fx.groundRing(t.cx, t.y, { scheme: 'fire', r1: 30, dur: 0.35, streaks: 5 });
            this.strike(f, t, ab, 1 / hits, { silent: true });
          }
          A().sfx('explosion');
          this.shake(4);
          yield 0.1;
        }
        yield 0.3;
      } else if (fxName === 'pillars') {
        for (let i = 0; i < hits; i++) {
          for (const t of alive()) {
            this.fx.pillar(t.cx + U.rand(-6, 6), t.y + 2, { color: col, w: 14, dur: 0.5 });
            this.fx.sparkle(t.cx, t.cy, { color: '#ffe060', size: 16 });
            this.strike(f, t, ab, 1 / hits, { silent: true });
          }
          A().sfx('light');
          this.shake(2);
          yield 0.14;
        }
        yield 0.3;
      } else if (fxName === 'quake') {
        A().sfx('earth');
        this.shake(6);
        for (let i = 0; i < hits; i++) {
          for (const t of alive()) {
            this.fx.spikes(t.cx, t.y + 2, { n: 5, h: 20, color: ab.element === 'fire' ? '#c05030' : '#9a8060' });
            this.fx.dust(t.cx, t.y, { n: 6, w: 20 });
            this.strike(f, t, ab, 1 / hits, { silent: true });
          }
          A().sfx('heavy');
          this.shake(4);
          yield 0.22;
        }
        yield 0.3;
      } else if (fxName === 'smoke') {
        for (const t of targets) this.fx.burst(t.cx, t.cy, { n: 30, color: ['#808890', '#b0b8c0', '#606870'], speed: 40, life: 1.0, size: 4, add: false, jitter: 20 });
        A().sfx('debuff');
        if (ab.power) for (const t of alive()) this.strike(f, t, ab, 1, { silent: true });
        yield 0.5;
      } else if (fxName === 'gaze') {
        // regard rouge : deux rayons depuis les yeux puis une onde sombre
        A().sfx('dark');
        const fr = f.rig ? f.art.frame(f.anim, f.at) : null;
        const ex = fr ? f.x - fr.foot.x + fr.head.x + 6 : f.cx + 6;
        const ey = fr ? f.y - fr.foot.y + fr.head.y + 4 : f.cy - 12;
        for (const t of alive()) {
          this.fx.add({
            dur: 0.4,
            draw: (ctx, it) => {
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = 1 - it.t / it.dur;
              ctx.strokeStyle = '#ff2a3a';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(ex, ey);
              ctx.lineTo(t.cx, t.cy - 6);
              ctx.stroke();
              ctx.restore();
            },
          });
          this.fx.sparkle(t.cx, t.cy - 6, { color: '#ff2a3a', size: 18 });
        }
        yield 0.25;
        for (const t of alive()) {
          this.fx.groundRing(t.x, t.y, { scheme: 'blood', r1: 26, dur: 0.4, streaks: 4 });
          this.strike(f, t, ab, 1, { silent: true });
        }
        A().sfx('hit');
        yield 0.4;
      } else {
        for (let i = 0; i < hits; i++) {
          const list = ab.target === 'enemies' || ab.target === 'heroes' ? alive() : alive().slice(0, 1);
          if (!list.length) break;
          if (fxName === 'fire' || fxName === 'dark') {
            const ps = list.map((t) => [this.fx.projectile(f.cx + d * 12, f.cy - 6, t.cx, t.cy, { color: col, size: 3, dur: 0.22, arc: 10 }), t]);
            A().sfx('shoot');
            yield* GS.until(() => ps.every(([p]) => p.done));
          }
          for (const t of list) {
            this.hitFx(t, ab, f);
            this.strike(f, t, ab, 1 / hits, { silent: true });
          }
          A().sfx(fxName in { fire: 1, water: 1, earth: 1, light: 1, dark: 1 } ? fxName : 'hit');
          yield 0.18;
        }
        yield 0.2;
      }
      f.weaponRot = f.idleRot();
      yield* GS.tween(f, { x: f.homeX }, 0.15);
    }

    *animSupport(f, ab, targets) {
      const col = ab.heal ? '#70ff90' : GS.EL[f.element].color;
      yield* this.castPose(f, col);
      for (const t of targets) {
        if (!t.alive && !ab.revive) continue;
        this.fx.magicCircle(t.x, t.y, { color: col, r: 16, dur: 0.7 });
        this.fx.ring(t.cx, t.cy, { color: col, r0: 20, r1: 4, dur: 0.4 });
        if (ab.fx === 'shield') this.fx.ring(t.cx, t.cy, { color: '#80c0ff', r0: 4, r1: 22, dur: 0.5, width: 2 });
        if (ab.fx === 'rage') {
          t.flash = 1;
          t.flashColor = '#ff3030';
          this.fx.flame(t.cx, t.y, { scheme: 'fire', n: 18, w: 14 });
        }
      }
      yield 0.35;
      f.weaponRot = f.idleRot();
      yield* GS.tween(f, { x: f.homeX }, 0.12);
    }

    hitFx(t, ab, f, small) {
      const fx = ab.fx;
      const x = t.cx;
      const y = t.cy;
      const n = small ? 8 : 14;
      const sc = this.schemeOf(f, ab);
      if (fx === 'fire') {
        this.fx.flash(x, y, { color: '#ff8030', r: small ? 10 : 16 });
        this.fx.flame(x, y + 6, { scheme: 'fire', n });
      } else if (fx === 'water') {
        this.fx.ring(x, y, { color: '#80d0ff', r0: 3, r1: 20, dur: 0.3 });
        this.fx.burst(x, y, { n, color: ['#3ea8ff', '#c0f0ff', '#ffffff'], speed: 110, life: 0.5, gravity: 260 });
      } else if (fx === 'earth') {
        this.fx.spikes(x, t.y + 2, { n: 3, h: 14 });
        this.fx.dust(x, t.y, { n: 5 });
      } else if (fx === 'light') {
        this.fx.pillar(x, t.y + 2, { color: '#ffe060', w: 8, dur: 0.35 });
        this.fx.sparkle(x, y, { color: '#ffe060', size: 14 });
      } else if (fx === 'dark') {
        this.fx.impact(x, y, { scheme: sc, spark: sc === 'blood' ? '#ff5a8a' : '#c070ff' });
      } else if (fx === 'heavy') {
        this.fx.impact(x, y, { scheme: 'white', big: true, spark: '#ffffff' });
        this.shake(3);
        GS.Audio.sfx('heavy');
      } else {
        this.fx.impact(x, y, { scheme: f.isHero ? 'white' : 'fire', spark: f.isHero ? '#ffffff' : '#ff8060' });
      }
    }

    // ================================================================= fin
    *victory() {
      this.ended = true;
      this.menu = null;
      A().stopMusic();
      A().sfx('victory');
      this.banner = { text: 'VICTOIRE !', sub: this.stage.name, color: '#ffd040', t: 0, dur: 99, win: true };
      for (const h of this.heroes) {
        if (!h.alive) continue;
        if (h.rig) {
          h.anim = 'victory';
          h.at = 0;
        } else {
          this.co.run(
            (function* () {
              for (let k = 0; k < 2; k++) {
                yield* GS.tween(h, { jump: 10 }, 0.18, E.outQuad);
                yield* GS.tween(h, { jump: 0 }, 0.18, E.inQuad);
              }
            })()
          );
        }
      }
      yield 2.4;
      const d = GS.data;
      const id = GS.stageId(this.ai, this.si);
      const rw = GS.stageRewards(this.stage);
      const first = !d.cleared[id];
      d.cleared[id] = true;
      const goldBonus = Math.min(0.5, this.heroes.reduce((a, h) => a + h.p('gold'), 0));
      const qGold = Math.round(rw.gold * (1 + goldBonus));
      d.gold += qGold + this.stolen + this.loot.gold;
      const items = this.loot.items.map((id) => GS.Equip.add(id));
      d.gems += (first ? rw.firstGems : 0) + this.loot.gems;
      d.stats.battles++;
      d.stats.wins++;
      const ups = GS.Save.teamUnits().map((u) => {
        const before = { level: u.level, xp: u.xp };
        const gained = GS.Save.addXp(u, rw.xp);
        return { uid: u.uid, before, gained };
      });
      GS.Save.save();
      GS.go(new GS.ResultScene({ win: true, ai: this.ai, si: this.si, gold: qGold, items, stolen: this.stolen, loot: this.loot, gems: first ? rw.firstGems : 0, xp: rw.xp, ups, first }));
    }

    *defeat() {
      this.ended = true;
      this.menu = null;
      A().stopMusic();
      A().sfx('defeat');
      this.banner = { text: 'DÉFAITE...', sub: "L'équipe est à terre", color: '#ff5060', t: 0, dur: 99 };
      yield 2.4;
      GS.data.stats.battles++;
      GS.data.gold += Math.floor(this.loot.gold / 2);
      GS.Save.save();
      GS.go(new GS.ResultScene({ win: false, ai: this.ai, si: this.si }));
    }

    // ================================================================= mise à jour
    warmUp(f, names) {
      const rig = f.art.rig;
      this.warm.push(...rig.warmList(names));
      // morceaux du corps pour le gore (en cache, partagés entre persos identiques)
      for (const s of ['F', 'B']) for (const n of ['up', 'low', 'hand', 'thigh', 'shin', 'foot', 'arm', 'lo', 'fist', 'knee', 'leg']) this.warm.push(() => rig.partCanvas(n + s));
      for (const n of ['head', 'chest', 'pelvis']) this.warm.push(() => rig.partCanvas(n));
    }

    update(dt) {
      this.t += dt;
      // pré-calcul des poses : au plus ~2 ms par image
      if (this.warm.length) {
        const t0 = performance.now();
        while (this.warm.length && performance.now() - t0 < 2) this.warm.shift()();
      }
      this.handleTopButtons();
      if (this.paused) {
        this.handlePause();
        return;
      }
      let wdt = dt * this.speed;
      if (this.hitstop > 0) {
        this.hitstop -= dt;
        wdt *= 0.1;
      }
      // coup final : ralenti et zoom
      if (this.slowmo > 0) {
        this.slowmo -= dt;
        wdt *= 0.3;
      }
      if (this.zoom) {
        this.zoom.t += dt;
        if (this.zoom.t >= this.zoom.dur) this.zoom = null;
      }
      if (this.mode === 'explore' && !this.ended) this.updateExplore(dt);
      this.handleMenu();
      this.co.update(wdt);
      this.fx.update(wdt);
      this.gore.update(wdt);
      for (const f of this.fighters) {
        f.flash = Math.max(0, f.flash - wdt * 4);
        f.kx = (f.kx || 0) * Math.pow(0.0001, wdt);
        if (Math.abs(f.kx) < 0.3) f.kx = 0;
        if (f.rig && (this.mode === 'battle' || !f.isHero)) f.at += wdt;
        else if (!f.isHero) f.at = (f.at || 0) + wdt;
        const target = f.hp / f.maxHp;
        f.hpGhost = f.hpGhost > target ? Math.max(target, f.hpGhost - wdt * 0.5) : target;
        f.shownHp = U.approach(f.shownHp, f.hp, Math.max(1, Math.abs(f.hp - f.shownHp) * wdt * 8));
        if (f.after) (f.trail || (f.trail = [])).push({ x: f.x + f.offX, y: f.y + f.offY, a: 0.55, img: this.fighterImage(f) });
        if (f.trail) {
          for (const p of f.trail) p.a -= wdt * 3;
          f.trail = f.trail.filter((p) => p.a > 0);
        }
        if (f.aura && f.alive && Math.random() < wdt * 30) this.fx.flame(f.x + U.rand(-14, 14), f.y, { scheme: 'blood', n: 2, speed: 60, w: 8 });
      }
      this.cam.shake = Math.max(0, this.cam.shake - wdt * 18);
      this.screenFlash = Math.max(0, this.screenFlash - wdt * 2.5);
      if (this.banner) this.banner.t += wdt;
      if (this.banner && this.banner.t > this.banner.dur) this.banner = null;
      if (this.abName) {
        this.abName.t += wdt;
        if (this.abName.t > 2.0) this.abName = null;
      }
      if (this.cutin) this.cutin.t += wdt;
      if (this.mode === 'battle' && !this.ended && (this.active || this.menu)) this.timeline = B.predict(this.fighters, 8, this.active);
    }

    handleTopButtons() {
      const inp = I();
      if (this.ended) return;
      const [ax, ay, aw, ah] = TOPBTN.auto;
      if (inp.clicked(ax, ay, aw, ah) || inp.hit('KeyT')) {
        inp.consume();
        this.auto = !this.auto;
        GS.data.settings.auto = this.auto;
        GS.Save.save();
        A().sfx('select');
      }
      const [sx, sy, sw, sh] = TOPBTN.speed;
      if (inp.clicked(sx, sy, sw, sh) || inp.hit('KeyF')) {
        inp.consume();
        this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
        GS.data.settings.speed = this.speed;
        GS.Save.save();
        A().sfx('select');
      }
      const [px, py, pw, ph] = TOPBTN.pause;
      if (inp.clicked(px, py, pw, ph) || inp.hit('KeyP') || (inp.hit('Escape') && !(this.menu && this.menu.state !== 'main'))) {
        inp.consume();
        this.paused = !this.paused;
        A().sfx('select');
      }
    }

    pauseRects() {
      return { resume: [W() / 2 - 70, 116, 140, 20], quit: [W() / 2 - 70, 144, 140, 20] };
    }

    handlePause() {
      const inp = I();
      const r = this.pauseRects();
      if (inp.clicked(...r.resume) || inp.hit('confirm')) {
        inp.consume();
        this.paused = false;
        A().sfx('confirm');
      } else if (inp.clicked(...r.quit)) {
        inp.consume();
        A().sfx('back');
        this.ended = true;
        A().stopMusic();
        GS.go(new GS.QuestScene(this.ai));
      }
    }

    cmdRect(i) {
      return [CMD.x + 8 - i * 3, CMD.y + 4 + i * 12, CMD.w - 8, 11];
    }
    skillRect(i) {
      return [178, 160 + i * 18, 296, 17];
    }

    itemEnabled(f, type) {
      if (type === 'attack') return true;
      if (type === 'skill') return f.def.skills.some((s) => s.mp <= f.mp);
      if (type === 'special') return f.sp >= 100;
      if (type === 'overlimit') return f.sl >= 100;
      return false;
    }

    hitFighter(list, x, y) {
      for (const f of list) {
        if (!f.alive) continue;
        const w = Math.max(22, f.sprite.w * 0.7, f.rig ? 28 : 0);
        const top = f.y - f.h - (f.fly ? 16 : 0);
        const sx = f.x - this.cam.x;
        if (U.inRect(x, y, sx - w / 2, top, w, f.h + 8)) return f;
      }
      return null;
    }

    validTargets(m) {
      const ab = m.pending.ab;
      if (ab.target === 'ally') return this.heroes.filter((h) => h.alive);
      return this.enemies.filter((e) => e.alive);
    }

    choose(f, type, ab) {
      const m = this.menu;
      if (type === 'skill' && !ab) {
        m.state = 'skills';
        m.sidx = 0;
        return;
      }
      if (!ab) ab = type === 'attack' ? B.basic(f) : f.def[type];
      if (ab.target === 'enemy' || ab.target === 'ally') {
        m.prev = m.state;
        m.state = 'target';
        m.pending = { type, ab };
        const list = this.validTargets(m);
        let idx = 0;
        if (ab.target === 'enemy' && this.lastTarget && list.includes(this.lastTarget)) idx = list.indexOf(this.lastTarget);
        if (ab.target === 'ally') idx = list.indexOf(list.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]);
        m.tidx = Math.max(0, idx);
        return;
      }
      let targets;
      if (ab.target === 'enemies') targets = this.enemies.filter((e) => e.alive);
      else if (ab.target === 'allies') targets = this.heroes.filter((h) => h.alive || ab.revive);
      else targets = [f];
      this.command = { type, ab, targets };
    }

    handleMenu() {
      const m = this.menu;
      if (!m || this.command || this.paused) return;
      const inp = I();
      const f = m.f;
      const click = inp.click;
      if (m.state === 'main') {
        if (inp.hit('up')) {
          m.idx = (m.idx + 3) % 4;
          A().sfx('select');
        }
        if (inp.hit('down')) {
          m.idx = (m.idx + 1) % 4;
          A().sfx('select');
        }
        let pick = -1;
        if (click) {
          for (let i = 0; i < 4; i++) if (U.inRect(click.x, click.y, ...this.cmdRect(i))) pick = i;
          if (pick < 0) {
            const e = this.hitFighter(this.enemies, click.x, click.y);
            if (e) {
              inp.consume();
              A().sfx('confirm');
              this.lastTarget = e;
              this.command = { type: 'attack', ab: B.basic(f), targets: [e] };
              return;
            }
          }
        }
        if (inp.hit('confirm')) pick = m.idx;
        if (pick >= 0) {
          inp.consume();
          m.idx = pick;
          const type = CMD_ITEMS[pick].type;
          if (!this.itemEnabled(f, type)) {
            A().sfx('error');
            GS.UI.toast(type === 'special' ? 'SP insuffisants (100% requis)' : type === 'overlimit' ? 'Jauge SL pas encore pleine' : 'MP insuffisants');
            return;
          }
          A().sfx('confirm');
          this.choose(f, type);
        }
      } else if (m.state === 'skills') {
        const sk = f.def.skills;
        const n = sk.length + 1;
        if (inp.hit('up')) {
          m.sidx = (m.sidx + n - 1) % n;
          A().sfx('select');
        }
        if (inp.hit('down')) {
          m.sidx = (m.sidx + 1) % n;
          A().sfx('select');
        }
        let pick = -1;
        if (click) {
          for (let i = 0; i < n; i++) if (U.inRect(click.x, click.y, ...this.skillRect(i))) pick = i;
          if (pick < 0 && !U.inRect(click.x, click.y, 174, 156, 304, 60)) pick = sk.length;
        }
        if (inp.hit('confirm')) pick = m.sidx;
        if (inp.hit('back')) pick = sk.length;
        if (pick >= 0) {
          inp.consume();
          if (pick === sk.length) {
            A().sfx('back');
            m.state = 'main';
            return;
          }
          const s = sk[pick];
          if (s.mp > f.mp) {
            A().sfx('error');
            GS.UI.toast('MP insuffisants');
            return;
          }
          A().sfx('confirm');
          this.choose(f, 'skill', s);
        }
      } else if (m.state === 'target') {
        const list = this.validTargets(m);
        if (!list.length) {
          m.state = 'main';
          return;
        }
        m.tidx = U.clamp(m.tidx, 0, list.length - 1);
        if (inp.hit('up') || inp.hit('left')) {
          m.tidx = (m.tidx + list.length - 1) % list.length;
          A().sfx('select');
        }
        if (inp.hit('down') || inp.hit('right')) {
          m.tidx = (m.tidx + 1) % list.length;
          A().sfx('select');
        }
        let target = null;
        if (click) {
          target = this.hitFighter(list, click.x, click.y);
          if (!target) for (let i = 0; i < 4; i++) if (U.inRect(click.x, click.y, ...this.cmdRect(i))) target = 'back';
        }
        if (inp.hit('confirm')) target = list[m.tidx];
        if (inp.hit('back') || target === 'back') {
          inp.consume();
          A().sfx('back');
          m.state = m.prev || 'main';
          return;
        }
        if (target) {
          inp.consume();
          A().sfx('confirm');
          if (!target.isHero) this.lastTarget = target;
          this.command = { type: m.pending.type, ab: m.pending.ab, targets: [target] };
        }
      }
    }

    // ================================================================= rendu
    fighterImage(f) {
      if (f.rig) return f.art.frameMix(f.anim, f.at).canvas;
      const sp = f.sprite;
      if (sp.frames && f.alive) return sp.frames[Math.floor((f.at || 0) * 5 + f.slot) % sp.frames.length];
      return sp.body;
    }
    // Silhouette colorée (flash, aura) d'une image, en cache.
    sil(img, color) {
      let m = SIL.get(img);
      if (!m) SIL.set(img, (m = {}));
      return m[color] || (m[color] = GS.Pix.silhouette(img, color));
    }

    draw(ctx) {
      const shx = this.cam.shake ? U.rand(-1, 1) * this.cam.shake : 0;
      const shy = this.cam.shake ? U.rand(-1, 1) * this.cam.shake * 0.6 : 0;
      ctx.save();
      const z = this.zoom;
      if (z) {
        // monte vite, tient, puis revient
        const p = z.t / z.dur;
        const k = 1 + (z.k - 1) * (p < 0.15 ? E.outQuad(p / 0.15) : p > 0.7 ? 1 - E.inOutQuad((p - 0.7) / 0.3) : 1);
        const fx = z.x - this.cam.x;
        ctx.translate(fx, z.y);
        ctx.scale(k, k);
        ctx.translate(-fx, -z.y);
      }
      GS.BG.draw(this.area.bg, this.t, this.cam.x + shx, shy);
      ctx.save();
      ctx.translate(Math.round(-this.cam.x + shx), Math.round(shy));
      this.gore.drawDecals(ctx, this.cam.x);
      if (this.dim > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        R.fade(this.dim * 0.8, '#05030c');
        ctx.restore();
      }
      this.drawPickups();
      this.fx.draw(ctx, true);
      for (const f of this.fighters) {
        if (f.gibbed || (f.ko >= 1 && !f.isHero)) continue;
        ctx.globalAlpha = (1 - (f.isHero ? 0 : f.ko)) * 0.4;
        R.ellipse(f.x + f.offX + (f.kx || 0), f.y + 1, Math.max(8, f.rig ? 15 * (f.rscale || 1) : f.sprite.w * 0.3), 3, '#000000');
        ctx.globalAlpha = 1;
      }
      const act = this.active;
      if (act && act.alive && !this.ended && this.mode === 'battle') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + Math.sin(this.t * 6) * 0.2;
        ctx.strokeStyle = act.isHero ? '#3ee0f0' : '#ff5060';
        ctx.beginPath();
        ctx.ellipse(act.x + act.offX, act.y + 1, 16, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const order = this.fighters.slice().sort((a, b) => a.y - b.y);
      for (const f of order) this.drawFighter(ctx, f);
      this.gore.draw(ctx);
      this.fx.draw(ctx, false);
      this.drawTargetCursor();
      this.fx.drawPops();
      ctx.restore();
      ctx.restore();
      ctx.drawImage(vignette(), 0, 0);
      if (this.screenFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        R.fade(this.screenFlash * 0.8, this.flashColor);
        ctx.restore();
      }
      if (this.mode === 'explore' && !this.ended) this.drawExploreHUD();
      else this.drawHUD(ctx);
      if (this.cutin) this.drawCutin(ctx);
      if (this.banner) this.drawBanner(ctx);
      if (this.paused) this.drawPause();
    }

    drawPickups() {
      const ctx = GS.ctx;
      for (const p of this.pickups) {
        if (p.taken) {
          continue;
        }
        if (p.x < this.cam.x - 20 || p.x > this.cam.x + W() + 20) continue;
        const bob = Math.round(Math.sin(p.t * 4) * 2);
        R.ellipse(p.x, p.y + 1, 5, 1, 'rgba(0,0,0,0.35)');
        if (p.type === 'chest') {
          R.rect(p.x - 9, p.y - 12, 18, 12, '#8a4a20');
          R.rect(p.x - 9, p.y - 12, 18, 4, '#b06a30');
          R.rect(p.x - 9, p.y - 8, 18, 1, '#ffd040');
          R.rect(p.x - 2, p.y - 9, 4, 4, '#ffd040');
          R.frame(p.x - 10, p.y - 13, 20, 14, '#2a1408');
        } else {
          const ic = GS.Icons.get(p.type === 'gem' ? 'gem' : 'gold');
          ctx.drawImage(ic, Math.round(p.x - ic.width / 2), Math.round(p.y - 12 + bob));
          if (Math.sin(p.t * 3) > 0.9) R.rect(p.x - 1, p.y - 11 + bob, 2, 2, '#ffffff');
        }
      }
    }

    drawFighter(ctx, f) {
      if (f.gibbed || (!f.isHero && f.ko >= 1)) return;
      if (f.x < this.cam.x - 80 || f.x > this.cam.x + W() + 80) return;
      const sp = f.sprite;
      const flyY = f.fly ? -16 + Math.sin(this.t * 4 + f.slot) * 3 : 0;
      const x = f.x + f.offX + (f.kx || 0);
      const y = f.y + f.offY + flyY - (f.jump || 0);
      if (f.rig) {
        const fr = f.art.frameMix(f.anim, f.at);
        const img = fr.canvas;
        const rs = f.rscale || 1;
        if (f.trail && f.trail.length) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (const p of f.trail) {
            ctx.globalAlpha = p.a * 0.5;
            const g = f.art.silhouette(p.img, f.def.fxColor || (f.isHero ? '#60e8ff' : '#ff4060'));
            ctx.save();
            ctx.translate(Math.round(p.x), Math.round(p.y));
            if (f.dir < 0) ctx.scale(-1, 1);
            if (rs !== 1) ctx.scale(rs, rs);
            ctx.drawImage(g, -fr.foot.x, -fr.foot.y);
            ctx.restore();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (f.ko > 0) {
          ctx.rotate(-f.ko * 1.4);
          ctx.globalAlpha = 1 - f.ko * 0.4;
        }
        if (f.dir < 0 || f.flip) ctx.scale(-1, 1);
        if (rs !== 1) ctx.scale(rs, rs);
        if (f.aura || f.charging) {
          const red = f.art.silhouette(img, '#ff2040');
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.45 + Math.sin(this.t * 24) * 0.2;
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(red, -fr.foot.x + dx, -fr.foot.y + dy);
          ctx.restore();
        }
        ctx.drawImage(img, -fr.foot.x, -fr.foot.y);
        if (f.flash > 0) {
          ctx.globalAlpha = Math.min(1, f.flash);
          ctx.drawImage(f.art.silhouette(img, f.flashColor || '#ffffff'), -fr.foot.x, -fr.foot.y);
        }
        ctx.restore();
        // yeux rouges qui brillent
        if (f.def.fxColor && f.alive && fr.head) {
          const ex = x + (fr.head.x - fr.foot.x) * (f.dir < 0 ? -1 : 1);
          const ey = y + fr.head.y - fr.foot.y + 4;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.25 + Math.sin(this.t * 3) * 0.1;
          R.circle(ex + 2 * f.dir, ey, 3, '#ff2a3a');
          ctx.restore();
        }
      } else {
        const img = this.fighterImage(f);
        if (f.trail && f.trail.length) {
          const ghost = this.sil(sp.body, f.isHero ? '#60e8ff' : '#ff6080');
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (const p of f.trail) {
            ctx.globalAlpha = p.a * 0.5;
            ctx.drawImage(ghost, Math.round(p.x - sp.foot.x), Math.round(p.y + flyY - sp.foot.y));
          }
          ctx.restore();
        }
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (f.ko > 0) {
          if (f.isHero) {
            ctx.rotate(-f.ko * 1.45);
            ctx.globalAlpha = 1 - f.ko * 0.45;
          } else {
            ctx.globalAlpha = 1 - f.ko;
            ctx.scale(1 + f.ko * 0.3, 1 - f.ko * 0.5);
          }
        }
        if (f.rot) ctx.rotate(f.rot);
        ctx.scale((f.flip ? -1 : 1) * f.sx, f.sy);
        const ox = -sp.foot.x;
        const oy = -sp.foot.y;
        if (f.charging) {
          const red = this.sil(img, '#ff2040');
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.4 + Math.sin(this.t * 10) * 0.25;
          for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.drawImage(red, ox + dx, oy + dy);
          ctx.restore();
        }
        const breathe = Math.sin(this.t * 3 + f.slot * 1.7) > 0.2 ? 1 : 0;
        if (sp.humanoid || f.isHero) {
          const sc = sp.scale || 1;
          const split = 15 * sc;
          ctx.drawImage(img, 0, 0, sp.w, split, ox, oy + breathe * sc, sp.w, split);
          ctx.drawImage(img, 0, split, sp.w, sp.h - split, ox, oy + split, sp.w, sp.h - split);
        } else if (f.alive && !f.fly && !sp.frames) {
          ctx.drawImage(img, ox, oy + breathe, sp.w, sp.h - breathe);
        } else ctx.drawImage(img, ox, oy);
        if (f.flash > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, f.flash);
          ctx.drawImage(this.sil(img, f.flashColor || '#ffffff'), ox, oy);
          ctx.restore();
        }
        if (sp.weapon) {
          const isBow = f.isHero && f.def.look.weapon === 'bow';
          ctx.save();
          ctx.translate(ox + sp.hand.x, oy + sp.hand.y);
          ctx.rotate(isBow ? 0 : f.weaponRot);
          ctx.drawImage(sp.weapon, -sp.grip[0], -sp.grip[1]);
          if (f.flash > 0 && sp.weaponWhite) {
            ctx.globalAlpha = Math.min(1, f.flash);
            ctx.drawImage(sp.weaponWhite, -sp.grip[0], -sp.grip[1]);
          }
          ctx.restore();
        }
        ctx.restore();
      }
      // barres de vie et statuts
      if (f.alive && !this.ended && (this.mode === 'battle' || !f.isHero)) {
        const bw = f.boss ? 50 : 30;
        const bx = Math.round(f.x + f.offX - bw / 2);
        const by = Math.round(f.y + 5);
        R.bar(bx, by, bw, 4, f.hp / f.maxHp, f.isHero ? '#40f080' : '#ff4058', f.isHero ? '#a0ffb0' : '#ff9060', { ghost: f.hpGhost, frame: 'rgba(0,0,0,0.8)' });
        if (!f.isHero) GS.Icons.draw(f.element, bx - 11, by - 3);
        let sx = bx;
        for (const s of f.statuses.slice(0, 6)) {
          const st = GS.STATUS[s.type];
          R.rect(sx, by + 5, 5, 4, st.color);
          R.frame(sx, by + 5, 5, 4, 'rgba(0,0,0,0.7)');
          sx += 6;
        }
        if (f.charging) F().draw('!', f.x + f.offX, f.topY - 14 + Math.sin(this.t * 10) * 2, { color: '#ff3048', outline: '#000', scale: 2, align: 'center' });
      }
    }

    drawTargetCursor() {
      const m = this.menu;
      if (!m || m.state !== 'target') return;
      const list = this.validTargets(m);
      const t = list[U.clamp(m.tidx, 0, list.length - 1)];
      if (!t) return;
      const by = Math.round(t.topY - (t.fly ? 24 : 10) + Math.sin(this.t * 8) * 2);
      const x = Math.round(t.x + t.offX);
      const c = m.pending.ab.target === 'ally' ? '#70ff90' : '#ffe040';
      for (let i = 0; i < 6; i++) R.rect(x - 5 + i, by + i, 11 - i * 2, 1, c);
      F().draw(t.name, x, by - 11, { color: '#ffffff', outline: '#000', align: 'center' });
    }

    // Liste des passifs d'un combattant (cadre centré en (cx, y)).
    drawPassiveBox(f, cx, y) {
      if (!f.passives.length) return;
      const P = GS.Passives;
      const rows = f.passives.map((id) => [GS.PASSIVES[id].name, P.desc(id), P.color(id, this.t)]);
      const w = Math.min(W() - 20, Math.max(...rows.map(([n, d]) => F().width(n) + F().width(d) + 14)) + 10);
      const h = 12 + rows.length * 9;
      R.panel(Math.round(cx - w / 2), y, w, h, { cut: 4 });
      F().draw('PASSIFS · ' + f.name, cx, y + 3, { color: R.COL.cyan, align: 'center' });
      rows.forEach(([n, d, col], i) => {
        const ly = y + 12 + i * 9;
        const lx = Math.round(cx - w / 2) + 5;
        F().draw(n, lx, ly, { color: col });
        let dd = d;
        const room = w - 14 - F().width(n);
        while (dd && F().width(dd) > room) dd = dd.slice(0, -2);
        if (dd !== d) dd = dd.trimEnd() + '...';
        F().draw(dd, lx + F().width(n) + 6, ly, { color: '#c8d8e0' });
      });
    }

    // ---------------------------------------------------------------- interface
    drawExploreHUD() {
      const ctx = GS.ctx;
      // haut : quête et progression
      R.panel(4, 4, 200, 26, { cut: 5 });
      F().draw(this.stage.name, 10, 8, { color: R.COL.cyan, outline: '#04101a' });
      const lead = this.leader();
      const prog = U.clamp(lead.x / this.levelLen, 0, 1);
      R.bar(10, 19, 170, 5, prog, '#3ee0f0', '#a0f8ff', { frame: false });
      this.groups.forEach((g) => {
        const gx = 10 + (g.x / this.levelLen) * 170;
        R.rect(gx - 1, 17, 3, 9, g.done ? '#5a6870' : g.boss ? '#ff3048' : '#ffd040');
      });
      F().draw('★', 186, 17, { color: '#ff3048' });
      this.drawTopButtons();
      // butin ramassé
      const lx = W() - 120;
      R.panel(lx, 4, 116, 16, { cut: 4 });
      GS.Icons.draw('gold', lx + 4, 7);
      F().draw(U.fmt(this.loot.gold), lx + 16, 8, { color: '#ffe080' });
      GS.Icons.draw('gem', lx + 64, 6);
      F().draw(U.fmt(this.loot.gems), lx + 76, 8, { color: '#a0e0ff' });
      // bas : équipe + flèches
      const y = HUD_Y + 6;
      this.heroes.forEach((h, i) => {
        const x = 52 + i * 128;
        R.panel(x, y, 122, 34, { cut: 5 });
        GS.Art.portrait(h.def, x + 3, y + 3, 26, 28, 1, { dark: !h.alive });
        F().draw(h.name, x + 32, y + 5, { color: h.alive ? '#ffffff' : '#7a7a7a' });
        R.bar(x + 32, y + 15, 84, 4, h.hp / h.maxHp, '#30d070', '#a0ff90', { frame: false });
        F().draw(`${h.hp}/${h.maxHp}`, x + 32, y + 22, { color: '#a0ffb0' });
      });
      const blink = Math.sin(this.t * 6) > 0 ? 1 : 0.6;
      ctx.save();
      ctx.globalAlpha = 0.85;
      R.panel(W() - 46, y, 42, 34, { cut: 6, border: '#ffe060' });
      F().draw('▶', W() - 25, y + 11, { color: '#ffe060', scale: 2, align: 'center', alpha: blink });
      R.panel(4, y, 42, 34, { cut: 6 });
      F().draw('<', 25, y + 11, { color: '#ffffff', scale: 2, align: 'center' });
      ctx.restore();
      if (this.hint < 6 && !this.auto) F().draw("Maintiens ▶ (ou la droite de l'écran) pour avancer", W() / 2, HUD_Y - 10, { color: '#ffffff', outline: '#000', align: 'center', alpha: Math.min(1, 6 - this.hint) });
    }

    drawHUD() {
      if (this.ended && this.banner && this.banner.win) return;
      this.drawTimeline();
      this.drawTopButtons();
      this.drawEnemyInfo();
      this.drawHeroPanel(this.focus || this.heroes[0]);
      this.drawCommandMenu();
      this.drawParty();
      if (this.menu && this.menu.state === 'skills') this.drawSkillMenu();
      if (this.abName) this.drawAbilityName();
      if (this.menu && this.menu.state === 'target') {
        const txt = this.menu.pending.ab.target === 'ally' ? 'Choisis un allié' : 'Choisis une cible';
        R.panel(W() / 2 - 56, 30, 112, 14, { cut: 4 });
        F().draw(txt, W() / 2, 34, { color: '#ffe060', align: 'center' });
        const list = this.validTargets(this.menu);
        const t = list[U.clamp(this.menu.tidx, 0, list.length - 1)];
        if (t) this.drawPassiveBox(t, W() / 2, 48);
      }
    }

    drawTimeline() {
      const x0 = 4;
      const y0 = 4;
      R.panel(x0, y0, 160, 20, { cut: 4 });
      F().draw('TOURS', x0 + 6, y0 + 7, { color: R.COL.dim });
      const list = this.timeline.slice(0, 7);
      list.forEach((f, i) => {
        const x = x0 + 36 + i * 17;
        const s = i === 0 ? 16 : 14;
        const y = y0 + 2 + (i === 0 ? 0 : 1);
        R.rect(x, y, s, s, f.isHero ? '#0a2a48' : '#3a0a18');
        if (f.isHero) GS.Art.portrait(f.def, x + 1, y + 1, s - 2, s - 2, f.rig ? 0.5 : 1, {});
        else if (f.rig) {
          const fr = f.art.frame('idle', 0);
          clipDraw(fr.canvas, x + 1, y + 1, s - 2, s - 2, fr.head.x, fr.head.y + 2, true);
        } else clipDraw(f.sprite.body, x + 1, y + 1, s - 2, s - 2, f.sprite.w / 2, f.sprite.h * 0.35);
        R.frame(x, y, s, s, i === 0 ? '#ffffff' : f.isHero ? '#3ea8ff' : '#ff5060');
      });
    }

    drawTopButtons() {
      const btn = (r, label, on) => {
        R.panel(r[0], r[1], r[2], r[3], { cut: 3, border: on ? '#ffe060' : R.COL.border, fill: on ? 'rgba(80,60,0,0.85)' : R.COL.panel, inner: false });
        F().draw(label, r[0] + r[2] / 2, r[1] + 4, { color: on ? '#ffe060' : '#ffffff', align: 'center' });
      };
      btn(TOPBTN.auto, 'AUTO', this.auto);
      btn(TOPBTN.speed, 'x' + this.speed, this.speed > 1);
      btn(TOPBTN.pause, 'II', this.paused);
    }

    drawEnemyInfo() {
      const boss = this.enemies.find((e) => e.boss && e.alive);
      if (boss) {
        const w = 190;
        const x = W() - w - 4;
        const y = 3;
        R.panel(x, y + 9, w, 20, { cut: 5 });
        F().draw(boss.name, x + w - 4, y, { color: R.COL.cyan, outline: '#04101a', align: 'right' });
        F().draw('HP', x + 7, y + 14, { color: '#3ee0f0' });
        F().draw(`${Math.round(boss.shownHp)}/${boss.maxHp}`, x + w - 7, y + 14, { color: '#5aa0ff', outline: '#04101a', align: 'right' });
        R.bar(x + 22, y + 23, w - 30, 3, boss.hp / boss.maxHp, '#ff3058', '#ffa040', { ghost: boss.hpGhost, frame: false });
        let px = x + w - 4;
        for (const id of boss.passives.slice().reverse()) {
          const n = GS.PASSIVES[id].name;
          F().draw(n, px, y + 32, { color: GS.Passives.color(id, this.t), outline: '#04101a', align: 'right' });
          px -= F().width(n) + 6;
        }
        GS.Icons.draw(boss.element, x - 9, y + 13);
      } else {
        F().draw(`VAGUE ${this.wave + 1}/${this.stage.waves.length}`, W() - 6, 8, { color: R.COL.cyan, outline: '#04101a', align: 'right' });
      }
    }

    drawHeroPanel(f) {
      if (!f) return;
      const x = 4;
      const y = HUD_Y;
      const w = 176;
      const h = 46;
      const ctx = GS.ctx;
      R.panel(x, y, w, h, { cut: 6 });
      ctx.save();
      ctx.globalAlpha = 0.25;
      R.line(x + 84, y + 4, x + 104, y + 24, R.COL.border);
      R.line(x + 104, y + 24, x + 170, y + 24, R.COL.border);
      ctx.restore();
      GS.Art.portrait(f.def, x + 112, y + 2, 62, h - 4, f.rig ? 1 : 2, { dark: !f.alive });
      const lx = x + 6;
      F().draw('HP', lx, y + 5, { color: '#3e8cff', outline: '#04101a' });
      F().draw(`${Math.round(f.shownHp)}/${f.maxHp}`, lx + 16, y + 5, { color: '#5ab0ff', outline: '#04101a' });
      R.bar(lx, y + 13, 100, 3, f.hp / f.maxHp, '#30d070', '#a0ff90', { ghost: f.hpGhost, frame: false });
      F().draw('MP', lx, y + 19, { color: '#c070ff', outline: '#04101a' });
      F().draw(`${f.mp}/${f.maxMp}`, lx + 16, y + 19, { color: '#e0d0ff', outline: '#04101a' });
      F().draw('SP', lx, y + 28, { color: '#3ec8ff', outline: '#04101a' });
      F().draw(`${Math.round(f.sp)}%`, lx + 16, y + 28, { color: f.sp >= 100 ? '#ffffff' : '#a0e8ff', outline: '#04101a' });
      R.bar(lx + 44, y + 29, 56, 4, f.sp / 100, '#2a9aff', '#80e8ff', { frame: false });
      const slc = f.sl >= 100 ? GS.rainbow(this.t) : '#ffe040';
      F().draw('SL', lx, y + 37, { color: '#ffd040', outline: '#04101a' });
      F().draw(`${Math.round(f.sl)}%`, lx + 16, y + 37, { color: slc, outline: '#04101a' });
      R.bar(lx + 44, y + 38, 56, 4, f.sl / 100, '#ffa020', f.sl >= 100 ? slc : '#fff080', { frame: false });
      if (!f.alive) F().draw('K.O.', x + 142, y + 18, { color: '#ff5060', outline: '#000', scale: 2, align: 'center' });
    }

    drawCommandMenu() {
      const m = this.menu;
      const f = m ? m.f : null;
      const ctx = GS.ctx;
      const active = !!m && !this.auto;
      ctx.save();
      if (!active) ctx.globalAlpha = 0.55;
      const { x, y, w, h } = CMD;
      R.poly([[x + 16, y], [x + w, y], [x + w, y + h - 6], [x + w - 6, y + h], [x, y + h], [x + 4, y + 20]], R.COL.panel, R.COL.border);
      CMD_ITEMS.forEach((it, i) => {
        const [rx, ry, rw, rh] = this.cmdRect(i);
        const en = f ? this.itemEnabled(f, it.type) : false;
        const sel = active && m.state === 'main' && m.idx === i;
        const hover = active && I().over(rx, ry, rw, rh);
        if (sel || hover) R.gradH(rx, ry, rw, rh, 'rgba(62,224,240,0.05)', 'rgba(62,224,240,0.45)');
        let col = en ? '#ffffff' : '#6a8890';
        if (it.type === 'overlimit' && en) col = GS.rainbow(this.t, i * 40);
        if (it.type === 'special' && en) col = '#80f0ff';
        F().draw(it.label, rx + rw - 3, ry + 2, { color: col, outline: '#04101a', align: 'right' });
        if (sel) F().draw('▶', rx + 2 + Math.round(Math.sin(this.t * 10)), ry + 2, { color: '#ffe060' });
      });
      ctx.restore();
      if (this.auto && !this.ended) F().draw('AUTO', x + w / 2 + 6, y - 9, { color: '#ffe060', outline: '#000', align: 'center' });
    }

    drawSkillMenu() {
      const m = this.menu;
      const f = m.f;
      R.panel(174, 156, 304, 60, { cut: 6 });
      f.def.skills.forEach((s, i) => {
        const [x, y, w, h] = this.skillRect(i);
        const ok = s.mp <= f.mp;
        const sel = m.sidx === i;
        if (sel || I().over(x, y, w, h)) R.gradH(x, y, w, h, 'rgba(62,224,240,0.4)', 'rgba(62,224,240,0.02)');
        F().draw(s.name, x + 10, y + 1, { color: ok ? '#ffffff' : '#7a8890', outline: '#04101a' });
        F().draw(`MP ${s.mp}`, x + w - 4, y + 1, { color: ok ? '#d0a0ff' : '#ff6070', outline: '#04101a', align: 'right' });
        F().draw(s.desc, x + 10, y + 9, { color: R.COL.dim });
        if (sel) F().draw('▶', x + 2, y + 1, { color: '#ffe060' });
      });
      const [bx, by] = this.skillRect(f.def.skills.length);
      const selb = m.sidx === f.def.skills.length;
      F().draw('RETOUR', bx + 10, by + 3, { color: selb ? '#ffe060' : R.COL.dim });
      if (selb) F().draw('▶', bx + 2, by + 3, { color: '#ffe060' });
    }

    drawParty() {
      const x = 280;
      const y = HUD_Y;
      const w = 196;
      const h = 46;
      R.panel(x, y, w, h, { cut: 6 });
      this.heroes.forEach((f, i) => {
        const ry = y + 3 + i * 14;
        if (this.active === f) R.gradH(x + 2, ry - 1, w - 4, 14, 'rgba(62,224,240,0.35)', 'rgba(62,224,240,0)');
        R.rect(x + 4, ry, 12, 12, '#0a2a48');
        GS.Art.portrait(f.def, x + 5, ry + 1, 10, 10, f.rig ? 0.5 : 1, { dark: !f.alive });
        R.frame(x + 4, ry, 12, 12, f.alive ? GS.EL[f.element].color : '#5a5a5a');
        F().draw(f.name, x + 19, ry, { color: f.alive ? '#ffffff' : '#7a7a7a' });
        R.bar(x + 19, ry + 8, 70, 3, f.hp / f.maxHp, '#30d070', '#a0ff90', { ghost: f.hpGhost, frame: false });
        F().draw(String(Math.round(f.shownHp)), x + 128, ry, { color: '#a0ffb0', align: 'right' });
        R.bar(x + 92, ry + 8, 40, 3, f.sp / 100, '#2a9aff', '#80e8ff', { frame: false });
        R.bar(x + 135, ry + 8, 40, 3, f.sl / 100, '#ffa020', f.sl >= 100 ? GS.rainbow(this.t, i * 60) : '#fff080', { frame: false });
        if (f.sl >= 100) F().draw('OL', x + 184, ry + 2, { color: GS.rainbow(this.t, i * 50), align: 'center' });
        else if (f.sp >= 100) F().draw('SP', x + 184, ry + 2, { color: '#80e8ff', align: 'center' });
      });
    }

    drawAbilityName() {
      const a = this.abName;
      const p = Math.min(1, a.t / 0.15);
      const w = F().width(a.name) + 30;
      const x = a.hero ? 4 - (1 - p) * 60 : W() - w - 4 + (1 - p) * 60;
      const y = 48;
      const col = a.color === 'rainbow' ? GS.rainbow(this.t) : a.color;
      const ctx = GS.ctx;
      ctx.save();
      ctx.globalAlpha = a.t > 1.6 ? Math.max(0, 1 - (a.t - 1.6) / 0.4) : 1;
      R.panel(x, y, w, 15, { cut: 5, border: col });
      R.rect(x + 4, y + 4, 3, 7, col);
      F().draw(a.name, x + 12, y + 4, { color: '#ffffff', outline: '#04101a' });
      ctx.restore();
    }

    drawBanner(ctx) {
      const b = this.banner;
      const p = Math.min(1, b.t / 0.25);
      const out = b.t > b.dur - 0.3 ? (b.dur - b.t) / 0.3 : 1;
      ctx.save();
      ctx.globalAlpha = U.clamp(out, 0, 1);
      const y = 88;
      const hgt = 44 * E.outBack(p);
      R.rect(0, y - hgt / 2, W(), hgt, 'rgba(5,3,12,0.75)');
      R.rect(0, y - hgt / 2, W(), 1, b.color);
      R.rect(0, y + hgt / 2 - 1, W(), 1, b.color);
      if (b.warn) {
        ctx.globalAlpha *= 0.35;
        for (let x = -40 + ((b.t * 60) % 20); x < W(); x += 20) R.poly([[x, y - hgt / 2], [x + 10, y - hgt / 2], [x, y + hgt / 2], [x - 10, y + hgt / 2]], b.color);
        ctx.globalAlpha = U.clamp(out, 0, 1);
      }
      const sc = b.win ? 3 : 2;
      const tx = W() / 2 + (1 - E.outCubic(p)) * 200;
      F().draw(b.text, tx, y - 10 - (b.sub ? 2 : -4), { color: b.win ? GS.rainbow(this.t) : b.color, outline: '#000', scale: sc, align: 'center' });
      if (b.sub) F().draw(b.sub, W() / 2, y + 11, { color: '#ffffff', outline: '#000', align: 'center' });
      ctx.restore();
    }

    drawCutin(ctx) {
      const c = this.cutin;
      const t = c.t;
      const f = c.f;
      const el = GS.EL[f.element];
      const main = f.def.fxColor || el.color;
      const dark = f.def.fxColor ? '#3a0410' : el.dark;
      ctx.save();
      R.fade(Math.min(0.75, t * 4), '#05030c');
      const open = E.outCubic(Math.min(1, t / 0.2));
      const close = t > 1.3 ? E.inQuad((t - 1.3) / 0.25) : 0;
      const bh = 96 * open * (1 - close);
      const cy = 118;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, cy - bh / 2 + 22);
      ctx.lineTo(W(), cy - bh / 2 - 22);
      ctx.lineTo(W(), cy + bh / 2 - 22);
      ctx.lineTo(0, cy + bh / 2 + 22);
      ctx.closePath();
      ctx.clip();
      R.gradH(0, 0, W(), GS.H, dark, main);
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 30; i++) {
        const ly = ((i * 37) % 150) + 44;
        const lx = ((i * 97 + t * 900) % (W() + 80)) - 80;
        R.rect(W() - lx, ly, 30 + (i % 3) * 20, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
      const slide = E.outCubic(Math.min(1, t / 0.35));
      const px = U.lerp(-160, 30, slide) + t * 14;
      if (f.rig) GS.Art.portrait(f.def, px, cy - 70, 190, 150, 3, { focusY: 8 });
      else GS.Art.portrait(f.def, px, cy - 60, 170, 120, 4, { focusX: 15, focusY: 14 });
      ctx.restore();
      R.line(0, cy - bh / 2 + 22, W(), cy - bh / 2 - 22, '#ffffff');
      R.line(0, cy + bh / 2 + 22, W(), cy + bh / 2 - 22, '#ffffff');
      if (t > 0.3 && t < 1.45) {
        const tp = Math.min(1, (t - 0.3) / 0.15);
        F().draw('OVERLIMIT', W() - 24 + (1 - tp) * 100, cy - 30, { color: GS.rainbow(t * 3), outline: '#000', scale: 3, align: 'right' });
        F().draw(c.ab.name, W() - 26, cy + 4, { color: '#ffffff', outline: '#000', scale: 2, align: 'right' });
        F().draw(f.def.name + ' - ' + f.def.title, W() - 26, cy + 26, { color: el.light, outline: '#000', align: 'right' });
      }
      ctx.restore();
    }

    drawPause() {
      R.fade(0.6, '#05030c');
      F().draw('PAUSE', W() / 2, 76, { color: R.COL.cyan, outline: '#000', scale: 3, align: 'center' });
      const r = this.pauseRects();
      R.panel(...r.resume, { cut: 5 });
      F().draw('REPRENDRE', W() / 2, r.resume[1] + 7, { color: '#ffffff', align: 'center' });
      R.panel(...r.quit, { cut: 5, border: '#ff5060' });
      F().draw('ABANDONNER', W() / 2, r.quit[1] + 7, { color: '#ff8090', align: 'center' });
      F().draw('Flèches : avancer   T : auto   F : vitesse   P : pause', W() / 2, 190, { color: R.COL.dim, align: 'center' });
    }
  }

  // Version agrandie d'un ancien sprite (chibi) pour l'aligner sur le grand format.
  function scaledSprite(sp, k) {
    const P = GS.Pix;
    const body = P.scale(sp.body, k);
    const weapon = sp.weapon ? P.scale(sp.weapon, k) : null;
    return Object.assign({}, sp, {
      body,
      white: P.silhouette(body, '#ffffff'),
      dark: P.silhouette(body, '#0a0614'),
      weapon,
      weaponWhite: weapon ? P.silhouette(weapon, '#ffffff') : null,
      grip: [sp.grip[0] * k, sp.grip[1] * k],
      hand: { x: sp.hand.x * k, y: sp.hand.y * k },
      foot: { x: sp.foot.x * k, y: sp.foot.y * k + k - 1 },
      w: body.width,
      h: body.height,
      scale: k,
    });
  }

  function clipDraw(img, x, y, w, h, fx, fy, mirror) {
    const ctx = GS.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const k = img.width > 60 && !mirror ? 0.5 : 1;
    if (mirror) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, Math.round(-fx), Math.round(-fy));
    } else ctx.drawImage(img, Math.round(x + w / 2 - fx * k), Math.round(y + h / 2 - fy * k), img.width * k, img.height * k);
    ctx.restore();
  }

  // Silhouettes en cache par image.
  const SIL = new WeakMap();

  // Vignette sombre (bords de l'écran assombris, ambiance dark).
  let VIG = null;
  function vignette() {
    if (VIG) return VIG;
    VIG = GS.Pix.makeCanvas(GS.W, GS.H);
    const c = VIG.getContext('2d');
    const g = c.createRadialGradient(GS.W / 2, GS.H * 0.55, GS.H * 0.3, GS.W / 2, GS.H * 0.55, GS.W * 0.62);
    g.addColorStop(0, 'rgba(4,2,8,0)');
    g.addColorStop(0.6, 'rgba(4,2,8,0.25)');
    g.addColorStop(1, 'rgba(2,0,4,0.7)');
    c.fillStyle = g;
    c.fillRect(0, 0, GS.W, GS.H);
    return VIG;
  }

  GS.BattleScene = BattleScene;
})();
