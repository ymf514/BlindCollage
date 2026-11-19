# Usage (needs Python with numpy, scipy, pillow):
#   python3 tools/riso_background.py background/new-scene.jpg background/riso/new-scene.jpg background/riso/thumbs/new-scene.jpg
# Riso-style background: tone-based separation into the author's inks (blue = shadows/structure,
# red = warm tones, optional yellow = light warm fill), grainy screen, misregistration, paper.
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BLUE = (35, 72, 172); RED = (215, 62, 50); YEL = (240, 226, 48)
PAPER = np.array([246, 244, 240]) / 255

def paper_tex(H, W, rng):
    fib = ndi.gaussian_filter(rng.normal(0, 1, (H, W)), 0.7) * 0.010
    mott = ndi.zoom(ndi.gaussian_filter(rng.normal(0, 1, (H // 8 + 2, W // 8 + 2)), 5), 8, order=1)[:H, :W] * 0.05
    return np.ones((H, W, 3)) * PAPER * (1 + (fib + mott)[..., None])

def screen(c, rng, grain, amount=0.55):
    # Soft grain: tones stay continuous; grain is strongest in midtones (like a scanned Riso),
    # solids stay solid, and a few ink dropouts speckle the flats.
    noise = ndi.gaussian_filter(rng.random(c.shape), grain)
    noise = (noise - noise.mean()) / (noise.std() + 1e-6)
    mid = 4 * c * (1 - c)
    a = np.clip(c + noise * 0.16 * amount * (0.35 + mid), 0, 1)
    drop = ndi.gaussian_filter((rng.random(c.shape) < 0.0015).astype(float), 0.8) * 3
    return np.clip(a - drop * 0.6, 0, 1)

def riso(src, out, inks=('blue', 'red', 'yellow'), width=1600, strength=0.78, grain=0.9,
         shifts=((0, 0), (3, -2), (-2, 2)), seed=7, thumb=None):
    rng = np.random.default_rng(seed)
    im = Image.open(src).convert('RGB'); im.thumbnail((width, width), Image.LANCZOS)
    f = np.asarray(im).astype(float) / 255
    H, W, _ = f.shape
    R, G, B = f[..., 0], f[..., 1], f[..., 2]
    L = 0.3 * R + 0.59 * G + 0.11 * B
    L = ndi.gaussian_filter(L, 0.6)
    dark = np.clip((1 - L) * 1.15 - 0.08, 0, 1) ** 1.25                  # shadows & structure
    warm = np.clip((R - B) * 1.6 + 0.10, 0, 1) * np.clip(1.25 - L * 0.6, 0, 1)
    light = np.clip(((R + G) / 2 - B) * 1.8 - 0.05, 0, 1) * np.clip(L * 1.2, 0, 1)
    cov = {'blue': dark * 0.92, 'red': np.clip(warm * 0.75 + dark * 0.18, 0, 1), 'yellow': light * 0.55}
    col = {'blue': BLUE, 'red': RED, 'yellow': YEL}
    out_img = paper_tex(H, W, rng)
    order = [k for k in ('yellow', 'red', 'blue') if k in inks]
    for i, k in enumerate(order):
        a = screen(cov[k] * strength, rng, grain)
        uneven = 1 - 0.10 * np.clip(ndi.gaussian_filter(rng.normal(0, 1, (H, W)), 50) * 10, 0, 1)
        a *= 0.9 * uneven
        dy, dx = shifts[i % len(shifts)]
        a = np.roll(np.roll(a, dy, 0), dx, 1)
        inkc = np.array(col[k]) / 255 / PAPER
        out_img *= 1 - a[..., None] * (1 - inkc)
    res = Image.fromarray((np.clip(out_img, 0, 1) * 255).astype(np.uint8))
    res.save(out, quality=86, optimize=True, progressive=True)
    if thumb:
        w, h = res.size; tw = min(w, h * 4 / 3); th = tw * 3 / 4
        res.crop((int((w - tw) / 2), int((h - th) / 2), int((w + tw) / 2), int((h + th) / 2))) \
           .resize((640, 480), Image.LANCZOS).save(thumb, quality=80, optimize=True, progressive=True)
    return res


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 3:
        sys.exit('usage: riso_background.py SRC OUT [THUMB]')
    riso(sys.argv[1], sys.argv[2], thumb=sys.argv[3] if len(sys.argv) > 3 else None)
