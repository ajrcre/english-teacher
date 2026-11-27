import { PixelCanvas, sprite, type Sprite } from "../canvas";

/**
 * Scenery for the lane runner, so Nova is seen to run through her world instead of on the spot.
 * Three layers move at different speeds (parallax):
 * - mid: things standing behind the lanes (fence posts, lamps, hives, crates, rocks…), slower than the ground;
 * - ground: pebbles, flowers and cracks on the lanes, moving with the gates;
 * - fore: tufts and stones at the very front, faster than the ground.
 * Each layer is one tile that repeats seamlessly (nothing is drawn across its edges).
 * Drawn in code in the unit's colours. No forests, by request (like the backdrops).
 */
export const MID_W = 160;
export const MID_H = 20;
export const FORE_W = 120;
export const FORE_H = 7;
export const DETAIL_W = 96;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

type Draw = (c: PixelCanvas, x: number, base: number, r: () => number) => number;

// ---------------------------------------------------------------------------
// Things standing behind the lanes. Each draws at x (left edge) on the ground line `base`
// and returns its width.

const fence =
  (wood: string, rail: string, cap?: string): Draw =>
  (c, x, b, r) => {
    const posts = 2 + Math.floor(r() * 3);
    const w = posts * 6 - 4;
    for (let k = 0; k < posts; k++) {
      c.rect(x + k * 6, b - 7, 2, 8, wood);
      if (cap) c.rect(x + k * 6, b - 8, 2, 1, cap);
    }
    c.hline(x, x + w - 1, b - 5, rail).hline(x, x + w - 1, b - 2, rail);
    return w;
  };

const lamp: Draw = (c, x, b, r) => {
  const h = 12 + Math.floor(r() * 5);
  c.vline(x + 1, b - h + 2, b, "G");
  c.hline(x, x + 2, b, "G");
  c.rect(x, b - h - 1, 3, 3, "f");
  c.set(x + 1, b - h - 2, "G");
  return 3;
};

const rock =
  (col: string, hi: string): Draw =>
  (c, x, b, r) => {
    const w = 5 + Math.floor(r() * 5);
    const h = 3 + Math.floor(r() * 3);
    c.ellipse(x + w / 2 - 0.5, b - h / 2 + 0.5, w / 2, h / 2, col);
    c.hline(x + 1, x + Math.floor(w / 2), b - h + 1, hi);
    return w;
  };

const bush =
  (col: string, hi: string, dots?: string): Draw =>
  (c, x, b, r) => {
    const rad = 3 + Math.floor(r() * 2);
    c.ellipse(x + rad, b - rad + 1, rad, rad, col);
    c.ellipse(x + rad * 2 + 1, b - rad + 2, rad - 1, rad - 1, col);
    c.ellipse(x + rad - 1, b - rad, rad - 2, rad - 2, hi);
    if (dots) for (let k = 0; k < 3; k++) c.set(x + 1 + Math.floor(r() * rad * 2), b - 1 - Math.floor(r() * rad), dots);
    return rad * 3 + 1;
  };

const mound =
  (col: string, shade: string): Draw =>
  (c, x, b, r) => {
    const w = 8 + Math.floor(r() * 8);
    const h = 3 + Math.floor(r() * 3);
    c.ellipse(x + w / 2, b, w / 2, h, col);
    c.hline(x + 2, x + w - 2, b, shade);
    return w + 1;
  };

const skep: Draw = (c, x, b) => {
  const s = 3;
  c.rect(x, b - 4, s * 2 + 3, 1, "T");
  c.vline(x + 1, b - 3, b, "d").vline(x + s * 2 + 1, b - 3, b, "d");
  c.ellipse(x + s + 1, b - 5 - s, s, s, "a");
  c.rect(x + 1, b - 5 - s, s * 2 + 1, s + 1, "a");
  for (let k = b - 5 - s * 2 + 2; k <= b - 5; k += 2) c.hline(x + 1, x + s * 2 + 1, k, "A");
  c.set(x + s + 1, b - 6, "d");
  return s * 2 + 3;
};

const crate: Draw = (c, x, b, r) => {
  const s = 5 + Math.floor(r() * 3);
  c.rect(x, b - s + 1, s, s, "t");
  c.hline(x, x + s - 1, b - s + 1, "K").vline(x + s - 1, b - s + 1, b, "T").hline(x, x + s - 1, b, "T");
  c.line(x + 1, b - 1, x + s - 2, b - s + 2, "T");
  if (r() < 0.5) {
    c.rect(x + 1, b - s * 2 + 2, s - 2, s - 1, "t");
    c.line(x + 2, b - s, x + s - 3, b - s * 2 + 3, "T");
  }
  return s;
};

const barrel: Draw = (c, x, b) => {
  c.rect(x, b - 6, 5, 7, "T");
  c.vline(x + 1, b - 6, b, "t");
  c.hline(x, x + 4, b - 5, "d").hline(x, x + 4, b - 1, "d");
  return 5;
};

