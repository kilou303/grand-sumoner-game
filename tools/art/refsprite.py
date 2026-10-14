"""Relevé d'un sprite à partir d'une image de référence en pixel art agrandi.

Pipeline commun aux héros relevés sur leur image (Azura, Vesper, Sakura) :
l'image est ramenée à sa grille d'origine, le personnage détouré (fond blanc + sol de
pierre), réduit aux proportions des autres héros (~64 px de haut) sur une palette commune
(k-means), retouché (visage) puis découpé en pièces pour l'animation modulaire (même format
que Djegui, voir src/gfx/modrig.js).

Chaque script tools/art/build_<héros>.py fournit sa configuration à `build(cfg)` :
  name, src, out, var    nom du héros, image source, fichier JS écrit, variable GS.<var>
  pitch, off, floor      grille de l'image agrandie (pas, décalage x/y), 1re ligne du sol
  face, face_col         retouches à la main : {ligne: (x0, 'pixels')}, {lettre: couleur}
  cut, joints, piv       découpe en pièces, articulations et pivots (image réduite)
  erase                  pixels à effacer après réduction : {ligne: R((x0, x1), ...)}
  keep_edge              zones où le contour sombre extérieur et les pixels isolés sont gardés
                         (mèches de cheveux noirs) : {ligne: R(...)}
  recolor                recoloration de zones : [{mask: {ligne: R(...)}, ramp: [couleurs sombre ->
                         clair], min_lum, max_sat}] (cheveux noirs distincts d'une armure grise...)
options : scale (1.5), ncol (22), outline_lum (30 : seuil du contour noir retiré),
          dark_bias (1.6 : poids des traits sombres à la réduction), hole_min / hole_size
          (225 / 3 : trous de fond enfermés à retirer), lift (gain d'éclaircissement des teintes
          sombres), names, nocrop.
"""
import json
import os
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
NAMES = {'h': 'head', 'q': 'hairBack', 't': 'torso', 'U': 'armUpF', 'L': 'armLoF', 'u': 'armUpB', 'l': 'armLoB',
         'F': 'fist', 'A': 'thighF', 'S': 'shinF', 'a': 'thighB', 's': 'shinB', 'O': 'shoe'}


def R(*spans):
    return spans


def lum(c):
    return c[..., 0] * 0.3 + c[..., 1] * 0.59 + c[..., 2] * 0.11


def pal_lum(h):
    r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
    return 0.3 * r + 0.59 * g + 0.11 * b


# ------------------------------------------------------------------ grille d'origine
def native(A, pitch, off):
    H, W = A.shape[:2]
    xs = np.arange(off[0] - pitch, W, pitch)
    ys = np.arange(off[1] - pitch, H, pitch)
    out = np.full((len(ys) - 1, len(xs) - 1, 3), 255.0)
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            a, b = max(0, int(ys[j] + pitch * 0.25)), min(H, int(ys[j + 1] - pitch * 0.25))
            c, d = max(0, int(xs[i] + pitch * 0.25)), min(W, int(xs[i + 1] - pitch * 0.25))
            if b > a and d > c:
                out[j, i] = np.median(A[a:b, c:d].reshape(-1, 3), axis=0)
    return out


