#!/usr/bin/env python3
"""Construit le modèle « Rôdeur » du créateur de perso à partir de son image de référence.

    python3 -I tools/art/build_rodeur.py [art/reference/rodeur_sprite.jpg]

Même relevé qu'Azura (voir tools/art/refsprite.py). Écrit src/gfx/rodeur_art.js.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refsprite import NAMES, ROOT, R, build  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'rodeur_sprite.jpg')

# ------------------------------------------------------------------ pièces du squelette
# Même pose de garde que Valka : bras gauche (arrière) devant le corps, poing au centre ; bras
# droit (avant) levé, poing en haut. Au repos les bras gardent cette garde (pocketB, pocketF),
# ils ne s'articulent que pour frapper. h tête, t torse, u/l/f bras arrière (haut, avant-bras,
# poing), U/L/F bras avant, a/s jambe arrière, A/S jambe avant, O pied. Le poing levé est
# retourné (rotate) pour pointer dans l'axe d'un avant-bras qui pend.
CUT = [
    ('u', {15: R((6, 11)), **{y: R((6, 10)) for y in range(16, 20)}, 20: R((4, 10)), 21: R((4, 10))}),
    ('l', {y: R((1, 11)) for y in range(22, 27)}),
    ('f', {20: R((12, 15)), 21: R((12, 15)), 22: R((12, 15)), 23: R((12, 15)), 24: R((12, 14)), 25: R((12, 14))}),
    ('h', {**{y: R((0, 35)) for y in range(0, 14)}, 14: R((7, 21))}),
    ('U', {y: R((22, 27)) for y in range(18, 24)}),
    ('L', {19: R((31, 33)), 20: R((30, 33)), 21: R((28, 33)),
           22: R((28, 31)), 23: R((27, 30)), 24: R((24, 30)), 25: R((24, 30)), 26: R((24, 30))}),
    ('F', {y: R((30, 34)) for y in range(14, 19)}),
    ('t', {y: R((0, 35)) for y in range(14, 38)}),
    ('a', {y: R((4, 16)) for y in range(38, 46)}),
    ('A', {y: R((17, 30)) for y in range(38, 45)}),
    ('s', {y: R((1, 12)) for y in range(46, 56)}),
    ('S', {y: R((20, 30)) for y in range(45, 54)}),
    ('O', {y: R((22, 33)) for y in range(54, 58)}),
]
JOINTS = {'hip': [16, 37], 'neck': [17, 15], 'shoulderF': [23, 18], 'shoulderB': [8, 17]}
PIV = {
    'head': ((17, 15), (17, 15)),
    'torso': ((16, 37), (17, 15)),
    'pocketB': ((16, 37), (17, 15)), 'pocketF': ((16, 37), (17, 15)),
    'armUpB': ((8, 17), (3, 23)), 'armLoB': ((3, 23), (11, 23)),
    'armUpF': ((23, 18), (26, 24)), 'armLoF': ((26, 24), (32, 19)),
    'fist': ((32, 19), (33, 15)),
    'thighF': ((20, 37), (25, 44)), 'shinF': ((25, 44), (26, 54)),
    'thighB': ((11, 37), (8, 45)), 'shinB': ((8, 45), (5, 56)),
    'shoe': ((26, 53), (30, 56)),
}

# ------------------------------------------------------------------ matières
# Clés de la palette par matière, pour chaque groupe de pièces (tête, corps, jambes).
MATERIALS = {
    'head': {'hair': 'CEGJLOQ', 'skin': 'PSTU'},
    'top': {'jacket': 'CEGJLOQ', 'inner': 'DHKM', 'skin': 'PSTU', 'pants': 'FIN', 'metal': 'R'},
    'legs': {'pants': 'FIN', 'shoes': 'DHKM'},
}


build({
    'name': 'Rodeur', 'var': 'RODEUR_ART', 'src': SRC, 'out': os.path.join(ROOT, 'src', 'gfx', 'rodeur_art.js'),
    'pitch': 9.65, 'off': (9.25, 9.75), 'floor': 88,
    # blanc des yeux : pas de trous de fond à retirer à l'intérieur du personnage
    'hole_min': 256,
    'cut': CUT, 'joints': JOINTS, 'piv': PIV, 'materials': MATERIALS,
    'names': {k: v for k, v in NAMES.items() if v != 'hairBack'},
    'combine': {'pocketB': ['u', 'l', 'f'], 'pocketF': ['U', 'L', 'F']},
    # poing levé : retourné pour pointer vers le bas
    'rotate': {'fist': 2},
    'base': {'id': 'rodeur', 'name': 'Rôdeur', 'label': "tunique verte, brassards", 'hipF': 4, 'hipB': -5, 'backArm': 'front'},
})
