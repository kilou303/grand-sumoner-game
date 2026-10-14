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
FACE_COL = {'k': '#2a2c36', 'a': '#020202', 'w': '#f8f7f2', 'i': '#549f9d', 'd': '#1e3a3c',
            'u': '#e9be97', 's': '#d29b81', 'r': '#bf8875', 'p': '#a8505a'}

# ------------------------------------------------------------------ pièces du squelette
# h tête, t torse (armure, avec les longs cheveux qui tombent dans le dos : ils suivent le
# buste), u/l bras arrière (épaulière, gantelet), U/L bras avant, F poing, a/s jambe arrière
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
    ('t', {10: R((0, 7)), **{y: R((0, 26)) for y in range(11, 31)}, **{y: R((10, 21)) for y in range(31, 35)},
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
    'head': ((16, 13), (16, 13)),
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
    'face': FACE, 'face_col': FACE_COL,
    'cut': CUT, 'joints': JOINTS, 'piv': PIV, 'names': {k: v for k, v in NAMES.items() if v != 'hairBack'},
})
