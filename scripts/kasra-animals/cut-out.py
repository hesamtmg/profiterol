"""
Cuts Kasra's NFT animals out of their OpenSea cards for the 3D animals hero: the animal alone on a transparent
background, without the neon frame behind it or its reflection on the glass below. The results are the .webp files
next to this script, which scripts/seed-kasra.mjs uploads.

Only needed again if the pictures change:

    pip install "rembg[cpu]" scipy
    python3 scripts/kasra-animals/cut-out.py ../kasra/kasra-app/public/image/NFT

It uses the BiRefNet background-removal model (downloaded on first use, about 1 GB of memory while it runs).
"""
import os
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

CARDS = {
    'owl': 'Owl.jpg',
    'tiger': 'Tiger.jpg',
    'wolf': 'Wolf.jpg',
    'bear': 'Bear.jpg',
    'bull': 'Bull.jpg',
    'unicorn': 'Unicorn.jpg',
    'mammoth': 'Mammoth.jpg',
    'rhino': 'Rihno.jpg',
}
# Every card has the same layout: the glass, where the reflection starts, is 621 px from the top.
GLASS = 621


def cut(session, path):
    card = Image.open(path).convert('RGB')
    above = card.crop((0, 0, card.width, GLASS))
    alpha = np.zeros((card.height, card.width), np.float32)
    alpha[:GLASS] = np.asarray(remove(above, session=session))[:, :, 3] / 255
    rgb = np.asarray(card).astype(np.float32) / 255

    # Any bit of the coloured frame the model kept: bright, strongly coloured pixels (the animals are greys).
    mx, mn = rgb.max(2), rgb.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    alpha[ndimage.binary_dilation((sat > 0.45) & (mx > 0.4), iterations=2)] = 0
    alpha[alpha < 0.16] = 0

    # Fill pinholes inside the body, and keep only the animal (drop specks well away from it).
    solid = alpha > 0.5
    alpha[ndimage.binary_fill_holes(solid) & ~solid] = 1
    labels, count = ndimage.label(solid)
    if count:
        sizes = ndimage.sum(solid, labels, range(1, count + 1))
        keep = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.02])
        alpha[~ndimage.binary_dilation(keep, iterations=2)] = 0

    ys, xs = np.nonzero(alpha > 0.05)
    margin = 6
    y0, x0 = max(0, ys.min() - margin), max(0, xs.min() - margin)
    y1, x1 = min(card.height, ys.max() + 1 + margin), min(card.width, xs.max() + 1 + margin)
    rgba = np.dstack([rgb, alpha])[y0:y1, x0:x1]
    return Image.fromarray((rgba * 255).round().astype(np.uint8), 'RGBA')


def main():
    src = sys.argv[1]
    out = os.path.dirname(os.path.abspath(__file__))
    session = new_session('birefnet-general')
    for name, file in CARDS.items():
        picture = cut(session, os.path.join(src, file))
        picture.save(os.path.join(out, f'{name}.webp'), quality=90, method=6)
        print(name, picture.size)


if __name__ == '__main__':
    main()
