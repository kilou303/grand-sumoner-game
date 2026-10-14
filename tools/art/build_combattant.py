#!/usr/bin/env python3
"""Construit le modèle « Combattant » du créateur de perso à partir de son image de référence.

    python3 -I tools/art/build_combattant.py [art/reference/combattant_sprite.jpg]

Même relevé qu'Azura (voir tools/art/refsprite.py). Écrit src/gfx/combattant_art.js.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refsprite import NAMES, ROOT, R, build  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'combattant_sprite.jpg')

# ------------------------------------------------------------------ pièces du squelette
# Même pose de garde que Valka : bras gauche (arrière) devant le corps, poing au centre ; bras
# droit (avant) levé, poing en haut. Au repos les bras gardent cette garde (pocketB, pocketF),
# ils ne s'articulent que pour frapper. h tête, t torse, u/l/f bras arrière (haut, avant-bras,
# poing), U/L/F bras avant, a/s jambe arrière, A/S jambe avant, O pied. Le poing levé est
# retourné (rotate) pour pointer dans l'axe d'un avant-bras qui pend.
CUT = [
    ('u', {14: R((6, 11)), 15: R((6, 11)), 16: R((5, 11)), 17: R((4, 14)), 18: R((4, 14)), **{y: R((10, 14)) for y in range(19, 23)}}),
    ('l', {19: R((7, 9)), 20: R((7, 9)), 21: R((7, 9)), 22: R((6, 9)), 23: R((6, 9))}),
    ('f', {y: R((0, 6)) for y in range(19, 26)}),
    ('h', {**{y: R((0, 36)) for y in range(0, 14)}, 14: R((13, 23))}),
    ('U', {y: R((24, 27)) for y in range(18, 25)}),
    ('L', {21: R((28, 34)), 22: R((28, 34)), 23: R((28, 34)), 24: R((28, 33)), 25: R((26, 33)), 26: R((26, 32))}),
    ('F', {y: R((29, 36)) for y in range(14, 21)}),
    ('t', {y: R((0, 36)) for y in range(14, 36)}),
    ('a', {y: R((3, 16)) for y in range(36, 46)}),
    ('A', {y: R((17, 31)) for y in range(36, 46)}),
    ('s', {y: R((2, 13)) for y in range(46, 55)}),
    ('S', {y: R((20, 31)) for y in range(46, 54)}),
    ('O', {y: R((23, 35)) for y in range(54, 58)}),
]
JOINTS = {'hip': [17, 35], 'neck': [18, 15], 'shoulderF': [24, 19], 'shoulderB': [12, 18]}
PIV = {
    'head': ((18, 15), (18, 15)),
    'torso': ((17, 35), (18, 15)),
    'pocketB': ((17, 35), (18, 15)), 'pocketF': ((17, 35), (18, 15)),
    'armUpB': ((12, 18), (11, 22)), 'armLoB': ((11, 22), (6, 22)),
    'armUpF': ((24, 19), (27, 24)), 'armLoF': ((27, 24), (32, 21)),
    'fist': ((32, 21), (33, 15)),
    'thighF': ((21, 35), (26, 45)), 'shinF': ((26, 45), (27, 54)),
    'thighB': ((13, 35), (8, 45)), 'shinB': ((8, 45), (6, 55)),
    'shoe': ((27, 53), (31, 56)),
}

# ------------------------------------------------------------------ matières
# Clés de la palette par matière, pour chaque groupe de pièces (tête, corps, jambes).
MATERIALS = {
    'head': {'hair': 'CDFJ', 'skin': 'MNORU', 'eyes': 'G'},
    'top': {'jacket': 'CDEFGJ', 'inner': 'HKQT', 'skin': 'MNORU', 'pants': 'ILPSV'},
    'legs': {'pants': 'ILPSV', 'skin': 'MNORU', 'shoes': 'CDEFGJHKQT'},
}


build({
    'name': 'Combattant', 'var': 'COMBATTANT_ART', 'src': SRC, 'out': os.path.join(ROOT, 'src', 'gfx', 'combattant_art.js'),
    'pitch': 9.65, 'off': (9.25, 9.75), 'floor': 88,
    # pantalon blanc : pas de trous de fond à retirer à l'intérieur du personnage
    'hole_min': 256,
    'cut': CUT, 'joints': JOINTS, 'piv': PIV, 'materials': MATERIALS,
    'names': {k: v for k, v in NAMES.items() if v != 'hairBack'},
    'combine': {'pocketB': ['u', 'l', 'f'], 'pocketF': ['U', 'L', 'F']},
    # poing levé : retourné pour pointer vers le bas
    'rotate': {'fist': 2},
    'base': {'id': 'combattant', 'name': 'Combattant', 'label': "débardeur d'arts martiaux, pantalon large", 'hipF': 4, 'hipB': -4, 'backArm': 'front'},
})
