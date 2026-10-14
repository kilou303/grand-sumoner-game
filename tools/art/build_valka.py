#!/usr/bin/env python3
"""Construit les sprites de Valka à partir de son image de référence.

    python3 -I tools/art/build_valka.py [art/reference/valka_sprite.jpg]

Même relevé qu'Azura (voir tools/art/refsprite.py), sur fond noir. Écrit src/gfx/valka_art.js.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refsprite import NAMES, ROOT, R, build  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'valka_sprite.jpg')

# ------------------------------------------------------------------ retouches
# Visage de trois quarts vers la droite (un seul œil visible sous la frange) : la réduction
# efface l'œil. a = cils, w = blanc, i = iris bleu, d = iris sombre, u = peau, s = peau
# ombrée, p = bouche.
FACE = {
    8: (20, 'aaa'),
    9: (20, 'wids'),
    10: (20, 'uuu'),
    12: (23, 'p'),
}
FACE_COL = {'a': '#2a1408', 'w': '#fefefc', 'i': '#3a8ad0', 'd': '#1a3a6a', 'u': '#f69f85', 's': '#da7965',
            'p': '#b0504a'}

# ------------------------------------------------------------------ pièces du squelette
# Vue de l'autre trois-quarts : le bras arrière (gauche de l'image, poing à la hanche) passe
# devant le torse, le bras avant (tendu en garde) part de derrière. Au repos, les deux bras
# gardent leur pose de garde (pocketB, pocketF) ; ils ne s'articulent que pour frapper.
# h tête, t torse (débardeur, épaulières, jupette à pointes), u/l/f bras arrière (épaulière et
# biceps avec le creux de l'aisselle, sinon un éclat noir reste sur le torse quand le bras
# part frapper, avant-bras, poing), L/F avant-bras et poing avant (le biceps avant, caché derrière
# le torse, reprend celui de l'arrière), a/s jambe arrière, A/S jambe avant, O pied.
CUT = [
    ('u', {12: R((7, 14)), 13: R((7, 14)), **{y: R((7, 15)) for y in range(14, 17)}, 17: R((7, 14)), 18: R((6, 13)),
           19: R((5, 15)), 20: R((4, 15)), 21: R((3, 14)), 22: R((2, 11)), 23: R((2, 8))}),
    ('l', {24: R((2, 8)), 25: R((2, 8)), 26: R((3, 8)), 27: R((4, 8)), 28: R((6, 8))}),
    ('f', {y: R((9, 13)) for y in range(23, 30)}),
    ('h', {**{y: R((0, 36)) for y in range(0, 12)}, 12: R((15, 26)), 13: R((17, 24))}),
    ('L', {y: R((24, 30)) for y in range(25, 30)}),
    ('F', {y: R((31, 36)) for y in range(23, 31)}),
    ('t', {y: R((0, 36)) for y in range(12, 38)}),
    ('a', {y: R((4, 17)) for y in range(38, 47)}),
    ('A', {y: R((17, 31)) for y in range(38, 47)}),
    ('s', {y: R((0, 13)) for y in range(47, 59)}),
    ('S', {y: R((20, 33)) for y in range(47, 59)}),
    ('O', {y: R((24, 36)) for y in range(59, 63)}),
]
# Articulations (coordonnées dans l'image réduite).
JOINTS = {'hip': [18, 37], 'neck': [20, 14], 'shoulderF': [24, 16], 'shoulderB': [11, 16]}
PIV = {
    'head': ((20, 14), (20, 14)),
    'torso': ((18, 37), (20, 14)),
    'pocketB': ((18, 37), (20, 14)), 'pocketF': ((18, 37), (20, 14)),
    'armUpB': ((11, 16), (4, 24)), 'armLoB': ((4, 24), (10, 26)),
    'armLoF': ((23, 27), (31, 27)),
    'fist': ((31, 27), (35, 27)),
    'thighF': ((22, 37), (26, 46)), 'shinF': ((26, 46), (29, 58)),
    'thighB': ((13, 37), (9, 46)), 'shinB': ((9, 46), (3, 58)),
    'shoe': ((29, 57), (34, 61)),
}

build({
    'name': 'Valka', 'var': 'VALKA_ART', 'src': SRC, 'out': os.path.join(ROOT, 'src', 'gfx', 'valka_art.js'),
    # image agrandie un peu plus en hauteur qu'en largeur, fond noir, pas de sol
    'pitch': (9.98, 10.14), 'off': (5.75, 7.25), 'bg': 'black',
    # plus petite dans son image que les autres : réduite moins fort pour la même taille en jeu
    'scale': 1.32,
    'face': FACE, 'face_col': FACE_COL,
    'cut': CUT, 'joints': JOINTS, 'piv': PIV,
    'names': {k: v for k, v in NAMES.items() if v not in ('hairBack', 'armUpF')},
    'combine': {'pocketB': ['u', 'l', 'f'], 'pocketF': ['L', 'F']},
    'alias': {'armUpF': 'armUpB'},
    # poing de profil (tendu vers la droite) : ramené dans l'axe d'un avant-bras qui pend
    'rotate': {'fist': 1},
})
