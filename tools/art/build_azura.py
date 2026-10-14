#!/usr/bin/env python3
"""Construit les sprites d'Azura à partir de son image de référence.

    python3 -I tools/art/build_azura.py [art/reference/azura_sprite.jpg]

L'image est du pixel art agrandi (~9,65 px par pixel) : on la ramène d'abord à sa grille
d'origine, on détoure le personnage (fond blanc + sol de pierre), puis on la réduit aux
proportions des autres héros (~64 px de haut) sur une palette commune (k-means). Le
personnage est ensuite découpé en pièces pour l'animation modulaire (même format que
Djegui, voir src/gfx/modrig.js). Écrit src/gfx/azura_art.js.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'azura_sprite.jpg')
OUT = os.path.join(ROOT, 'src', 'gfx', 'azura_art.js')

# Grille de l'image agrandie : pas et décalage (mesurés sur les bords des pixels).
PITCH = 9.65
OFF = (8.75, 9.5)
FLOOR = 86  # première ligne (grille d'origine) où le sol de pierre apparaît
SCALE = 1.5  # réduction : 3 pixels d'origine -> 2 pixels de jeu
NCOL = 22
CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'


def lum(c):
    return c[..., 0] * 0.3 + c[..., 1] * 0.59 + c[..., 2] * 0.11


def pal_lum(h):
    r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
    return 0.3 * r + 0.59 * g + 0.11 * b


# ------------------------------------------------------------------ grille d'origine
def native(A):
    H, W = A.shape[:2]
    xs = np.arange(OFF[0] - PITCH, W, PITCH)
    ys = np.arange(OFF[1] - PITCH, H, PITCH)
    out = np.full((len(ys) - 1, len(xs) - 1, 3), 255.0)
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            a, b = max(0, int(ys[j] + PITCH * 0.25)), min(H, int(ys[j + 1] - PITCH * 0.25))
            c, d = max(0, int(xs[i] + PITCH * 0.25)), min(W, int(xs[i + 1] - PITCH * 0.25))
            if b > a and d > c:
                out[j, i] = np.median(A[a:b, c:d].reshape(-1, 3), axis=0)
    return out


# ------------------------------------------------------------------ détourage
def segment(nat):
    h, w = nat.shape[:2]
    L = lum(nat)
    ok = nat.min(2) > 215  # fond blanc
    ok[FLOOR:] |= L[FLOOR:] > 40  # sol : tout sauf le contour noir des bottes
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
    # trous de fond enfermés (entre le bras et le torse) : zones blanches de plus de 3 pixels
    white = (nat.min(2) > 225) & m
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
            if len(comp) > 3:
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
def reduce(lab, m, ncol, dark):
    """Réduit la grille d'index de palette par vote pondéré par la surface couverte.
    Les traits sombres (contours intérieurs) sont favorisés pour ne pas disparaître."""
    h, w = m.shape
    oh, ow = int(np.ceil(h / SCALE)), int(np.ceil(w / SCALE))
    g = [['.'] * ow for _ in range(oh)]
    for y in range(oh):
        for x in range(ow):
            votes = np.zeros(ncol)
            cover = 0.0
            for sy in range(int(y * SCALE), min(h, int(np.ceil((y + 1) * SCALE)))):
                wy = min(sy + 1, (y + 1) * SCALE) - max(sy, y * SCALE)
                for sx in range(int(x * SCALE), min(w, int(np.ceil((x + 1) * SCALE)))):
                    wx = min(sx + 1, (x + 1) * SCALE) - max(sx, x * SCALE)
                    a = wx * wy
                    if a <= 0 or not m[sy, sx]:
                        continue
                    cover += a
                    votes[lab[sy, sx]] += a * (1.6 if dark[lab[sy, sx]] else 1.0)
            if cover >= 0.5 * SCALE * SCALE:
                g[y][x] = CHARS[int(np.argmax(votes))]
    return g


def strip_outline(g, pal):
    """Retire le contour noir extérieur (le jeu le redessine proprement)."""
    h, w = len(g), len(g[0])
    rm = []
    for y in range(h):
        for x in range(w):
            if g[y][x] != '.' and pal_lum(pal[g[y][x]]) < 30:
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


def crop(g):
    h, w = len(g), len(g[0])
    ys = [y for y in range(h) if any(c != '.' for c in g[y])]
    xs = [x for x in range(w) if any(g[y][x] != '.' for y in range(h))]
    return [list(r[min(xs):max(xs) + 1]) for r in g[min(ys):max(ys) + 1]]


def build_frame():
    A = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    nat, m = segment(native(A))
    pix = nat[m]
    C = kmeans(pix, NCOL)
    pal = {CHARS[i]: '#%02x%02x%02x' % tuple(int(round(v)) for v in C[i]) for i in range(len(C))}
    lab = np.argmin(((nat[:, :, None, :] - C[None, None]) ** 2).sum(3), 2)
    dark = [pal_lum(pal[CHARS[i]]) < 30 for i in range(len(C))]
    g = reduce(lab, m, len(C), dark)
    strip_outline(g, pal)
    isolated(g)
    return [''.join(r) for r in crop(g)], pal


# ------------------------------------------------------------------ retouches
# Visage refait à la main (3/4 vers la droite) : la réduction efface les yeux.
# k = mèche sombre, f = mèche, a = contour, w = blanc de l'œil, i = iris, d = iris sombre,
# u = peau claire, s = peau, r = peau ombrée, p = ombre (bouche).
FACE = {
    9: (10, 'faauuaa'),
    10: (10, 'fwduuwd'),
    11: (10, 'fuiuuui'),
    12: (10, 'kruuuus'),
    13: (10, 'kruupss'),
    14: (10, 'fkruusa'),
    15: (10, 'kkrra'),
}
FACE_COL = {'k': '#0f2c3e', 'f': '#1c4255', 'a': '#020102', 'w': '#fbfbf9', 'i': '#528d9f', 'd': '#0f2c3e',
            'u': '#f8ccab', 's': '#e4a685', 'r': '#d39375', 'p': '#b5785c'}

# ------------------------------------------------------------------ pièces du squelette
# Chaque pixel de l'image réduite est attribué à une pièce selon des plages (ligne -> [x0, x1]).
# h tête, q queue de cheval (derrière le torse), t torse (avec la tunique), u/l bras arrière
# (épaulière, avant-bras + brassard), U/L bras avant, F poing, a/s jambe arrière (pantalon,
# botte), A/S jambe avant, O pied. Le premier qui couvre un pixel le prend.
def R(*spans):
    return spans


CUT = [
    ('u', {13: R((6, 7)), **{y: R((4, 9)) for y in range(14, 17)}, **{y: R((3, 9)) for y in range(17, 22)},
           22: R((3, 8)), 23: R((3, 6)), 24: R((2, 5)), 25: R((2, 5))}),
    ('l', {y: R((2, 5)) for y in range(26, 32)}),
    ('h', {**{y: R((0, 22)) for y in range(0, 13)}, 13: R((0, 5), (8, 22)), 14: R((0, 3), (10, 17)),
           15: R((0, 3), (10, 17)), 16: R((0, 3), (10, 13), (16, 17)), 17: R((17, 17))}),
    ('q', {y: R((0, 2)) for y in range(17, 25)}),
    ('U', {**{y: R((16, 18)) for y in range(19, 23)}, **{y: R((17, 20)) for y in range(23, 26)}}),
    ('L', {**{y: R((17, 20)) for y in range(26, 29)}, **{y: R((19, 21)) for y in range(29, 32)}}),
    ('F', {y: R((20, 23)) for y in range(32, 37)}),
    ('t', {16: R((14, 15)), 17: R((10, 16)), **{y: R((10, 17)) for y in range(18, 22)}, 22: R((9, 17)),
           **{y: R((10, 17)) for y in range(23, 28)}, 28: R((9, 17)),
           29: R((6, 19)), **{y: R((6, 19)) for y in range(30, 37)}, **{y: R((4, 20)) for y in range(37, 40)},
           40: R((4, 6), (12, 16), (20, 20)), 41: R((11, 16))}),
    ('a', {y: R((2, 11)) for y in range(39, 46)}),
    ('A', {y: R((12, 20)) for y in range(39, 46)}),
    ('s', {y: R((2, 10)) for y in range(46, 55)}),
    ('S', {y: R((13, 20)) for y in range(46, 54)}),
    ('O', {y: R((14, 23)) for y in range(53, 60)}),
]
# Articulations (coordonnées dans l'image réduite).
JOINTS = {'hip': [12, 38], 'neck': [13, 16], 'shoulderF': [17, 20], 'shoulderB': [6, 17]}
PIV = {
    'head': ((13, 16), (13, 16)), 'hairBack': ((13, 16), (13, 16)),
    'torso': ((12, 38), (13, 16)),
    'armUpF': ((17, 20), (19, 26)), 'armLoF': ((19, 26), (20, 31)),
    'armUpB': ((6, 17), (4, 25)), 'armLoB': ((4, 25), (4, 31)),
    'fist': ((21, 32), (21, 35)),
    'thighF': ((16, 38), (17, 45)), 'shinF': ((17, 45), (17, 54)),
    'thighB': ((7, 38), (6, 45)), 'shinB': ((6, 45), (4, 54)),
    'shoe': ((17, 53), (21, 57)),
}
NAMES = {'h': 'head', 'q': 'hairBack', 't': 'torso', 'U': 'armUpF', 'L': 'armLoF', 'u': 'armUpB', 'l': 'armLoB',
         'F': 'fist', 'A': 'thighF', 'S': 'shinF', 'a': 'thighB', 's': 'shinB', 'O': 'shoe'}
NOCROP = {'torso'}


def nearest(pal, hexc):
    r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
    return min(pal, key=lambda k: sum((int(pal[k][i:i + 2], 16) - v) ** 2 for i, v in zip((1, 3, 5), (r, g, b))))


def retouch(rows, pal):
    g = [list(r) for r in rows]
    for y, (x0, row) in FACE.items():
        for i, ch in enumerate(row):
            if ch != '.':
                g[y][x0 + i] = nearest(pal, FACE_COL[ch])
    return [''.join(r) for r in g]


def build_parts(rows):
    h, w = len(rows), len(rows[0])
    owner = [[None] * w for _ in range(h)]
    for key, spans in CUT:
        for y, rs in spans.items():
            for x0, x1 in rs:
                for x in range(x0, min(x1, w - 1) + 1):
                    if y < h and owner[y][x] is None and rows[y][x] != '.':
                        owner[y][x] = key
    parts = {}
    for key, name in NAMES.items():
        cells = [(y, x) for y in range(h) for x in range(w) if owner[y][x] == key]
        ys = [c[0] for c in cells]
        xs = [c[1] for c in cells]
        y0, y1 = min(ys), max(ys)
        x0, x1 = (0, w - 1) if name in NOCROP else (min(xs), max(xs))
        t = [''.join(rows[y][x] if owner[y][x] == key else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
        pv, en = PIV[name]
        parts[name] = {'pivot': [pv[0] - x0, pv[1] - y0], 'end': [en[0] - x0, en[1] - y0], 't': t}
    left = [(y, x) for y in range(h) for x in range(w) if rows[y][x] != '.' and owner[y][x] is None]
    return parts, left


def main():
    rows, pal = build_frame()
    rows = retouch(rows, pal)
    parts, left = build_parts(rows)
    lines = [
        "'use strict';",
        '// Azura — image extraite et nettoyée de sa référence (art/reference/azura_sprite.jpg).',
        '// Fichier généré par tools/art/build_azura.py : ne pas éditer à la main.',
        '(function () {',
        '  GS.AZURA_ART = {',
        '    pal: ' + json.dumps(pal) + ',',
        '    joints: ' + json.dumps(JOINTS) + ',',
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
    if os.environ.get('DUMP'):
        json.dump({'pal': pal, 'rows': rows}, open(os.environ['DUMP'], 'w'))
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('écrit', OUT, '%dx%d' % (len(rows[0]), len(rows)), 'pixels non attribués :', left)


main()
