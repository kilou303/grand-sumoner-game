#!/usr/bin/env python3
"""Construit les sprites de Djegui à partir de la planche de référence.

    python3 -I tools/art/build_djegui.py [art/reference/djegui_sheet.webp]

Étapes : détourage de chaque pose (remplissage depuis les bords sur la couleur du fond),
réduction sur une grille de pixels nette, palette commune (k-means), nettoyage automatique
(ombres au sol, pixels isolés) puis corrections manuelles pixel par pixel (MANUAL), et
création de nouvelles images (coups de poing, dégâts...). Écrit src/gfx/djegui_art.js.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'djegui_sheet.webp')
OUT = os.path.join(ROOT, 'src', 'gfx', 'djegui_art.js')

A = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
BG = np.array([11, 13, 17])
H_TARGET = 64

# Zones de la planche (x0, y0, x1, y1) et hauteur d'un personnage debout dans chaque rangée.
REG = {
    'idle1': (500, 30, 680, 392), 'side1': (700, 30, 870, 392), 'back': (900, 30, 1080, 392),
    'idle5': (1310, 30, 1495, 392),
    'walk1': (480, 440, 672, 684), 'walk2': (686, 440, 866, 684), 'walk3': (876, 440, 1056, 684),
    'walk4': (1076, 440, 1256, 684), 'walk5': (1286, 440, 1476, 684),
    'run1': (436, 750, 614, 962), 'run2': (600, 750, 792, 962), 'run3': (756, 746, 942, 962),
    'run4': (926, 746, 1112, 962), 'power': (1140, 690, 1520, 992),
    'big': (16, 26, 384, 1012),
}
FIG_H = {'idle': 340.0, 'walk': 226.0, 'run': 226.0, 'power': 300.0, 'big': 975.0}


def row_of(k):
    if k in ('idle1', 'side1', 'back', 'idle5'):
        return 'idle'
    for p in ('walk', 'run', 'power', 'big'):
        if k.startswith(p):
            return p
    return 'idle'


def lum(c):
    return c[..., 0] * 0.3 + c[..., 1] * 0.59 + c[..., 2] * 0.11


# ------------------------------------------------------------------ détourage
def segment(x0, y0, x1, y1, tol=7):
    sub = A[y0:y1, x0:x1]
    h, w = sub.shape[:2]
    bgl = np.sqrt(((sub - BG) ** 2).sum(axis=2)) <= tol
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgl[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgl[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bgl[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    fg = ~seen
    lab = np.zeros((h, w), int)
    cur = 0
    sizes = {}
    for y in range(h):
        for x in range(w):
            if fg[y, x] and not lab[y, x]:
                cur += 1
                n = 0
                q.append((y, x))
                lab[y, x] = cur
                while q:
                    cy, cx = q.popleft()
                    n += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = cur
                                q.append((ny, nx))
                sizes[cur] = n
    best = max(sizes, key=sizes.get)
    return sub, lab == best


def figure(k):
    sub, m = segment(*REG[k])
    L = lum(sub.astype(float))
    bright_rows = np.nonzero(((L > 150) & m).sum(axis=1) > 2)[0]
    m[bright_rows.max() + 3:] = False
    ys, xs = np.nonzero(m)
    return sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1], m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


# ------------------------------------------------------------------ réduction
def downsample(img, m, f):
    h, w = m.shape
    oh, ow = int(round(h / f)), int(round(w / f))
    out = np.zeros((oh, ow, 3), float)
    alpha = np.zeros((oh, ow), bool)
    for y in range(oh):
        for x in range(ow):
            ya, yb = int(y * f), max(int(y * f) + 1, int((y + 1) * f))
            xa, xb = int(x * f), max(int(x * f) + 1, int((x + 1) * f))
            cm = m[ya:yb, xa:xb]
            if cm.mean() < 0.45:
                continue
            px = img[ya:yb, xa:xb][cm]
            red = px[(px[:, 0] > 150) & (px[:, 1] < 90) & (px[:, 2] < 100)]
            if len(red) >= 2:
                out[y, x] = red.mean(axis=0)
            else:
                Ls = lum(px.astype(float))
                out[y, x] = px[np.argsort(Ls)[len(Ls) // 2]]
            alpha[y, x] = True
    # retire le contour noir extérieur (redessiné proprement par le jeu)
    L = lum(out)
    rm = []
    for y in range(oh):
        for x in range(ow):
            if alpha[y, x] and L[y, x] < 9:
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if not (0 <= ny < oh and 0 <= nx < ow) or not alpha[ny, nx]:
                        rm.append((y, x))
                        break
    for y, x in rm:
        alpha[y, x] = False
    return out, alpha


def remove_shadow_cores(out, alpha):
    """Supprime les grandes taches noires (ombre entre les jambes / au sol) en gardant les traits fins."""
    L = lum(out)
    h, w = alpha.shape
    dark = alpha & (L < 13)
    core = np.zeros_like(dark)
    for y in range(h):
        for x in range(w):
            if dark[y, x]:
                core[y, x] = all(not (0 <= y + dy < h and 0 <= x + dx < w) or not alpha[y + dy, x + dx] or dark[y + dy, x + dx]
                                 for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)))
    rm = core.copy()
    for y in range(h):
        for x in range(w):
            if dark[y, x] and not core[y, x]:
                if any(0 <= y + dy < h and 0 <= x + dx < w and core[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    rm[y, x] = True
    alpha[rm] = False
    for y in range(h):
        for x in range(w):
            if alpha[y, x]:
                n = sum(1 for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < h and 0 <= x + dx < w and alpha[y + dy, x + dx])
                if n <= 1:
                    alpha[y, x] = False


# ------------------------------------------------------------------ palette
CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'


def kmeans(pix, k, seed=1):
    rng = np.random.default_rng(seed)
    C = [pix[rng.integers(len(pix))]]
    for _ in range(k - 1):
        d = np.min([((pix - c) ** 2).sum(1) for c in C], axis=0)
        C.append(pix[rng.choice(len(pix), p=d / d.sum())])
    C = np.array(C, float)
    for _ in range(30):
        lab = np.argmin(((pix[:, None, :] - C[None]) ** 2).sum(2), 1)
        for i in range(k):
            if (lab == i).any():
                C[i] = pix[lab == i].mean(0)
    return C[np.argsort(C @ np.array([0.3, 0.59, 0.11]))]


# ------------------------------------------------------------------ nettoyage
def pal_lum(h):
    r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
    return 0.3 * r + 0.59 * g + 0.11 * b


def auto_clean(g, pal):
    LIGHT = {c for c in pal if pal_lum(pal[c]) > 95}
    h, w = len(g), len(g[0])
    lowest = max((y for y in range(h) for x in range(w) if g[y][x] in LIGHT), default=h - 1)
    for x in range(w):
        col = [y for y in range(h) if g[y][x] in LIGHT]
        cut = (max(col) + 2) if col else None
        for y in range(h):
            if g[y][x] == '.':
                continue
            if y > lowest + 1 or (cut is not None and y > cut and pal_lum(pal[g[y][x]]) < 60 and y > h - 8):
                g[y][x] = '.'
    isolated(g)
    return crop(g)


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


def small_components(g, minsize=20):
    h, w = len(g), len(g[0])
    seen = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if g[y][x] == '.' or seen[y][x]:
                continue
            comp = []
            dq = deque([(y, x)])
            seen[y][x] = True
            while dq:
                cy, cx = dq.popleft()
                comp.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and not seen[ny][nx] and g[ny][nx] != '.':
                        seen[ny][nx] = True
                        dq.append((ny, nx))
            if len(comp) < minsize:
                for cy, cx in comp:
                    g[cy][cx] = '.'


def crop(g):
    h, w = len(g), len(g[0])
    ys = [y for y in range(h) if any(c != '.' for c in g[y])]
    xs = [x for x in range(w) if any(g[y][x] != '.' for y in range(h))]
    return [list(r[min(xs):max(xs) + 1]) for r in g[min(ys):max(ys) + 1]]


# Corrections manuelles (coordonnées après le nettoyage automatique) :
# ('dark', x0, y0, x1, y1) efface les pixels sombres (ombres) du rectangle ; ('all', ...) efface tout.
MANUAL = {
    'idle1': [('dark', 14, 42, 16, 42), ('dark', 11, 43, 16, 53), ('dark', 9, 54, 18, 56), ('dark', 10, 57, 16, 57),
              ('all', 3, 62, 9, 64), ('all', 18, 62, 23, 64)],
    'idle5': [('dark', 13, 43, 19, 53), ('dark', 12, 54, 17, 54)],
    'side1': [('all', 0, 63, 21, 64)],
    'walk1': [('dark', 14, 54, 21, 56), ('dark', 29, 55, 33, 56), ('all', 8, 61, 16, 63), ('all', 33, 61, 41, 62)],
    'walk2': [('dark', 10, 49, 17, 53), ('all', 6, 59, 12, 59)],
    'walk3': [('all', 25, 61, 31, 61)],
    'walk4': [('all', 9, 61, 15, 61), ('all', 31, 61, 42, 62)],
    'walk5': [('all', 5, 61, 13, 64), ('all', 26, 61, 37, 62)],
}


def manual(g, ops, pal):
    for op, x0, y0, x1, y1 in ops:
        for y in range(y0, min(y1, len(g) - 1) + 1):
            for x in range(x0, min(x1, len(g[0]) - 1) + 1):
                c = g[y][x]
                if c == '.':
                    continue
                if op == 'all' or pal_lum(pal[c]) < 45:
                    g[y][x] = '.'


# ------------------------------------------------------------------ pièces du squelette (animation modulaire)
# Découpées dans la pose 3/4 (idle5 retournée, tournée vers la droite). Coordonnées dans cette image.
# pivot = articulation d'attache (haut de la pièce), end = articulation suivante (coude, genou...).
CUTS = {
    'head': {'rows': (0, 15), 'x': lambda y: (0, 28), 'pivot': (14, 15), 'end': (14, 15)},
    'torso': {'rows': (15, 41), 'x': lambda y: (5, 23) if y <= 21 else (4, 22) if y >= 38 else (8, 20), 'pivot': (14, 41), 'end': (14, 15), 'nocrop': True},
    # bras d'origine de la fiche, mains dans les poches (même repère que le torse)
    'pocketF': {'rows': (15, 41), 'x': lambda y: (21, 28) if 18 <= y <= 37 else (99, 99), 'pivot': (14, 41), 'end': (14, 15), 'nocrop': True},
    'pocketB': {'rows': (15, 41), 'x': lambda y: (1, 7) if 19 <= y <= 37 else (99, 99), 'pivot': (14, 41), 'end': (14, 15), 'nocrop': True},
    # bras d'origine (texture de la fiche), découpés sans la poche ni la couture du torse
    'armUpF': {'rows': (19, 27), 'x': lambda y: (22, 28), 'pivot': (25, 20), 'end': (25, 27)},
    'armLoF': {'rows': (27, 33), 'x': lambda y: (21, 27), 'pivot': (24, 27), 'end': (24, 33)},
    'thighF': {'rows': (41, 47), 'x': lambda y: (15, 23), 'pivot': (19, 41), 'end': (19, 47)},
    'shinF': {'rows': (47, 54), 'x': lambda y: (15, 23), 'pivot': (19, 47), 'end': (19, 54)},
    'thighB': {'rows': (41, 47), 'x': lambda y: (3, 10), 'pivot': (6, 41), 'end': (6, 47)},
    'shinB': {'rows': (47, 54), 'x': lambda y: (3, 10), 'pivot': (6, 47), 'end': (6, 54)},
}
# Pièces dessinées à la main dans la même palette (couleurs ramenées à la plus proche).
HAND = {
    'shoe': {'pivot': (3, 0), 'end': (8, 4), 't': [
        '..lwwl.....',
        '.wlvvwl....',
        '.wvvwwwwl..',
        'lwvwwwlwwwl',
        'wvwwwvvwwww',
        'mmgggggggms',
        '.dddddddd..',
    ], 'col': {'w': '#eae1ef', 'l': '#bdb0c7', 'v': '#9e8cbe', 'g': '#afa3ba', 'm': '#7c6f8c', 's': '#635670', 'd': '#392f41'}},
    'fist': {'pivot': (2, 0), 'end': (2, 3), 't': [
        '.ab.',
        'abca',
        'abba',
        '.aa.',
    ], 'col': {'a': '#2a1814', 'b': '#45291f', 'c': '#62402f'}},
}


def build_parts(frames, pal):
    def nearest(hexc):
        r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
        return min(pal, key=lambda k: sum((int(pal[k][i:i + 2], 16) - v) ** 2 for i, v in zip((1, 3, 5), (r, g, b))))

    src = [r[::-1] for r in frames['idle5']]
    parts = {}
    for name, c in CUTS.items():
        y0, y1 = c['rows']
        rows = []
        for y in range(y0, y1 + 1):
            xa, xb = c['x'](y)
            rows.append(''.join(src[y][x] if xa <= x <= xb and x < len(src[y]) else '.' for x in range(len(src[0]))))
        # recadre horizontalement (sauf pièces alignées sur le torse)
        if c.get('nocrop'):
            x0 = 0
        else:
            xs = [x for x in range(len(rows[0])) if any(r[x] != '.' for r in rows)]
            x0 = min(xs)
            rows = [r[x0:max(xs) + 1] for r in rows]
        parts[name] = {'pivot': [c['pivot'][0] - x0, c['pivot'][1] - y0], 'end': [c['end'][0] - x0, c['end'][1] - y0], 't': rows}
    # retouche du visage (sous la capuche) : peau brune, deux yeux rouges, plus de bande noire.
    # k = ombre de la capuche, d/g/l = peau (sombre -> clair), e = rouge sombre, r = rouge vif.
    FACE = {
        11: '..kkdddgggddkk.....',
        12: '..kdgerggglerdk....',
        13: '..kdglggllggdkk....',
        14: '...kdglgddggdk.....',
        15: '...kkdggggdkk......',
    }
    fc = {'k': '#0e0c13', 'd': '#2a1814', 'g': '#45291f', 'l': '#62402f', 'e': '#8a1418', 'r': '#e0222a'}
    head = parts['head']['t']
    for y, row in FACE.items():
        cur = list(head[y])
        for x, ch in enumerate(row):
            if ch != '.' and x < len(cur):
                cur[x] = nearest(fc[ch])
        head[y] = ''.join(cur)
    for name, hdef in HAND.items():
        m = {k: nearest(v) for k, v in hdef['col'].items()}
        parts[name] = {'pivot': list(hdef['pivot']), 'end': list(hdef['end']), 't': [''.join(m.get(ch, '.') for ch in r) for r in hdef['t']]}
    parts['armUpB'] = dict(parts['armUpF'])
    parts['armLoB'] = dict(parts['armLoF'])
    return parts


# ------------------------------------------------------------------ main
def main():
    raw = {}
    for k in REG:
        img, m = figure(k)
        target = H_TARGET * (2.6 if k == 'big' else 1.0)
        out, alpha = downsample(img.astype(float), m, FIG_H[row_of(k)] / target)
        if k.startswith('walk') or k.startswith('run'):
            remove_shadow_cores(out, alpha)
        raw[k] = (out, alpha)
    pix = np.concatenate([raw[k][0][raw[k][1]] for k in raw if k not in ('big', 'power')])
    C = kmeans(pix, 20)
    # couleurs imposées : yeux rouges et aura (sinon absorbées par les gris)
    FIXED = ['#e0222a', '#ff6a6a', '#8a1418', '#4a1612', '#6e2a22', '#2a1814', '#45291f', '#62402f']
    C = np.concatenate([C, np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in FIXED], float)])
    C = C[np.argsort(C @ np.array([0.3, 0.59, 0.11]))]
    pal = {CHARS[i]: '#%02x%02x%02x' % tuple(int(round(v)) for v in C[i]) for i in range(len(C))}
    frames = {}
    for k, (img, a) in raw.items():
        lab = np.argmin(((img[:, :, None, :] - C[None, None]) ** 2).sum(3), 2)
        g = [[CHARS[lab[y, x]] if a[y, x] else '.' for x in range(img.shape[1])] for y in range(img.shape[0])]
        if k not in ('power', 'big'):
            g = auto_clean(g, pal)
        if not os.environ.get('NOMANUAL'):
            manual(g, MANUAL.get(k, []), pal)
        small_components(g)
        g = crop(g)
        frames[k] = [''.join(r) for r in g]
    parts = build_parts(frames, pal)
    # centre du torse (pixels clairs de la moitié haute) : sert à aligner les images
    meta = {}
    LIGHT = {c for c in pal if pal_lum(pal[c]) > 95}
    for k, rows in frames.items():
        h = len(rows)
        pts = [(x, y) for y in range(int(h * 0.2), int(h * 0.6)) for x, c in enumerate(rows[y]) if c in LIGHT]
        cx = round(sum(p[0] for p in pts) / max(1, len(pts)))
        meta[k] = {'cx': cx, 'w': len(rows[0]), 'h': h}
    lines = [
        "'use strict';",
        '// Djegui — images extraites et nettoyées de la planche de référence (art/reference/djegui_sheet.webp).',
        '// Fichier généré par tools/art/build_djegui.py : ne pas éditer à la main.',
        '(function () {',
        '  GS.DJEGUI_ART = {',
        '    pal: ' + json.dumps(pal) + ',',
        '    meta: ' + json.dumps(meta) + ',',
        '    frames: {',
    ]
    for k, rows in frames.items():
        lines.append(f'      {k}: [')
        lines += [f"        '{r}'," for r in rows]
        lines.append('      ],')
    lines += ['    },', '    parts: {']
    for k, p in parts.items():
        lines.append(f'      {k}: {{ pivot: {json.dumps(p["pivot"])}, end: {json.dumps(p["end"])}, t: [')
        lines += [f"        '{r}'," for r in p['t']]
        lines.append('      ] },')
    lines += ['    },', '  };', '})();']
    if os.environ.get('DUMP'):
        json.dump({'pal': pal, 'frames': frames}, open(os.environ['DUMP'], 'w'))
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('écrit', OUT, {k: (v['w'], v['h']) for k, v in meta.items()})


main()
