#!/usr/bin/env python3
"""Construit les sprites de Tout Puissant à partir de sa planche de référence.

    python3 -I tools/art/build_toutpuissant.py [art/reference/tout_puissant_sheet.png]

Étapes (comme tools/art/build_djegui.py) : détourage de chaque pose (remplissage depuis les
bords sur la couleur du fond, halos bleus écartés), réduction sur une grille de pixels nette
(matière dominante de chaque case puis ton par luminance), palette commune (couleurs imposées
des matières + k-means pour le reste), nettoyage automatique (ombres au sol, pixels isolés),
corrections manuelles (MANUAL), effets relevés (orbe, tourbillon, colonne...). Les pièces du
squelette sont relevées pixel par pixel sur la pose 3/4 (idle1, tournée vers la droite) puis
nettoyées à la main (aplats francs façon JUS). Écrit src/gfx/toutpuissant_art.js.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'tout_puissant_sheet.png')
OUT = os.path.join(ROOT, 'src', 'gfx', 'toutpuissant_art.js')

A = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
BG = np.array([10, 13, 19])

# Zones de la planche (x0, y0, x1, y1). Rangée 1 : tour complet au repos ; rangée 2 : marche ;
# rangée 3 : attaques ; rangée 4 : portraits et effets ; à gauche : grand portrait.
REG = {
    'idle1': (450, 10, 615, 356), 'idle2': (648, 10, 795, 356), 'side': (826, 10, 975, 356),
    'back': (996, 10, 1148, 356), 'idle5': (1167, 10, 1320, 356), 'idle6': (1358, 10, 1510, 356),
    'walk1': (438, 360, 592, 596), 'walk2': (636, 360, 778, 596), 'walk3': (813, 360, 961, 596),
    'walk4': (979, 360, 1135, 596), 'walk5': (1167, 360, 1314, 596), 'walk6': (1340, 360, 1530, 594),
    'cast': (396, 600, 566, 840), 'swing': (670, 600, 1018, 840),
    'meditate': (1075, 588, 1262, 862), 'aura': (1296, 596, 1530, 862),
    'head1': (415, 845, 519, 996), 'head2': (525, 850, 621, 996), 'head3': (634, 850, 733, 996), 'head4': (748, 848, 847, 996),
    'big': (2, 16, 426, 1022),
}
# Facteur de réduction (pixels de la planche par pixel du jeu) : rangée 1 calée pour que le
# corps (du cou aux pieds) ait la taille de celui de Djegui ; les rangées 2-3 sont dessinées
# plus petites sur la planche (rapport mesuré crinière -> ceinture : 0,725).
F_IDLE = 5.05
F_ROW = 5.05 * 0.725
SCALE = {'idle': F_IDLE, 'walk': F_ROW, 'act': F_ROW, 'head': 2.5, 'big': 5.75}
# Effets : (zone, facteur, rogner les pixels du personnage)
FX_REG = {
    'galaxy': ((1082, 888, 1199, 996), 3.0),
    'swirl': ((1196, 888, 1369, 998), 3.0),
    'column': ((1343, 856, 1520, 1016), 3.0),
    'ball': ((558, 640, 640, 720), 3.0),
    'crescent': ((880, 610, 1018, 830), 3.0),
}


def row_of(k):
    if k.startswith('walk'):
        return 'walk'
    if k in ('cast', 'swing', 'meditate', 'aura'):
        return 'act'
    if k.startswith('head'):
        return 'head'
    if k == 'big':
        return 'big'
    return 'idle'


def lum(c):
    return c[..., 0] * 0.3 + c[..., 1] * 0.59 + c[..., 2] * 0.11


# ------------------------------------------------------------------ palette
# Matières imposées (ombre -> clair), pour ne perdre aucune teinte clé de la planche.
SEM = {
    'k': '#050307',  # trait sombre
    'n': '#17131c', 'N': '#2c2633', 'm': '#4a4256',  # tabard noir
    'q': '#3a0418', 'r': '#5c0a26', 'R': '#82122f', 's': '#a81d42', 'S': '#c8325a',  # robe bordeaux
    'y': '#8a5a14', 'Y': '#d49c2f', 'z': '#f0c850', 'Z': '#fcef9a',  # or
    'O': '#a84410', 'o': '#f07818', 'p': '#ffb048',  # orange
    'v': '#8a7e96', 'W': '#c4b8cc', 'w': '#f4eef6', 'V': '#ffffff',  # blanc
    'b': '#0a1c78', 'B': '#1442c8', 'u': '#3a78f0', 'U': '#7ab0ff',  # ceinture bleue
    'c': '#2a78d8', 'C': '#58baf4', 'i': '#a8e0fa', 'I': '#e8faff',  # anneau cyan
    'd': '#2e1210', 'e': '#5a2a20', 'E': '#8a4a34', 'f': '#b46e50',  # peau foncée
    'h': '#4a4e74', 'H': '#7c82a8', 'j': '#aeb2cc', 'J': '#e2e2ee',  # crinière argentée
}
GROUPS = {'K': 'k', 'T': 'nNm', 'R': 'qrRsS', 'G': 'yYzZ', 'O': 'Oop', 'W': 'vWwV', 'B': 'bBuU', 'C': 'cCiI', 'E': 'deEf', 'H': 'hHjJ'}
# poids des matières fines (liserés dorés, bords blancs, anneau) pour qu'elles survivent à la réduction
BOOST = {'G': 1.7, 'W': 1.5, 'C': 1.7, 'O': 1.7, 'B': 1.2, 'E': 1.2, 'H': 1.1, 'K': 0.8, 'T': 1.0, 'R': 1.0}
# Effets (énergie bleue) : bleu nuit -> blanc, et violet de l'aura.
FXP = {
    'a': '#0a1440', 'A': '#122c8c', 'g': '#1c4cd8', 'G': '#3a7cf8', 'l': '#6ab4ff', 'L': '#a8dcff', 't': '#e0f4ff', 'T': '#ffffff',
    'x': '#3c2c9c', 'X': '#8070e8',
}
EXTRA_KEYS = 'DFKMPQ'


def hex3(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


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


# ------------------------------------------------------------------ détourage
def flood_bg(sub, bgl):
    h, w = bgl.shape
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
    return ~seen


def components(fg):
    h, w = fg.shape
    lab = np.zeros((h, w), int)
    sizes = {}
    cur = 0
    q = deque()
    for y in range(h):
        for x in np.nonzero(fg[y] & (lab[y] == 0))[0]:
            if lab[y, x]:
                continue
            cur += 1
            n = 0
            lab[y, x] = cur
            q.append((y, x))
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
    return lab, sizes


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy * dy + dx * dx > r * r:
                continue
            sh = np.zeros_like(m)
            ys = slice(max(0, dy), m.shape[0] + min(0, dy))
            yd = slice(max(0, -dy), m.shape[0] + min(0, -dy))
            xs = slice(max(0, dx), m.shape[1] + min(0, dx))
            xd = slice(max(0, -dx), m.shape[1] + min(0, -dx))
            sh[ys, xs] = m[yd, xd]
            out |= sh
    return out


def glow_mask(sub):
    """Halo d'énergie bleue / violette (aura, boule, croissant) : bleu nettement dominant."""
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    return (b - np.maximum(r, g) > 40) & ~((r < 40) & (g < 90) & (b < 140))


