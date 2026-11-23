"""Cut sprites out of the flat-magenta sheets in .concepts/ into transparent PNGs.
   python3 scripts/assets/cut_sprites.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import json, os

OUT = ".concepts/sprites"
os.makedirs(OUT, exist_ok=True)

def key_alpha(rgb):
    a = rgb.astype(np.float32)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    key = np.median(border, axis=0)
    dist = np.sqrt(((a - key) ** 2).sum(axis=2))
    alpha = np.clip((dist - 70) / (150 - 70), 0, 1)
    return key, dist, alpha

def despill(rgb, alpha):
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    excess = np.maximum(0, np.minimum(r, b) - g)
    edge = alpha < 0.98
    k = np.where(edge, 0.95, 0.0) * excess
    a[..., 0] = r - k
    a[..., 2] = b - k
    return np.clip(a, 0, 255).astype(np.uint8)

def components(alpha, min_area):
    mask = ndi.binary_dilation(alpha > 0.35, iterations=14)   # merge pieces of one sprite (e.g. lantern glow)
    lab, n = ndi.label(mask)
    objs = ndi.find_objects(lab)
    out = []
    for i, sl in enumerate(objs):
        area = (lab[sl] == i + 1).sum()
        if area < min_area:
            continue
        out.append(sl)
    return out

def cut(name, min_area):
    rgb = np.array(Image.open(f".concepts/{name}.png").convert("RGB"))
    key, dist, alpha = key_alpha(rgb)
    clean = despill(rgb, alpha)
    rgba = np.dstack([clean, (alpha * 255).astype(np.uint8)])
    slices = components(alpha, min_area)
    sprites = []
    for sl in slices:
        ys, xs = sl
        crop = rgba[ys, xs]
        # tight bbox on visible pixels
        vis = crop[..., 3] > 10
        yy, xx = np.where(vis)
        crop = crop[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
        sprites.append({"cx": (xs.start + xs.stop) / 2, "cy": (ys.start + ys.stop) / 2, "img": Image.fromarray(crop, "RGBA")})
    return sprites

def rows(sprites, tol=250):
    sprites = sorted(sprites, key=lambda s: s["cy"])
    out, cur = [], [sprites[0]]
    for s in sprites[1:]:
        if abs(s["cy"] - cur[-1]["cy"]) < tol:
            cur.append(s)
        else:
            out.append(cur); cur = [s]
    out.append(cur)
    return [sorted(r, key=lambda s: s["cx"]) for r in out]

# ---- Nova ----
def cut_columns(name, y0, y1, expected):
    """Split one row of a sheet into `expected` sprites at the empty gaps between them."""
    rgb = np.array(Image.open(f".concepts/{name}.png").convert("RGB"))
    key, dist, alpha = key_alpha(rgb)
    clean = despill(rgb, alpha)
    rgba = np.dstack([clean, (alpha * 255).astype(np.uint8)])
    occupied = (dist[y0:y1] > 140).any(axis=0)
    xs = np.where(occupied)[0]
    gaps = [(xs[i - 1], xs[i]) for i in range(1, len(xs)) if xs[i] - xs[i - 1] > 15]
    assert len(gaps) == expected - 1, f"found {len(gaps) + 1} columns, expected {expected}"
    bounds = [0] + [(a + b) // 2 for a, b in gaps] + [rgba.shape[1]]
    out = []
    for x0, x1 in zip(bounds, bounds[1:]):
        crop = rgba[y0:y1, x0:x1]
        vis = crop[..., 3] > 10
        yy, xx = np.where(vis)
        crop = crop[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
        out.append({"cx": (x0 + x1) / 2, "cy": (y0 + y1) / 2, "img": Image.fromarray(crop, "RGBA")})
    return out

H0 = Image.open(".concepts/nova-walk.png").height
walk = cut_columns("nova-walk", 0, int(H0 * 0.47), 4)
poses = rows(cut("nova-walk", 40000), tol=330)
poses = [r for r in poses if len(r) == 3][0] if any(len(r) == 3 for r in poses) else poses[-1]
print("walk frames:", len(walk), "poses:", len(poses))
SCALE = 0.34   # sheet is 2752 wide; sprites end up ~300 px tall
def scaled(im, s=SCALE):
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)

# Walk: put every frame on one canvas, feet on the same baseline, so the loop does not jitter.
w = [scaled(s["img"]) for s in walk]
W, H = max(i.width for i in w), max(i.height for i in w)
strip = Image.new("RGBA", (W * len(w), H), (0, 0, 0, 0))
for i, im in enumerate(w):
    strip.paste(im, (i * W + (W - im.width) // 2, H - im.height), im)
strip.save(f"{OUT}/nova-walk.png")
json.dump({"frames": len(w), "w": W, "h": H}, open(f"{OUT}/nova-walk.json", "w"))
for name, s in zip(["nova-idle", "nova-jump", "nova-sleep"], poses):
    scaled(s["img"]).save(f"{OUT}/{name}.png")

# ---- Props ----
props = rows(cut("map-props", 6000), tol=180)
print("prop rows:", [len(r) for r in props])
flat = [s for r in props for s in r]
for i, s in enumerate(flat):
    scaled(s["img"], 0.30).save(f"{OUT}/prop-{i:02d}.png")
print("props:", len(flat))
