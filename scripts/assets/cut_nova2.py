"""Cut the Nova2 animation sheets (2 rows x 4 frames, flat magenta background) into aligned frame strips.
   python3 scripts/assets/cut_nova2.py
Frames share a canvas per sheet: feet on the row baseline (airborne frames keep their lift),
horizontal centre at the mass centre of each frame, one common scale across all sheets."""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = ".concepts/sprites2"; os.makedirs(OUT, exist_ok=True)

def load(name):
    rgb = np.array(Image.open(f".concepts/{name}.png").convert("RGB"))
    a = rgb.astype(np.float32)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    key = np.median(border, axis=0)
    dist = np.sqrt(((a - key) ** 2).sum(axis=2))
    # Magenta sheets: cut the pink lantern halo too (hard ramp). Purple sheet: its key is closer to orange fur, so use a soft ramp.
    lo, hi = (115, 165) if key[0] > 235 else (55, 100)
    alpha = np.clip((dist - lo) / (hi - lo), 0, 1)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    excess = np.maximum(0, np.minimum(r, b) - g)
    k = np.where(alpha < 0.98, 0.95, 0.0) * excess
    a[..., 0] = np.clip(r - k, 0, 255); a[..., 2] = np.clip(b - k, 0, 255)
    return np.dstack([a.astype(np.uint8), (alpha * 255).astype(np.uint8)]), dist

def frames_of(name, expected=8, dil=10, min_area=15000):
    rgba, dist = load(name)
    mask = ndi.binary_dilation(dist > 140, iterations=dil)
    lab, n = ndi.label(mask)
    objs = ndi.find_objects(lab)
    found = []
    for i, sl in enumerate(objs):
        if (lab[sl] == i + 1).sum() < min_area: continue
        found.append((sl, i + 1))
    if len(found) != expected:
        raise SystemExit(f"{name}: found {len(found)} sprites, expected {expected}")
    cy = [(f[0][0].start + f[0][0].stop) / 2 for f in found]
    order = np.argsort(cy); half = expected // 2
    if expected == 8:
        groups = [sorted([found[i] for i in order[:half]], key=lambda f: f[0][1].start), sorted([found[i] for i in order[half:]], key=lambda f: f[0][1].start)]
    else:
        groups = [sorted(found, key=lambda f: f[0][1].start)]
    frames = []
    for grp in groups:
        for sl, idx in grp:
            ys, xs = sl
            own = ndi.binary_dilation(lab == idx, iterations=18)          # this sprite and its glow only
            y0, y1, x0, x1 = max(0, ys.start - 40), ys.stop + 40, max(0, xs.start - 60), xs.stop + 60
            crop = rgba[y0:y1, x0:x1].copy()
            crop[..., 3] = np.where(own[y0:y1, x0:x1], crop[..., 3], 0)
            frames.append(crop)
    return frames, groups

def bbox(img, thr=40):
    yy, xx = np.where(img[..., 3] > thr)
    return xx.min(), yy.min(), xx.max() + 1, yy.max() + 1

def build_strip(name, outname, scale):
    frames, rows = frames_of(name)
    items = []
    for f in frames:
        x0, y0, x1, y1 = bbox(f)
        solid = f[..., 3] > 128
        ys, xs = np.where(solid)
        items.append({"img": f, "bb": (x0, y0, x1, y1), "cx": xs.mean(), "bottom": ys.max()})
    # per-row baseline = lowest paw in the row
    per = 4
    for r in range(2):
        grp = items[r * per:(r + 1) * per]
        base = max(i["bottom"] for i in grp)
        for i in grp: i["base"] = base
    # canvas: left/right extents about each frame's centroid, up/down about the row baseline
    L = max(i["cx"] - i["bb"][0] for i in items); R = max(i["bb"][2] - i["cx"] for i in items)
    T = max(i["base"] - i["bb"][1] for i in items); B = 6
    W = int(np.ceil(max(L, R) * 2)); H = int(np.ceil(T + B))
    strip = Image.new("RGBA", (W * len(items), H), (0, 0, 0, 0))
    for n, i in enumerate(items):
        im = Image.fromarray(i["img"], "RGBA")
        ox = int(round(W / 2 - i["cx"])); oy = int(round(T - i["base"]))
        cell = Image.new("RGBA", (W, H), (0, 0, 0, 0)); cell.paste(im, (ox, oy), im)
        strip.paste(cell, (n * W, 0))
    s = scale
    strip = strip.resize((int(strip.width * s) // len(items) * len(items), int(H * s)), Image.LANCZOS)
    fw = strip.width // len(items)
    strip.save(f"{OUT}/{outname}.png", optimize=True)
    json.dump({"frames": len(items), "w": fw, "h": strip.height, "ear_to_foot": float(np.median([i["base"] - i["bb"][1] for i in items])) * s}, open(f"{OUT}/{outname}.json", "w"))
    return float(np.median([i["base"] - i["bb"][1] for i in items]))

# One scale for everything: make the side-walk fox (ears to feet) about 190 px tall.
h_side = None
meta = {}
for sheet, outname in [("nova2-walk-side", "walk-side"), ("nova2-trot-side", "trot-side"), ("nova2-walk-away", "walk-away"), ("nova2-walk-toward", "walk-toward")]:
    frames, _ = frames_of(sheet)
    hs = float(np.median([bbox(f)[3] - bbox(f)[1] for f in frames]))
    meta[outname] = hs
h_ref = meta["walk-side"]
for sheet, outname in [("nova2-walk-side", "walk-side"), ("nova2-trot-side", "trot-side"), ("nova2-walk-away", "walk-away"), ("nova2-walk-toward", "walk-toward")]:
    # normalise apparent height; front/back views look taller on the page so match shoulder-to-paw height
    ratio = 1.0 if "side" in outname else h_ref / meta[outname]
    sc = 0.55 * (ratio if "side" not in outname else 1.0)
    e = build_strip(sheet, outname, sc)
    print(outname, "scale", round(sc, 3), "ear-to-foot", round(e * sc))

# Poses: 8 separate sprites, one shared scale (the first one, "sitting", set 1.2x the walking height).
frames, rows = frames_of("nova2-poses")
names = ["sit", "look-up", "sniff", "stretch", "scratch", "pounce", "yawn", "wave"]
sit_h = bbox(frames[0])[3] - bbox(frames[0])[1]
walk_h = json.load(open(f"{OUT}/walk-side.json"))["ear_to_foot"]
ps = (walk_h * 1.2) / sit_h
for n, f in zip(names, frames):
    x0, y0, x1, y1 = bbox(f)
    im = Image.fromarray(f[y0:y1, x0:x1], "RGBA")
    im.resize((max(1, int(im.width * ps)), max(1, int(im.height * ps))), Image.LANCZOS).save(f"{OUT}/pose-{n}.png", optimize=True)
print("pose scale", round(ps, 3))