def figure(k):
    """Personnage seul : fond retiré, halos bleus écartés loin du corps, plus grande composante."""
    x0, y0, x1, y1 = REG[k]
    sub = A[y0:y1, x0:x1]
    fg = flood_bg(sub, np.sqrt(((sub - BG) ** 2).sum(2)) <= 9)
    if k in ('cast', 'swing', 'meditate', 'aura'):
        gl = glow_mask(sub)
        core = dilate(fg & ~gl, 3)
        fg &= ~gl | core
    lab, sizes = components(fg)
    m = lab == max(sizes, key=sizes.get)
    # ombre au sol : rien sous le pixel clair le plus bas (chaussures blanches)
    L = lum(sub.astype(float))
    bright = np.nonzero(((L > 150) & m).sum(axis=1) > 1)[0]
    m[bright.max() + 3:] = False
    ys, xs = np.nonzero(m)
    return sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1], m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def fx_region(k):
    (x0, y0, x1, y1), f = FX_REG[k]
    sub = A[y0:y1, x0:x1]
    m = np.sqrt(((sub - BG) ** 2).sum(2)) > 14
    if k in ('ball', 'crescent'):
        m &= glow_mask(sub) | (lum(sub.astype(float)) > 200)
    return sub, m, f


# ------------------------------------------------------------------ réduction
SEM_KEYS = list(SEM)
SEM_C = np.array([hex3(SEM[k]) for k in SEM_KEYS], float)
GL = list(GROUPS)
GOF = {ch: g for g, s in GROUPS.items() for ch in s}
GIDX = np.array([GL.index(GOF[k]) for k in SEM_KEYS])
TONE_L = {g: [lum(np.array(hex3(SEM[t]), float)) for t in s] for g, s in GROUPS.items()}


