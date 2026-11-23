"""Cuts the 2x2 hand-drawn button sheet (.concepts/buttons-sheet.png) into four transparent PNGs.
Each is normalised to 200 px tall so CSS can 9-slice it (rounded caps left/right, stretchy middle)."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import sys, os

SRC = ".concepts/buttons-sheet.png"
OUT = sys.argv[1] if len(sys.argv) > 1 else ".concepts/splash"
NAMES = ["btn-amber", "btn-amber-pressed", "btn-parchment", "btn-teal"]
im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(float)
d = np.sqrt(((a - np.array([255, 0, 255])) ** 2).sum(2))
alpha = np.clip((d - 120) / 60, 0, 1)            # hard ramp: also removes the purple drop shadow
alpha = ndi.binary_opening(alpha > 0.5, iterations=2) * alpha
# despill magenta from edge pixels
r, g, b = a[..., 0], a[..., 1], a[..., 2]
spill = np.clip(np.minimum(r, b) - g, 0, None)
r2, b2 = r - spill * 0.9, b - spill * 0.9
rgb = np.dstack([r2, g, b2]).clip(0, 255)
rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
mask = alpha > 0.5
lab, n = ndi.label(ndi.binary_closing(mask, iterations=3))
counts = ndi.sum(mask, lab, range(1, n + 1))
keep = [int(i) + 1 for i in np.argsort(-counts)[:4]]      # the four buttons; hatching specks are smaller
objs = ndi.find_objects(lab)
items = sorted([(k, objs[k - 1]) for k in keep], key=lambda t: (round(t[1][0].start / 600), t[1][1].start))
os.makedirs(OUT, exist_ok=True)
for name, (k, sl) in zip(NAMES, items):
    m = ndi.binary_dilation(ndi.binary_fill_holes(lab == k), iterations=3)
    crop = rgba[sl].copy(); crop[..., 3] = (crop[..., 3] * m[sl]).astype(np.uint8)
    img = Image.fromarray(crop, "RGBA"); img = img.crop(img.getbbox())
    h = 200; w = round(img.width * h / img.height)
    img = img.resize((w, h), Image.LANCZOS)
    img.save(f"{OUT}/{name}.png"); print(name, img.size)
