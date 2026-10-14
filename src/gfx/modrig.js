'use strict';
// Animation modulaire : un personnage est découpé en pièces de pixel art (tête, torse, bras,
// avant-bras, poings, cuisses, tibias, chaussures). Les membres pivotent autour de leurs
// articulations, le torse se penche par cisaillement (plus naturel en pixel art qu'une rotation),
// avec écrasement/étirement et balancement du bas de la veste. Chaque pose est recomposée pixel
// par pixel, détourée automatiquement puis mise en cache.
(function () {
  const U = GS.U;
  const Pix = GS.Pix;
  const M = (GS.ModRig = {});

  const CW = 96;
  const CH = 92;
  const GROUND = 86;
  const ROOT_X = 44;
  M.CW = CW;
  M.CH = CH;
  M.GROUND = GROUND;
  M.FOOT = { x: ROOT_X + 1, y: GROUND + 1 };

  // ------------------------------------------------------------ rastérisation
  // Rotation façon RotSprite : le gabarit est agrandi ×8 par Scale2x (qui arrondit les
  // diagonales au lieu de dupliquer les pixels), on y échantillonne la rotation puis on revient
  // à la taille d'origine. Les membres tournés gardent des bords nets, sans trous ni escaliers.
  const UP = 8;
  const upCache = new WeakMap();
  const scale2x = (g) => {
    const h = g.length;
    const w = g[0].length;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x]);
    const out = [];
    for (let y = 0; y < h; y++) {
      const r0 = [];
      const r1 = [];
      for (let x = 0; x < w; x++) {
        const P = g[y][x];
        const A = at(x, y - 1);
        const B = at(x + 1, y);
        const C = at(x - 1, y);
        const D = at(x, y + 1);
        r0.push(C === A && C !== D && A !== B ? A : P, A === B && A !== C && B !== D ? B : P);
        r1.push(D === C && D !== B && C !== A ? C : P, B === D && B !== A && D !== C ? D : P);
      }
      out.push(r0, r1);
    }
    return out;
  };
  const upscaled = (tpl) => {
    let u = upCache.get(tpl);
    if (!u) {
      u = tpl.map((row) => [...row]);
      for (let k = 1; k < UP; k *= 2) u = scale2x(u);
      upCache.set(tpl, u);
    }
    return u;
  };
  // Gabarit tourné autour d'un axe vertical (colonne cx) : chaque ligne est enroulée sur un
  // cylindre de section elliptique (profondeur = ratio × sa demi-largeur) ; chaque colonne
  // montre le point le plus proche de la caméra. Les détails glissent sur le volume (le visage
  // passe de face au profil) au lieu d'être écrasés. Le dos est pris dans `back` aux mêmes
  // colonnes, vu en miroir (la tête y devient des cheveux). Rend { t, ax } : nouveau gabarit
  // (élargi au besoin) et colonne de l'axe dans celui-ci.
  const warpCache = new WeakMap();
  const warp = (tpl, back, cx, yaw, ratio) => {
    let m = warpCache.get(tpl);
    if (!m) warpCache.set(tpl, (m = new Map()));
    const key = yaw.toFixed(4) + ':' + cx + ':' + ratio;
    let r = m.get(key);
    if (r) return r;
    const h = tpl.length;
    const w = tpl[0].length;
    // chaque ligne est une ellipse autour de son propre centre ; centres et demi-largeurs
    // sont lissés sur les lignes voisines (sinon les lignes de largeurs différentes se
    // décalent et font des bandes)
    const span = tpl.map((row, y) => {
      let x0 = Infinity;
      let x1 = -Infinity;
      for (let x = 0; x < w; x++) {
        if (row[x] === '.' && back[y][x] === '.') continue;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x + 1);
      }
      return x1 > x0 ? [x0, x1] : null;
    });
    const smooth = (f) =>
      span.map((sp, y) => {
        if (!sp) return 0;
        let sum = 0;
        let n = 0;
        for (let k = -2; k <= 2; k++) {
          const o = span[y + k];
          if (o) {
            sum += f(o);
            n++;
          }
        }
        return sum / n;
      });
    const cen = smooth((o) => (o[0] + o[1]) / 2);
    const half = smooth((o) => (o[1] - o[0]) / 2);
    const rad = span.map((sp, y) => (sp ? Math.max(cen[y] - sp[0], sp[1] - cen[y], half[y]) : 0));
    let ext = 1;
    span.forEach((sp, y) => {
      if (sp) ext = Math.max(ext, Math.abs(cen[y] - cx) + rad[y]);
    });
    const Rm = Math.ceil(ext);
    const W = 2 * Rm + 2;
    const ax = Rm + 1 + (cx - Math.floor(cx));
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const t = tpl.map((row, y) => {
      const R = rad[y];
      const out = new Array(W).fill('.');
      if (!R) return out.join('');
      const c = cen[y];
      const Rz = R * ratio;
      const best = new Float64Array(W).fill(-Infinity);
      const N = Math.ceil(R * 24);
      for (let i = 0; i < N; i++) {
        const th = ((i + 0.5) / N - 0.5) * 2 * Math.PI;
        const px = R * Math.sin(th);
        const pz = Rz * Math.cos(th);
        const j = Math.floor(ax + (c - cx + px) * cy + pz * sy);
        const z = -px * sy + pz * cy;
        if (j < 0 || j >= W || z <= best[j]) continue;
        // un trou du gabarit laisse voir ce qu'il y a derrière (l'autre face du volume)
        const sx = Math.floor(c + px);
        const ch = sx < 0 || sx >= w ? '.' : (pz >= 0 ? row : back[y])[sx];
        if (ch === '.') continue;
        best[j] = z;
        out[j] = ch;
      }
      return out.join('');
    });
    r = { t, ax };
    m.set(key, r);
    return r;
  };
  M.warp = warp;
  // Pièce tournée : enroulée sur son propre volume (autour du centre de sa boîte) puis placée
  // comme un point du corps situé à cette distance de l'axe (cx) et à z0 en profondeur.
  // Rend { t, ax } : gabarit et colonne de l'axe du corps dans ce gabarit.
  const turnPiece = (tpl, back, cx, yaw, ratio, z0 = 0) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    tpl.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.' && back[y][x] === '.') continue;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
    });
    if (x1 < x0) return { t: tpl, ax: cx };
    const cc = (x0 + x1 + 1) / 2;
    const w = warp(tpl, back, cc, yaw, ratio);
    return { t: w.t, ax: w.ax - ((cc - cx) * Math.cos(yaw) + z0 * Math.sin(yaw)) };
  };
  // Place `tpl` pour que son point (ax, ay) tombe en (px, py), tourné de `ang` (sens horaire).
  // o (facultatif) : k = raccourci le long de l'axe u du gabarit (membre vu en profondeur),
  // s = échelle uniforme (perspective : plus gros quand c'est plus près).
  const stampRot = (g, tpl, ax, ay, px, py, ang, map, o) => {
    const th = tpl.length;
    const tw = tpl[0].length;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const k = o && o.k !== undefined ? Math.max(0.05, o.k) : 1;
    const sc = o && o.s !== undefined ? o.s : 1;
    const ux = o && o.u ? o.u[0] : 0;
    const uy = o && o.u ? o.u[1] : 1;
    const scaled = k !== 1 || sc !== 1;
    // quasi droit et sans échelle : copie directe (identique au dessin d'origine)
    const up = Math.abs(Math.sin(ang)) > 0.04 || scaled ? upscaled(tpl) : null;
    const rad = Math.ceil(Math.hypot(Math.max(ax, tw - ax), Math.max(ay, th - ay)) * Math.max(1, sc)) + 1;
    const ik = 1 / k - 1;
    const out = [];
    for (let y = Math.floor(py - rad); y <= py + rad; y++) {
      if (y < 0 || y >= g.h) continue;
      for (let x = Math.floor(px - rad); x <= px + rad; x++) {
        if (x < 0 || x >= g.w) continue;
        const dx = x + 0.5 - px;
        const dy = y + 0.5 - py;
        let rx = dx * c + dy * s;
        let ry = -dx * s + dy * c;
        if (scaled) {
          const pr = (rx * ux + ry * uy) * ik;
          rx = (rx + pr * ux) / sc;
          ry = (ry + pr * uy) / sc;
        }
        const fx = rx + ax;
        const fy = ry + ay;
        if (fy < 0 || fy >= th || fx < 0 || fx >= tw) continue;
        let ch = up ? up[Math.floor(fy * UP)][Math.floor(fx * UP)] : tpl[Math.floor(fy)][Math.floor(fx)];
        if (ch === '.') continue;
        if (map && map[ch]) ch = map[ch];
        g[y][x] = ch;
        out.push(y * g.w + x);
      }
    }
    return out;
  };
  M.stampRot = stampRot;

  // Torse en 2 pièces articulées à la taille : le bassin suit les hanches (penché de `hipLean`),
  // la poitrine se penche de `lean` à partir de la taille (cisaillement, plus propre en pixel
  // art qu'une rotation), avec écrasement/étirement et balancement de l'ourlet.
  // Le pivot (hanche) du gabarit est placé en (hx, hy).
  const WAIST = 11; // lignes entre la hanche et la taille
  M.WAIST = WAIST;
  // cells (facultatif) : reçoit les cases écrites.
  const stampTorso = (g, tpl, pvx, pvy, hx, hy, lean, sy, sway, hemRows, hipLean, cells = null) => {
    const th = tpl.length;
    const tw = tpl[0].length;
    const k = Math.tan(lean);
    const kh = Math.tan(hipLean === undefined ? lean * 0.4 : hipLean);
    const shiftOf = (up) => (up <= WAIST ? kh * up : kh * WAIST + k * (up - WAIST)) * sy;
    const top = Math.floor(hy - pvy * sy) - 2;
    const bottom = Math.ceil(hy + (th - pvy) * sy) + 1;
    for (let y = top; y <= bottom; y++) {
      if (y < 0 || y >= g.h) continue;
      const ty = Math.floor(pvy + (y + 0.5 - hy) / sy);
      if (ty < 0 || ty >= th) continue;
      const up = pvy - ty; // hauteur au-dessus de la hanche (en lignes du gabarit)
      let shift = shiftOf(up);
      const hemStart = th - hemRows;
      if (ty >= hemStart) shift += sway * ((ty - hemStart + 1) / hemRows);
      const row = tpl[ty];
      for (let tx = 0; tx < tw; tx++) {
        const ch = row[tx];
        if (ch === '.') continue;
        const x = Math.round(hx + (tx - pvx) + shift);
        if (x >= 0 && x < g.w) {
          g[y][x] = ch;
          if (cells) cells.push(y * g.w + x);
        }
      }
    }
    // position (en grille) d'un point du gabarit après transformation (corps de face)
    return (px, py) => {
      const up = pvy - py;
      return { x: hx + (px - pvx) + shiftOf(up), y: hy - up * sy };
    };
  };

  // Liseré sombre autour d'une pièce, là où elle recouvre d'autres pièces.
  // owner/gid (facultatifs) : on ne cerne pas les pixels du même membre (autres pièces du bras).
  const innerOutline = (g, cells, ch, owner, gid) => {
    const set = new Set(cells);
    for (const id of cells) {
      const x = id % g.w;
      const y = (id - x) / g.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        const nid = ny * g.w + nx;
        if (set.has(nid) || g[ny][nx] === '.') continue;
        if (owner && owner[nid] === gid) continue;
        g[ny][nx] = ch;
      }
    }
  };

  const ang0 = (p) => Math.atan2(p.end[0] - p.pivot[0], p.end[1] - p.pivot[1]);
  const len = (p) => Math.hypot(p.end[0] - p.pivot[0], p.end[1] - p.pivot[1]);
  // axe du membre dans son gabarit (du pivot vers le bout), pour le raccourci en profondeur
  const axis = (p) => {
    const l = len(p) || 1;
    return [(p.end[0] - p.pivot[0]) / l, (p.end[1] - p.pivot[1]) / l];
  };

  // ------------------------------------------------------------ 3D
  // Squelette en 3D projeté sur l'écran : x vers l'avant du perso (droite), y vers le bas,
  // z vers la caméra. Chaque membre a un angle dans le plan (a) et un angle de profondeur (d) ;
  // le corps entier peut tourner autour de l'axe vertical des hanches (yaw). Un membre qui
  // pointe vers la caméra ou s'en éloigne est raccourci, grossit ou rapetisse selon sa distance
  // (perspective), et les pièces sont dessinées de la plus lointaine à la plus proche.
  // Sans profondeur ni rotation, le rendu est exactement celui du dessin à plat.
  M.PERSP = 120; // distance de la caméra (pixels) pour la perspective ; 0 : sans perspective
  const KZ = 8; // rang d'affichage gagné par pixel vers la caméra
  // profondeur au repos (pixels vers la caméra) des points d'attache
  const Z_NEAR_ARM = 4;
  const Z_LEG = 2;
  const Z_HEAD = 1;
  // épaisseur (profondeur / largeur) du torse et de la tête, pour les rotations
  const TORSO_DEPTH = 0.55;
  const HEAD_DEPTH = 0.9;
  const ARM_DEPTH = 0.8;
  const lumOf = (h) => {
    const [r, g, b] = U.hexToRgb(h);
    return 0.3 * r + 0.59 * g + 0.11 * b;
  };
  const isWarm = (h) => {
    const [r, g] = U.hexToRgb(h);
    return r > g + 20;
  };

  // ------------------------------------------------------------ personnage
  class ModChar {
    constructor(spec) {
      this.spec = spec;
      this.P = spec.art.parts;
      this.cache = new Map();
      this.L = { thigh: len(this.P.thighF), shin: len(this.P.shinF) };
      // membres arrachés (gore) : 'armF', 'armB', 'head'
      this.lost = {};
      this.lostKey = '';
      // palette assombrie pour les membres arrière (profondeur) : couleur la plus proche
      // d'une version assombrie de chaque teinte (garde la même famille de couleur)
      // spec.shadeFamily : clé -> famille (même matière) où chercher la teinte assombrie
      const pal = spec.art.pal;
      const keys = Object.keys(pal);
      const fam = spec.shadeFamily;
      this.shade = {};
      for (const k of keys) {
        const target = U.hexToRgb(U.shade(pal[k], -0.22));
        let best = k;
        let bd = 1e9;
        for (const k2 of keys) {
          if (fam && fam[k2] !== fam[k]) continue;
          const c = U.hexToRgb(pal[k2]);
          const d = (c[0] - target[0]) ** 2 + (c[1] - target[1]) ** 2 + (c[2] - target[2]) ** 2;
          if (d < bd) {
            bd = d;
            best = k2;
          }
        }
        this.shade[k] = best;
      }
    }

    // Arrière de la tête (vue de dos) : le visage est recouvert par les cheveux (ou la
    // capuche) : chaque pixel qui n'en fait pas partie prend le pixel de cheveux le plus proche
    // sur sa ligne. Sont des cheveux les matières « hair » du modèle relevé (ou des persos
    // assemblés) ; à défaut, les couleurs présentes dans le haut de la tête.
    headHair() {
      if (this._headHair !== undefined) return this._headHair;
      const art = this.spec.art;
      const t = this.P.head.t;
      const mat = {};
      if (art.mat && art.mat.head) Object.assign(mat, art.mat.head);
      const fam = this.spec.shadeFamily;
      if (fam) for (const [k, f] of Object.entries(fam)) if (f.startsWith('head:')) mat[k] = f.slice(5);
      const top = new Set();
      for (const row of t.slice(0, Math.max(2, Math.round(t.length / 4)))) for (const ch of row) top.add(ch);
      const hairy = (ch) => ch !== '.' && (mat[ch] ? mat[ch] === 'hair' : top.has(ch));
      const count = {};
      for (const row of t) for (const ch of row) if (hairy(ch)) count[ch] = (count[ch] || 0) + 1;
      const main = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      if (!main) return (this._headHair = null);
      this._headHair = t.map((row) =>
        [...row]
          .map((ch, x) => {
            if (ch === '.' || hairy(ch)) return ch;
            for (let d = 1; d < row.length; d++) {
              if (hairy(row[x - d])) return row[x - d];
              if (hairy(row[x + d])) return row[x + d];
            }
            return main;
          })
          .join('')
      );
      return this._headHair;
    }

    render(pose) {
      const sp = this.spec;
      const P = this.P;
      const L = this.L;
      const J = sp.joints;
      const lost = this.lost;
      const g = Pix.grid(CW, CH);
      const lean0 = pose.lean || 0;
      const sy = 1 + (pose.squash || 0);
      const stumps = [];
      const pts = {};
      // avancée de chaque articulation vers la caméra : par rapport à sa place au repos
      // (depth) et absolue (zs, pour une vue de dessus)
      const depth = {};
      const zs = {};
      const yaw = pose.yaw || 0;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);
      const turned = yaw !== 0;
      // le corps penché vers l'avant, vu tourné : l'inclinaison à l'écran suit le cosinus
      const lean = lean0 * cyw;
      const PD = M.PERSP;
      const persp = (dz) => (PD > 0 && dz ? U.clamp(PD / (PD - dz), 0.8, 1.25) : 1);
      // hauteur de hanche : le pied le plus bas touche le sol (sauf en l'air : pose.y < 0)
      const ext = (l, side) => {
        if (lost['leg' + side]) return -1;
        const d1 = l.d || 0;
        const d2 = d1 + (l.dk || 0);
        return Math.cos(l.a) * Math.cos(d1) * L.thigh + (lost['knee' + side] ? 0 : Math.cos(l.a - l.k) * Math.cos(d2) * L.shin);
      };
      let lowest = Math.max(ext(pose.legs[0], 'B'), ext(pose.legs[1], 'F'));
      if (lowest < 0) lowest = 2; // plus de jambes : sur le bassin
      const hip = { x: ROOT_X + (pose.x || 0), y: GROUND - 6 - lowest + (pose.y || 0) };

      // point d'attache (x à plat, profondeur au repos z0) après rotation du corps
      const root = (x, y, z0) => ({ x: hip.x + (x - hip.x) * cyw + z0 * syw, y, z: -(x - hip.x) * syw + z0 * cyw, z0 });
      // segment de longueur l, angle a dans le plan, d en profondeur, puis rotation du corps
      // vecteur (bx, by, bz) dans le repère du corps, vu après la rotation du corps
      const segV = (bx, by, bz) => {
        const dx = bx * cyw + bz * syw;
        return { dx, dy: by, dz: -bx * syw + bz * cyw, ang: Math.atan2(dx, by), slen: Math.hypot(dx, by) };
      };
      const seg = (l, a, d) => {
        // à plat (sans profondeur ni rotation) : exactement le calcul du dessin d'origine
        if (!d && !syw) return { dx: Math.sin(a) * l, dy: Math.cos(a) * l, dz: 0, ang: a, slen: l };
        return segV(Math.sin(a) * Math.cos(d) * l, Math.cos(a) * Math.cos(d) * l, Math.sin(d) * l);
      };
      const at = (o, v) => ({ x: o.x + v.dx, y: o.y + v.dy, z: o.z + v.dz, z0: o.z0 });

      // ---------------------------------------------------------- pièces à dessiner
      // Chaque pièce a un rang : le rang du dessin à plat (ordre d'origine) plus KZ par pixel
      // d'avancée vers la caméra. On les trie puis on les dessine de la plus lointaine à la
      // plus proche.
      const items = [];
      const add = (layer, dz, draw, o = {}) => items.push(Object.assign({ key: layer + KZ * dz + (o.sub || 0) * 0.01, n: items.length, draw }, o));
      let gid = 0;
      // membre (pièce) entre deux points : pivot du gabarit sur `from`, axe vers `v`
      const limbDraw = (part, from, v, map) => () => {
        const p = P[part];
        const r = len(p) ? v.slen / len(p) : 1;
        const k = Math.abs(r - 1) < 1e-6 ? 1 : U.clamp(r, 0.3, 1);
        return stampRot(g, p.t, p.pivot[0] + 0.5, p.pivot[1] + 0.5, from.x, from.y, ang0(p) - v.ang, map, { k, u: axis(p), s: persp(from.z + v.dz / 2 - from.z0) });
      };

      // ---------------------------------------------------------- jambes
      const drawLeg = (l, front) => {
        const side = front ? 'F' : 'B';
        const layer = front ? 30 : 20;
        const group = ++gid;
        const h = root(hip.x + (front ? sp.hipF : sp.hipB), hip.y, front ? Z_LEG : -Z_LEG);
        pts['hip' + side] = { x: h.x, y: h.y };
        zs['hip' + side] = h.z;
        if (lost['leg' + side]) {
          stumps.push([h.x, h.y + 1, 5, 3]);
          return;
        }
        const map = front ? null : this.shade;
        const thighN = front ? 'thighF' : 'thighB';
        const shinN = front ? 'shinF' : 'shinB';
        const outline = (k) => front || k > 60;
        // traînée d'un coup de pied rapide : deux images fantômes du tibia et du pied le long
        // de la course, sous la jambe
        const tr = pose.trail && pose.trail.legs[front ? 1 : 0];
        if (tr && !lost['knee' + side]) {
          add(layer, 0, () => {
            for (const k of [0.35, 0.7]) {
              const ga = U.lerp(tr.a, l.a, k);
              const sa = ga - U.lerp(tr.k, l.k, k);
              const kx = h.x + Math.sin(ga) * L.thigh;
              const ky = h.y + Math.cos(ga) * L.thigh;
              const pS = P[shinN];
              stampRot(g, pS.t, pS.pivot[0] + 0.5, pS.pivot[1] + 0.5, kx, ky, ang0(pS) - sa, map);
              const ex = kx + Math.sin(sa) * len(pS);
              const ey = ky + Math.cos(sa) * len(pS);
              stampRot(g, P.shoe.t, P.shoe.pivot[0] + 0.5, P.shoe.pivot[1] + 0.5, ex, ey - 1, U.clamp(-sa * 0.65, -0.7, 1.4), map);
            }
            return [];
          }, { sub: -1 });
        }
        const d1 = l.d || 0;
        const vT = seg(len(P[thighN]), l.a, d1);
        const knee = at(h, vT);
        pts['knee' + side] = { x: knee.x, y: knee.y };
        depth['knee' + side] = knee.z - knee.z0;
        zs['knee' + side] = knee.z;
        const kT = layer + KZ * (h.z + vT.dz / 2 - h.z0);
        add(layer, h.z + vT.dz / 2 - h.z0, limbDraw(thighN, h, vT, map), { sub: 1, group, outline: outline(kT) });
        if (lost['knee' + side]) {
          stumps.push([knee.x, knee.y, 4, 4]);
          return;
        }
        const d2 = d1 + (l.dk || 0);
        const vS = seg(len(P[shinN]), l.a - l.k, d2);
        const ank = at(knee, vS);
        const kS = layer + KZ * (knee.z + vS.dz / 2 - knee.z0);
        add(layer, knee.z + vS.dz / 2 - knee.z0, limbDraw(shinN, knee, vS, map), { sub: 2, group, outline: outline(kS) });
        const shoe = P.shoe;
        const fr = U.clamp(-vS.ang * 0.65 + (l.toe || 0), -0.7, 1.4);
        add(layer, ank.z - ank.z0, () => stampRot(g, shoe.t, shoe.pivot[0] + 0.5, shoe.pivot[1] + 0.5, ank.x, ank.y - 1, fr, map, { s: persp(ank.z - ank.z0) }), { sub: 3, group, outline: outline(layer + KZ * (ank.z - ank.z0)) });
        pts['ank' + side] = { x: ank.x, y: ank.y - 1 };
        depth['ank' + side] = ank.z - ank.z0;
        zs['ank' + side] = ank.z;
      };

      // ---------------------------------------------------------- torse
      // Les bras "mains dans les poches" de la fiche sont collés au torse (même cisaillement).
      const tp = P.torso;
      const intact = (side) => !lost['arm' + side] && !lost['lo' + side] && !lost['fist' + side];
      const pocketB = (pose.arms[0].hand || 'fist') === 'pocket' && P.pocketB && intact('B');
      const pocketF = (pose.arms[1].hand || 'fist') === 'pocket' && P.pocketF && intact('F');
      // corps tourné : torse enroulé sur son volume (dos au-delà d'un quart de tour)
      const back = cyw < 0;
      const torsoStamp = (part, cells) => {
        const pp = P[part];
        // les bras dans les poches sont des volumes à part, à la profondeur des épaules
        const z0 = part === 'torso' ? 0 : part === 'pocketF' ? zF : zB;
        const wp = turned ? turnPiece(pp.t, pp.t, pp.pivot[0] + 0.5, yaw, part === 'torso' ? TORSO_DEPTH : ARM_DEPTH, z0) : { t: pp.t, ax: pp.pivot[0] + 0.5 };
        return stampTorso(g, wp.t, wp.ax, pp.pivot[1] + 0.5, hip.x, hip.y, lean, sy, pose.sway || 0, 5, pose.hipLean, cells);
      };
      // bras avant derrière le torse (tous sauf Djegui) : sa poche passe sous le torse
      const under = sp.frontArm === 'under';
      // bras arrière devant le torse (perso vu de l'autre trois-quarts, comme Valka)
      const backOver = sp.backArm === 'front';
      // calque du torse : poche arrière (derrière le buste), torse, poches devant ; ses
      // cellules servent au liseré des bras qui passent dessous
      let torsoMask = null;
      if (pocketF && under) {
        add(55, 0, () => {
          const cells = [];
          torsoStamp('pocketF', cells);
          return cells;
        }, { seam: true });
      }
      add(60, 0, () => {
        const cells = [];
        // poches derrière le buste, buste, poches devant ; de dos, l'ordre s'inverse
        const near = [];
        const far = [];
        if (pocketB) (backOver ? near : far).push('pocketB');
        if (pocketF && !under) near.unshift('pocketF');
        for (const part of back ? near : far) torsoStamp(part, cells);
        torsoStamp('torso', cells);
        for (const part of back ? far : near) torsoStamp(part, cells);
        torsoMask = new Uint8Array(CW * CH);
        for (const id of cells) torsoMask[id] = 1;
        return cells;
      }, { torso: true });
      // carte de placement (cisaillement du buste) : sert aux épaules, au cou, à la taille
      const map = stampTorso(Pix.grid(CW, CH), tp.t, tp.pivot[0] + 0.5, tp.pivot[1] + 0.5, hip.x, hip.y, lean0, sy, pose.sway || 0, 5, pose.hipLean);
      const local = (j) => [j[0] - (J.hip[0] - tp.pivot[0]), j[1] - (J.hip[1] - tp.pivot[1])];
      const sF2 = map(...local(J.shoulderF));
      const sB2 = map(...local(J.shoulderB));
      // rotation du buste : l'épaule arrière avance (coup du bras arrière, garde)
      const tw = pose.twist || 0;
      sB2.x += tw * 13;
      sB2.y += tw * 1;
      sF2.x -= tw * 3;
      const zF = under ? -Z_NEAR_ARM : Z_NEAR_ARM;
      const zB = backOver ? Z_NEAR_ARM : -Z_NEAR_ARM;
      const shF = root(sF2.x, sF2.y, zF);
      const shB = root(sB2.x, sB2.y, zB);
      const neck2 = map(...local(J.neck));
      const neck = root(neck2.x, neck2.y, Z_HEAD);
      zs.neck = neck.z;
      const w2 = map(tp.pivot[0], tp.pivot[1] - WAIST);
      pts.waist = { x: root(w2.x, w2.y, 0).x, y: w2.y };

      // ---------------------------------------------------------- bras
      // Bras en 3 pièces : biceps, avant-bras, poing (+ arme dans le poing avant).
      let handF = null;
      let muzzle = null;
      const drawArm = (arm, front, layer) => {
        const side = front ? 'F' : 'B';
        const sh = front ? shF : shB;
        const group = ++gid;
        pts['sh' + side] = { x: sh.x, y: sh.y };
        zs['sh' + side] = sh.z;
        if (lost['arm' + side]) {
          stumps.push([sh.x, sh.y, 4, 4]);
          return;
        }
        let hand = arm.hand || 'fist';
        if (hand === 'pocket') {
          if (front ? pocketF : pocketB) return;
          // bras mutilé : il pend le long du corps
          arm = { a: front ? -0.12 : 0.12, e: front ? 0.2 : -0.2, hand: 'fist' };
          hand = 'fist';
        }
        const mp = null;
        const upN = front ? 'armUpF' : 'armUpB';
        const loN = front ? 'armLoF' : 'armLoB';
        const seam = front && under;
        const lit = front || pose.swap || pose.backArm === 'front' || sp.backArm === 'front';
        const outline = (k) => lit || k > 60;
        // traînée d'un coup rapide : deux images fantômes de l'avant-bras et du poing le long
        // de la course, sous le bras
        const tr = pose.trail && pose.trail.arms[front ? 1 : 0];
        if (tr && !lost['lo' + side]) {
          add(layer, 0, () => {
            const cells = [];
            for (const k of [0.35, 0.7]) {
              const ga = U.lerp(tr.a, arm.a, k);
              const gf = ga + U.lerp(tr.e, arm.e || 0, k);
              const ex = sh.x + Math.sin(ga) * len(P[upN]);
              const ey = sh.y + Math.cos(ga) * len(P[upN]);
              const pl = P[loN];
              cells.push(...stampRot(g, pl.t, pl.pivot[0] + 0.5, pl.pivot[1] + 0.5, ex, ey, ang0(pl) - gf, mp));
              const hl = len(pl) + 0.5;
              if (!lost['fist' + side]) cells.push(...stampRot(g, P.fist.t, P.fist.pivot[0] + 0.5, P.fist.pivot[1] + 0.5, ex + Math.sin(gf) * hl, ey + Math.cos(gf) * hl, -gf, mp));
            }
            return cells;
          }, { sub: 0 });
        }
        const d1 = arm.d || 0;
        const vU = seg(len(P[upN]), arm.a, d1);
        const elb = at(sh, vU);
        pts['elb' + side] = { x: elb.x, y: elb.y };
        depth['elb' + side] = elb.z - elb.z0;
        zs['elb' + side] = elb.z;
        const kU = layer + KZ * (sh.z + vU.dz / 2 - sh.z0);
        add(layer, sh.z + vU.dz / 2 - sh.z0, limbDraw(upN, sh, vU, mp), { sub: 1, group, outline: outline(kU), seam });
        const fa = arm.a + (arm.e || 0);
        if (lost['lo' + side]) {
          stumps.push([elb.x, elb.y, 3, 3]);
          return;
        }
        const d2 = d1 + (arm.de || 0);
        const vL = seg(len(P[loN]), fa, d2);
        const kL = layer + KZ * (elb.z + vL.dz / 2 - elb.z0);
        add(layer, elb.z + vL.dz / 2 - elb.z0, limbDraw(loN, elb, vL, mp), { sub: 2, group, outline: outline(kL), seam });
        const vH = seg(len(P[loN]) + 0.5, fa, d2);
        const hnd = at(elb, vH);
        pts['wr' + side] = { x: hnd.x, y: hnd.y };
        depth['wr' + side] = hnd.z - hnd.z0;
        zs['wr' + side] = hnd.z;
        if (lost['fist' + side]) {
          stumps.push([elb.x + vL.dx, elb.y + vL.dy, 3, 3]);
          return;
        }
        const dzH = hnd.z - hnd.z0;
        const kH = layer + KZ * dzH;
        const sH = persp(dzH);
        const W = sp.weapon;
        if (front && W && pose.wpn !== 'none' && hand !== 'pocket') {
          // angle de l'arme : absolu (wabs), ou relatif à l'avant-bras (wr ; par défaut
          // perpendiculaire comme une épée, dans l'axe pour un pistolet)
          const wa = pose.wabs !== undefined ? pose.wabs : fa + (pose.wr !== undefined ? pose.wr : W.wr !== undefined ? W.wr : 1.6);
          // l'arme tourne avec l'avant-bras : dans son axe (pistolet) elle suit sa profondeur,
          // en travers (épée) elle reste dans le plan
          let vW = seg(1, wa, 0);
          if (d2 || syw) {
            const cr = Math.cos(wa - fa);
            const sr = Math.sin(wa - fa);
            const cd = Math.cos(d2);
            vW = segV(Math.sin(fa) * cd * cr + Math.cos(fa) * sr, Math.cos(fa) * cd * cr - Math.sin(fa) * sr, Math.sin(d2) * cr);
          }
          const wang = Math.PI - vW.ang;
          const kw = U.clamp(vW.slen, 0.3, 1);
          add(layer, dzH, () => stampRot(g, W.t, W.grip[0] + 0.5, W.grip[1] + 0.5, hnd.x, hnd.y, wang, null, { k: kw, u: [0, 1], s: sH }), { sub: 3, group, outline: outline(kH), seam });
          // bout de l'arme (bouche du canon, pointe) : milieu de la première ligne du gabarit
          const tx = ((W.t[0].length - 1) / 2 - W.grip[0]) * sH;
          const ty = -W.grip[1] * kw * sH;
          muzzle = { x: hnd.x + tx * Math.cos(wang) - ty * Math.sin(wang), y: hnd.y + tx * Math.sin(wang) + ty * Math.cos(wang) };
        }
        if (hand !== 'pocket') {
          const f = P.fist;
          add(layer, dzH, () => stampRot(g, f.t, f.pivot[0] + 0.5, f.pivot[1] + 0.5, hnd.x, hnd.y, -vL.ang, mp, { s: sH }), { sub: 4, group, outline: outline(kH), seam });
        }
        if (front) handF = { x: hnd.x, y: hnd.y, ang: vL.ang };
      };

      // rangs du dessin à plat : bras arrière derrière (10), jambes (20, 30), bras avant sous
      // le torse (40), cheveux (50), torse (55-65), tête (70), bras arrière devant (80), bras
      // avant (90), bras arrière lancé devant tout (100)
      const backBehind = !pose.swap && pose.backArm !== 'front' && sp.backArm !== 'front';
      drawArm(pose.arms[0], false, backBehind ? 10 : pose.swap ? 100 : 80);
      drawLeg(pose.legs[0], false);
      drawLeg(pose.legs[1], true);
      drawArm(pose.arms[1], true, under ? 40 : 90);
      // tête tournée (rotation du corps + headYaw) : enroulée sur son volume, le visage glisse
      // vers le profil puis laisse place aux cheveux
      const hyaw = yaw + (pose.headYaw || 0);
      const hBack = Math.cos(hyaw) < 0;
      const headRot = (pose.tilt || 0) * Math.cos(hyaw) + lean0 * 0.5 * cyw;
      const hy0 = neck.y + (pose.hy || 0) - (sp.headLift || 0);
      const hx0 = neck.x + (pose.hx || 0) * cyw;
      if (P.hairBack && !lost.head) {
        const hb = P.hairBack;
        const { t, ax } = hyaw ? turnPiece(hb.t, hb.t, hb.pivot[0] + 0.5, hyaw, HEAD_DEPTH) : { t: hb.t, ax: hb.pivot[0] + 0.5 };
        // les cheveux pendent (ne suivent qu'en partie la tête) et traînent derrière l'élan
        const rot = headRot * 0.35 + (pose.hairLag || 0);
        add(hBack ? 75 : 50, 0, () => stampRot(g, t, ax, hb.pivot[1] + 0.5, hx0, hy0, rot));
      }
      const hp = P.head;
      if (!lost.head) {
        const { t, ax } = hyaw ? turnPiece(hp.t, this.headHair() || hp.t, hp.pivot[0] + 0.5, hyaw, HEAD_DEPTH) : { t: hp.t, ax: hp.pivot[0] + 0.5 };
        add(70, neck.z - neck.z0, () => stampRot(g, t, ax, hp.pivot[1] + 0.5, hx0, hy0, headRot));
      } else stumps.push([neck.x, neck.y - 1, 6, 3]);

      // ---------------------------------------------------------- dessin, du fond vers l'avant
      items.sort((a, b) => a.key - b.key || a.n - b.n);
      const owner = new Int16Array(CW * CH);
      const seamCells = [];
      for (const it of items) {
        const cells = it.draw() || [];
        for (const id of cells) owner[id] = it.group || 0;
        if (it.seam && !torsoMask) seamCells.push(...cells);
        if (it.torso) {
          // liseré sombre là où un bras passe sous le bord du torse
          for (const id of seamCells) {
            if (torsoMask[id]) continue;
            const x = id % CW;
            const y = (id - x) / CW;
            if ((x > 0 && torsoMask[id - 1]) || (x < CW - 1 && torsoMask[id + 1]) || (y > 0 && torsoMask[id - CW]) || (y < CH - 1 && torsoMask[id + CW])) g[y][x] = sp.outline;
          }
        }
        if (it.outline) innerOutline(g, cells, sp.outline, owner, it.group);
      }

      // miroir (pose.mirror) : le perso se retourne autour de l'axe des hanches (vrille d'un
      // coup de pied retourné, d'un tir tournoyant)
      if (pose.mirror) {
        const ax = 2 * ROOT_X;
        for (const row of g) {
          const src = row.slice();
          for (let x = 0; x < CW; x++) row[x] = ax - x >= 0 && ax - x < CW ? src[ax - x] : '.';
        }
        const flip = (p) => p && Object.assign(p, { x: ax - p.x });
        for (const p of new Set([shF, shB, neck, hip, handF, muzzle].concat(Object.values(pts)))) flip(p);
        if (handF) handF.ang = -handF.ang;
        for (const st of stumps) st[0] = ax - st[0];
      }
      const canvas = Pix.render(g, sp.art.pal, { outlineColor: sp.outlineColor || '#050307' });
      // moignons sanglants
      if (stumps.length) {
        const c = canvas.getContext('2d');
        for (const [x, y, w, h] of stumps) {
          const x0 = Math.round(x + 1 - w / 2);
          const y0 = Math.round(y + 1 - h / 2);
          c.fillStyle = '#5a040c';
          c.fillRect(x0, y0, w, h);
          c.fillStyle = '#c01020';
          c.fillRect(x0 + 1, y0 + 1, Math.max(1, w - 2), Math.max(1, h - 2));
        }
      }
      const P1 = (p) => (p ? { x: p.x + 1, y: p.y + 1 } : null);
      const out = {
        canvas,
        hand: handF ? { x: handF.x + 1, y: handF.y + 1, ang: handF.ang } : null,
        muzzle: P1(muzzle),
        head: { x: neck.x + 1, y: neck.y - 9 + 1 },
        shF: P1(shF),
        shB: P1(shB),
        neck: P1(neck),
        hip: P1(hip),
        depth,
        zs,
      };
      for (const k of Object.keys(pts)) if (!out[k]) out[k] = P1(pts[k]);
      return out;
    }

    // Copie indépendante (mêmes graphismes, membres et cache propres) : un par combattant.
    clone() {
      return new ModChar(this.spec);
    }

    // Recolle tous les membres (réanimation).
    heal() {
      this.lost = {};
      this.lostKey = '';
      this.cache.clear();
    }

    // Arrache un membre : les images suivantes sont rendues sans lui.
    lose(part) {
      if (this.lost[part]) return false;
      this.lost[part] = true;
      this.lostKey = Object.keys(this.lost).sort().join(',');
      this.cache.clear();
      return true;
    }

    // Image isolée d'une partie du corps (morceaux qui volent). Segments : 'head', 'chest',
    // 'pelvis', 'upF' (biceps), 'lowF' (avant-bras), 'handF' (poing + arme), 'thighF',
    // 'shinF', 'footF' (et B). Membres entiers coupés à une articulation : 'armF' (épaule),
    // 'loF' (coude), 'fistF' (poignet), 'legF' (hanche), 'kneeF' (genou). Canvas recadré.
    partCanvas(name) {
      const cache = this.spec._parts || (this.spec._parts = {});
      return cache[name] || (cache[name] = this.renderPart(name));
    }

    renderPart(name) {
      const P = this.P;
      const sp = this.spec;
      const S = 64;
      const g = Pix.grid(S, S);
      const cx = S / 2;
      const side = name[name.length - 1];
      const base = name.slice(0, -1);
      const st = (p, x, y, a) => stampRot(g, p.t, p.pivot[0] + 0.5, p.pivot[1] + 0.5, x, y, ang0(p) - a);
      const up = P[side === 'B' ? 'armUpB' : 'armUpF'];
      const lo = P[side === 'B' ? 'armLoB' : 'armLoF'];
      const th = P[side === 'B' ? 'thighB' : 'thighF'];
      const sh = P[side === 'B' ? 'shinB' : 'shinF'];
      const arm = (from, a = 0.3) => {
        // biceps (si 'up'), avant-bras (si <= 'lo'), poing + arme
        let x = cx;
        let y = 14;
        const fa = a + 0.4;
        if (from === 'up') {
          st(up, x, y, a);
          x += Math.sin(a) * len(up);
          y += Math.cos(a) * len(up);
        }
        if (from === 'up' || from === 'lo') {
          st(lo, x, y, fa);
          x += Math.sin(fa) * (len(lo) + 0.5);
          y += Math.cos(fa) * (len(lo) + 0.5);
        }
        if (side === 'F' && sp.weapon) stampRot(g, sp.weapon.t, sp.weapon.grip[0] + 0.5, sp.weapon.grip[1] + 0.5, x, y, Math.PI - (fa + (sp.weapon.wr !== undefined ? sp.weapon.wr : 1.6)));
        stampRot(g, P.fist.t, P.fist.pivot[0] + 0.5, P.fist.pivot[1] + 0.5, x, y, -fa);
      };
      const leg = (from) => {
        let y = 10;
        if (from === 'thigh') {
          st(th, cx, y, 0);
          y += len(th);
        }
        if (from !== 'foot') {
          st(sh, cx, y, 0);
          y += len(sh);
        }
        stampRot(g, P.shoe.t, P.shoe.pivot[0] + 0.5, P.shoe.pivot[1] + 0.5, cx, y - 1, 0);
      };
      const torsoRows = (r0, r1) => {
        const t = P.torso;
        const tpl = t.t.map((row, y) => (y >= r0 && y <= r1 ? row : '.'.repeat(row.length)));
        stampRot(g, tpl, t.pivot[0] + 0.5, t.pivot[1] + 0.5, cx, 50, 0);
      };
      const waistRow = P.torso.pivot[1] - WAIST;
      if (name === 'head') {
        if (P.hairBack) stampRot(g, P.hairBack.t, P.hairBack.pivot[0] + 0.5, P.hairBack.pivot[1] + 0.5, cx, 40, 0);
        stampRot(g, P.head.t, P.head.pivot[0] + 0.5, P.head.pivot[1] + 0.5, cx, 40, 0);
      } else if (name === 'chest') torsoRows(0, waistRow - 1);
      else if (name === 'pelvis') torsoRows(waistRow, 99);
      else if (name === 'torso') torsoRows(0, 99);
      else if (base === 'arm') arm('up');
      else if (base === 'lo') arm('lo');
      else if (base === 'fist' || base === 'hand') arm('fist');
      else if (base === 'up') st(up, cx, 14, 0.3);
      else if (base === 'low') st(lo, cx, 14, 0.5);
      else if (base === 'leg') leg('thigh');
      else if (base === 'knee') leg('shin');
      else if (base === 'thigh') st(th, cx, 10, 0);
      else if (base === 'shin') st(sh, cx, 10, 0);
      else if (base === 'foot') leg('foot');
      const cv = Pix.render(g, sp.art.pal, { outlineColor: sp.outlineColor || '#050307' });
      const c = GS.Gore.crop(cv);
      return c ? c.canvas : cv;
    }

    frame(pose) {
      const q = quant(pose);
      const key = this.lostKey + JSON.stringify(q);
      let f = this.cache.get(key);
      if (!f) {
        f = this.render(q);
        if (this.cache.size > 700) this.cache.clear();
        this.cache.set(key, f);
      }
      return f;
    }

    // anim : nom d'un cycle, d'une séquence ou d'une pose-clé ; t en secondes.
    poseOf(anim, t = 0) {
      const map = this.spec.animMap;
      return M.pose((map && map[anim]) || anim, t);
    }

    // Toutes les poses distinctes d'animations (pré-calcul progressif, évite les saccades).
    warmList(names) {
      const map = this.spec.animMap || {};
      const out = [];
      for (const n0 of names) {
        const n = map[n0] || n0;
        const C = CYCLES[n];
        const S = SEQ[n];
        // toutes les images à 30 images/s
        const dur = C ? C.dur : S ? M.seqDur(n) : 0;
        for (let f = 0; f <= Math.ceil(dur * FPS); f++) out.push(() => this.anim(n, f / FPS));
      }
      return out;
    }

    // Pose d'une animation à l'instant t, avec les mouvements secondaires (d'après la pose
    // deux images plus tôt).
    posed(anim, t = 0) {
      const map = this.spec.animMap;
      const name = (map && map[anim]) || anim;
      const p = M.pose(name, t);
      if (!CYCLES[name] && !SEQ[name]) return p;
      return M.dynamics(p, M.pose(name, t - 2 / FPS));
    }

    anim(anim, t = 0) {
      return this.frame(this.posed(anim, t));
    }

    // Fondu d'une animation (a1 figée à t1) vers une autre (a2 à t2), k de 0 à 1 (par tiers).
    mix(a1, t1, a2, t2, k) {
      const q = Math.round(U.clamp(k, 0, 1) * 3) / 3;
      return this.frame(M.blend(this.posed(a1, t1), this.posed(a2, t2), EASE.inout(q)));
    }
  }
  M.Char = ModChar;

  const q1 = (v) => Math.round((v || 0) * 20) / 20;
  function quant(p) {
    return {
      swap: !!p.swap,
      mirror: !!p.mirror,
      backArm: p.backArm || 'behind',
      wr: p.wr === undefined ? undefined : q1(p.wr),
      wabs: p.wabs === undefined ? undefined : q1(p.wabs),
      wpn: p.wpn,
      twist: q1(p.twist),
      // ramenée entre -π et π : un tour complet retombe exactement sur la pose de face
      yaw: q1((p.yaw || 0) - 2 * Math.PI * Math.round((p.yaw || 0) / (2 * Math.PI))),
      headYaw: q1(p.headYaw),
      x: Math.round(p.x || 0),
      y: Math.round(p.y || 0),
      lean: q1(p.lean),
      squash: Math.round((p.squash || 0) * 20) / 20,
      sway: Math.round(p.sway || 0),
      tilt: q1(p.tilt),
      hx: Math.round(p.hx || 0),
      hy: Math.round(p.hy || 0),
      legs: p.legs.map((l) => ({ a: q1(l.a), k: q1(l.k), toe: q1(l.toe), d: q1(l.d), dk: q1(l.dk) })),
      arms: p.arms.map((a) => ({ a: q1(a.a), e: q1(a.e), d: q1(a.d), de: q1(a.de), hand: a.hand || 'fist' })),
      hairLag: q1(p.hairLag),
      trail: p.trail
        ? {
            arms: p.trail.arms.map((a) => (a ? { a: q1(a.a), e: q1(a.e) } : null)),
            legs: p.trail.legs.map((l) => (l ? { a: q1(l.a), k: q1(l.k) } : null)),
          }
        : null,
    };
  }

  // Mouvements secondaires calculés d'après la vitesse de la pose (p) par rapport à la pose
  // deux images plus tôt (q) : les cheveux et le bas du vêtement traînent derrière l'élan, et
  // un membre qui balaie vite laisse une traînée.
  const SMEAR = 0.45;
  M.dynamics = (p, q) => {
    const vx = (p.x || 0) - (q.x || 0);
    const vy = (p.y || 0) - (q.y || 0);
    const dl = (p.lean || 0) - (q.lean || 0);
    const out = Object.assign({}, p);
    out.hairLag = U.clamp(0.09 * vx - 0.9 * dl - 0.03 * vy, -0.7, 0.7);
    out.sway = (p.sway || 0) + U.clamp(-0.5 * vx, -2, 2);
    // seulement pour un coup : bras lancé vers l'avant ou le haut, jambe levée devant
    const fast = (a, b) => Math.max(a.a, b.a) > 0.9 && Math.abs(a.a - b.a) + 0.5 * Math.abs((a.e || 0) - (b.e || 0)) > SMEAR;
    const arms = p.arms.map((a, i) => {
      const b = q.arms[i];
      return (a.hand || 'fist') !== 'pocket' && (b.hand || 'fist') !== 'pocket' && fast(a, b) ? { a: b.a, e: b.e || 0 } : null;
    });
    const legs = p.legs.map((l, i) => {
      const b = q.legs[i];
      return Math.min(l.a, b.a) > 0.6 && Math.abs(l.a - b.a) > SMEAR ? { a: b.a, k: b.k } : null;
    });
    if (arms.some(Boolean) || legs.some(Boolean)) out.trail = { arms, legs };
    return out;
  };

  const lerp = U.lerp;
  // rotation du corps : par le plus court chemin (une vrille enchaîne des poses à moins d'un
  // demi-tour d'écart, et revient à 0 sans se dérouler)
  const lerpAng = (a, b, t) => {
    const d = b - a - 2 * Math.PI * Math.round((b - a) / (2 * Math.PI));
    return a + d * t;
  };
  M.blend = (p, q, t) => ({
    swap: t < 0.5 ? p.swap : q.swap,
    mirror: t < 0.5 ? p.mirror : q.mirror,
    backArm: t < 0.5 ? p.backArm : q.backArm,
    wpn: t < 0.5 ? p.wpn : q.wpn,
    wr: p.wr === undefined && q.wr === undefined ? undefined : lerp(p.wr === undefined ? 1.6 : p.wr, q.wr === undefined ? 1.6 : q.wr, t),
    wabs: p.wabs !== undefined && q.wabs !== undefined ? lerp(p.wabs, q.wabs, t) : t < 0.5 ? p.wabs : q.wabs,
    twist: lerp(p.twist || 0, q.twist || 0, t),
    yaw: lerpAng(p.yaw || 0, q.yaw || 0, t),
    headYaw: lerp(p.headYaw || 0, q.headYaw || 0, t),
    x: lerp(p.x || 0, q.x || 0, t),
    y: lerp(p.y || 0, q.y || 0, t),
    lean: lerp(p.lean || 0, q.lean || 0, t),
    squash: lerp(p.squash || 0, q.squash || 0, t),
    sway: lerp(p.sway || 0, q.sway || 0, t),
    tilt: lerp(p.tilt || 0, q.tilt || 0, t),
    hx: lerp(p.hx || 0, q.hx || 0, t),
    hy: lerp(p.hy || 0, q.hy || 0, t),
    legs: [0, 1].map((i) => {
      const a = p.legs[i];
      const b = q.legs[i];
      return { a: lerp(a.a, b.a, t), k: lerp(a.k, b.k, t), toe: lerp(a.toe || 0, b.toe || 0, t), d: lerp(a.d || 0, b.d || 0, t), dk: lerp(a.dk || 0, b.dk || 0, t) };
    }),
    arms: [0, 1].map((i) => {
      const a = p.arms[i];
      const b = q.arms[i];
      return { a: lerp(a.a, b.a, t), e: lerp(a.e || 0, b.e || 0, t), d: lerp(a.d || 0, b.d || 0, t), de: lerp(a.de || 0, b.de || 0, t), hand: t < 0.5 ? a.hand : b.hand };
    }),
  });

  // ------------------------------------------------------------ poses-clés
  // Angles : 0 = vers le bas, positif = vers l'avant (droite). [arrière, avant].
  // k = flexion du genou, e = flexion du coude, toe = rotation du pied.
  const PK = { a: 0, e: 0, hand: 'pocket' };
  const PP = [PK, PK];
  const K = (M.KEY = {
    idle: { legs: [{ a: -0.1, k: 0.04 }, { a: 0.12, k: 0.04 }], arms: PP },
    // attitude de combat : mains dans les poches, appui sur la jambe arrière
    guard: { lean: 0.04, x: -1, legs: [{ a: -0.34, k: 0.22 }, { a: 0.26, k: 0.3 }], arms: PP },
    guard2: { lean: 0.02, x: -1, y: 1, squash: -0.02, legs: [{ a: -0.36, k: 0.32 }, { a: 0.28, k: 0.4 }], arms: PP },
    crouch: { lean: 0.22, squash: -0.06, legs: [{ a: -0.7, k: 1.3 }, { a: 0.65, k: 1.45 }], arms: PP },
    // direct du bras avant
    windup: { lean: -0.1, x: -3, sway: -1, legs: [{ a: -0.5, k: 0.5 }, { a: 0.36, k: 0.6 }], arms: [PK, { a: -0.9, e: 2.0 }] },
    jab: { lean: 0.3, x: 4, sway: 2, legs: [{ a: -0.7, k: 0.1 }, { a: 0.55, k: 0.45 }], arms: [PK, { a: 1.6, e: 0.0 }] },
    // cross du bras arrière (le bras avant reste dans la poche)
    crossWind: { swap: true, twist: 0.4, lean: -0.02, x: -1, legs: [{ a: -0.55, k: 0.45 }, { a: 0.45, k: 0.6 }], arms: [{ a: -0.6, e: 1.6 }, PK] },
    cross: { swap: true, twist: 1, lean: 0.38, x: 6, sway: 2, legs: [{ a: -0.8, k: 0.05 }, { a: 0.6, k: 0.55 }], arms: [{ a: 1.6, e: 0.0 }, PK] },
    upWind: { lean: 0.25, squash: -0.06, x: 1, legs: [{ a: -0.75, k: 1.2 }, { a: 0.6, k: 1.4 }], arms: [PK, { a: 0.3, e: 2.4 }] },
    uppercut: { lean: -0.05, y: -8, x: 3, squash: 0.06, legs: [{ a: -0.3, k: 0.2 }, { a: 0.5, k: 1.2 }], arms: [PK, { a: 2.85, e: 0.15 }] },
    // coups de pied, mains dans les poches
    kickPrep: { lean: -0.15, legs: [{ a: -0.15, k: 0.3 }, { a: 1.2, k: 2.1 }], arms: PP },
    kick: { lean: -0.32, x: -2, sway: -2, legs: [{ a: -0.25, k: 0.15 }, { a: 1.7, k: 0.0, toe: -0.8 }], arms: PP },
    airKick: { lean: -0.25, y: -14, sway: -2, legs: [{ a: 0.4, k: 1.7 }, { a: 1.75, k: 0.0, toe: -0.8 }], arms: PP },
    hurt: { lean: -0.3, x: -4, tilt: -0.2, sway: -2, legs: [{ a: -0.35, k: 0.55 }, { a: 0.4, k: 0.7 }], arms: PP },
    ko: { lean: -0.25, tilt: 0.25, legs: [{ a: -0.6, k: 1.2 }, { a: 0.5, k: 1.4 }], arms: PP },
    // pose de pouvoir (fiche) : accroupi, une main au sol, poing tendu
    power: { backArm: 'front', twist: 0.6, lean: 0.42, x: 3, tilt: 0.05, squash: -0.05, legs: [{ a: -1.15, k: 0.3 }, { a: 1.05, k: 2.0 }], arms: [{ a: 0.15, e: -0.1, hand: 'fist' }, { a: 1.5, e: 0.0 }] },
    // regard écarlate : il fixe l'ennemi, mains dans les poches
    cast: { lean: -0.06, tilt: 0.06, legs: [{ a: -0.3, k: 0.15 }, { a: 0.3, k: 0.2 }], arms: PP },
    victory: { tilt: -0.1, legs: [{ a: -0.15, k: 0.04 }, { a: 0.15, k: 0.04 }], arms: PP },
    jump: { lean: 0.15, y: -10, legs: [{ a: 0.6, k: 1.7 }, { a: 1.1, k: 2.0 }], arms: PP },
    land: { lean: 0.25, squash: -0.08, legs: [{ a: -0.8, k: 1.5 }, { a: 0.7, k: 1.6 }], arms: PP },
    dash: { lean: 0.5, sway: -3, legs: [{ a: -1.1, k: 0.45 }, { a: 0.75, k: 1.4 }], arms: PP },
  });

  // poses avec arme (épée, lance, bâton, arc...) : le poing avant tient l'arme
  const ARM_POSES = {
    aidle: { legs: [{ a: -0.14, k: 0.06 }, { a: 0.16, k: 0.06 }], arms: [PK, { a: 0.3, e: 0.5 }], wr: 1.7 },
    astance1: { lean: 0.06, x: -1, legs: [{ a: -0.42, k: 0.38 }, { a: 0.34, k: 0.46 }], arms: [PK, { a: 0.55, e: 0.6 }], wr: 1.45 },
    astance2: { lean: 0.04, x: -1, y: 1, squash: -0.02, legs: [{ a: -0.44, k: 0.48 }, { a: 0.36, k: 0.56 }], arms: [PK, { a: 0.5, e: 0.65 }], wr: 1.5 },
    slashWind: { lean: -0.12, x: -3, sway: -1, legs: [{ a: -0.5, k: 0.5 }, { a: 0.36, k: 0.6 }], arms: [PK, { a: -2.7, e: -0.3 }], wr: -0.4 },
    slash: { lean: 0.32, x: 5, sway: 2, legs: [{ a: -0.75, k: 0.12 }, { a: 0.6, k: 0.5 }], arms: [PK, { a: 1.35, e: 0.05 }], wr: -0.35 },
    slashLow: { lean: 0.15, x: 0, legs: [{ a: -0.6, k: 0.7 }, { a: 0.5, k: 0.8 }], arms: [PK, { a: -0.5, e: 0.2 }], wr: -0.7 },
    slashUp: { lean: -0.05, x: 4, y: -2, legs: [{ a: -0.4, k: 0.2 }, { a: 0.5, k: 0.4 }], arms: [PK, { a: 2.5, e: 0.15 }], wr: 0.3 },
    thrustWind: { lean: -0.05, x: -3, legs: [{ a: -0.5, k: 0.5 }, { a: 0.4, k: 0.6 }], arms: [PK, { a: -0.3, e: 1.85 }], wabs: 1.57 },
    thrust: { lean: 0.36, x: 7, sway: 2, legs: [{ a: -0.85, k: 0.05 }, { a: 0.65, k: 0.5 }], arms: [PK, { a: 1.55, e: 0.0 }], wabs: 1.57 },
    castStaff: { lean: -0.06, legs: [{ a: -0.3, k: 0.15 }, { a: 0.3, k: 0.2 }], arms: [PK, { a: 2.55, e: 0.25 }], wabs: Math.PI },
    drawBow: { backArm: 'front', twist: 0.5, lean: 0.05, legs: [{ a: -0.45, k: 0.3 }, { a: 0.4, k: 0.35 }], arms: [{ a: 1.35, e: 2.5 }, { a: 1.55, e: 0.0 }], wabs: Math.PI },
    shoot: { backArm: 'front', twist: 0.4, lean: -0.05, x: -2, legs: [{ a: -0.45, k: 0.3 }, { a: 0.4, k: 0.35 }], arms: [{ a: 0.9, e: 1.9 }, { a: 1.55, e: 0.0 }], wabs: Math.PI },
    avictory: { tilt: -0.08, legs: [{ a: -0.15, k: 0.04 }, { a: 0.15, k: 0.04 }], arms: [PK, { a: 2.95, e: 0.1 }], wabs: Math.PI },
    ahurt: { lean: -0.3, x: -4, tilt: -0.2, sway: -2, legs: [{ a: -0.35, k: 0.55 }, { a: 0.4, k: 0.7 }], arms: [PK, { a: -0.5, e: 0.7 }], wr: 1.2 },
    ako: { lean: -0.25, tilt: 0.25, legs: [{ a: -0.6, k: 1.2 }, { a: 0.5, k: 1.4 }], arms: [PK, { a: 0.4, e: 0.5 }], wr: 1.6 },
    ajump: { lean: 0.15, y: -10, legs: [{ a: 0.6, k: 1.7 }, { a: 1.1, k: 2.0 }], arms: [PK, { a: 0.9, e: 0.9 }], wr: 1.4 },
    aland: { lean: 0.25, squash: -0.08, legs: [{ a: -0.8, k: 1.5 }, { a: 0.7, k: 1.6 }], arms: [PK, { a: 0.9, e: 0.6 }], wr: 1.4 },
  };
  Object.assign(K, ARM_POSES);

  // poses au pistolet (canon dans l'axe de l'avant-bras, wr relatif) ; le poing arrière
  // reste en garde devant la poitrine
  const GUARD_B = { a: 0.5, e: 1.9, hand: 'fist' };
  Object.assign(K, {
    gidle: { legs: [{ a: -0.14, k: 0.06 }, { a: 0.16, k: 0.06 }], arms: [PK, { a: 0.2, e: 0.45 }], wr: 0.75 },
    gstance1: { lean: 0.05, x: -1, legs: [{ a: -0.42, k: 0.38 }, { a: 0.34, k: 0.46 }], arms: [GUARD_B, { a: 0.75, e: 0.55 }], wr: 0.3 },
    gstance2: { lean: 0.03, x: -1, y: 1, squash: -0.02, legs: [{ a: -0.44, k: 0.48 }, { a: 0.36, k: 0.56 }], arms: [GUARD_B, { a: 0.7, e: 0.6 }], wr: 0.3 },
    aim: { lean: 0.02, x: -1, twist: 0.2, legs: [{ a: -0.5, k: 0.3 }, { a: 0.42, k: 0.4 }], arms: [{ a: 0.8, e: 1.7, hand: 'fist' }, { a: 1.57, e: 0.0 }], wr: 0 },
    recoil: { lean: -0.08, x: -3, twist: 0.1, legs: [{ a: -0.52, k: 0.34 }, { a: 0.4, k: 0.42 }], arms: [{ a: 0.7, e: 1.8, hand: 'fist' }, { a: 1.95, e: -0.15 }], wr: 0 },
    gcast: { lean: -0.04, legs: [{ a: -0.3, k: 0.15 }, { a: 0.3, k: 0.2 }], arms: [PK, { a: 2.9, e: 0.1 }], wr: 0 },
  });

  // ------------------------------------------------------------ cycles
  const TAU = Math.PI * 2;
  const CYCLES = (M.CYCLES = {
    idle: {
      frames: 4,
      dur: 2.0,
      pose: (p) => {
        // respiration : le buste descend d'un pixel et s'écrase un peu, en douceur
        const b = (1 - Math.cos(p * TAU)) / 2;
        return Object.assign({}, K.idle, { y: Math.round(b), squash: -0.02 * b });
      },
    },
    // garde rebondissante façon jeu de combat
    stance: {
      frames: 6,
      dur: 1.2,
      pose: (p) => M.blend(K.guard, K.guard2, (1 - Math.cos(p * TAU)) / 2),
    },
    walk: {
      frames: 8,
      dur: 0.84,
      pose: (p) => {
        const s = Math.sin(p * TAU);
        const c = Math.cos(p * TAU);
        return {
          y: Math.abs(s) < 0.5 ? 0 : -1,
          lean: 0.06,
          sway: Math.round(-s * 1.2),
          tilt: s * 0.03,
          x: c * 0.6,
          legs: [
            { a: -0.48 * s, k: 0.1 + 0.85 * Math.max(0, -c), toe: s > 0.6 ? 0.5 : 0 },
            { a: 0.48 * s, k: 0.1 + 0.85 * Math.max(0, c), toe: s < -0.6 ? 0.5 : 0 },
          ],
          arms: PP,
        };
      },
    },
    run: {
      frames: 8,
      dur: 0.5,
      pose: (p) => {
        const s = Math.sin(p * TAU);
        const c = Math.cos(p * TAU);
        return {
          y: -Math.abs(c) * 3 + 1.5,
          lean: 0.36,
          x: 3,
          sway: Math.round(-2 - s * 1.5),
          legs: [
            { a: -0.95 * s + 0.15, k: 0.35 + 1.65 * Math.max(0, -c), toe: 0.3 * Math.max(0, s) },
            { a: 0.95 * s + 0.15, k: 0.35 + 1.65 * Math.max(0, c), toe: 0.3 * Math.max(0, -s) },
          ],
          arms: PP,
        };
      },
    },
  });

  const withWeapon = (pose, arm, extra) => Object.assign({}, pose, { arms: [PK, arm] }, extra);
  CYCLES.astance = { frames: 6, dur: 1.2, pose: (p) => M.blend(K.astance1, K.astance2, (1 - Math.cos(p * TAU)) / 2) };
  CYCLES.awalk = {
    frames: 8,
    dur: 0.84,
    pose: (p) => withWeapon(CYCLES.walk.pose(p), { a: 0.3 + Math.sin(p * TAU) * 0.15, e: 0.5 }, { wr: 1.7 }),
  };
  CYCLES.arun = {
    frames: 8,
    dur: 0.5,
    pose: (p) => withWeapon(CYCLES.run.pose(p), { a: -0.5 + Math.sin(p * TAU) * 0.2, e: 0.9 }, { wabs: -2.3 }),
  };

  CYCLES.gstance = { frames: 6, dur: 1.2, pose: (p) => M.blend(K.gstance1, K.gstance2, (1 - Math.cos(p * TAU)) / 2) };
  CYCLES.gwalk = {
    frames: 8,
    dur: 0.84,
    pose: (p) => withWeapon(CYCLES.walk.pose(p), { a: 0.25 + Math.sin(p * TAU) * 0.12, e: 0.45 }, { wr: 0.75 }),
  };

  // ------------------------------------------------------------ séquences d'attaque
  // Liste de [pose, durée] ; on interpole avec un easing (anticipation -> frappe -> retour).
  const SEQ = (M.SEQ = {
    jab: [['guard', 0.0], ['windup', 0.07], ['jab', 0.05], ['jab', 0.07], ['guard', 0.12]],
    cross: [['guard', 0.0], ['crossWind', 0.07], ['cross', 0.05], ['cross', 0.08], ['guard', 0.14]],
    uppercut: [['guard', 0.0], ['upWind', 0.09], ['uppercut', 0.06], ['uppercut', 0.1], ['land', 0.1], ['guard', 0.12]],
    kick: [['guard', 0.0], ['kickPrep', 0.08], ['kick', 0.05], ['kick', 0.1], ['guard', 0.14]],
    airKick: [['guard', 0.0], ['crouch', 0.08], ['jump', 0.08], ['airKick', 0.06], ['airKick', 0.1], ['land', 0.1], ['guard', 0.12]],
    hurt: [['hurt', 0.0], ['hurt', 0.16], ['guard', 0.2]],
    power: [['guard', 0.0], ['crouch', 0.12], ['power', 0.1], ['power', 0.6]],
    cast: [['guard', 0.0], ['cast', 0.15], ['cast', 0.3], ['guard', 0.15]],
    // avec arme
    slashA: [['astance1', 0.0], ['slashWind', 0.08], ['slash', 0.05], ['slash', 0.08], ['astance1', 0.12]],
    slashB: [['astance1', 0.0], ['slashLow', 0.07], ['slashUp', 0.05], ['slashUp', 0.08], ['astance1', 0.12]],
    thrust: [['astance1', 0.0], ['thrustWind', 0.08], ['thrust', 0.05], ['thrust', 0.08], ['astance1', 0.12]],
    shoot: [['astance1', 0.0], ['drawBow', 0.12], ['drawBow', 0.06], ['shoot', 0.05], ['shoot', 0.08], ['astance1', 0.12]],
    castStaff: [['astance1', 0.0], ['castStaff', 0.15], ['castStaff', 0.3], ['astance1', 0.15]],
    ahurt: [['ahurt', 0.0], ['ahurt', 0.16], ['astance1', 0.2]],
    // pistolet : on lève l'arme, coup de feu, recul, on revient en joue
    fire: [['gstance1', 0.0], ['aim', 0.08], ['aim', 0.04], ['recoil', 0.04], ['aim', 0.07], ['gstance1', 0.12]],
    gcast: [['gstance1', 0.0], ['gcast', 0.15], ['gcast', 0.3], ['gstance1', 0.15]],
  });
  // instant (secondes) du coup dans chaque séquence
  M.HIT = { jab: 0.12, cross: 0.12, uppercut: 0.15, kick: 0.13, airKick: 0.22, power: 0.22, cast: 0.15, slashA: 0.13, slashB: 0.12, thrust: 0.13, shoot: 0.23, castStaff: 0.15, fire: 0.12, gcast: 0.15 };

  M.seqDur = (name) => SEQ[name].reduce((s, k) => s + k[1], 0);

  // Coups décrits en données (src/data/moves.js) : { poses: {nom: pose}, seq: [[pose, durée,
  // courbe?], ...], hit: index du segment au bout duquel le coup touche }.
  M.addMoves = (defs) => {
    for (const [name, d] of Object.entries(defs)) {
      Object.assign(K, d.poses || {});
      if (!d.seq) continue;
      SEQ[name] = d.seq;
      M.HIT[name] = d.seq.slice(1, (d.hit || 1) + 1).reduce((s, k) => s + k[1], 0);
    }
  };

  // ------------------------------------------------------------ interpolation
  // Les animations sont échantillonnées à 30 images/s (rendu image par image, cache des poses)
  // et chaque segment d'une séquence suit une courbe : 'inout' (anticipation, retour en garde),
  // 'back' (coup : part vite, dépasse un peu la pose puis s'y pose), 'out', 'in', 'lin', 'snap'
  // (reste sur la pose de départ puis bascule d'un coup). Par défaut : 'back' pour les segments
  // très courts (frappes), 'inout' sinon ; un 3e élément [pose, durée, courbe] l'impose.
  const FPS = (M.FPS = 30);
  const EASE = (M.EASE = {
    lin: (t) => t,
    in: (t) => t * t,
    out: (t) => 1 - (1 - t) * (1 - t),
    inout: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
    back: (t) => {
      const k = 1.9;
      const u = t - 1;
      return 1 + (k + 1) * u * u * u + k * u * u;
    },
    snap: (t) => (t < 0.6 ? 0 : 1),
  });
  const easeOf = (seg) => EASE[seg[2] || (seg[1] <= 0.06 ? 'back' : 'inout')];
  const frameT = (t) => Math.round(t * FPS) / FPS;
  M.frameT = frameT;
  M.pose = (anim, t = 0) => {
    if (typeof anim !== 'string') return anim;
    t = frameT(t);
    const C = CYCLES[anim];
    if (C) {
      const p = (((t % C.dur) + C.dur) % C.dur) / C.dur;
      return C.pose(p);
    }
    const S = SEQ[anim];
    if (S) {
      let acc = 0;
      for (let i = 1; i < S.length; i++) {
        const d = S[i][1];
        if (t <= acc + d) {
          const u = d > 0 ? U.clamp((t - acc) / d, 0, 1) : 1;
          return M.blend(K[S[i - 1][0]], K[S[i][0]], easeOf(S[i])(u));
        }
        acc += d;
      }
      return K[S[S.length - 1][0]];
    }
    return K[anim] || K.idle;
  };
})();