def reduce_figure(img, m, f):
    """Matière dominante de chaque case (liserés favorisés), puis ton de la matière d'après la
    luminance moyenne lissée : aplats nets au lieu d'un bruit de couleurs."""
    h, w = m.shape
    oh, ow = int(round(h / f)), int(round(w / f))
    lab = np.argmin(((img[:, :, None, :] - SEM_C[None, None]) ** 2).sum(3), 2)
    mat = GIDX[lab]
    L = lum(img)
    boost = np.array([BOOST[g] for g in GL])
    G = np.full((oh, ow), -1)
    T = np.zeros((oh, ow))
    for y in range(oh):
        for x in range(ow):
            ya, yb = int(y * f), max(int(y * f) + 1, int((y + 1) * f))
            xa, xb = int(x * f), max(int(x * f) + 1, int((x + 1) * f))
            cm = m[ya:yb, xa:xb]
            if cm.size == 0 or cm.mean() < 0.45:
                continue
            mm = mat[ya:yb, xa:xb][cm]
            gi = (np.bincount(mm, minlength=len(GL)) * boost).argmax()
            G[y, x] = gi
            T[y, x] = L[ya:yb, xa:xb][cm][mm == gi].mean()
    # matière isolée (une seule case) : prend la matière majoritaire autour
    G2 = G.copy()
    for y in range(oh):
        for x in range(ow):
            if G[y, x] < 0:
                continue
            nb = [G[yy, xx] for yy in range(max(0, y - 1), min(oh, y + 2)) for xx in range(max(0, x - 1), min(ow, x + 2)) if G[yy, xx] >= 0]
            if sum(1 for v in nb if v == G[y, x]) <= 1:
                vals, c = np.unique(nb, return_counts=True)
                G2[y, x] = vals[c.argmax()]
    G = G2
    g = [['.'] * ow for _ in range(oh)]
    for y in range(oh):
        for x in range(ow):
            if G[y, x] < 0:
                continue
            grp = GL[G[y, x]]
            v = [T[yy, xx] for yy in range(max(0, y - 1), min(oh, y + 2)) for xx in range(max(0, x - 1), min(ow, x + 2)) if G[yy, xx] == G[y, x] and T[yy, xx] > 0]
            t = 0.6 * T[y, x] + 0.4 * (np.mean(v) if v else T[y, x])
            g[y][x] = GROUPS[grp][int(np.argmin([abs(t - q) for q in TONE_L[grp]]))]
    # retire le contour noir extérieur (redessiné proprement par le jeu)
    rm = [(y, x) for y in range(oh) for x in range(ow) if g[y][x] == 'k' and any(
        not (0 <= y + dy < oh and 0 <= x + dx < ow) or g[y + dy][x + dx] == '.' for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for y, x in rm:
        g[y][x] = '.'
    return g


FX_RAMP = 'aAgGlLtT'
FX_L = [lum(np.array(hex3(FXP[c]), float)) for c in FX_RAMP]


def reduce_fx(img, m, f):
    """Effet lumineux : luminance moyenne de chaque case -> rampe bleu nuit -> blanc
    (violet pour les cases nettement violettes)."""
    h, w = m.shape
    oh, ow = int(round(h / f)), int(round(w / f))
    g = [['.'] * ow for _ in range(oh)]
    for y in range(oh):
        for x in range(ow):
            ya, yb = int(y * f), max(int(y * f) + 1, int((y + 1) * f))
            xa, xb = int(x * f), max(int(x * f) + 1, int((x + 1) * f))
            cm = m[ya:yb, xa:xb]
            if cm.size == 0 or cm.mean() < 0.3:
                continue
            px = img[ya:yb, xa:xb][cm]
            c = px.mean(0)
            L = lum(c)
            if L < 22:
                continue
            if c[0] > c[1] + 25 and c[2] > 120:
                g[y][x] = 'X' if L > 90 else 'x'
            else:
                g[y][x] = FX_RAMP[int(np.argmin([abs(L - q) for q in FX_L]))]
    return g


# ------------------------------------------------------------------ nettoyage
LIGHTS = set('wVWzZYjJIi')


def auto_clean(g):
    """Ombre au sol : supprime les pixels sombres sous le pixel clair le plus bas de chaque colonne."""
    h, w = len(g), len(g[0])
    lowest = max((y for y in range(h) for x in range(w) if g[y][x] in LIGHTS), default=h - 1)
    for x in range(w):
        col = [y for y in range(h) if g[y][x] in LIGHTS]
        cut = (max(col) + 1) if col else None
        for y in range(h):
            if g[y][x] == '.':
                continue
            if y > lowest + 1 or (cut is not None and y > cut and g[y][x] in 'knNq' and y > h - 5):
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
# ('dark', x0, y0, x1, y1) efface les pixels sombres du rectangle ; ('all', ...) efface tout.
MANUAL = {}


def manual(g, ops):
    for op, x0, y0, x1, y1 in ops:
        for y in range(y0, min(y1, len(g) - 1) + 1):
            for x in range(x0, min(x1, len(g[0]) - 1) + 1):
                c = g[y][x]
                if c == '.':
                    continue
                if op == 'all' or c in 'knNqd':
                    g[y][x] = '.'


# ------------------------------------------------------------------ pièces du squelette
# Relevées sur idle1 (3/4 tourné vers la droite, ~5 pixels de la planche par pixel) puis
# nettoyées à la main : contours nets, 2-3 tons par matière, détails gardés (anneau, liserés
# dorés, losanges, ceinture enroulée). Lettres = palette SEM ci-dessus.
# Repère « fiche » (celui de spec.joints) : hanche (16, 44), cou (16, 19), sol en y = 65.
# Torse : x 2..30 et y 17..57 de la fiche (la robe descend sous la hanche, jusqu'aux mollets).
TORSO = [
    '...........CCCCCCC...........',
    '.........CinnneeeniC.........',
    '........CinrRRsRRrnnC........',
    '.......CinrRRsSsRRrniC.......',
    '...wwnnCinzYrRsRRrYziCWw.....',
    '....WwnNCinzYYYYYzniCnWw.....',
    '....rWwnNCiiNnnnNiiCnWw......',
    '....rrWwnnNCiIiiiCNnWw.......',
    '.....rrWwnnNnzooOnYnWw.......',
    '.....rRrWwnNnzopOnYWw........',
    '......rRrWwNnzopOnYw.........',
    '......rRRrWwnzooOnYw.........',
    '.......rRRrWwzooOnY..........',
    '.......rRrBuuuUuuuuBb........',
    '.......rRrbBBBBBBBBBb........',
    '.......rRrBuuuuuUuuBb........',
    '.......rrrbbBBBBBBBbb........',
    '.......rRRrrWzNnnnnYWnn......',
    '.......rRRrWwzNnnnnYwWn......',
    '.......rRrWwnzNnnnnYnwW......',
    '.......sRrWwnzNnnnnYnnwW.....',
    '......rsRWwnnzNnwnnYnnwWr....',
    '......rsRWwnnzNwVwnYnnnwW....',
    '......rsWwnnnzNnwnnYnnnwWr...',
    '.....rRsWwnnnzNnnnnYnnnnwWr..',
    '.....rRWwrnnnzNnwnnYnnnnwWr..',
    '.....rRWwrqnnzNwVwnYnnnnnwr..',
    '....rRWwRrqnnzNnwnnYnnnnnWr..',
    '....rRWwRrqqnzNnnnnYqnnnnWrr.',
    '....rsRWRrrqqzNnOnnYqqnnrrRr.',
    '....rsRRRsrrqzNOoOnYqqqrrRRr.',
    '....rsRRsRrrqzNopoOYyqqrRrRr.',
    '....rsRsRRrrqzNnOoOnYqqrRrRr.',
    '...rRsRsRrrrqzNnOnnYqqrRrRrr.',
    '...rRsRsRsrrqzNnnnnYqqrRrRrr.',
    '...rRsRsRsRrqrzNnnYyqrrRrRrr.',
    '...rRsRsRsRrrqrzNnYqrrRrRRrr.',
    '...rRsRsRsRRrrqrzYyqrRrRrRrr.',
    '...qrRsRsRsRRrrqrYqrRRrRrRrq.',
    '....qrRqRrRsRrrqrrRRrRrqRrq..',
    '.....qr..qr.q......q..rq.....',
]
TORSO_X, TORSO_Y = 2, 17
# Tête avec la crinière : x 9..23 et y 0..19 de la fiche.
HEAD = [
    '.......jJ......',
    '......HjJj.....',
    '.....hjJJjH....',
    '....hHjJjJjH...',
    '...hHjjJjJjjH..',
    '..hhHjJjjJjjH..',
    '..hHjjJjjJjJH..',
    '.hhHjjjJjjJjjH.',
    '.hHjjHjJjjjJjH.',
    '..hHjHjjJjjjJh.',
    '..hHjHHjjHjjHh.',
    '..hHHjHHHhHHhe.',
    '..hHjHHheEEfff.',
    '..hHHHheEddEdd.',
    '...hHeEEwkEfk..',
    '...heEeEEEEffE.',
    '....eEEEEEEeEe.',
    '.....eEEEEedde.',
    '......eEEEEEe..',
    '.......eeEe....',
]
HEAD_X, HEAD_Y = 9, 0
# Membres (dessinés pendants : pivot en haut, articulation suivante en bas).
LIMBS = {
    # manche large (biceps), puis avant-bras évasé jusqu'au revers de la manche
    'armUpF': {'pivot': (2, 0), 'end': (2, 7), 't': ['.rRr.', 'rRsRr', 'rRsRr', 'rRsRq', 'rRsRq', 'rRsRq', 'rRRrq', 'rRRrq']},
    'armLoF': {'pivot': (3, 0), 'end': (3, 6), 't': ['.rRsRq', '.rRsRq', 'rRsRRq', 'rRsRrq', 'rsRRrq', 'sRRrrq', 'qqqqqq']},
    'fist': {'pivot': (1, 1), 'end': (1, 3), 't': ['.eEf', 'eEEf', 'deEE', '.de.']},
    # pantalon bouffant
    'thighF': {'pivot': (3, 0), 'end': (3, 7), 't': ['qrRRrq', 'qrRsRq', 'qrRsRq', 'qrRsRq', 'qrRsRq', 'qrRsRq', 'qrRsRq', 'qrRsRq']},
    'shinF': {'pivot': (3, 0), 'end': (3, 8), 't': ['qrRsRq', 'qrRsRq', 'qrRsRq', 'qrRsRq', 'qrRsRq', 'qrRRrq', '.qrRq.', '.qrrq.', '.qqq..']},
    # chaussure blanche, bande dorée à la cheville
    'shoe': {'pivot': (2, 0), 'end': (6, 5), 't': ['.qrq....', '.yzY....', '.WwwW...', '.WwwwW..', 'vWwwwwW.', 'vWWwwwwW', 'vvvvvvvv']},
}
# Bâton (pointe vers le haut) : sphère noire dans l'anneau cyan, coupe dorée, tige bleue et or.
STAFF = {
    'grip': (3, 24),
    't': [
        '...i...',
        '..ikC..',
        '.ikkkC.',
        '.iNmnC.',
        'iNVmnnC',
        'iNmnnkC',
        'inNnnkC',
        '.inkkC.',
        '.ckkkc.',
        '..ckc..',
        '...c...',
        '.yzZzY.',
        '..zZY..',
        '..zZY..',
        '..zYy..',
        '...zy..',
        '...zy..',
    ] + ['...uB..'] * 21 + ['...zY..'] * 11 + ['...uB..'] * 5 + ['...zY..', '...zY..', '...Yy..'],
}
# Articulations (repère fiche) et écart des hanches.
JOINTS = {'hip': [16, 44], 'neck': [16, 19], 'shoulderF': [22, 24], 'shoulderB': [8, 24]}
HIP_F, HIP_B = 3, -3


def build_parts():
    parts = {}
    tx, ty = TORSO_X, TORSO_Y
    parts['torso'] = {'pivot': [JOINTS['hip'][0] - tx, JOINTS['hip'][1] - ty], 'end': [JOINTS['neck'][0] - tx, JOINTS['neck'][1] - ty], 't': TORSO}
    parts['head'] = {'pivot': [JOINTS['neck'][0] - HEAD_X, JOINTS['neck'][1] - HEAD_Y], 'end': [JOINTS['neck'][0] - HEAD_X, JOINTS['neck'][1] - HEAD_Y], 't': HEAD}
    for name, p in LIMBS.items():
        parts[name] = {'pivot': list(p['pivot']), 'end': list(p['end']), 't': p['t']}
    parts['armUpB'] = parts['armUpF']
    parts['armLoB'] = parts['armLoF']
    parts['thighB'] = parts['thighF']
    parts['shinB'] = parts['shinF']
    for name, p in parts.items():
        w = max(len(r) for r in p['t'])
        p['t'] = [r + '.' * (w - len(r)) for r in p['t']]
    return parts


def stamp(g, t, x0, y0):
    for j, row in enumerate(t):
        for i, ch in enumerate(row):
            if ch != '.' and 0 <= y0 + j < len(g) and 0 <= x0 + i < len(g[0]):
                g[y0 + j][x0 + i] = ch


def stamp_rot(g, t, ax, ay, px, py, ang):
    """Comme ModRig.stampRot : le point (ax, ay) de `t` tombe en (px, py), tourné de `ang`."""
    import math
    th, tw = len(t), len(t[0])
    c, s = math.cos(ang), math.sin(ang)
    rad = math.ceil(math.hypot(max(ax, tw - ax), max(ay, th - ay))) + 1
    for y in range(math.floor(py - rad), math.floor(py + rad) + 1):
        for x in range(math.floor(px - rad), math.floor(px + rad) + 1):
            if not (0 <= y < len(g) and 0 <= x < len(g[0])):
                continue
            dx, dy = x + 0.5 - px, y + 0.5 - py
            tx = math.floor(dx * c + dy * s + ax)
            ty = math.floor(-dx * s + dy * c + ay)
            if 0 <= ty < th and 0 <= tx < tw and t[ty][tx] != '.':
                g[y][x] = t[ty][tx]


def rest_frame(parts):
    """Pose de repos propre (relevé nettoyé d'idle1) : bras arrière pendant, main avant sur le
    bâton posé au sol. Même ordre de dessin que le jeu (bras avant derrière le torse)."""
    import math
    W, H = 36, 70
    g = [['.'] * W for _ in range(H)]
    hip = JOINTS['hip']
    th, sh_, shoe = parts['thighF'], parts['shinF'], parts['shoe']
    tl = th['end'][1] - th['pivot'][1]
    sl = sh_['end'][1] - sh_['pivot'][1]

    def arm(sh, a, e, staff):
        up, lo, fist = parts['armUpF'], parts['armLoF'], parts['fist']
        ul = up['end'][1] - up['pivot'][1]
        ll = lo['end'][1] - lo['pivot'][1]
        stamp_rot(g, up['t'], up['pivot'][0] + 0.5, up['pivot'][1] + 0.5, sh[0], sh[1], -a)
        ex, ey = sh[0] + math.sin(a) * ul, sh[1] + math.cos(a) * ul
        fa = a + e
        stamp_rot(g, lo['t'], lo['pivot'][0] + 0.5, lo['pivot'][1] + 0.5, ex, ey, -fa)
        hx, hy = ex + math.sin(fa) * (ll + 0.5), ey + math.cos(fa) * (ll + 0.5)
        if staff:
            stamp_rot(g, STAFF['t'], STAFF['grip'][0] + 0.5, STAFF['grip'][1] + 0.5, hx, hy, 0)
        stamp_rot(g, fist['t'], fist['pivot'][0] + 0.5, fist['pivot'][1] + 0.5, hx, hy, -fa)

    arm(JOINTS['shoulderB'], 0.12, -0.2, False)
    for dx in (HIP_B, HIP_F):
        x = hip[0] + dx
        stamp(g, th['t'], x - th['pivot'][0], hip[1])
        stamp(g, sh_['t'], x - sh_['pivot'][0], hip[1] + tl)
        stamp(g, shoe['t'], x - shoe['pivot'][0], hip[1] + tl + sl - 1)
    arm(JOINTS['shoulderF'], 0.25, 0.75, True)
    stamp(g, TORSO, TORSO_X, TORSO_Y)
    stamp(g, HEAD, HEAD_X, HEAD_Y)
    return crop(g)


# ------------------------------------------------------------------ main
def main():
    raw = {}
    for k in REG:
        img, m = figure(k)
        raw[k] = reduce_figure(img.astype(float), m, SCALE[row_of(k)])
    # couleurs hors matières (k-means sur la planche) : ajoutées si elles sont loin de toutes
    pix = np.concatenate([figure(k)[0][figure(k)[1]] for k in ('idle1', 'walk1', 'cast')]).astype(float)
    pix = pix[np.random.default_rng(0).choice(len(pix), min(len(pix), 20000), replace=False)]
    known = np.array([hex3(c) for c in list(SEM.values()) + list(FXP.values())], float)
    extras = [c for c in kmeans(pix, 16) if np.sqrt(((known - c) ** 2).sum(1)).min() > 48][:len(EXTRA_KEYS)]
    pal = dict(SEM)
    pal.update(FXP)
    for key, c in zip(EXTRA_KEYS, extras):
        pal[key] = '#%02x%02x%02x' % tuple(int(round(v)) for v in c)
    frames = {}
    parts = build_parts()
    frames['idle'] = [''.join(r) for r in rest_frame(parts)]
    for k, g in raw.items():
        if k not in ('big', 'meditate', 'aura') and not k.startswith('head'):
            g = auto_clean(g)
        manual(g, MANUAL.get(k, []))
        small_components(g)
        g = crop(g)
        frames[k] = [''.join(r) for r in g]
    fx = {}
    for k in FX_REG:
        sub, m, f = fx_region(k)
        g = reduce_fx(sub.astype(float), m, f)
        small_components(g, 3)
        fx[k] = [''.join(r) for r in crop(g)]
    # centre du torse (pixels clairs de la moitié haute) : sert à aligner les images
    meta = {}
    for k, rows in frames.items():
        h = len(rows)
        pts = [(x, y) for y in range(int(h * 0.2), int(h * 0.6)) for x, c in enumerate(rows[y]) if c in LIGHTS]
        cx = round(sum(p[0] for p in pts) / max(1, len(pts)))
        meta[k] = {'cx': cx, 'w': len(rows[0]), 'h': h}
    weapon = {'grip': list(STAFF['grip']), 't': STAFF['t']}
    lines = [
        "'use strict';",
        '// Tout Puissant — images relevées et nettoyées sur la planche de référence (art/reference/tout_puissant_sheet.png).',
        '// Fichier généré par tools/art/build_toutpuissant.py : ne pas éditer à la main.',
        '(function () {',
        '  GS.TOUTPUISSANT_ART = {',
        '    pal: ' + json.dumps(pal) + ',',
        '    meta: ' + json.dumps(meta) + ',',
        '    joints: ' + json.dumps(JOINTS) + ',',
        '    hipF: %d,' % HIP_F,
        '    hipB: %d,' % HIP_B,
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
    lines += ['    },', f'    weapon: {{ grip: {json.dumps(weapon["grip"])}, t: [']
    lines += [f"      '{r}'," for r in weapon['t']]
    lines += ['    ] },', '    fx: {']
    for k, rows in fx.items():
        lines.append(f'      {k}: [')
        lines += [f"        '{r}'," for r in rows]
        lines.append('      ],')
    lines += ['    },', '  };', '})();']
    if os.environ.get('DUMP'):
        json.dump({'pal': pal, 'frames': frames, 'fx': fx}, open(os.environ['DUMP'], 'w'))
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('écrit', OUT, {k: (v['w'], v['h']) for k, v in meta.items()}, {k: (len(v[0]), len(v)) for k, v in fx.items()})


main()