const bollard: Draw = (c, x, b) => {
  c.rect(x + 1, b - 4, 3, 5, "G");
  c.rect(x, b - 5, 5, 2, "g");
  return 5;
};

const gearPost: Draw = (c, x, b, r) => {
  const h = 8 + Math.floor(r() * 4);
  c.rect(x + 2, b - h + 3, 2, h - 2, "d");
  c.ellipse(x + 2.5, b - h, 3, 3, "g");
  for (let k = 0; k < 4; k++) c.set(x + 2 + Math.round(4 * Math.cos(k * 1.57)), b - h + Math.round(4 * Math.sin(k * 1.57)), "g");
  c.rect(x + 2, b - h, 1, 1, "G");
  return 6;
};

const spike =
  (col: string, hi: string): Draw =>
  (c, x, b, r) => {
    const w = 4 + Math.floor(r() * 4);
    const h = 6 + Math.floor(r() * 9);
    c.tri(x, b + 1, x + w, b + 1, x + w / 2, b - h, col);
    c.line(x + Math.floor(w / 2), b - h + 2, x + 1, b, hi);
    return w + 1;
  };

const crystal =
  (col: string, hi: string): Draw =>
  (c, x, b, r) => {
    const h = 5 + Math.floor(r() * 5);
    c.tri(x, b + 1, x + 4, b + 1, x + 2, b - h, col);
    c.tri(x + 3, b + 1, x + 7, b + 1, x + 5, b - h + 3, col);
    c.vline(x + 2, b - h + 2, b - 1, hi);
    return 8;
  };

const books: Draw = (c, x, b, r) => {
  const n = 3 + Math.floor(r() * 3);
  const cols = ["U", "S", "a", "V", "L", "r"];
  for (let k = 0; k < n; k++) {
    const w = 6 + Math.floor(r() * 3);
    const dx = Math.floor(r() * 2);
    c.rect(x + dx, b - k * 2 - 1, w, 2, cols[Math.floor(r() * cols.length)]);
    c.set(x + dx + w - 1, b - k * 2 - 1, "W");
  }
  return 9;
};

const pillar: Draw = (c, x, b, r) => {
  const h = 11 + Math.floor(r() * 6);
  c.rect(x + 1, b - h + 2, 5, h - 1, ">");
  c.vline(x + 1, b - h + 2, b, "{");
  c.rect(x, b - h, 7, 2, "]");
  c.rect(x, b - 1, 7, 2, "]");
  if (r() < 0.5) c.line(x + 3, b - h + 4, x + 4, b - h + 8, "<");
  return 7;
};

const torch: Draw = (c, x, b, r) => {
  const h = 9 + Math.floor(r() * 4);
  c.vline(x + 1, b - h + 3, b, "d");
  c.rect(x, b - h + 2, 3, 1, "G");
  c.rect(x, b - h, 3, 2, "@");
  c.set(x + 1, b - h - 1, "v");
  return 3;
};

const reeds: Draw = (c, x, b, r) => {
  const n = 3 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const h = 4 + Math.floor(r() * 6);
    c.vline(x + k * 2, b - h, b, k % 2 ? "T" : "Q");
    if (r() < 0.4) c.set(x + k * 2, b - h - 1, "O");
  }
  return n * 2;
};

/** How each unit's world looks along the lanes. */
interface Theme {
  /** Things behind the lanes, picked at random (repeats allowed). */
  mid: Draw[];
  /** Front tufts or stones: [main colour, highlight]; "blades" draws grass, "lumps" draws stones/snow. */
  fore: { kind: "blades" | "lumps"; col: string; hi: string };
  /** Details on the lanes: a dark and a light pebble colour, and small accents (flowers, sparkles). */
  ground: { stone: string; hi: string; accents: string[] };
}

const THEMES: Record<string, Theme> = {
  spelling: {
    mid: [skep, bush("L", "l", "p"), fence("d", "T"), bush("L", "l", "y"), fence("d", "T")],
    fore: { kind: "blades", col: "L", hi: "l" },
    ground: { stone: "Q", hi: "l", accents: ["p", "y", "w", "v"] },
  },
  "the-giver": {
    mid: [mound("z", "C"), lamp, fence("G", "g", "x"), mound("z", "C")],
    fore: { kind: "lumps", col: "B", hi: "c" },
    ground: { stone: "C", hi: "w", accents: ["w", "c"] },
  },
  poetry: {
    mid: [mound("z", "C"), rock("D", "C"), reeds, rock("C", "x")],
    fore: { kind: "lumps", col: "z", hi: "x" },
    ground: { stone: "D", hi: "x", accents: ["w", "x"] },
  },
  "number-the-stars": {
    mid: [bollard, crate, lamp, barrel, fence("d", "t")],
    fore: { kind: "lumps", col: "g", hi: "e" },
    ground: { stone: "d", hi: "t", accents: ["e", "g"] },
  },
  grammar: {
    mid: [crate, barrel, gearPost, lamp, gearPost],
    fore: { kind: "lumps", col: "d", hi: "A" },
    ground: { stone: "T", hi: "Y", accents: ["a", "g"] },
  },
  "word-treasury": {
    mid: [spike("F", "H"), crystal("v", "w"), rock("F", "H"), crystal("a", "y"), spike("E", "F")],
    fore: { kind: "lumps", col: "A", hi: "a" },
    ground: { stone: "E", hi: "H", accents: ["a", "v", "y"] },
  },
  "short-stories": {
    mid: [lamp, books, fence("d", "T"), books, bush("h", "L")],
    fore: { kind: "blades", col: "L", hi: "l" },
    ground: { stone: "d", hi: "t", accents: ["W", "y"] },
  },
  "grey-fox": {
    mid: [pillar, torch, rock("<", ">"), pillar, spike("<", ">")],
    fore: { kind: "lumps", col: "{", hi: "}" },
    ground: { stone: "(", hi: "}", accents: ["@", "]"] },
  },
};

