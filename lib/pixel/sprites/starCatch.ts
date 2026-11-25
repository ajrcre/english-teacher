import { PixelCanvas, sprite, type Sprite } from "../canvas";

/**
 * Sprites for Star Catch: big golden falling stars (twinkling), a star glowing when it is the
 * right answer, a cracked grey star for a wrong catch, and Nova's woven basket.
 */
export const STAR_W = 21;
export const STAR_H = 20;

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
  | { kind: "cracked" };

function star(look: StarLook): PixelCanvas {
  const c = new PixelCanvas(STAR_W, STAR_H);
  const cx = 10.5;
  const cy = 10.8;
  const outer = starPoints(cx, cy, 9.6, 4.2);
  const core = starPoints(cx, cy - 0.5, 6, 2.6);
  const grey = look.kind === "cracked";
  const glow = look.kind === "glow";
  const f = look.kind === "cracked" ? 0 : look.f;
  for (let y = 0; y < STAR_H; y++)
    for (let x = 0; x < STAR_W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (!inside(outer, px, py)) continue;
      // lit from the top left: a pale core, warm body, darker lower edges
      let ch = grey ? "g" : glow ? "y" : "a";
      if (inside(core, px, py)) ch = grey ? "e" : glow ? "f" : "Y";
      if (py > cy + 3 && !inside(core, px, py))
        ch = grey ? "G" : glow ? "a" : "A";
      c.set(x, y, ch);
    }
  if (!grey) {
    // a twinkle that travels across the face of the star
    const spots = [
      [7, 8],
      [10, 6],
      [12, 9],
    ];
    const [sx, sy] = spots[f % spots.length];
    c.set(sx, sy, "w").set(sx + 1, sy, glow ? "w" : "f");
    // a little shine at the top point
    c.set(10, 2, glow ? "w" : "y");
  } else {
    c.line(6, 6, 9, 11, "k")
      .line(9, 11, 7, 15, "k")
      .line(9, 11, 13, 13, "k")
      .line(13, 13, 15, 12, "k");
  }
  c.outline("k");
  if (glow) {
    // rays around a glowing star
    const r = f % 2 ? 1 : 0;
    c.set(0, 3 - r, "f")
      .set(20, 3 - r, "f")
      .set(10 - 0, 0, "f")
      .set(1, 17 + r, "y")
      .set(19, 17 + r, "y");
  }
  return c;
}

export const fallingStar: Sprite = sprite(
  star({ kind: "gold", f: 0 }),
  star({ kind: "gold", f: 1 }),
  star({ kind: "gold", f: 2 }),
);
export const glowingStar: Sprite = sprite(
  star({ kind: "glow", f: 0 }),
  star({ kind: "glow", f: 1 }),
  star({ kind: "glow", f: 2 }),
);
export const crackedStar: Sprite = sprite(star({ kind: "cracked" }));

export const BASKET_W = 28;
export const BASKET_H = 13;

/** Nova's woven basket (2 frames: still, and a little squash when a star lands in it). */
export const basket: Sprite = sprite(
  ...[0, 1].map((f) => {
    const c = new PixelCanvas(BASKET_W, BASKET_H);
    const top = 1 + f;
    const L = 1;
    const R = BASKET_W - 2;
    // rim
    c.rect(L, top, R - L + 1, 3, "t");
    c.hline(L + 1, R - 1, top, "K");
    c.hline(L, R, top + 2, "d");
    // body, slightly narrower at the bottom, woven in vertical slats
    for (let y = top + 3; y < BASKET_H - 1; y++) {
      const inset = y >= BASKET_H - 3 ? 2 : 1;
      for (let x = L + inset; x <= R - inset; x++)
        c.set(x, y, x % 3 === 0 ? "d" : (x + y) % 2 ? "T" : "t");
    }
    c.hline(L + 2, R - 2, BASKET_H - 2, "d");
    c.outline("k");
    return c;
  }),
);
