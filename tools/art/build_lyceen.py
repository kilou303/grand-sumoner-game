#!/usr/bin/env python3
"""Construit le modèle « Lycéen » du créateur de perso à partir de son image de référence.

    python3 -I tools/art/build_lyceen.py [art/reference/lyceen_sprite.jpg]

Même relevé qu'Azura (voir tools/art/refsprite.py). Écrit src/gfx/lyceen_art.js.
"""
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refsprite import NAMES, ROOT, R, build  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'reference', 'lyceen_sprite.jpg')

# ------------------------------------------------------------------ pièces du squelette
# Même pose de garde que Valka : bras gauche (arrière) devant le corps, poing au centre ; bras
# droit (avant) levé, poing en haut. Au repos les bras gardent cette garde (pocketB, pocketF),
# ils ne s'articulent que pour frapper. h tête, t torse, u/l/f bras arrière (haut, avant-bras,
# poing), U/L/F bras avant, a/s jambe arrière, A/S jambe avant, O pied. Le poing levé est
# retourné (rotate) pour pointer dans l'axe d'un avant-bras qui pend.
CUT = [
    ('u', {15: R((6, 9)), **{y: R((5, 9)) for y in range(16, 19)}, 19: R((4, 9)), 20: R((3, 9)), 21: R((2, 9))}),
    ('l', {y: R((1, 9)) for y in range(22, 26)}),
    ('f', {y: R((10, 15)) for y in range(19, 24)}),
    ('h', {y: R((0, 34)) for y in range(0, 14)}),
    ('U', {y: R((22, 26)) for y in range(17, 24)}),
    ('L', {20: R((27, 32)), 21: R((27, 32)), 22: R((27, 31)), 23: R((27, 30)), 24: R((25, 29)), 25: R((25, 29))}),
    ('F', {y: R((30, 34)) for y in range(14, 20)}),
    ('t', {y: R((0, 34)) for y in range(14, 36)}),
    ('a', {y: R((4, 16)) for y in range(36, 45)}),
    ('A', {y: R((18, 30)) for y in range(36, 44)}),
    ('s', {y: R((0, 12)) for y in range(45, 54)}),
    ('S', {y: R((20, 30)) for y in range(44, 52)}),
    ('O', {y: R((22, 33)) for y in range(52, 58)}),
]
JOINTS = {'hip': [16, 35], 'neck': [17, 14], 'shoulderF': [22, 17], 'shoulderB': [8, 16]}
PIV = {
    'head': ((17, 14), (17, 14)),
    'torso': ((16, 35), (17, 14)),
    'pocketB': ((16, 35), (17, 14)), 'pocketF': ((16, 35), (17, 14)),
    'armUpB': ((8, 16), (2, 22)), 'armLoB': ((2, 22), (10, 22)),
    'armUpF': ((22, 17), (26, 23)), 'armLoF': ((26, 23), (31, 20)),
    'fist': ((31, 20), (32, 15)),
    'thighF': ((21, 35), (25, 43)), 'shinF': ((25, 43), (26, 52)),
    'thighB': ((11, 35), (8, 44)), 'shinB': ((8, 44), (4, 53)),
    'shoe': ((26, 51), (30, 56)),
}

# ------------------------------------------------------------------ matières
# Clés de la palette par matière, pour chaque groupe de pièces (tête, corps, jambes).
MATERIALS = {
    'head': {'hair': 'FLO', 'skin': 'PRTU'},
    'top': {'jacket': 'CEGJ', 'inner': 'HN', 'skin': 'PRTU', 'pants': 'DIM'},
    'legs': {'pants': 'IM', 'shoes': 'D'},
}


build({
    'name': 'Lyceen', 'var': 'LYCEEN_ART', 'src': SRC, 'out': os.path.join(ROOT, 'src', 'gfx', 'lyceen_art.js'),
    'pitch': 9.65, 'off': (9.25, 9.75), 'floor': 88,
    # chemise blanche : pas de trous de fond à retirer à l'intérieur du personnage
    'hole_min': 256,
    'cut': CUT, 'joints': JOINTS, 'piv': PIV, 'materials': MATERIALS,
    'names': {k: v for k, v in NAMES.items() if v != 'hairBack'},
    'combine': {'pocketB': ['u', 'l', 'f'], 'pocketF': ['U', 'L', 'F']},
    # poing levé : retourné pour pointer vers le bas
    'rotate': {'fist': 2},
    'base': {'id': 'lyceen', 'name': 'Lycéen', 'label': "blazer de lycée, cravate", 'hipF': 5, 'hipB': -5, 'backArm': 'front'},
})