# ------------------------------------------------------------------ détourage
def segment(nat, floor, hole_min=225, hole_size=3):
    h, w = nat.shape[:2]
    L = lum(nat)
    ok = nat.min(2) > 215  # fond blanc
    ok[floor:] |= L[floor:] > 40  # sol : tout sauf le contour noir des bottes
    seen = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in range(w) if (y in (0, h - 1) or x in (0, w - 1)) and ok[y, x])
    for y, x in q:
        seen[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and ok[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    m = ~seen
    # trous de fond enfermés (entre le bras et le torse) : zones blanches de plus de `hole_size`
    # pixels (hole_min > 255 : aucun, quand le personnage porte du blanc)
    white = (nat.min(2) > hole_min) & m
    seen = np.zeros((h, w), bool)
    for y0 in range(h):
        for x0 in range(w):
            if not white[y0, x0] or seen[y0, x0]:
                continue
            comp = [(y0, x0)]
            seen[y0, x0] = True
            i = 0
            while i < len(comp):
                y, x = comp[i]
                i += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        comp.append((ny, nx))
            if len(comp) > hole_size:
                for y, x in comp:
                    m[y, x] = False
    ys, xs = np.nonzero(m)
    return nat[ys.min():ys.max() + 1, xs.min():xs.max() + 1], m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


# ------------------------------------------------------------------ palette
def kmeans(pix, k, seed=1):
    rng = np.random.default_rng(seed)
    C = [pix[rng.integers(len(pix))]]
    for _ in range(k - 1):
        d = np.min([((pix - c) ** 2).sum(1) for c in C], axis=0)
        C.append(pix[rng.choice(len(pix), p=d / d.sum())])
    C = np.array(C, float)
    for _ in range(40):
        lab = np.argmin(((pix[:, None, :] - C[None]) ** 2).sum(2), 1)
        for i in range(k):
            if (lab == i).any():
                C[i] = pix[lab == i].mean(0)
    return C[np.argsort(C @ np.array([0.3, 0.59, 0.11]))]


# ------------------------------------------------------------------ réduction
def reduce(lab, m, ncol, dark, scale, bias):
    """Réduit la grille d'index de palette par vote pondéré par la surface couverte.
    Les traits sombres (contours intérieurs) sont favorisés pour ne pas disparaître."""
    h, w = m.shape
    oh, ow = int(np.ceil(h / scale)), int(np.ceil(w / scale))
    g = [['.'] * ow for _ in range(oh)]
    for y in range(oh):
        for x in range(ow):
            votes = np.zeros(ncol)
            cover = 0.0
            for sy in range(int(y * scale), min(h, int(np.ceil((y + 1) * scale)))):
                wy = min(sy + 1, (y + 1) * scale) - max(sy, y * scale)
                for sx in range(int(x * scale), min(w, int(np.ceil((x + 1) * scale)))):
                    wx = min(sx + 1, (x + 1) * scale) - max(sx, x * scale)
                    a = wx * wy
                    if a <= 0 or not m[sy, sx]:
                        continue
                    cover += a
                    votes[lab[sy, sx]] += a * (bias if dark[lab[sy, sx]] else 1.0)
            if cover >= 0.5 * scale * scale:
                g[y][x] = CHARS[int(np.argmax(votes))]
    return g


def strip_outline(g, pal, thr):
    """Retire le contour noir extérieur (le jeu le redessine proprement)."""
    h, w = len(g), len(g[0])
    rm = []
    for y in range(h):
        for x in range(w):
            if g[y][x] != '.' and pal_lum(pal[g[y][x]]) < thr:
                if any(not (0 <= y + dy < h and 0 <= x + dx < w) or g[y + dy][x + dx] == '.' for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    rm.append((y, x))
    for y, x in rm:
        g[y][x] = '.'


def isolated(g, passes=2):
    h, w = len(g), len(g[0])
    for _ in range(passes):
        for y in range(h):
            for x in range(w):
                if g[y][x] == '.':
                    continue
                n = sum(1 for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < h and 0 <= x + dx < w and g[y + dy][x + dx] != '.')
                if n <= 1:
                    g[y][x] = '.'


def build_frame(cfg):
    A = np.asarray(Image.open(cfg['src']).convert('RGB')).astype(float)
    nat, m = segment(native(A, cfg['pitch'], cfg['off']), cfg['floor'], cfg.get('hole_min', 225), cfg.get('hole_size', 3))
    pix = nat[m]
    ncol = cfg.get('ncol', 22)
    thr = cfg.get('outline_lum', 30)
    C = kmeans(pix, ncol)
    pal = {CHARS[i]: '#%02x%02x%02x' % tuple(int(round(v)) for v in C[i]) for i in range(len(C))}
    lab = np.argmin(((nat[:, :, None, :] - C[None, None]) ** 2).sum(3), 2)
    dark = [pal_lum(pal[CHARS[i]]) < thr for i in range(len(C))]
    g = reduce(lab, m, len(C), dark, cfg.get('scale', 1.5), cfg.get('dark_bias', 1.6))
    raw = [r[:] for r in g]
    strip_outline(g, pal, thr)
    isolated(g)
    # cadrage d'après le personnage nettoyé (les coordonnées des réglages s'y réfèrent)
    h, w = len(g), len(g[0])
    y0 = min(y for y in range(h) if any(c != '.' for c in g[y]))
    y1 = max(y for y in range(h) if any(c != '.' for c in g[y]))
    x0 = min(x for x in range(w) if any(g[y][x] != '.' for y in range(h)))
    x1 = max(x for x in range(w) if any(g[y][x] != '.' for y in range(h)))
    # zones protégées du nettoyage : des cheveux noirs perdraient leurs mèches fines du bord
    for y, rs in cfg.get('keep_edge', {}).items():
        for a, b in rs:
            for x in range(a, b + 1):
                if y0 + y <= y1 and x0 + x <= x1:
                    g[y0 + y][x0 + x] = raw[y0 + y][x0 + x]
    if cfg.get('lift'):
        pal = lift(pal, thr, cfg['lift'])
    return [''.join(r[x0:x1 + 1]) for r in g[y0:y1 + 1]], pal


def lift(pal, thr, gain):
    """Éclaircit les teintes sombres (sauf le contour) pour qu'un personnage tout en noir
    reste lisible sur les fonds sombres du jeu : gain plein près du seuil, nul vers lum 140."""
    out = {}
    for k, h in pal.items():
        L = pal_lum(h)
        if L < thr:
            out[k] = h
            continue
        f = 1 + (gain - 1) * max(0.0, min(1.0, (140 - L) / (140 - thr)))
        out[k] = '#%02x%02x%02x' % tuple(min(255, int(round(int(h[i:i + 2], 16) * f + 6 * (f - 1)))) for i in (1, 3, 5))
    return out


# ------------------------------------------------------------------ retouches
def dist2(a, b):
    return sum((int(a[i:i + 2], 16) - int(b[i:i + 2], 16)) ** 2 for i in (1, 3, 5))


def nearest(pal, hexc):
    return min(pal, key=lambda k: dist2(pal[k], hexc))


def erase(rows, spans):
    """Efface des pixels restés à tort (fond enfermé entre un bras et le torse)."""
    g = [list(r) for r in rows]
    for y, rs in spans.items():
        for x0, x1 in rs:
            for x in range(x0, x1 + 1):
                g[y][x] = '.'
    return [''.join(r) for r in g]


def sat(h):
    c = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    return (max(c) - min(c)) / max(1, max(c))


def recolor(rows, pal, specs):
    """Remplace, dans chaque masque, les teintes grises (saturation <= max_sat, hors contour
    plus sombre que min_lum) par un dégradé : la plus sombre présente -> ramp[0], la plus claire
    -> ramp[-1]. Les couleurs du dégradé sont ajoutées à la palette."""
    pal = dict(pal)
    g = [list(r) for r in rows]
    for sp in specs:
        cells = [(y, x) for y, rs in sp['mask'].items() for x0, x1 in rs for x in range(x0, x1 + 1)
                 if y < len(g) and x < len(g[0]) and g[y][x] != '.']
        ok = lambda k: pal_lum(pal[k]) >= sp.get('min_lum', 10) and sat(pal[k]) <= sp.get('max_sat', 0.3)
        keys = sorted({g[y][x] for y, x in cells if ok(g[y][x])}, key=lambda k: pal_lum(pal[k]))
        ramp = sp['ramp']
        new = {}
        for i, k in enumerate(keys):
            c = ramp[round(i * (len(ramp) - 1) / max(1, len(keys) - 1))]
            hit = [kk for kk, v in pal.items() if v == c]
            if not hit:
                hit = [CHARS[len(pal)]]
                pal[hit[0]] = c
            new[k] = hit[0]
        for y, x in cells:
            if g[y][x] in new:
                g[y][x] = new[g[y][x]]
    return [''.join(r) for r in g], pal


def retouch(rows, pal, face, face_col):
    """Retouches à la main ('.' garde le pixel, ' ' l'efface). Une couleur sans équivalent proche dans la palette (yeux verts
    d'un personnage qui n'en a pas ailleurs, par exemple) y est ajoutée."""
    pal = dict(pal)
    for hexc in face_col.values():
        if dist2(pal[nearest(pal, hexc)], hexc) > 24 ** 2:
            pal[CHARS[len(pal)]] = hexc
    g = [list(r) for r in rows]
    for y, (x0, row) in face.items():
        for i, ch in enumerate(row):
            if ch == ' ':
                g[y][x0 + i] = '.'
            elif ch != '.':
                g[y][x0 + i] = nearest(pal, face_col[ch])
    return [''.join(r) for r in g], pal


# ------------------------------------------------------------------ pièces du squelette
def build_parts(rows, cut, piv, names, nocrop):
    """Chaque pixel est attribué à une pièce selon des plages (ligne -> [x0, x1]) ;
    la première pièce qui couvre un pixel le prend."""
    h, w = len(rows), len(rows[0])
    owner = [[None] * w for _ in range(h)]
    for key, spans in cut:
        for y, rs in spans.items():
            for x0, x1 in rs:
                for x in range(x0, min(x1, w - 1) + 1):
                    if y < h and owner[y][x] is None and rows[y][x] != '.':
                        owner[y][x] = key
    parts = {}
    for key, name in names.items():
        cells = [(y, x) for y in range(h) for x in range(w) if owner[y][x] == key]
        if not cells:
            raise SystemExit('pièce vide : ' + name)
        ys = [c[0] for c in cells]
        xs = [c[1] for c in cells]
        y0, y1 = min(ys), max(ys)
        x0, x1 = (0, w - 1) if name in nocrop else (min(xs), max(xs))
        t = [''.join(rows[y][x] if owner[y][x] == key else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
        pv, en = piv[name]
        parts[name] = {'pivot': [pv[0] - x0, pv[1] - y0], 'end': [en[0] - x0, en[1] - y0], 't': t}
    left = [(y, x) for y in range(h) for x in range(w) if rows[y][x] != '.' and owner[y][x] is None]
    return parts, left


def build(cfg):
    rows, pal = build_frame(cfg)
    rows = erase(rows, cfg.get('erase', {}))
    rows, pal = recolor(rows, pal, cfg.get('recolor', []))
    rows, pal = retouch(rows, pal, cfg.get('face', {}), cfg.get('face_col', {}))
    if os.environ.get('DUMP'):
        json.dump({'pal': pal, 'rows': rows}, open(os.environ['DUMP'], 'w'))
    if not cfg.get('cut'):
        print('\n'.join('%2d %s' % (y, r) for y, r in enumerate(rows)))
        return
    parts, left = build_parts(rows, cfg['cut'], cfg['piv'], cfg.get('names', NAMES), cfg.get('nocrop', {'torso'}))
    rel = os.path.relpath(cfg['src'], ROOT)
    script = 'tools/art/build_%s.py' % cfg['name'].lower()
    lines = [
        "'use strict';",
        '// %s — image extraite et nettoyée de sa référence (%s).' % (cfg['name'], rel),
        '// Fichier généré par %s : ne pas éditer à la main.' % script,
        '(function () {',
        '  GS.%s = {' % cfg['var'],
        '    pal: ' + json.dumps(pal) + ',',
        '    joints: ' + json.dumps(cfg['joints']) + ',',
        '    frames: {',
        '      idle: [',
    ]
    lines += [f"        '{r}'," for r in rows]
    lines += ['      ],', '    },', '    parts: {']
    for k, p in parts.items():
        lines.append(f'      {k}: {{ pivot: {json.dumps(p["pivot"])}, end: {json.dumps(p["end"])}, t: [')
        lines += [f"        '{r}'," for r in p['t']]
        lines.append('      ] },')
    lines += ['    },', '  };', '})();']
    with open(cfg['out'], 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('écrit', cfg['out'], '%dx%d' % (len(rows[0]), len(rows)), 'pixels non attribués :', left)
