'use strict';
// Audio 100% synthétisé (WebAudio) : bruitages "chiptune" et petit séquenceur de musique.
(function () {
  const A = (GS.Audio = { ctx: null, muted: false, musicOn: true });
  let master, sfxBus, musicBus, noiseBuf;
  const waves = {};

  A.unlock = () => {
    if (!A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      master = A.ctx.createGain();
      master.gain.value = A.muted ? 0 : 0.7;
      master.connect(A.ctx.destination);
      sfxBus = A.ctx.createGain();
      sfxBus.gain.value = 0.55;
      sfxBus.connect(master);
      musicBus = A.ctx.createGain();
      musicBus.gain.value = 0.3;
      musicBus.connect(master);
      const len = A.ctx.sampleRate;
      noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // Ondes "pulse" 25% et 12,5% façon console 8 bits.
      for (const duty of [0.125, 0.25]) {
        const n = 32;
        const real = new Float32Array(n);
        const imag = new Float32Array(n);
        for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
        waves['pulse' + duty] = A.ctx.createPeriodicWave(real, imag);
      }
      if (pendingSong) {
        const s = pendingSong;
        pendingSong = null;
        A.music(s);
      }
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
  };

  A.setMuted = (m) => {
    A.muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, A.ctx.currentTime, 0.05);
  };

  const setWave = (osc, type) => {
    if (waves[type]) osc.setPeriodicWave(waves[type]);
    else osc.type = type;
  };

  // Note simple avec enveloppe et glissando optionnel.
  const tone = (o) => {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + (o.delay || 0);
    const osc = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    setWave(osc, o.type || 'square');
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
    const v = o.vol === undefined ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  };

  const noise = (o) => {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + (o.delay || 0);
    const src = A.ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = A.ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + o.dur);
    f.Q.value = o.q || 1;
    const g = A.ctx.createGain();
    const v = o.vol === undefined ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  };

  const arp = (notes, step, o = {}) =>
    notes.forEach((f, i) => tone(Object.assign({ f, dur: o.dur || 0.12, type: o.type || 'pulse0.25', vol: o.vol || 0.14, delay: (o.delay || 0) + i * step }, {})));

  const throttle = {};
  A.sfx = (name, p = 1) => {
    if (!A.ctx || A.muted) return;
    const now = performance.now();
    if (throttle[name] && now - throttle[name] < 30) return;
    throttle[name] = now;
    switch (name) {
      case 'select':
        tone({ f: 880, dur: 0.05, type: 'pulse0.25', vol: 0.08 });
        break;
      case 'confirm':
        tone({ f: 660, dur: 0.06, type: 'pulse0.25', vol: 0.1 });
        tone({ f: 990, dur: 0.1, type: 'pulse0.25', vol: 0.1, delay: 0.05 });
        break;
      case 'back':
        tone({ f: 500, f2: 300, dur: 0.1, type: 'pulse0.25', vol: 0.1 });
        break;
      case 'error':
        tone({ f: 200, dur: 0.12, type: 'square', vol: 0.1 });
        tone({ f: 150, dur: 0.15, type: 'square', vol: 0.1, delay: 0.08 });
        break;
      case 'turn':
        tone({ f: 1320, dur: 0.05, type: 'triangle', vol: 0.12 });
        tone({ f: 1760, dur: 0.08, type: 'triangle', vol: 0.1, delay: 0.04 });
        break;
      case 'dash':
        noise({ f: 800, f2: 3000, dur: 0.15, filter: 'bandpass', q: 2, vol: 0.12 });
        break;
      case 'slash':
        noise({ f: 4000, f2: 700, dur: 0.14, filter: 'bandpass', q: 3, vol: 0.32 });
        tone({ f: 1200 * p, f2: 500, dur: 0.08, type: 'sawtooth', vol: 0.05 });
        break;
      case 'hit':
        noise({ f: 1800, f2: 200, dur: 0.12, vol: 0.4 });
        tone({ f: 160, f2: 50, dur: 0.12, type: 'triangle', vol: 0.3 });
        break;
      case 'crit':
        noise({ f: 3000, f2: 200, dur: 0.18, vol: 0.45 });
        tone({ f: 1600, f2: 1400, dur: 0.15, type: 'pulse0.125', vol: 0.12 });
        tone({ f: 120, f2: 40, dur: 0.2, type: 'triangle', vol: 0.35 });
        break;
      case 'gore':
        // explosion de chair : craquement grave + éclaboussures
        noise({ f: 700, f2: 60, dur: 0.55, vol: 0.6 });
        tone({ f: 70, f2: 25, dur: 0.45, type: 'sine', vol: 0.55 });
        for (let i = 0; i < 6; i++) noise({ f: 1200 + Math.random() * 1500, f2: 300, dur: 0.07, filter: 'bandpass', q: 4, vol: 0.25, delay: 0.06 + i * 0.05 + Math.random() * 0.03 });
        break;
      case 'sever':
        // membre tranché : chuintement + craquement d'os
        noise({ f: 5000, f2: 900, dur: 0.12, filter: 'bandpass', q: 3, vol: 0.35 });
        tone({ f: 300, f2: 90, dur: 0.08, type: 'square', vol: 0.12, delay: 0.03 });
        noise({ f: 1400, f2: 400, dur: 0.25, filter: 'bandpass', q: 2, vol: 0.2, delay: 0.06 });
        break;
      case 'splat':
        noise({ f: 900, f2: 200, dur: 0.09, filter: 'bandpass', q: 3, vol: 0.18 });
        break;
      case 'heavy':
        noise({ f: 900, f2: 60, dur: 0.5, vol: 0.5 });
        tone({ f: 90, f2: 30, dur: 0.5, type: 'sine', vol: 0.5 });
        break;
      case 'shoot':
        tone({ f: 900, f2: 1800, dur: 0.08, type: 'pulse0.25', vol: 0.08 });
        noise({ f: 2500, f2: 5000, dur: 0.08, filter: 'highpass', vol: 0.12 });
        break;
      case 'gun':
        noise({ f: 3000, f2: 400, dur: 0.12, vol: 0.32 });
        tone({ f: 160, f2: 50, dur: 0.12, type: 'square', vol: 0.12 });
        break;
      case 'magic':
        arp([523, 784, 1047, 1568], 0.04, { type: 'triangle', vol: 0.12, dur: 0.2 });
        noise({ f: 6000, dur: 0.3, filter: 'highpass', vol: 0.06 });
        break;
      case 'fire':
        noise({ f: 1500, f2: 300, dur: 0.45, vol: 0.4 });
        noise({ f: 5000, f2: 2000, dur: 0.3, filter: 'highpass', vol: 0.1, delay: 0.05 });
        tone({ f: 200, f2: 60, dur: 0.35, type: 'sawtooth', vol: 0.08 });
        break;
      case 'water':
        for (let i = 0; i < 5; i++) tone({ f: 500 + Math.random() * 600, f2: 200, dur: 0.08, type: 'sine', vol: 0.15, delay: i * 0.05 });
        noise({ f: 1200, f2: 400, dur: 0.4, filter: 'bandpass', q: 1, vol: 0.2 });
        break;
      case 'ice':
        arp([2093, 2637, 3136, 2637], 0.05, { type: 'triangle', vol: 0.08, dur: 0.15 });
        noise({ f: 7000, dur: 0.25, filter: 'highpass', vol: 0.1 });
        break;
      case 'earth':
        noise({ f: 400, f2: 80, dur: 0.6, vol: 0.55 });
        tone({ f: 70, f2: 35, dur: 0.5, type: 'triangle', vol: 0.4 });
        break;
      case 'light':
        arp([1047, 1319, 1568, 2093], 0.03, { type: 'sine', vol: 0.12, dur: 0.4 });
        noise({ f: 8000, dur: 0.4, filter: 'highpass', vol: 0.06 });
        break;
      case 'dark':
        tone({ f: 220, f2: 55, dur: 0.5, type: 'sawtooth', vol: 0.12 });
        tone({ f: 233, f2: 58, dur: 0.5, type: 'sawtooth', vol: 0.1 });
        noise({ f: 600, f2: 100, dur: 0.5, vol: 0.2 });
        break;
      case 'thunder':
        noise({ f: 5000, f2: 300, dur: 0.6, vol: 0.5 });
        tone({ f: 60, f2: 30, dur: 0.6, type: 'square', vol: 0.15 });
        break;
      case 'heal':
        arp([523, 659, 784, 1047, 1319], 0.05, { type: 'triangle', vol: 0.12, dur: 0.25 });
        break;
      case 'buff':
        tone({ f: 400, f2: 1200, dur: 0.25, type: 'pulse0.25', vol: 0.08 });
        tone({ f: 600, f2: 1800, dur: 0.25, type: 'pulse0.25', vol: 0.06, delay: 0.08 });
        break;
      case 'debuff':
        tone({ f: 900, f2: 200, dur: 0.3, type: 'pulse0.25', vol: 0.08 });
        break;
      case 'ko':
        tone({ f: 600, f2: 80, dur: 0.6, type: 'square', vol: 0.1 });
        noise({ f: 1000, f2: 100, dur: 0.5, vol: 0.2 });
        break;
      case 'charge':
        tone({ f: 150, f2: 900, dur: 0.6, type: 'sawtooth', vol: 0.06 });
        noise({ f: 300, f2: 4000, dur: 0.6, filter: 'bandpass', q: 4, vol: 0.12 });
        break;
      case 'cutin':
        noise({ f: 200, f2: 6000, dur: 0.35, filter: 'bandpass', q: 1.5, vol: 0.3 });
        tone({ f: 110, f2: 55, dur: 0.6, type: 'sawtooth', vol: 0.15, delay: 0.3 });
        noise({ f: 2000, f2: 100, dur: 0.6, vol: 0.4, delay: 0.3 });
        break;
      case 'explosion':
        noise({ f: 3000, f2: 50, dur: 0.9, vol: 0.6 });
        tone({ f: 80, f2: 25, dur: 0.8, type: 'sine', vol: 0.55 });
        break;
      case 'summon_charge':
        tone({ f: 120, f2: 1400, dur: 1.6, type: 'sawtooth', vol: 0.05, attack: 0.3 });
        tone({ f: 180, f2: 2100, dur: 1.6, type: 'triangle', vol: 0.08, attack: 0.3 });
        noise({ f: 200, f2: 8000, dur: 1.6, filter: 'bandpass', q: 6, vol: 0.12, attack: 0.5 });
        break;
      case 'summon_burst':
        noise({ f: 6000, f2: 200, dur: 1.0, vol: 0.4 });
        arp([392, 523, 659, 784, 1047], 0.03, { type: 'pulse0.25', vol: 0.1, dur: 0.6 });
        break;
      case 'star':
        tone({ f: 1046 * p, dur: 0.18, type: 'pulse0.125', vol: 0.12 });
        tone({ f: 2093 * p, dur: 0.25, type: 'triangle', vol: 0.08, delay: 0.02 });
        break;
      case 'rare':
        arp([523, 659, 784, 1047, 1319, 1568, 2093], 0.06, { type: 'pulse0.25', vol: 0.12, dur: 0.35 });
        arp([262, 330, 392, 523], 0.1, { type: 'triangle', vol: 0.2, dur: 0.6 });
        break;
      case 'levelup':
        arp([784, 988, 1175, 1568], 0.06, { type: 'pulse0.25', vol: 0.1, dur: 0.18 });
        break;
      case 'coin':
        tone({ f: 988, dur: 0.06, type: 'pulse0.25', vol: 0.08 });
        tone({ f: 1319, dur: 0.18, type: 'pulse0.25', vol: 0.08, delay: 0.06 });
        break;
      case 'victory': {
        const n = [523, 523, 523, 523, 415, 466, 523, 466, 523];
        const d = [0.1, 0.1, 0.1, 0.3, 0.3, 0.3, 0.2, 0.1, 0.6];
        let t = 0;
        n.forEach((f, i) => {
          tone({ f, dur: d[i] + 0.05, type: 'pulse0.25', vol: 0.14, delay: t });
          tone({ f: f / 2, dur: d[i] + 0.05, type: 'triangle', vol: 0.2, delay: t });
          t += d[i] + 0.02;
        });
        break;
      }
      case 'defeat':
        arp([440, 415, 392, 370, 349], 0.22, { type: 'triangle', vol: 0.2, dur: 0.3 });
        break;
      default:
        break;
    }
  };

  // ------------------------------------------------------------ musique
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const freqOf = (name) => {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return 0;
    const midi = 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  };
  const seq = (s) => s.trim().split(/\s+/);

  const SONGS = {
    home: {
      bpm: 104,
      tracks: [
        {
          wave: 'pulse0.25',
          vol: 0.09,
          notes: seq(`E5 = G5 = C5 = D5 E5  C5 = A4 = = = G4 A4  F4 = A4 = C5 = F5 E5  D5 = = = B4 = G4 =
                      E5 = G5 = C6 = B5 G5  A5 = E5 = C5 = E5 =  F5 = E5 = D5 = C5 A4  B4 = D5 = G5 = = -`),
        },
        {
          wave: 'triangle',
          vol: 0.22,
          notes: seq(`C3 G3 C4 G3 C3 G3 C4 G3  A2 E3 A3 E3 A2 E3 A3 E3  F2 C3 F3 C3 F2 C3 F3 C3  G2 D3 G3 D3 G2 D3 G3 D3`),
        },
        { wave: 'pulse0.125', vol: 0.04, notes: seq(`- C5 - E5 - G5 - E5  - A4 - C5 - E5 - C5  - F4 - A4 - C5 - A4  - G4 - B4 - D5 - B4`) },
      ],
      drums: 'k.h.s.h.k.h.s.hh',
    },
    battle: {
      bpm: 150,
      tracks: [
        {
          wave: 'pulse0.25',
          vol: 0.09,
          notes: seq(`A4 = C5 = E5 - D5 C5  A4 = = = F4 = G4 A4  B4 = D5 = G5 = F5 E5  E5 = = = D5 = B4 G#4
                      A4 = C5 = E5 = A5 =  G5 = F5 = E5 = C5 =  D5 = B4 = G4 = B4 D5  E5 = = = = = - -`),
        },
        {
          wave: 'triangle',
          vol: 0.26,
          notes: seq(`A2 A3 A2 A3 A2 A3 A2 A3  F2 F3 F2 F3 F2 F3 F2 F3  G2 G3 G2 G3 G2 G3 G2 G3  E2 E3 E2 E3 E2 E3 E2 E3`),
        },
        { wave: 'pulse0.125', vol: 0.035, notes: seq(`E5 A5 E5 C5 E5 A5 E5 C5  F5 A5 F5 C5 F5 A5 F5 C5  G5 B5 G5 D5 G5 B5 G5 D5  G#5 B5 G#5 E5 G#5 B5 G#5 E5`) },
      ],
      drums: 'k.hsk.hskkhsk.hs',
    },
    boss: {
      bpm: 168,
      tracks: [
        {
          wave: 'pulse0.25',
          vol: 0.09,
          notes: seq(`D5 D5 F5 D5 A5 = G5 F5  D5 = F5 = Bb5 = A5 G5  E5 E5 G5 E5 C6 = Bb5 A5  C#6 = A5 = E5 = C#5 =
                      D5 = A4 = D5 = F5 =  Bb4 = D5 = F5 = Bb5 =  C5 = E5 = G5 = C6 =  A5 = = = C#6 = E6 =`),
        },
        {
          wave: 'sawtooth',
          vol: 0.07,
          notes: seq(`D2 D2 D3 D2 D2 D3 D2 D3  Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 Bb2  C2 C2 C3 C2 C2 C3 C2 C3  A1 A1 A2 A1 A1 A2 A1 A2`),
        },
        {
          wave: 'triangle',
          vol: 0.22,
          notes: seq(`D3 = D3 = D3 = D3 =  Bb2 = Bb2 = Bb2 = Bb2 =  C3 = C3 = C3 = C3 =  A2 = A2 = A2 = A2 =`),
        },
      ],
      drums: 'k.hskkhsk.hskshs',
    },
    summon: {
      bpm: 84,
      tracks: [
        { wave: 'triangle', vol: 0.12, notes: seq(`E4 G4 B4 E5 B4 G4 E4 G4  C4 E4 G4 C5 G4 E4 C4 E4  D4 F#4 A4 D5 A4 F#4 D4 F#4  B3 D#4 F#4 B4 F#4 D#4 B3 D#4`) },
        { wave: 'sine', vol: 0.1, notes: seq(`B5 = = = G5 = = =  E5 = = = G5 = = =  F#5 = = = A5 = = =  B5 = = = D#5 = = =`) },
        { wave: 'triangle', vol: 0.18, notes: seq(`E2 = = = = = = =  C2 = = = = = = =  D2 = = = = = = =  B1 = = = = = = =`) },
      ],
      drums: '',
    },
  };

  let song = null;
  let songName = null;
  let step = 0;
  let nextT = 0;
  let timer = null;
  let pendingSong = null;

  const playDrum = (ch, t) => {
    if (ch === 'k') {
      tone({ f: 160, f2: 40, dur: 0.12, type: 'sine', vol: 0.5, bus: musicBus, delay: t - A.ctx.currentTime });
    } else if (ch === 's') {
      noise({ f: 2500, dur: 0.1, filter: 'highpass', vol: 0.25, bus: musicBus, delay: t - A.ctx.currentTime });
      tone({ f: 220, f2: 120, dur: 0.07, type: 'triangle', vol: 0.2, bus: musicBus, delay: t - A.ctx.currentTime });
    } else if (ch === 'h') {
      noise({ f: 8000, dur: 0.03, filter: 'highpass', vol: 0.08, bus: musicBus, delay: t - A.ctx.currentTime });
    }
  };

  const schedule = () => {
    if (!song || !A.ctx) return;
    const stepDur = 60 / song.bpm / 2;
    while (nextT < A.ctx.currentTime + 0.2) {
      for (const tr of song.tracks) {
        const i = step % tr.notes.length;
        const tok = tr.notes[i];
        if (tok !== '-' && tok !== '=') {
          let len = 1;
          while (tr.notes[(i + len) % tr.notes.length] === '=' && len < tr.notes.length) len++;
          const f = freqOf(tok);
          if (f)
            tone({
              f,
              dur: Math.max(0.06, len * stepDur * 0.92),
              type: tr.wave,
              vol: tr.vol,
              attack: 0.01,
              bus: musicBus,
              delay: nextT - A.ctx.currentTime,
            });
        }
      }
      if (song.drums) playDrum(song.drums[step % song.drums.length], nextT);
      nextT += stepDur;
      step++;
    }
  };

  A.music = (name) => {
    if (songName === name && (song || pendingSong)) return;
    songName = name;
    if (!A.ctx) {
      pendingSong = name;
      return;
    }
    song = name ? SONGS[name] : null;
    step = 0;
    nextT = A.ctx.currentTime + 0.12;
    if (!timer) timer = setInterval(schedule, 30);
  };

  A.stopMusic = () => {
    song = null;
    songName = null;
    pendingSong = null;
  };
})();
