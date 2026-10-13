'use strict';
// Coroutines (générateurs) pour scénariser animations et combats.
//   yield 0.3        -> attend 0.3 s
//   yield            -> attend 1 frame
//   yield task       -> attend la fin d'une autre tâche (ou d'un tableau de tâches)
//   yield* gen()     -> exécute une sous-séquence
(function () {
  const U = GS.U;

  class Runner {
    constructor() {
      this.tasks = [];
      this.dt = 0;
    }
    run(gen) {
      const task = { gen, wait: 0, waitFor: null, done: false };
      this.tasks.push(task);
      return task;
    }
    update(dt) {
      this.dt = dt;
      GS.dt = dt;
      const list = this.tasks.slice();
      for (const t of list) this.step(t, dt);
      this.tasks = this.tasks.filter((t) => !t.done);
    }
    step(t, dt) {
      if (t.done) return;
      if (t.wait > 0) {
        t.wait -= dt;
        if (t.wait > 0) return;
      }
      if (t.waitFor) {
        const w = t.waitFor;
        const ok = Array.isArray(w) ? w.every((x) => x.done) : w.done;
        if (!ok) return;
        t.waitFor = null;
      }
      const r = t.gen.next();
      if (r.done) {
        t.done = true;
        return;
      }
      const v = r.value;
      if (typeof v === 'number') t.wait = v;
      else if (v && (v.gen || Array.isArray(v))) t.waitFor = v;
    }
    clear() {
      this.tasks = [];
    }
    get busy() {
      return this.tasks.length > 0;
    }
  }
  GS.Runner = Runner;

  // Interpole des propriétés numériques d'un objet.
  GS.tween = function* (obj, to, dur, ease = U.Ease.outQuad) {
    const from = {};
    for (const k in to) from[k] = obj[k];
    let t = 0;
    while (t < dur) {
      t += GS.dt || 0.016;
      const p = ease(Math.min(1, t / dur));
      for (const k in to) obj[k] = from[k] + (to[k] - from[k]) * p;
      if (t < dur) yield;
    }
    for (const k in to) obj[k] = to[k];
  };

  GS.wait = function* (sec) {
    yield sec;
  };

  // Attend qu'une condition devienne vraie.
  GS.until = function* (fn) {
    while (!fn()) yield;
  };
})();
