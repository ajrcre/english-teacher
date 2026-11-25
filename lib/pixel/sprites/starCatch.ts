import { PixelCanvas, sprite, type Sprite } from "../canvas";

/**
 * Sprites for Star Catch: plump golden falling stars (a glint travels around them), a star
 * glowing when it is the right answer, a star broken in two for a wrong catch, little shards,
 * and Nova's woven basket with her paws on the rim.
 */
export const STAR_W = 25;
export const STAR_H = 24;

/** The points of a five-pointed star centred at (cx, cy), outer radius r, inner radius ri. */
function starPoints(
  cx: number,
  cy: number,
  r: number,
  ri: number,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? ri : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

function inside(pts: [number, number][], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
}

type StarLook =
  | { kind: "gold"; f: number }
  | { kind: "glow"; f: number }
  | { kind: "broken" };

/** Colours for each look: [highlight, light, body, shade, deep shade]. */
const TONES = {
  gold: ["f", "y", "Y", "a", "A"],
  glow: ["w", "f", "y", "Y", "a"],
  broken: ["w", "W", "e", "g", "G"],
} as const;

function star(look: StarLook): PixelCanvas {
  const c = new PixelCanvas(STAR_W, STAR_H);
  const cx = 12.5;
  const cy = 13;
  // chunky arms (a fat inner radius) read better than a thin spiky star at this size
  const outer = starPoints(cx, cy, 11.6, 5.6);
  const inner = starPoints(cx - 0.6, cy - 0.8, 7.6, 3.6);
  const tone = TONES[look.kind];
  const f = look.kind === "broken" ? 0 : look.f;
  for (let y = 0; y < STAR_H; y++)
    for (let x = 0; x < STAR_W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (!inside(outer, px, py)) continue;
      // light from the top left: shade by how far down-right of the centre this pixel is
      const lit = (cx - px) * 0.55 + (cy - py) * 0.85;
      let ch: string = tone[2];
      if (lit > 3) ch = tone[1];
      else if (lit < -4.5) ch = tone[4];
      else if (lit < -1.5) ch = tone[3];
      if (inside(inner, px, py) && lit > -1) ch = lit > 2.5 ? tone[1] : tone[2];
      c.set(x, y, ch);
    }
  // a rim of light along the upper-left edges
  for (let y = 1; y < STAR_H; y++)
    for (let x = 1; x < STAR_W; x++) {
      const here = c.get(x, y);
      if (here === ".") continue;
      if (
        (c.get(x - 1, y) === "." || c.get(x, y - 1) === ".") &&
        x <= cx + 2 &&
        y <= cy + 1
      )
        c.set(x, y, tone[0]);
    }

  if (look.kind === "broken") {
    // split down the middle, the two halves pulled apart
    const out = new PixelCanvas(STAR_W, STAR_H);
    for (let y = 0; y < STAR_H; y++)
      for (let x = 0; x < STAR_W; x++) {
        const ch = c.get(x, y);
        if (ch === ".") continue;
        const crack = 12 + Math.round(Math.sin(y * 1.3) * 1.2);
        if (x < crack) out.set(x - 1, y + (x < 6 ? 1 : 0), ch);
        else if (x > crack) out.set(x + 1, y + 1, ch);
      }
    out.outline("k");
    return out;
  }

  // a glint travels around the star: one bright 4-point sparkle on the face
  const spots = [
    [8, 9],
    [13, 7],
    [16, 12],
    [10, 15],
  ];
  const [sx, sy] = spots[f % spots.length];
  c.set(sx, sy, "w");
  if (f % 2 === 0)
    c.set(sx - 1, sy, tone[0])
      .set(sx + 1, sy, tone[0])
      .set(sx, sy - 1, tone[0])
      .set(sx, sy + 1, tone[0]);
  c.outline("k");
  if (look.kind === "glow") {
    // rays around a glowing star, pulsing out and in
    const r = f % 2;
    for (const [x, y] of [
      [12, 0 + r],
      [0 + r, 8],
      [24 - r, 8],
      [3 + r, 22 - r],
      [21 - r, 22 - r],
    ])
      c.set(x, y, "w");
  }
  return c;
}

export const fallingStar: Sprite = sprite(
  ...[0, 1, 2, 3].map((f) => star({ kind: "gold", f })),
);
export const glowingStar: Sprite = sprite(
  ...[0, 1, 2, 3].map((f) => star({ kind: "glow", f })),
);
export const crackedStar: Sprite = sprite(star({ kind: "broken" }));

/** Tiny grey shards that fly off a broken star (3 shapes). */
export const shard: Sprite = sprite(
  ...[
    ["kk.", "kgk", ".k."],
    [".k", "kG", "k."],
    ["kkk", "keG", "kk."],
  ].map((rows) => PixelCanvas.fromRows(rows.map((r) => r.padEnd(3, ".")))),
);

export const BASKET_W = 30;
export const BASKET_H = 15;

/**
 * Nova's woven basket (2 frames: still, and a little squash when a star lands in it), with
 * her two paws holding the rim.
 */
export const basket: Sprite = sprite(
  ...[0, 1].map((f) => {
    const c = new PixelCanvas(BASKET_W, BASKET_H);
    const top = 2 + f;
    const L = 1;
    const R = BASKET_W - 2;
    // a rope rim: twisted, light on top
    c.rect(L, top, R - L + 1, 3, "t");
    for (let x = L; x <= R; x++) {
      c.set(x, top, x % 3 === 0 ? "K" : "y");
      c.set(x, top + 1, x % 3 === 1 ? "T" : "t");
      c.set(x, top + 2, "d");
    }
    // the body: over-and-under weave, narrowing to the bottom, darker below
    for (let y = top + 3; y < BASKET_H - 1; y++) {
      const inset = 1 + Math.floor((y - top - 3) / 4);
      const row = y - top - 3;
      for (let x = L + inset; x <= R - inset; x++) {
        const over = (Math.floor(x / 3) + Math.floor(row / 2)) % 2 === 0;
        let ch = over ? "t" : "T";
        if (x % 3 === 0) ch = "d";
        if (row >= 6 && ch === "t") ch = "T";
        c.set(x, y, ch);
      }
    }
    c.hline(L + 3, R - 3, BASKET_H - 2, "d");
    c.outline("k");
    // paws over the rim
    for (const px of [7, R - 8]) {
      c.rect(px, top - 1, 4, 2, "W");
      c.set(px + 1, top - 1, "w")
        .set(px, top + 1, "e")
        .set(px + 3, top + 1, "e");
      c.hline(px, px + 3, top - 2, "k");
      c.set(px - 1, top - 1, "k").set(px + 4, top - 1, "k");
      c.set(px + 1, top + 1, "k").set(px + 2, top + 1, "k");
    }
    return c;
  }),
);
