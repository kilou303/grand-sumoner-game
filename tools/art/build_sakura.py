#!/usr/bin/env python3
"""Construit les sprites de Sakura à partir de son image de référence.

    python3 -I tools/art/build_sakura.py [art/reference/sakura_sprite.jpg]

Même relevé qu'Azura (voir tools/art/refsprite.py). Écrit src/gfx/sakura_art.js.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refsprite import NAMES, ROOT, R, build  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'sakura_sprite.jpg')

# ------------------------------------------------------------------ retouches
# Visage refait à la main (3/4 vers la droite) : la réduction efface les yeux.
# f = mèche, a = contour, w = blanc de l'œil, i = iris vert, d = iris sombre,
# u = peau claire, s = peau, r = peau ombrée, p = bouche.
FACE = {
    7: (10, 'faauuaa'),
    8: (10, 'fwduuwd'),
    9: (10, 'ruiuuui'),
    10: (10, 'ruuuus'),
    11: (11, 'ruups'),
}
# Poing (repris pour les deux mains) : la réduction n'en garde que la manchette et le contour.
FIST = {
    31: (20, 'uus'),
    32: (20, 'uus'),
    33: (20, 'rus'),
    34: (20, 'uss'),
    35: (20, 'rs'),
}
FACE_COL = {'f': '#972e5e', 'a': '#020203', 'w': '#e9f0f6', 'i': '#5c9a7c', 'd': '#2c5444',
            'u': '#e4ba92', 's': '#c99a7c', 'r': '#c08872', 'p': '#a0605a'}

# Fond blanc resté entre le bras arrière et le torse (gardé car la chemise est blanche).
ERASE = {22: R((7, 7)), 23: R((7, 7)), 24: R((6, 7)), 25: R((6, 7)), 26: R((6, 7)), 27: R((6, 6)), 28: R((6, 6))}

# ------------------------------------------------------------------ pièces du squelette
# h tête, t torse (chemise et jupe), u/l bras arrière (manche, poignet), U/L bras avant,
# F poing, a/s jambe arrière (cuisse, chaussette), A/S jambe avant, O pied. Pas de cheveux
# derrière le torse (coupe courte). Le poing et le pied arrière reprennent ceux de l'avant.
CUT = [
    ('u', {15: R((5, 7)), 16: R((4, 7)), 17: R((4, 7)), **{y: R((3, 6)) for y in range(18, 22)},
           22: R((2, 5)), 23: R((2, 5))}),
    ('l', {**{y: R((1, 5)) for y in range(24, 29)}, 29: R((1, 4)), 30: R((1, 4))}),
    ('h', {**{y: R((0, 22)) for y in range(0, 13)}, 13: R((8, 14))}),
    ('U', {15: R((16, 17)), **{y: R((16, 18)) for y in range(16, 24)}}),
    ('L', {24: R((16, 18)), 25: R((16, 19)), 26: R((17, 19)), 27: R((17, 20)), 28: R((18, 20)), 29: R((18, 20)),
           30: R((19, 21))}),
    ('F', {y: R((20, 22)) for y in range(31, 36)}),
    ('t', {14: R((5, 16)), **{y: R((2, 21)) for y in range(15, 31)}, **{y: R((5, 19)) for y in range(31, 36)},
           **{y: R((3, 21)) for y in range(36, 39)}}),
    ('a', {y: R((2, 10)) for y in range(39, 47)}),
    ('A', {y: R((13, 20)) for y in range(39, 47)}),
    ('s', {y: R((0, 8)) for y in range(47, 56)}),
    ('S', {y: R((13, 20)) for y in range(47, 55)}),
    ('O', {y: R((13, 22)) for y in range(55, 59)}),
]
# Articulations (coordonnées dans l'image réduite).
JOINTS = {'hip': [11, 38], 'neck': [12, 14], 'shoulderF': [17, 17], 'shoulderB': [5, 16]}
PIV = {
    'head': ((12, 14), (12, 14)),
    'torso': ((11, 38), (12, 14)),
    'armUpF': ((17, 17), (17, 24)), 'armLoF': ((17, 24), (20, 31)),
    'armUpB': ((5, 16), (4, 24)), 'armLoB': ((4, 24), (3, 31)),
    'fist': ((21, 31), (21, 35)),
    'thighF': ((16, 38), (17, 46)), 'shinF': ((17, 46), (17, 55)),
    'thighB': ((7, 38), (5, 46)), 'shinB': ((5, 46), (2, 55)),
    'shoe': ((17, 54), (20, 57)),
}

# ------------------------------------------------------------------ matières
# Clés de la palette par matière, pour chaque groupe de pièces (tête, corps, jambes) :
# le créateur de perso les recolore et mélange les modèles (voir GS.Variants.buildRef).
MATERIALS = {
    'head': {'hair': 'ILPT', 'skin': 'SNK', 'eyes': 'WX'},
    'top': {'jacket': 'MOQRUV', 'inner': 'BDFH', 'skin': 'SNK'},
    'legs': {'skin': 'SNK', 'pants': 'CE', 'shoes': 'G'},
}


build({
    'materials': MATERIALS,
    'name': 'Sakura', 'var': 'SAKURA_ART', 'src': SRC, 'out': os.path.join(ROOT, 'src', 'gfx', 'sakura_art.js'),
    'pitch': 9.65, 'off': (8.5, 9.5), 'floor': 88,
    # chemise blanche : pas de trous de fond à retirer à l'intérieur du personnage
    'hole_min': 256,
    'face': {**FACE, **FIST}, 'face_col': FACE_COL, 'erase': ERASE,
    'cut': CUT, 'joints': JOINTS, 'piv': PIV, 'names': {k: v for k, v in NAMES.items() if v != 'hairBack'},
})
