#!/usr/bin/env python3
"""Construit les sprites d'Azura à partir de son image de référence.

    python3 -I tools/art/build_azura.py [art/reference/azura_sprite.jpg]

L'image est du pixel art agrandi (~9,65 px par pixel) : voir tools/art/refsprite.py pour
le relevé (grille d'origine, détourage, réduction, palette, découpe). Écrit src/gfx/azura_art.js.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refsprite import ROOT, R, build  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'azura_sprite.jpg')

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
# h tête, q queue de cheval (derrière le torse), t torse (avec la tunique), u/l bras arrière
# (épaulière, avant-bras + brassard), U/L bras avant, F poing, a/s jambe arrière (pantalon,
# botte), A/S jambe avant, O pied.
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


# ------------------------------------------------------------------ matières
# Clés de la palette par matière, pour chaque groupe de pièces (tête, corps, jambes) :
# le créateur de perso les recolore et mélange les modèles (voir GS.Variants.buildRef).
MATERIALS = {
    'head': {'hair': 'DFKO', 'skin': 'PRSU'},
    'top': {'jacket': 'BH', 'inner': 'CGJM', 'metal': 'NQT', 'skin': 'PRSU', 'pants': 'EIL', 'hair': 'DFK'},
    'legs': {'pants': 'EIL', 'shoes': 'CGJM', 'metal': 'NQT'},
}


build({
    'materials': MATERIALS,
    'name': 'Azura', 'var': 'AZURA_ART', 'src': SRC, 'out': os.path.join(ROOT, 'src', 'gfx', 'azura_art.js'),
    'pitch': 9.65, 'off': (8.75, 9.5), 'floor': 86,
    'face': FACE, 'face_col': FACE_COL, 'cut': CUT, 'joints': JOINTS, 'piv': PIV,
})