const themeOf = (unitId: string) => THEMES[unitId] ?? THEMES["number-the-stars"];

export const SCENERY_IDS = Object.keys(THEMES);

const cache = new Map<string, Sprite>();
function cached(key: string, make: () => PixelCanvas): Sprite {
  let s = cache.get(key);
  if (!s) cache.set(key, (s = sprite(make())));
  return s;
}

/** The row of things standing behind the lanes (MID_W×MID_H, standing on its bottom row). */
export function midScenery(unitId: string): Sprite {
  return cached(`mid:${unitId}`, () => {
    const c = new PixelCanvas(MID_W, MID_H);
    const t = themeOf(unitId);
    const r = rng(seedOf(unitId));
    const base = MID_H - 1;
    // Draw each thing on its own canvas first, so it can be skipped if it would cross the edge.
    let x = 3 + Math.floor(r() * 6);
    while (x < MID_W - 4) {
      const part = new PixelCanvas(MID_W, MID_H);
      const w = t.mid[Math.floor(r() * t.mid.length)](part, x, base, r);
      if (x + w > MID_W - 3) break;
      c.stamp(part, 0, 0);
      x += w + 6 + Math.floor(r() * 14);
    }
    return c.outline("k");
  });
}

/** Tufts or stones at the very front of the field (FORE_W×FORE_H, standing on its bottom row). */
export function foreScenery(unitId: string): Sprite {
  return cached(`fore:${unitId}`, () => {
    const c = new PixelCanvas(FORE_W, FORE_H);
    const { kind, col, hi } = themeOf(unitId).fore;
    const r = rng(seedOf(unitId) ^ 0x9e3779b9);
    const base = FORE_H - 1;
    let x = 2 + Math.floor(r() * 8);
    while (x < FORE_W - 10) {
      if (kind === "blades") {
        const n = 3 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const h = 2 + Math.floor(r() * (FORE_H - 3));
          const lean = r() < 0.5 ? -1 : 1;
          c.line(x + k * 2, base, x + k * 2 + (h > 3 ? lean : 0), base - h, k % 2 ? hi : col);
        }
        x += n * 2;
      } else {
        const w = 4 + Math.floor(r() * 5);
        const h = 2 + Math.floor(r() * 3);
        c.ellipse(x + w / 2, base, w / 2, h, col);
        c.hline(x + 1, x + Math.floor(w / 2), base - h + 1, hi);
        x += w;
      }
      x += 8 + Math.floor(r() * 16);
    }
    return c.outline("k");
  });
}

/** Pebbles, flowers and sparkles on one lane (DETAIL_W×laneH, transparent elsewhere). */
export function groundDetails(unitId: string, laneH: number): Sprite {
  const h = Math.max(8, Math.round(laneH));
  return cached(`ground:${unitId}:${h}`, () => {
    const c = new PixelCanvas(DETAIL_W, h);
    const { stone, hi, accents } = themeOf(unitId).ground;
    const r = rng(seedOf(unitId) ^ 0x51ed27);
    const count = 7;
    for (let k = 0; k < count; k++) {
      // spread evenly with a little jitter, never across the tile's edges
      const x = Math.floor(((k + 0.15 + r() * 0.7) * (DETAIL_W - 6)) / count) + 2;
      const y = 4 + Math.floor(r() * (h - 8));
      const kind = r();
      if (kind < 0.45) {
        // a pebble with a lit top
        c.rect(x, y, 3, 2, stone).set(x, y, hi);
      } else if (kind < 0.8) {
        // a flower, a sparkle or a gem
        c.set(x, y, accents[Math.floor(r() * accents.length)]);
        c.set(x, y + 1, stone);
      } else {
        // a small crack or a tuft
        c.set(x, y + 1, stone).set(x + 1, y, stone).set(x + 2, y + 1, stone);
      }
    }
    return c;
  });
}
