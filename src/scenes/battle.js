'use strict';
// Scène de combat au tour par tour "dynamique" : ruées, coups d'arme, effets, cut-in d'Overlimit.
(function () {
  const U = GS.U;
  const R = GS.R;
  const B = GS.Battle;
  const E = U.Ease;
  const F = () => GS.Font;
  const I = () => GS.Input;
  const A = () => GS.Audio;

  const HUD_Y = 166;
  const CMD = { x: 152, y: 161, w: 86, h: 52 };
  const CMD_ITEMS = [
    { type: 'attack', label: 'ATTAQUE' },
    { type: 'skill', label: 'COMPÉTENCE' },
    { type: 'special', label: 'SPÉCIAL' },
    { type: 'overlimit', label: 'OVERLIMIT' },
  ];
  const TOPBTN = { auto: [122, 4, 28, 13], speed: [152, 4, 22, 13], pause: [176, 4, 18, 13] };

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
      this.heroes = GS.Save.teamUnits().map((u, i) => B.heroFighter(u, i));
      this.enemies = [];
      this.wave = 0;
      this.cam = { x: 0, y: 0, shake: 0, scroll: 0 };
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
      this.stolen = 0;
      this.cutin = null;
      this.lastTarget = null;
      this.timeline = [];
      this.ended = false;
      A().music('battle');
      this.co.run(this.main());
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

    // ================================================================= déroulement
    *main() {
      const n = this.stage.waves.length;
      for (this.wave = 0; this.wave < n; this.wave++) {
        yield* this.spawnWave(this.wave);
        if (this.wave === 0) B.initCT(this.fighters);
        else B.initCT(this.enemies);
        const res = yield* this.fightLoop();
        if (res === 'defeat') {
          yield* this.defeat();
          return;
        }
        yield 0.6;
      }
      yield* this.victory();
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
        yield 0.12;
      }
    }

    *spawnWave(w) {
      const wave = this.stage.waves[w];
      const pos = B.enemyPositions(wave);
      this.enemies = wave.map(([k, el], i) => B.enemyFighter(k, el, this.stage.level, i, pos[i]));
      const boss = this.enemies.find((e) => e.boss);
      if (boss) A().music('boss');
      if (w > 0) {
        // l'équipe avance : défilement du décor
        for (const h of this.heroes) if (h.alive) h.running = true;
        yield* GS.tween(this.cam, { scroll: this.cam.scroll + 60 }, 0.9, E.inOutQuad);
        for (const h of this.heroes) h.running = false;
      }
      this.enemies.forEach((e, i) => {
        e.offX = 220;
        this.co.run(
          (function* () {
            yield i * 0.12;
            yield* GS.tween(e, { offX: 0 }, 0.45, E.outCubic);
          })()
        );
      });
      const n = this.stage.waves.length;
      if (boss) {
        this.banner = { text: 'ATTENTION', sub: boss.name, color: '#ff3048', t: 0, dur: 2.0, warn: true };
        A().sfx('charge');
        yield 2.0;
      } else {
        this.banner = { text: `VAGUE ${w + 1}/${n}`, sub: this.stage.name, color: '#3ee0f0', t: 0, dur: 1.3 };
        yield 1.3;
      }
    }

    *takeTurn(f) {
      if (f.isHero) f.mp = Math.min(f.maxMp, f.mp + 5);
      // effets de début de tour
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
          this.fx.burst(f.cx, f.cy, { n: 12, color: ev.type === 'burn' ? ['#ff6020', '#ffd040'] : ['#a040e0', '#60f060'], speed: 40, vy: -40, life: 0.5 });
          A().sfx(ev.type === 'burn' ? 'fire' : 'debuff');
        }
        yield 0.35;
        if (f.hp <= 0) {
          f.alive = false;
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
          yield 0.2;
          cmd = B.autoChoice(f, this.heroes, this.enemies);
        } else cmd = yield* this.playerInput(f);
      } else {
        yield 0.3;
        cmd = B.enemyChoice(f, this.heroes, this.enemies);
      }
      if (!cmd) return;
      yield* this.perform(f, cmd);
      B.decayStatuses(f);
      // rage du boss
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

    // ================================================================= actions
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
      // cibles encore valides ?
      let targets = cmd.targets.filter((t) => t && (t.alive || ab.revive));
      if (!targets.length && (ab.target === 'enemy' || !ab.target)) {
        const alive = this.foesOf(f).filter((e) => e.alive);
        if (!alive.length) return;
        targets = [alive[0]];
      }
      cmd.targets = targets;

      if (!ab.basic) this.showName(f, ab.name, cmd.type === 'overlimit' ? 'rainbow' : cmd.type === 'special' ? GS.EL[f.element].color : null);
      if (cmd.type === 'overlimit') yield* this.cutIn(f, ab);
      else if (cmd.type === 'special' || cmd.release) yield* this.specialIntro(f);

      const anim = ab.anim || 'melee';
      if (anim === 'melee' || anim === 'thrust') yield* this.animMelee(f, ab, targets, anim === 'thrust');
      else if (anim === 'spin') yield* this.animSpin(f, ab, targets);
      else if (anim === 'ranged') yield* this.animRanged(f, ab, targets);
      else if (anim === 'magic') yield* this.animMagic(f, ab, targets);
      else yield* this.animSupport(f, ab, targets);

      yield* this.afterEffects(f, ab, targets);

      if (f.isHero) {
        const g = { attack: [15, 25, 10], skill: [0, 12, 10], special: [0, 0, 25], overlimit: [0, 0, 0] }[cmd.type] || [0, 0, 0];
        f.mp = Math.min(f.maxMp, f.mp + g[0]);
        f.sp = Math.min(100, f.sp + g[1]);
        f.sl = Math.min(100, f.sl + g[2]);
      }
      this.dim = 0;
      yield 0.15;
    }

    // Statuts, soins, retards et réanimation après l'animation.
    *afterEffects(f, ab, targets) {
      const offensive = ab.target === 'enemy' || ab.target === 'enemies' || ab.target === 'heroes' || !ab.target;
      if (ab.heal) {
        let list = offensive ? this.alliesOf(f) : targets;
        if (ab.revive) {
          for (const h of this.alliesOf(f)) {
            if (!h.alive) {
              h.alive = true;
              h.ko = 0;
              h.alpha = 1;
              h.hp = Math.round(h.maxHp * ab.revive);
              h.statuses = [];
              h.ct = h.turnLen() * 0.5;
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
          if (B.addStatus(t, eff, f)) {
            any = true;
            const st = GS.STATUS[eff.type];
            this.fx.pop(t.cx, t.topY - 10, st.name, { color: st.color, dur: 1.1, scale: 1 });
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

    // Applique les dégâts d'un coup.
    strike(f, tgt, ab, frac, o = {}) {
      if (!tgt || !tgt.alive) return null;
      const r = B.damage(f, tgt, ab, frac);
      tgt.hp = Math.max(0, tgt.hp - r.dmg);
      tgt.flash = 1;
      tgt.flashColor = '#ffffff';
      tgt.kx = (tgt.isHero ? -1 : 1) * (r.crit ? 6 : 3);
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
      this.hitstop = Math.max(this.hitstop, r.crit ? 0.09 : 0.035);
      if (!o.silent) A().sfx(r.crit ? 'crit' : 'hit');
      if (tgt.isHero) {
        tgt.sp = Math.min(100, tgt.sp + 5);
        tgt.sl = Math.min(100, tgt.sl + 4);
      }
      if (ab.steal && f.isHero && Math.random() < 0.6) {
        const g = U.randInt(20, 60) * (1 + Math.floor(this.stage.level / 4));
        this.stolen += g;
        this.fx.pop(tgt.cx, tgt.topY - 14, '+' + g + ' OR', { color: '#ffd040', dur: 1.2 });
        A().sfx('coin');
      }
      if (tgt.hp <= 0) {
        tgt.alive = false;
        if (f.isHero) f.sl = Math.min(100, f.sl + 10);
        this.co.run(this.koAnim(tgt));
      }
      return r;
    }

    shake(v) {
      this.cam.shake = Math.max(this.cam.shake, v);
    }

    showName(f, name, color) {
      this.abName = { name, color: color || (f.isHero ? '#3ee0f0' : '#ff5060'), t: 0, hero: f.isHero };
    }

    *specialIntro(f) {
      this.dim = 0.55;
      f.flash = 1;
      f.flashColor = GS.EL[f.element].light;
      this.fx.ring(f.cx, f.cy, { color: GS.EL[f.element].color, r0: 4, r1: 40, dur: 0.4 });
      this.fx.burst(f.cx, f.cy, { n: 24, color: [GS.EL[f.element].color, '#ffffff'], speed: 120, life: 0.5 });
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

    *koAnim(f) {
      A().sfx('ko');
      f.flash = 1;
      f.flashColor = '#ff4060';
      f.charging = null;
      if (!f.isHero) {
        const col = U.rgbToHex(...this.spriteColor(f));
        this.fx.burst(f.cx, f.cy, { n: 30, color: [col, '#ffffff', U.shade(col, 0.4)], speed: 70, life: 0.8, jitter: 16, gravity: -30 });
      }
      yield* GS.tween(f, { ko: 1 }, f.isHero ? 0.4 : 0.6, E.outQuad);
    }

    spriteColor(f) {
      if (f._col) return f._col;
      try {
        const c = f.sprite.body.getContext('2d');
        const d = c.getImageData(Math.floor(f.sprite.w / 2), Math.floor(f.sprite.h / 2), 1, 1).data;
        f._col = d[3] ? [d[0], d[1], d[2]] : [200, 200, 220];
      } catch (err) {
        f._col = [200, 200, 220];
      }
      return f._col;
    }

    // ---------------------------------------------------------------- animations
    dirOf(f) {
      return f.isHero ? 1 : -1;
    }
    swingAngles(f, i) {
      const d = this.dirOf(f);
      return i % 2 === 0 ? [-2.2 * d, 2.1 * d] : [2.1 * d, -1.0 * d];
    }
    elemColor(f, ab) {
      const el = GS.EL[ab.element || f.element];
      if (ab.fx === 'slash' || ab.fx === 'hit' || ab.fx === 'heavy' || ab.fx === 'bite') return f.isHero ? '#e8f8ff' : '#ffb0b0';
      return el.color;
    }

    *dashTo(f, x, y, dur = 0.18) {
      A().sfx('dash');
      f.after = true;
      yield* GS.tween(f, { x, y }, dur, E.inQuad);
      f.after = false;
    }

    *dashBack(f) {
      f.after = true;
      yield* GS.tween(f, { x: f.homeX, y: f.homeY }, 0.2, E.outQuad);
      f.after = false;
      f.weaponRot = f.idleRot();
      f.flip = false;
    }

    *animMelee(f, ab, targets, thrust) {
      let tgt = targets[0];
      const d = this.dirOf(f);
      const hits = ab.hits || 1;
      const reach = (tgt.sprite.w * (tgt.boss ? 0.32 : 0.4)) + 12;
      yield* this.dashTo(f, tgt.x - d * reach, tgt.y + 1);
      const col = this.elemColor(f, ab);
      const armed = !!f.sprite.weapon;
      for (let i = 0; i < hits; i++) {
        if (!tgt.alive) {
          const alt = this.foesOf(f).filter((e) => e.alive);
          if (!alt.length) break;
          tgt = alt[0];
        }
        if (thrust) {
          f.weaponRot = d * 1.45;
          yield* GS.tween(f, { offX: -4 * d }, 0.06);
          A().sfx('slash', 1.3);
          yield* GS.tween(f, { offX: 7 * d }, 0.04);
          this.fx.thrust(tgt.cx - d * 6, tgt.cy, { color: col, dir: d });
        } else if (armed) {
          const [a0, a1] = this.swingAngles(f, i);
          yield* GS.tween(f, { weaponRot: a0, offX: -2 * d }, 0.06);
          A().sfx('slash', 1 + i * 0.05);
          yield* GS.tween(f, { weaponRot: a1, offX: 4 * d }, 0.05, E.outQuad);
          this.fx.slash(tgt.cx, tgt.cy, { color: col, r: 14 + (ab.power || 1) * 2, dir: i % 2 ? -1 : 1, angle: d > 0 ? 0.2 : Math.PI - 0.2, tilt: i % 2 ? 0.6 : -0.5 });
        } else {
          // monstre : bond / morsure
          yield* GS.tween(f, { offX: -6 * d, sy: 0.8, sx: 1.15 }, 0.08);
          yield* GS.tween(f, { offX: 8 * d, sy: 1.1, sx: 0.9 }, 0.06);
          if (ab.fx === 'bite') {
            this.fx.slash(tgt.cx, tgt.cy - 4, { color: '#ffffff', r: 9, angle: Math.PI / 2, dir: 1, flat: 1, width: 3 });
            this.fx.slash(tgt.cx, tgt.cy + 4, { color: '#ffffff', r: 9, angle: -Math.PI / 2, dir: 1, flat: 1, width: 3 });
          } else this.fx.slash(tgt.cx, tgt.cy, { color: col, r: 12, angle: d > 0 ? 0 : Math.PI });
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
      const col = this.elemColor(f, ab);
      for (let i = 0; i < hits; i++) {
        f.flip = !f.flip;
        f.weaponRot = (i % 2 ? -2 : 2) * d;
        A().sfx('slash', 0.9 + Math.random() * 0.3);
        for (const t of alive) {
          if (!t.alive) continue;
          this.fx.slash(t.cx + U.rand(-4, 4), t.cy + U.rand(-4, 4), { color: col, r: 16, angle: Math.random() * 6, dir: i % 2 ? 1 : -1, tilt: U.rand(-1, 1) });
          this.hitFx(t, ab, f, true);
          this.strike(f, t, ab, 1 / hits, { silent: true });
        }
        A().sfx('hit');
        this.fx.ring(f.cx, f.y - 8, { color: col, r0: 6, r1: 40, flat: 0.4, dur: 0.25 });
        yield hits > 5 ? 0.06 : 0.11;
      }
      f.flip = false;
      yield 0.15;
      yield* this.dashBack(f);
    }

    *animRanged(f, ab, targets) {
      const d = this.dirOf(f);
      yield* GS.tween(f, { offX: -5 * d }, 0.1);
      const hits = ab.hits || 1;
      const col = this.elemColor(f, ab);
      const tasks = [];
      const kind = ab.fx === 'kunai' ? 'kunai' : ab.fx === 'harpoon' ? 'harpoon' : ab.fx === 'rock' ? 'rock' : ab.fx === 'arrow' || ab.fx === 'arrows' || ab.fx === 'beam' ? 'arrow' : 'orb';
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
        yield GS.until(() => beam.done);
      } else {
        for (let i = 0; i < hits; i++) {
          const list = ab.target === 'enemies' || ab.target === 'heroes' ? targets : [targets[0]];
          for (const t of list) {
            const rain = ab.fx === 'arrows';
            const sx = rain ? t.cx + U.rand(-30, 10) * d : f.cx + d * 12;
            const sy = rain ? -10 : f.cy - 2;
            const p = this.fx.projectile(sx, sy, t.cx + U.rand(-4, 4), t.cy + U.rand(-5, 5), { color: col, kind, dur: rain ? 0.28 : 0.2, arc: kind === 'rock' ? 18 : 0, size: 2 });
            tasks.push(
              this.co.run(
                function* () {
                  yield* GS.until(() => p.done);
                  if (!t.alive) {
                    const alt = this.foesOf(f).filter((e) => e.alive);
                    if (!alt.length) return;
                    this.strike(f, alt[0], ab, 1 / hits);
                    return;
                  }
                  this.hitFx(t, ab, f, true);
                  this.strike(f, t, ab, 1 / hits);
                }.call(this)
              )
            );
          }
          A().sfx('shoot');
          yield hits > 4 ? 0.06 : 0.12;
        }
        yield tasks;
      }
      yield* GS.tween(f, { offX: 0 }, 0.12);
    }

    *castPose(f, color) {
      const d = this.dirOf(f);
      yield* GS.tween(f, { x: f.homeX + d * 8 }, 0.12);
      this.fx.magicCircle(f.x, f.y, { color, r: 18, dur: 1.0 });
      f.weaponRot = -0.2 * d;
      A().sfx('magic');
      for (let i = 0; i < 3; i++) {
        this.fx.burst(f.cx, f.cy - 4, { n: 6, color: [color, '#ffffff'], speed: 50, life: 0.3, jitter: 30, add: true });
        yield 0.1;
      }
    }

    *animMagic(f, ab, targets) {
      const col = GS.EL[ab.element || f.element].color;
      yield* this.castPose(f, col);
      const hits = ab.hits || 1;
      const alive = () => targets.filter((t) => t.alive);
      const center = () => {
        const a = alive().length ? alive() : targets;
        return [a.reduce((s, t) => s + t.cx, 0) / a.length, a.reduce((s, t) => s + t.y, 0) / a.length];
      };
      const fxName = ab.fx;
      const d = this.dirOf(f);
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
        const [cx] = center();
        const cy = alive().length ? alive().reduce((s, t) => s + t.cy, 0) / alive().length : 120;
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
        const [cx] = center();
        const cy = alive().length ? alive().reduce((s, t) => s + t.cy, 0) / alive().length : 120;
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
          const ps = list.map((t) => {
            const p = this.fx.projectile(t.cx + 70 * d, -20, t.cx, t.y - 6, { color: '#ff7020', size: 5, dur: 0.32 });
            return [p, t];
          });
          A().sfx('fire');
          yield* GS.until(() => ps.every(([p]) => p.done));
          for (const [, t] of ps) {
            this.fx.flash(t.cx, t.y - 6, { color: '#ff9030', r: 22, dur: 0.25 });
            this.fx.burst(t.cx, t.y - 6, { n: 26, color: ['#ff5010', '#ffb040', '#fff0a0'], speed: 160, life: 0.5, gravity: 200 });
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
            this.fx.burst(t.cx, t.cy, { n: 12, color: [col, '#ffffff'], speed: 90, life: 0.4, shape: 'star', size: 3 });
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
            this.fx.spikes(t.cx, t.y + 2, { n: 5, h: 18, color: ab.element === 'fire' ? '#c05030' : '#9a8060' });
            this.fx.burst(t.cx, t.y, { n: 14, color: ['#a08868', '#d0b890'], speed: 80, angle: -Math.PI / 2, spread: 2, gravity: 300, life: 0.6, add: false });
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
      } else {
        // projectile élémentaire ou effet direct, coup par coup
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
        this.fx.magicCircle(t.x, t.y, { color: col, r: 14, dur: 0.7 });
        this.fx.ring(t.cx, t.cy, { color: col, r0: 20, r1: 4, dur: 0.4 });
        if (ab.fx === 'shield') this.fx.ring(t.cx, t.cy, { color: '#80c0ff', r0: 4, r1: 18, dur: 0.5, width: 2 });
        if (ab.fx === 'rage') {
          t.flash = 1;
          t.flashColor = '#ff3030';
          this.fx.burst(t.cx, t.y, { n: 20, color: ['#ff3030', '#ff9040'], speed: 40, vy: -80, life: 0.5, jitter: 10 });
        }
      }
      yield 0.35;
      f.weaponRot = f.idleRot();
      yield* GS.tween(f, { x: f.homeX }, 0.12);
    }

    // Petit effet d'impact selon l'élément.
    hitFx(t, ab, f, small) {
      const fx = ab.fx;
      const col = this.elemColor(f, ab);
      const x = t.cx;
      const y = t.cy;
      const n = small ? 8 : 14;
      if (fx === 'fire') {
        this.fx.flash(x, y, { color: '#ff8030', r: small ? 10 : 16 });
        this.fx.burst(x, y, { n, color: ['#ff4010', '#ffa030', '#fff080'], speed: 100, life: 0.45, gravity: -60 });
      } else if (fx === 'water') {
        this.fx.ring(x, y, { color: '#80d0ff', r0: 3, r1: 20, dur: 0.3 });
        this.fx.burst(x, y, { n, color: ['#3ea8ff', '#c0f0ff', '#ffffff'], speed: 110, life: 0.5, gravity: 260 });
      } else if (fx === 'earth') {
        this.fx.spikes(x, t.y + 2, { n: 3, h: 12 });
        this.fx.burst(x, t.y, { n, color: ['#a08868', '#70d050'], speed: 80, gravity: 260, angle: -Math.PI / 2, spread: 2, life: 0.5 });
      } else if (fx === 'light') {
        this.fx.pillar(x, t.y + 2, { color: '#ffe060', w: 8, dur: 0.35 });
        this.fx.burst(x, y, { n, color: ['#ffe060', '#ffffff'], speed: 90, life: 0.4, shape: 'star', size: 3 });
      } else if (fx === 'dark') {
        this.fx.flash(x, y, { color: '#9040e0', r: 12 });
        this.fx.burst(x, y, { n, color: ['#b464ff', '#ff60c0', '#301040'], speed: 90, life: 0.45 });
      } else if (fx === 'heavy') {
        this.fx.flash(x, y, { color: '#ffffff', r: 18 });
        this.fx.ring(x, y, { color: '#ffffff', r0: 4, r1: 26, dur: 0.25, width: 3 });
        this.fx.burst(x, y, { n: n + 6, color: ['#ffffff', '#ffe0a0'], speed: 150, life: 0.35, shape: 'line' });
        this.shake(3);
        GS.Audio.sfx('heavy');
      } else {
        this.fx.burst(x, y, { n, color: [col, '#ffffff'], speed: 120, life: 0.3, shape: 'line' });
      }
    }

    // ================================================================= fin de combat
    *victory() {
      this.ended = true;
      A().stopMusic();
      A().sfx('victory');
      this.banner = { text: 'VICTOIRE !', sub: this.stage.name, color: '#ffd040', t: 0, dur: 99, win: true };
      for (const h of this.heroes) {
        if (!h.alive) continue;
        this.co.run(
          (function* () {
            for (let k = 0; k < 2; k++) {
              yield* GS.tween(h, { jump: 10 }, 0.18, E.outQuad);
              yield* GS.tween(h, { jump: 0 }, 0.18, E.inQuad);
            }
            h.weaponRot = -0.4;
          })()
        );
      }
      yield 2.2;
      // récompenses
      const d = GS.data;
      const id = GS.stageId(this.ai, this.si);
      const rw = GS.stageRewards(this.stage);
      const first = !d.cleared[id];
      d.cleared[id] = true;
      d.gold += rw.gold + this.stolen;
      if (first) d.gems += rw.firstGems;
      d.stats.battles++;
      d.stats.wins++;
      const ups = GS.Save.teamUnits().map((u) => {
        const before = { level: u.level, xp: u.xp };
        const gained = GS.Save.addXp(u, rw.xp);
        return { uid: u.uid, before, gained };
      });
      GS.Save.save();
      GS.go(new GS.ResultScene({ win: true, ai: this.ai, si: this.si, gold: rw.gold, stolen: this.stolen, gems: first ? rw.firstGems : 0, xp: rw.xp, ups, first }));
    }

    *defeat() {
      this.ended = true;
      A().stopMusic();
      A().sfx('defeat');
      this.banner = { text: 'DÉFAITE...', sub: "L'équipe est à terre", color: '#ff5060', t: 0, dur: 99 };
      yield 2.4;
      GS.data.stats.battles++;
      GS.Save.save();
      GS.go(new GS.ResultScene({ win: false, ai: this.ai, si: this.si }));
    }

    // ================================================================= mise à jour
    update(dt) {
      this.t += dt;
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
      this.wdt = wdt;
      this.handleMenu();
      this.co.update(wdt);
      this.fx.update(wdt);
      for (const f of this.fighters) {
        f.flash = Math.max(0, f.flash - wdt * 4);
        f.kx = (f.kx || 0) * Math.pow(0.0001, wdt);
        if (Math.abs(f.kx) < 0.3) f.kx = 0;
        const target = f.hp / f.maxHp;
        f.hpGhost = f.hpGhost > target ? Math.max(target, f.hpGhost - wdt * 0.5) : target;
        f.shownHp = U.approach(f.shownHp, f.hp, Math.max(1, Math.abs(f.hp - f.shownHp) * wdt * 8));
        if (f.after) (f.trail || (f.trail = [])).push({ x: f.x + f.offX, y: f.y + f.offY, a: 0.55 });
        if (f.trail) {
          for (const p of f.trail) p.a -= wdt * 3;
          f.trail = f.trail.filter((p) => p.a > 0);
        }
      }
      this.cam.shake = Math.max(0, this.cam.shake - wdt * 18);
      this.screenFlash = Math.max(0, this.screenFlash - wdt * 2.5);
      if (this.banner) this.banner.t += wdt;
      if (this.banner && this.banner.t > this.banner.dur) this.banner = null;
      if (this.abName) {
        this.abName.t += wdt;
        if (this.abName.t > 1.6 && !this.active) this.abName = null;
        else if (this.abName.t > 2.4) this.abName = null;
      }
      if (this.cutin) this.cutin.t += wdt;
      if (!this.ended && (this.active || this.menu)) this.timeline = B.predict(this.fighters, 8, this.active);
    }

    // ---------------------------------------------------------------- entrées
    handleTopButtons() {
      const inp = I();
      if (this.ended) return;
      const [ax, ay, aw, ah] = TOPBTN.auto;
      if (inp.clicked(ax, ay, aw, ah) || inp.hit('KeyA')) {
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
      if (inp.clicked(px, py, pw, ph) || inp.hit('KeyP') || (inp.hit('Escape') && !this.menu)) {
        inp.consume();
        this.paused = !this.paused;
        A().sfx('select');
      }
    }

    pauseRects() {
      return { resume: [GS.W / 2 - 60, 96, 120, 18], quit: [GS.W / 2 - 60, 120, 120, 18] };
    }

    handlePause() {
      const inp = I();
      const r = this.pauseRects();
      if (inp.clicked(...r.resume) || inp.hit('confirm') || inp.hit('Escape')) {
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
      return [CMD.x + 6 - i * 3, CMD.y + 4 + i * 12, CMD.w - 6, 11];
    }

    skillRect(i) {
      return [150, 112 + i * 17, 230, 16];
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
        const w = Math.max(18, f.sprite.w * 0.7);
        const top = f.y - f.h - (f.fly ? 16 : 0);
        if (U.inRect(x, y, f.x - w / 2, top, w, f.h + 6)) return f;
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
      if (!m || this.command) return;
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
          if (pick < 0 && !U.inRect(click.x, click.y, 146, 108, 238, 60)) pick = sk.length;
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
          if (!target) {
            // clic sur le menu : revenir en arrière
            for (let i = 0; i < 4; i++) if (U.inRect(click.x, click.y, ...this.cmdRect(i))) target = 'back';
          }
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
    draw(ctx) {
      const shx = this.cam.shake ? U.rand(-1, 1) * this.cam.shake : 0;
      const shy = this.cam.shake ? U.rand(-1, 1) * this.cam.shake * 0.6 : 0;
      GS.BG.draw(this.area.bg, this.t, this.cam.scroll + shx, shy);
      ctx.save();
      ctx.translate(Math.round(shx), Math.round(shy));
      if (this.dim > 0) R.fade(this.dim * 0.8, '#05030c');
      this.fx.draw(ctx, true);
      // ombres
      for (const f of this.fighters) {
        if (f.ko >= 1 && !f.isHero) continue;
        const a = (1 - (f.isHero ? 0 : f.ko)) * 0.4;
        ctx.globalAlpha = a;
        R.ellipse(f.x + f.offX + (f.kx || 0), f.y + 1, Math.max(6, f.sprite.w * 0.3), 2, '#000000');
        ctx.globalAlpha = 1;
      }
      // cercle du tour actif
      const act = this.active;
      if (act && act.alive && !this.ended) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + Math.sin(this.t * 6) * 0.2;
        ctx.strokeStyle = act.isHero ? '#3ee0f0' : '#ff5060';
        ctx.beginPath();
        ctx.ellipse(act.x + act.offX, act.y + 1, 13, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const order = this.fighters.slice().sort((a, b) => a.y - b.y);
      for (const f of order) this.drawFighter(ctx, f);
      this.fx.draw(ctx, false);
      this.drawTargetCursor();
      this.fx.drawPops();
      ctx.restore();
      if (this.screenFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        R.fade(this.screenFlash * 0.8, this.flashColor);
        ctx.restore();
      }
      this.drawHUD(ctx);
      if (this.cutin) this.drawCutin(ctx);
      if (this.banner) this.drawBanner(ctx);
      if (this.paused) this.drawPause();
    }

    drawFighter(ctx, f) {
      if (!f.isHero && f.ko >= 1) return;
      const sp = f.sprite;
      const flyY = f.fly ? -14 + Math.sin(this.t * 4 + f.slot) * 3 : 0;
      const x = f.x + f.offX + (f.kx || 0);
      const y = f.y + f.offY + flyY - (f.jump || 0) + (f.running ? -Math.abs(Math.sin(this.t * 14)) * 2 : 0);
      // traînée (images rémanentes)
      if (f.trail && f.trail.length) {
        const ghost = sp.ghost || (sp.ghost = GS.Pix.silhouette(sp.body, f.isHero ? '#60e8ff' : '#ff6080'));
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
      // aura de charge (boss)
      if (f.charging) {
        const red = sp.red || (sp.red = GS.Pix.silhouette(sp.body, '#ff2040'));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.4 + Math.sin(this.t * 10) * 0.25;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.drawImage(red, ox + dx, oy + dy);
        ctx.restore();
      }
      // corps : la tête respire (humanoïdes), les monstres se tassent
      const breathe = Math.sin(this.t * 3 + f.slot * 1.7) > 0.2 ? 1 : 0;
      if (sp.humanoid || f.isHero) {
        const sc = sp.scale || 1;
        const split = (14 + 1) * sc;
        ctx.drawImage(sp.body, 0, 0, sp.w, split, ox, oy + breathe * sc, sp.w, split);
        ctx.drawImage(sp.body, 0, split, sp.w, sp.h - split, ox, oy + split, sp.w, sp.h - split);
      } else if (f.alive && !f.fly) {
        const sq = breathe ? 1 : 0;
        ctx.drawImage(sp.body, ox, oy + sq, sp.w, sp.h - sq);
      } else ctx.drawImage(sp.body, ox, oy);
      if (f.flash > 0) {
        const wimg = f.flashColor === '#ffffff' ? sp.white : sp['f' + f.flashColor] || (sp['f' + f.flashColor] = GS.Pix.silhouette(sp.body, f.flashColor));
        ctx.save();
        ctx.globalAlpha = Math.min(1, f.flash);
        ctx.drawImage(wimg, ox, oy);
        ctx.restore();
      }
      // arme
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
      // barres sous les ennemis / héros
      if (f.alive && !this.ended) {
        const bw = f.boss ? 44 : 26;
        const bx = Math.round(f.x + f.offX - bw / 2);
        const by = Math.round(f.y + 4);
        if (!f.boss || this.enemies.filter((e) => e.alive).length > 1 || true) {
          R.bar(bx, by, bw, 4, f.hp / f.maxHp, f.isHero ? '#40f080' : '#ff4058', f.isHero ? '#a0ffb0' : '#ff9060', { ghost: f.hpGhost, frame: 'rgba(0,0,0,0.8)' });
        }
        if (!f.isHero) GS.Icons.draw(f.element, bx - 10, by - 3);
        // statuts
        let sx = bx;
        for (const s of f.statuses.slice(0, 5)) {
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
      const by = Math.round(t.topY - (t.fly ? 22 : 8) + Math.sin(this.t * 8) * 2);
      const x = Math.round(t.x + t.offX);
      const c = m.pending.ab.target === 'ally' ? '#70ff90' : '#ffe040';
      for (let i = 0; i < 5; i++) R.rect(x - 4 + i, by + i, 9 - i * 2, 1, c);
      R.rect(x - 5, by - 1, 11, 1, '#000');
      F().draw(t.name, x, by - 11, { color: '#ffffff', outline: '#000', align: 'center' });
    }

    // ---------------------------------------------------------------- interface
    drawHUD(ctx) {
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
        R.panel(GS.W / 2 - 50, 22, 100, 13, { cut: 4 });
        F().draw(txt, GS.W / 2, 25, { color: '#ffe060', align: 'center' });
      }
    }

    drawTimeline() {
      const x0 = 4;
      const y0 = 4;
      R.panel(x0, y0, 114, 18, { cut: 4 });
      const list = this.timeline.slice(0, 7);
      list.forEach((f, i) => {
        const x = x0 + 4 + i * 15;
        const s = i === 0 ? 14 : 12;
        const y = y0 + 2 + (i === 0 ? 0 : 1);
        R.rect(x, y, s, s, f.isHero ? '#0a2a48' : '#3a0a18');
        GS.UI.portrait(f.def.look ? f.def : { id: f.key, look: null }, x + 1, y + 1, s - 2, s - 2, 1, f.isHero ? { focusX: 15, focusY: 13 } : {});
        if (!f.isHero) {
          // portrait de monstre : centre du sprite
          ctx_clipDraw(f.sprite.body, x + 1, y + 1, s - 2, s - 2, f.sprite.w / 2, f.sprite.h * 0.35);
        }
        R.frame(x, y, s, s, i === 0 ? '#ffffff' : f.isHero ? '#3ea8ff' : '#ff5060');
      });
    }

    drawTopButtons() {
      const btn = (r, label, on) => {
        R.panel(r[0], r[1], r[2], r[3], { cut: 3, border: on ? '#ffe060' : R.COL.border, fill: on ? 'rgba(80,60,0,0.85)' : R.COL.panel, inner: false });
        F().draw(label, r[0] + r[2] / 2, r[1] + 3, { color: on ? '#ffe060' : '#ffffff', align: 'center' });
      };
      btn(TOPBTN.auto, 'AUTO', this.auto);
      btn(TOPBTN.speed, 'x' + this.speed, this.speed > 1);
      btn(TOPBTN.pause, 'II', this.paused);
    }

    drawEnemyInfo() {
      const boss = this.enemies.find((e) => e.boss && e.alive);
      if (boss) {
        // Barre de boss (comme sur la capture)
        const x = 226;
        const y = 3;
        const w = 154;
        R.panel(x, y + 8, w, 18, { cut: 5, skew: 0 });
        F().draw(boss.name, x + w - 4, y, { color: R.COL.cyan, outline: '#04101a', align: 'right' });
        F().draw('HP', x + 6, y + 13, { color: '#3ee0f0', scale: 1 });
        F().draw(`${Math.round(boss.shownHp)}/${boss.maxHp}`, x + w - 6, y + 13, { color: '#5aa0ff', outline: '#04101a', align: 'right' });
        R.bar(x + 20, y + 21, w - 26, 3, boss.hp / boss.maxHp, '#ff3058', '#ffa040', { ghost: boss.hpGhost, frame: false });
        GS.Icons.draw(boss.element, x - 8, y + 11);
      } else {
        F().draw(`VAGUE ${this.wave + 1}/${this.stage.waves.length}`, GS.W - 6, 6, { color: R.COL.cyan, outline: '#04101a', align: 'right' });
      }
    }

    drawHeroPanel(f) {
      if (!f) return;
      const x = 4;
      const y = HUD_Y;
      const w = 148;
      const h = 46;
      const ctx = GS.ctx;
      R.panel(x, y, w, h, { cut: 6 });
      // décor "circuit"
      ctx.save();
      ctx.globalAlpha = 0.25;
      R.line(x + 70, y + 4, x + 90, y + 24, R.COL.border);
      R.line(x + 90, y + 24, x + 140, y + 24, R.COL.border);
      ctx.restore();
      // portrait à droite
      GS.UI.portrait(f.def, x + 92, y + 2, 54, h - 4, 2, { focusX: 15, focusY: 12 });
      if (!f.alive) R.fade(0, '#000');
      const lx = x + 6;
      F().draw('HP', lx, y + 5, { color: '#3e8cff', outline: '#04101a' });
      F().draw(`${Math.round(f.shownHp)}/${f.maxHp}`, lx + 16, y + 5, { color: '#5ab0ff', outline: '#04101a' });
      R.bar(lx, y + 13, 84, 3, f.hp / f.maxHp, '#30d070', '#a0ff90', { ghost: f.hpGhost, frame: false });
      F().draw('MP', lx, y + 19, { color: '#c070ff', outline: '#04101a' });
      F().draw(`${f.mp}/${f.maxMp}`, lx + 16, y + 19, { color: '#e0d0ff', outline: '#04101a' });
      F().draw('SP', lx, y + 28, { color: '#3ec8ff', outline: '#04101a' });
      F().draw(`${Math.round(f.sp)}%`, lx + 16, y + 28, { color: f.sp >= 100 ? '#ffffff' : '#a0e8ff', outline: '#04101a' });
      R.bar(lx + 42, y + 29, 42, 4, f.sp / 100, '#2a9aff', '#80e8ff', { frame: false });
      const slc = f.sl >= 100 ? GS.rainbow(this.t) : '#ffe040';
      F().draw('SL', lx, y + 37, { color: '#ffd040', outline: '#04101a' });
      F().draw(`${Math.round(f.sl)}%`, lx + 16, y + 37, { color: slc, outline: '#04101a' });
      R.bar(lx + 42, y + 38, 42, 4, f.sl / 100, '#ffa020', f.sl >= 100 ? slc : '#fff080', { frame: false });
      if (!f.alive) F().draw('K.O.', x + 118, y + 18, { color: '#ff5060', outline: '#000', scale: 2, align: 'center' });
    }

    drawCommandMenu() {
      const m = this.menu;
      const f = m ? m.f : null;
      const ctx = GS.ctx;
      const active = !!m && !this.auto;
      ctx.save();
      if (!active) ctx.globalAlpha = 0.55;
      // panneau incliné
      const { x, y, w, h } = CMD;
      R.poly(
        [
          [x + 16, y],
          [x + w, y],
          [x + w, y + h - 6],
          [x + w - 6, y + h],
          [x, y + h],
          [x + 4, y + 20],
        ],
        R.COL.panel,
        R.COL.border
      );
      ctx.globalAlpha *= 0.3;
      R.line(x + 18, y + 3, x + 30, y + 15, R.COL.border);
      ctx.globalAlpha = active ? 1 : 0.55;
      CMD_ITEMS.forEach((it, i) => {
        const [rx, ry, rw, rh] = this.cmdRect(i);
        const en = f ? this.itemEnabled(f, it.type) : false;
        const sel = active && m.state === 'main' && m.idx === i;
        const hover = active && I().over(rx, ry, rw, rh);
        if (sel || hover) {
          R.gradH(rx, ry, rw, rh, 'rgba(62,224,240,0.05)', 'rgba(62,224,240,0.45)');
        }
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
      R.panel(146, 108, 238, 56, { cut: 6 });
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
      const x = 242;
      const y = HUD_Y;
      const w = 138;
      const h = 46;
      R.panel(x, y, w, h, { cut: 6 });
      this.heroes.forEach((f, i) => {
        const ry = y + 3 + i * 14;
        const act = this.active === f;
        if (act) R.gradH(x + 2, ry - 1, w - 4, 14, 'rgba(62,224,240,0.35)', 'rgba(62,224,240,0)');
        R.rect(x + 4, ry, 12, 12, '#0a2a48');
        GS.UI.portrait(f.def, x + 5, ry + 1, 10, 10, 1, { focusX: 15, focusY: 12, dark: !f.alive });
        R.frame(x + 4, ry, 12, 12, f.alive ? GS.EL[f.element].color : '#5a5a5a');
        F().draw(f.name, x + 19, ry, { color: f.alive ? '#ffffff' : '#7a7a7a' });
        R.bar(x + 19, ry + 8, 50, 3, f.hp / f.maxHp, '#30d070', '#a0ff90', { ghost: f.hpGhost, frame: false });
        F().draw(String(Math.round(f.shownHp)), x + 100, ry, { color: '#a0ffb0', align: 'right' });
        R.bar(x + 72, ry + 8, 28, 3, f.sp / 100, '#2a9aff', '#80e8ff', { frame: false });
        R.bar(x + 103, ry + 8, 30, 3, f.sl / 100, '#ffa020', f.sl >= 100 ? GS.rainbow(this.t, i * 60) : '#fff080', { frame: false });
        if (f.sl >= 100) F().draw('OL', x + 118, ry, { color: GS.rainbow(this.t, i * 50), align: 'center' });
        else if (f.sp >= 100) F().draw('SP', x + 118, ry, { color: '#80e8ff', align: 'center' });
      });
    }

    drawAbilityName() {
      const a = this.abName;
      const p = Math.min(1, a.t / 0.15);
      const w = F().width(a.name) + 30;
      const x = a.hero ? 4 - (1 - p) * 60 : GS.W - w - 4 + (1 - p) * 60;
      const y = 40;
      const col = a.color === 'rainbow' ? GS.rainbow(this.t) : a.color;
      const ctx = GS.ctx;
      ctx.save();
      ctx.globalAlpha = a.t > 1.3 ? Math.max(0, 1 - (a.t - 1.3) / 0.3) : 1;
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
      const y = 70;
      const hgt = 40 * E.outBack(p);
      R.rect(0, y - hgt / 2, GS.W, hgt, 'rgba(5,3,12,0.75)');
      R.rect(0, y - hgt / 2, GS.W, 1, b.color);
      R.rect(0, y + hgt / 2 - 1, GS.W, 1, b.color);
      if (b.warn) {
        ctx.globalAlpha *= 0.35;
        for (let x = -40 + ((b.t * 60) % 20); x < GS.W; x += 20) R.poly([[x, y - hgt / 2], [x + 10, y - hgt / 2], [x, y + hgt / 2], [x - 10, y + hgt / 2]], b.color);
        ctx.globalAlpha = U.clamp(out, 0, 1);
      }
      const sc = b.win ? 3 : 2;
      const tx = GS.W / 2 + (1 - E.outCubic(p)) * 200;
      F().draw(b.text, tx, y - 10 - (b.sub ? 2 : -4), { color: b.win ? GS.rainbow(this.t) : b.color, outline: '#000', scale: sc, align: 'center' });
      if (b.sub) F().draw(b.sub, GS.W / 2, y + 10, { color: '#ffffff', outline: '#000', align: 'center' });
      ctx.restore();
    }

    drawCutin(ctx) {
      const c = this.cutin;
      const t = c.t;
      const f = c.f;
      const el = GS.EL[f.element];
      ctx.save();
      R.fade(Math.min(0.75, t * 4), '#05030c');
      // bande diagonale
      const open = E.outCubic(Math.min(1, t / 0.2));
      const close = t > 1.3 ? E.inQuad((t - 1.3) / 0.25) : 0;
      const bh = 70 * open * (1 - close);
      const cy = 100;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, cy - bh / 2 + 18);
      ctx.lineTo(GS.W, cy - bh / 2 - 18);
      ctx.lineTo(GS.W, cy + bh / 2 - 18);
      ctx.lineTo(0, cy + bh / 2 + 18);
      ctx.closePath();
      ctx.clip();
      R.gradH(0, 0, GS.W, GS.H, el.dark, el.color);
      // lignes de vitesse
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 26; i++) {
        const ly = ((i * 37) % 120) + 40;
        const lx = ((i * 97 + t * 900) % (GS.W + 80)) - 80;
        R.rect(GS.W - lx, ly, 30 + (i % 3) * 20, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
      // héros en grand
      const slide = E.outCubic(Math.min(1, t / 0.35));
      const px = U.lerp(-120, 40, slide) + t * 12;
      GS.UI.portrait(f.def, px, cy - 50, 140, 100, 4, { focusX: 15, focusY: 14 });
      ctx.restore();
      R.line(0, cy - bh / 2 + 18, GS.W, cy - bh / 2 - 18, '#ffffff');
      R.line(0, cy + bh / 2 + 18, GS.W, cy + bh / 2 - 18, '#ffffff');
      if (t > 0.3 && t < 1.45) {
        const tp = Math.min(1, (t - 0.3) / 0.15);
        F().draw('OVERLIMIT', GS.W - 20 + (1 - tp) * 100, cy - 26, { color: GS.rainbow(t * 3), outline: '#000', scale: 3, align: 'right' });
        F().draw(c.ab.name, GS.W - 22, cy + 6, { color: '#ffffff', outline: '#000', scale: 2, align: 'right' });
        F().draw(f.def.name + ' - ' + f.def.title, GS.W - 22, cy + 26, { color: el.light, outline: '#000', align: 'right' });
      }
      ctx.restore();
    }

    drawPause() {
      R.fade(0.6, '#05030c');
      F().draw('PAUSE', GS.W / 2, 64, { color: R.COL.cyan, outline: '#000', scale: 3, align: 'center' });
      const r = this.pauseRects();
      R.panel(...r.resume, { cut: 5 });
      F().draw('REPRENDRE', GS.W / 2, r.resume[1] + 6, { color: '#ffffff', align: 'center' });
      R.panel(...r.quit, { cut: 5, border: '#ff5060' });
      F().draw('ABANDONNER', GS.W / 2, r.quit[1] + 6, { color: '#ff8090', align: 'center' });
      F().draw('A : auto   F : vitesse   P : pause', GS.W / 2, 160, { color: R.COL.dim, align: 'center' });
    }
  }

  // Dessine une zone d'un sprite centrée sur (fx, fy), recadrée.
  function ctx_clipDraw(img, x, y, w, h, fx, fy) {
    const ctx = GS.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const k = img.width > 60 ? 0.5 : 1;
    ctx.drawImage(img, Math.round(x + w / 2 - fx * k), Math.round(y + h / 2 - fy * k), img.width * k, img.height * k);
    ctx.restore();
  }

  GS.BattleScene = BattleScene;
})();
