#!/usr/bin/env python3
"""Construit les sprites de Vesper à partir de son image de référence.

    python3 -I tools/art/build_vesper.py [art/reference/vesper_sprite.jpg]

Même relevé qu'Azura (voir tools/art/refsprite.py). Écrit src/gfx/vesper_art.js.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refsprite import NAMES, ROOT, R, build  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'vesper_sprite.jpg')

# ------------------------------------------------------------------ retouches
# Visage refait à la main (3/4 vers la droite) : la réduction efface les yeux.
# k = mèche, a = contour, w = blanc de l'œil, i = iris turquoise, d = iris sombre,
# u = peau claire, s = peau, r = peau ombrée, p = lèvres.
FACE = {
    5: (14, 'uuuuu'),
    6: (13, 'raauaa'),
    7: (13, 'rwduwd'),
    8: (13, 'ruiuui'),
    9: (13, 'ruuuus'),
    10: (14, 'ruups'),
    11: (14, 'krsr'),
}
# Cheveux peints à la main dans le dégradé noir bleuté (1 = le plus sombre ... 5 = clair,
# 6 = brillance, ' ' = vide) : reflet sur le crâne, puis longues mèches qui tombent dans le
# dos en s'écartant du bras arrière.
SHINE = {
    2: (12, '4565'),
    3: (16, '454'),
}
LOCKS = {
    10: (7, '2343'),
    11: (5, '234632'),
    12: (4, '2345421'),
    13: (2, '23453'),
    14: (1, '23452'),
    15: (0, '2 345'),
    16: (0, '2 345'),
    17: (0, ' 2453'),
    18: (0, ' 3452'),
    19: (0, '26542'),
    20: (0, '2 453'),
    21: (0, ' 354'),
    22: (0, ' 453'),
    23: (0, '2543'),
    24: (0, '354'),
    25: (0, '453'),
    26: (0, '452'),
    27: (0, '352'),
    28: (0, '342'),
    29: (0, '231'),
    30: (0, '12 '),
}
FACE_COL = {'1': '#0d0e18', '2': '#191c2c', '3': '#262b42', '4': '#353d5c', '5': '#4b577e', '6': '#7f8fc0',
            'k': '#2a2c36', 'a': '#020202', 'w': '#f8f7f2', 'i': '#549f9d', 'd': '#1e3a3c',
            'u': '#e9be97', 's': '#d29b81', 'r': '#bf8875', 'p': '#a8505a'}

# ------------------------------------------------------------------ cheveux
# Longs cheveux derrière le dos (à gauche du bras arrière, mèches à droite du bras avant).
HAIR_BACK = {10: R((0, 7)), 11: R((0, 10)), 12: R((0, 10)), 13: R((0, 6)), 14: R((0, 5)),
             **{y: R((0, 4)) for y in range(15, 21)}, **{y: R((0, 3), (24, 26)) for y in range(21, 24)},
             **{y: R((0, 2), (25, 26)) for y in range(24, 31)}}
# Noir bleuté (distinct du gris de l'armure) : dessus de la tête, et mèches à droite du bras
# avant où même les traits noirs passent dans le dégradé (gardées au bord, voir keep_edge).
HAIR_HEAD = {**{y: R((0, 26)) for y in range(0, 4)}, 4: R((9, 13), (18, 22)), 5: R((9, 13), (19, 22)),
             **{y: R((9, 12), (19, 22)) for y in range(6, 8)}, 8: R((9, 12), (20, 22)), 9: R((8, 12), (20, 22)),
             10: R((11, 13), (19, 22)), 11: R((18, 20))}
HAIR_RIGHT = {**{y: R((24, 26)) for y in range(21, 24)}, **{y: R((25, 26)) for y in range(24, 31)}}
HAIR_RAMP = ['#0d0e18', '#191c2c', '#262b42', '#353d5c', '#4b577e']

# ------------------------------------------------------------------ pièces du squelette
# h tête, q longs cheveux (derrière le torse, suivent la tête), t torse (armure), u/l bras arrière (épaulière, gantelet), U/L bras avant, F poing, a/s jambe arrière
# (cuisse, botte), A/S jambe avant, O pied. Le poing et le pied arrière reprennent ceux de
# l'avant.
CUT = [
    ('u', {13: R((7, 10)), 14: R((6, 10)), **{y: R((5, 10)) for y in range(15, 20)}, 20: R((5, 9)), 21: R((4, 9)),
           22: R((4, 8)), 23: R((4, 8))}),
    ('l', {y: R((3, 7)) for y in range(24, 31)}),
    ('h', {**{y: R((8, 22)) for y in range(0, 11)}, 11: R((11, 21)), 12: R((12, 19))}),
    ('U', {18: R((20, 22)), **{y: R((20, 23)) for y in range(19, 25)}}),
    ('L', {**{y: R((21, 23)) for y in range(25, 28)}, **{y: R((22, 24)) for y in range(28, 31)}}),
    ('F', {y: R((22, 25)) for y in range(31, 35)}),
    ('q', HAIR_BACK),
    ('t', {**{y: R((0, 26)) for y in range(11, 31)}, **{y: R((10, 21)) for y in range(31, 35)},
           **{y: R((7, 23)) for y in range(35, 38)}}),
    ('a', {38: R((3, 15)), **{y: R((3, 14)) for y in range(39, 47)}}),
    ('A', {y: R((16, 24)) for y in range(38, 47)}),
    ('s', {y: R((1, 11)) for y in range(47, 55)}),
    ('S', {y: R((16, 23)) for y in range(47, 54)}),
    ('O', {y: R((16, 26)) for y in range(54, 58)}),
]
# Articulations (coordonnées dans l'image réduite).
JOINTS = {'hip': [15, 37], 'neck': [16, 13], 'shoulderF': [21, 18], 'shoulderB': [8, 15]}
PIV = {
    'head': ((16, 13), (16, 13)), 'hairBack': ((16, 13), (16, 13)),
    'torso': ((15, 37), (16, 13)),
    'armUpF': ((21, 18), (22, 25)), 'armLoF': ((22, 25), (23, 31)),
    'armUpB': ((8, 15), (5, 23)), 'armLoB': ((5, 23), (6, 31)),
    'fist': ((23, 31), (24, 34)),
    'thighF': ((19, 37), (20, 46)), 'shinF': ((20, 46), (20, 54)),
    'thighB': ((10, 37), (8, 46)), 'shinB': ((8, 46), (6, 54)),
    'shoe': ((20, 53), (23, 56)),
}

build({
    'name': 'Vesper', 'var': 'VESPER_ART', 'src': SRC, 'out': os.path.join(ROOT, 'src', 'gfx', 'vesper_art.js'),
    'pitch': 9.65, 'off': (8.5, 9.5), 'floor': 88,
    # tenue presque noire : seul le noir pur est du contour, pas de surpoids des traits
    # sombres, teintes sombres éclaircies pour rester lisible sur les fonds du jeu
    'outline_lum': 10, 'dark_bias': 1.0, 'lift': 2.0, 'hole_size': 0,
    'face': {**FACE, **SHINE, **LOCKS}, 'face_col': FACE_COL, 'keep_edge': HAIR_RIGHT,
    'recolor': [{'mask': HAIR_HEAD, 'ramp': HAIR_RAMP}, {'mask': HAIR_RIGHT, 'ramp': HAIR_RAMP, 'min_lum': 0}],
    'cut': CUT, 'joints': JOINTS, 'piv': PIV, 'names': NAMES,
})
