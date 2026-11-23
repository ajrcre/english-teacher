import { PixelCanvas, sprite, type Sprite } from "../canvas";
import { PALETTE } from "../palette";

/**
 * Battle backdrops, one per unit, 128×72 with three animation frames each
 * (twinkling stars, shimmering water, drifting snow, turning gears…).
 * Drawn in code so they stay crisp at any size. No forests, by request.
 */
export const BACKDROP_W = 128;
export const BACKDROP_H = 72;
const W = BACKDROP_W;
const H = BACKDROP_H;
const FRAMES = 3;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Horizontal colour bands with a soft dithered blend at each boundary. */
function gradient(c: PixelCanvas, bands: [string, number][], x = 0, w = W, yStart = 0): void {
  let y0 = yStart;
  for (const [col, end] of bands) {
    c.rect(x, y0, w, end - y0, col);
    y0 = end;
  }
  for (let i = 0; i < bands.length - 1; i++) {
    const above = bands[i][0];
    const below = bands[i + 1][0];
    const yb = bands[i][1];
    for (let xx = x; xx < x + w; xx++) {
      if (xx % 4 === 0) c.set(xx, yb - 2, below);
      if ((xx + yb) % 2 === 0) c.set(xx, yb - 1, below);
      if (xx % 4 === 2) c.set(xx, yb, above);
    }
  }
}

interface Star {
  x: number;
  y: number;
  big: boolean;
  phase: number;
}

function makeStars(seed: number, count: number, yMax: number, xMin = 0, xMax = W): Star[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({ x: Math.floor(xMin + r() * (xMax - xMin)), y: Math.floor(r() * yMax), big: r() < 0.12, phase: Math.floor(r() * FRAMES) }));
}

function drawStars(c: PixelCanvas, stars: Star[], frame: number, onlyOn?: (x: number, y: number) => boolean): void {
  for (const s of stars) {
    if (onlyOn && !onlyOn(s.x, s.y)) continue;
    const bright = (frame + s.phase) % FRAMES === 0;
    if (s.big) {
      c.set(s.x, s.y, "f");
      if (bright) c.set(s.x - 1, s.y, "6").set(s.x + 1, s.y, "6").set(s.x, s.y - 1, "6").set(s.x, s.y + 1, "6");
    } else {
      c.set(s.x, s.y, bright ? "f" : "6");
    }
  }
}

/** A wavy ridge line from baseY; everything below it is filled with `col`. */
function ridge(c: PixelCanvas, baseY: number, waves: [number, number, number][], col: string, top?: string, x0 = 0, x1 = W - 1): number[] {
  const ys: number[] = [];
  for (let x = x0; x <= x1; x++) {
    let y = baseY;
    for (const [amp, freq, phase] of waves) y += amp * Math.sin(x * freq + phase);
    const yy = Math.round(y);
    ys.push(yy);
    c.vline(x, yy, H - 1, col);
    if (top) c.set(x, yy, top);
  }
  return ys;
}

function moon(c: PixelCanvas, cx: number, cy: number, r: number, halo: string): void {
  // soft halo rings
  for (let y = cy - r - 4; y <= cy + r + 4; y++)
    for (let x = cx - r - 4; x <= cx + r + 4; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r && d <= r + 2 && (x + y) % 2 === 0) c.set(x, y, halo);
      else if (d > r + 2 && d <= r + 4 && (x + y) % 4 === 0) c.set(x, y, halo);
    }
  c.ellipse(cx, cy, r, r, "f");
  c.ellipse(cx + r * 0.3, cy + r * 0.25, r * 0.28, r * 0.22, "y");
  c.ellipse(cx - r * 0.35, cy - r * 0.3, r * 0.18, r * 0.18, "y");
  c.set(cx + 1, cy - r + 2, "y");
}

/** A filled ellipse with a dithered, soft rim (for glows and layered rock). */
function softEllipse(c: PixelCanvas, cx: number, cy: number, rx: number, ry: number, col: string, rim = 2.5, only?: string[]): void {
  const edge = 1 + rim / Math.min(rx, ry);
  for (let y = Math.floor(cy - ry * edge); y <= Math.ceil(cy + ry * edge); y++)
    for (let x = Math.floor(cx - rx * edge); x <= Math.ceil(cx + rx * edge); x++) {
      if (only && !only.includes(c.get(x, y))) continue;
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d <= 1 || (d <= edge && (x + y) % 2 === 0)) c.set(x, y, col);
    }
}

// ---------------------------------------------------------------------------
// Word Treasury: a treasure cave lit by a shaft of starlight.
function treasureCave(frame: number): PixelCanvas {
  const c = new PixelCanvas(W, H, "E");
  const r = rng(11);
  // layered chamber: dark edges, warmer rock towards the centre
  softEllipse(c, 64, 36, 70, 40, "F", 3);
  softEllipse(c, 64, 40, 50, 28, "H", 3);
  softEllipse(c, 64, 44, 30, 18, "t", 3, ["H"]);
  // rocky bumps on the walls, lit from above
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * 46);
    const rx = 2 + r() * 4;
    const base = c.get(x, y);
    const dark = base === "F" ? "E" : base === "H" ? "F" : base === "t" ? "H" : null;
    if (!dark) continue;
    // a ledge: a lit top edge with a dithered shadow underneath
    for (let yy = Math.round(y); yy <= Math.round(y + rx * 0.5); yy++)
      for (let xx = Math.round(x - rx); xx <= Math.round(x + rx); xx++)
        if (c.get(xx, yy) === base && ((xx + yy) % 2 === 0 || yy === Math.round(y))) c.set(xx, yy, dark);
    const lit: Record<string, string> = { F: "H", H: "t", t: "e" };
    c.hline(Math.round(x - rx + 1), Math.round(x + rx - 1), Math.round(y - 1), lit[base] ?? base);
  }
  // opening in the roof with night sky
  c.ellipse(64, 1, 13, 7, "F");
  c.ellipse(64, 0, 11, 6, "1");
  c.ellipse(64, -1, 8, 5, "0");
  drawStars(c, makeStars(5, 12, 7, 53, 75), frame, (x, y) => ["0", "1"].includes(c.get(x, y)));
  // shaft of starlight down to the floor, with drifting dust
  for (let y = 6; y < 62; y++) {
    const half = 8 + (y - 6) * 0.3;
    for (let x = Math.floor(64 - half); x <= Math.ceil(64 + half); x++) {
      const cur = c.get(x, y);
      const lighter: Record<string, string> = { E: "F", F: "H", H: "t", t: "e" };
      const edge = Math.abs(x - 64) > half - 3;
      if (lighter[cur] && (!edge || (x + y) % 2 === 0)) c.set(x, y, lighter[cur]);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = 56 + Math.floor(r() * 17);
    const y = (8 + Math.floor(r() * 46) + frame * 2) % 56;
    c.set(x, y, "y");
  }
  // stalactites
  for (const [x, len] of [
    [8, 12],
    [18, 7],
    [30, 10],
    [44, 6],
    [84, 8],
    [96, 12],
    [108, 6],
    [120, 11],
  ] as [number, number][]) {
    c.tri(x - 3, 0, x + 3, 0, x, len, "E");
    c.vline(x - 1, 1, len - 3, "F");
  }
  // glowing crystals on the walls
  const crystal = (x: number, y: number, h: number, col: string, hi: string) => {
    c.tri(x - 2, y, x + 2, y, x, y - h, col);
    c.vline(x, y - h + 2, y - 1, hi);
  };
  crystal(10, 42, 8, "D", "c");
  crystal(14, 44, 5, "C", "x");
  crystal(6, 45, 4, "C", "x");
  crystal(117, 40, 9, "V", "v");
  crystal(121, 43, 6, "v", "w");
  crystal(112, 44, 4, "V", "v");
  crystal(24, 30, 5, "S", "s");
  crystal(103, 28, 6, "S", "s");
  // floor
  ridge(c, 54, [[1.5, 0.12, 0], [1, 0.31, 2]], "F", "H");
  softEllipse(c, 64, 62, 36, 7, "H", 3, ["F"]);
  softEllipse(c, 64, 62, 22, 4, "t", 2, ["H"]);
  for (let y = 66; y < H; y++) for (let x = 0; x < W; x++) if ((x + y) % 2 === 0 && c.get(x, y) === "F") c.set(x, y, "E");
  // treasure heaps left and right
  const heap = (cx: number, cy: number, rx: number, ry: number) => {
    c.ellipse(cx, cy, rx, ry, "A");
    c.ellipse(cx, cy - 1, rx - 2, ry - 1, "a");
    for (let i = 0; i < rx * 2; i++) {
      const x = Math.floor(cx - rx + 2 + r() * (rx * 2 - 4));
      const y = Math.floor(cy - ry + 2 + r() * ry);
      if (c.get(x, y) === "a") c.set(x, y, r() < 0.5 ? "y" : "A");
    }
  };
  heap(16, 62, 15, 8);
  heap(112, 63, 16, 8);
  heap(30, 66, 7, 4);
  // gems in the gold
  for (const [x, y, col] of [
    [12, 57, "r"],
    [22, 60, "S"],
    [108, 58, "V"],
    [118, 61, "r"],
    [100, 62, "S"],
    [31, 64, "v"],
  ] as [number, number, string][]) {
    c.set(x, y, col).set(x + 1, y, col).set(x, y - 1, "w");
  }
  // a goblet and a chest lid
  c.rect(101, 52, 3, 4, "a").rect(100, 51, 5, 1, "y").vline(102, 56, 57, "A").hline(101, 103, 58, "A");
  // sparkles that hop between frames
  const sparkles: [number, number][] = [
    [10, 56],
    [20, 59],
    [113, 57],
    [104, 60],
    [26, 63],
    [119, 60],
    [64, 40],
    [58, 30],
    [70, 22],
  ];
  sparkles.forEach(([x, y], i) => {
    if ((i + frame) % FRAMES !== 0) return;
    c.set(x, y, "f").set(x - 1, y, "y").set(x + 1, y, "y").set(x, y - 1, "y").set(x, y + 1, "y");
  });
  return c;
}

// ---------------------------------------------------------------------------
// Number the Stars: a quiet Danish harbour at night, the far shore across the water.
function harbour(frame: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  gradient(c, [
    ["0", 10],
    ["1", 22],
    ["2", 31],
    ["3", 38],
    ["4", 42],
  ]);
  drawStars(c, makeStars(21, 55, 38), frame);
  moon(c, 98, 13, 6, "3");
  // the far shore (Sweden) with a few lights
  ridge(c, 41, [[0.8, 0.09, 1], [0.5, 0.23, 0]], "i", undefined, 60, 127);
  for (const [x, i] of [
    [72, 0],
    [81, 1],
    [90, 2],
    [113, 0],
    [121, 1],
  ] as [number, number][])
    c.set(x, 41, (frame + i) % FRAMES === 0 ? "f" : "a");
  // sea
  gradient(c, [
    ["4", 46],
    ["3", 52],
    ["2", 60],
    ["1", 72],
  ], 0, W, 42);
  // moon path on the water
  const r = rng(3 + frame);
  for (let y = 43; y < 62; y++) {
    const spread = 2 + (y - 43) * 0.35;
    for (let k = 0; k < 2; k++) {
      const x = Math.round(98 + (r() - 0.5) * 2 * spread);
      const len = 1 + Math.floor(r() * 3);
      c.hline(x, x + len, y, y < 50 ? "f" : "y");
    }
  }
  // ripple lines that drift
  const rr = rng(77);
  for (let i = 0; i < 40; i++) {
    const y = 44 + Math.floor(rr() * 18);
    const x = Math.floor(rr() * W) + frame * 2;
    c.hline(x % W, (x % W) + 2 + Math.floor(rr() * 4), y, y < 50 ? "5" : "3");
  }
  // village on the quay (left)
  const house = (x: number, w: number, h: number, base: number, lit: number[]) => {
    c.rect(x, base - h, w, h, "q");
    c.tri(x - 1, base - h, x + w, base - h, x + w / 2 - 0.5, base - h - Math.ceil(w * 0.7), "q");
    lit.forEach((wx, i) => {
      const on = i === 0 || (frame + i) % FRAMES !== 1;
      c.rect(x + wx, base - h + 2, 1, 2, on ? "f" : "N");
    });
  };
  house(0, 7, 9, 48, [2, 5]);
  house(8, 6, 12, 48, [2]);
  house(15, 8, 8, 48, [1, 5]);
  house(24, 5, 10, 48, [2]);
  house(30, 7, 7, 48, [3]);
  c.rect(4, 30, 1, 4, "q"); // chimney
  c.rect(19, 33, 1, 4, "q");
  c.rect(0, 48, 40, 3, "G");
  c.hline(0, 39, 48, "g");
  for (let x = 1; x < 40; x += 4) c.set(x, 50, "q");
  c.ellipse(20, 52, 22, 2, "1"); // quay reflection
  c.dither(0, 51, 40, 3, "q", "1");
  // fishing boat (right)
  c.tri(104, 48, 126, 48, 108, 53, "q");
  c.tri(108, 53, 126, 48, 123, 53, "q");
  c.rect(106, 46, 20, 2, "q");
  c.vline(115, 30, 46, "q");
  c.line(115, 31, 124, 45, "q");
  c.rect(111, 43, 4, 3, "q");
  c.set(113, 44, frame === 1 ? "a" : "f");
  c.set(124, 44, "a");
  c.hline(105, 125, 54, "2");
  // wooden dock in the foreground (the battle platform)
  c.rect(0, 62, W, 10, "T");
  for (let y = 62; y < 72; y += 3) c.hline(0, W - 1, y, "d");
  for (let x = 6; x < W; x += 16) c.vline(x, 62, 71, "d");
  c.hline(0, W - 1, 61, "t");
  for (let x = 2; x < W; x += 22) {
    c.rect(x, 57, 3, 5, "d");
    c.hline(x, x + 2, 57, "T");
  }
  c.dither(0, 63, W, 9, "d", "T");
  // a coil of rope and a lantern on the dock
  c.ellipse(118, 61, 4, 1.5, "A");
  c.ellipse(118, 61, 2, 0.8, "d");
  c.rect(9, 58, 3, 3, frame === 2 ? "Y" : "y");
  c.hline(9, 11, 57, "d");
  return c;
}

// ---------------------------------------------------------------------------
// The Giver: the world split in two. On the left, the grey community of Sameness;
// on the right, memories in full colour (sunset, the red sled, a warm cabin).
// The boundary shimmers where the colour is seeping in.
const GREYS = ["k", "G", "g", "e", "W", "w", "x"];

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

const greyOf = new Map<string, string>();
function toGrey(ch: string): string {
  let g = greyOf.get(ch);
  if (!g) {
    const lum = luminance(PALETTE[ch] ?? "#000000");
    g = GREYS.reduce((best, cand) => (Math.abs(luminance(PALETTE[cand]) - lum) < Math.abs(luminance(PALETTE[best]) - lum) ? cand : best), GREYS[0]);
    greyOf.set(ch, g);
  }
  return g;
}

function memories(frame: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  gradient(c, [
    ["2", 7],
    ["9", 17],
    ["8", 27],
    ["7", 36],
    ["f", 42],
  ]);
  drawStars(c, makeStars(31, 14, 12, 60, 128), frame);
  // low winter sun
  for (let y = 30; y <= 42; y++)
    for (let x = 96; x <= 120; x++) {
      const d = Math.hypot(x - 108, y - 41);
      if (d <= 9) c.set(x, y, d < 7 ? "f" : "y");
      else if (d <= 11 && (x + y) % 2 === 0) c.set(x, y, "y");
    }
  // far purple hills and a glowing horizon
  ridge(c, 41, [[2, 0.05, 1], [1, 0.14, 0]], "9");
  ridge(c, 44, [[1.5, 0.07, 2], [0.7, 0.2, 1]], "V");
  // the community on the left: identical houses in perfect rows
  for (let row = 0; row < 3; row++) {
    for (let x = 2 + row * 4; x < 52; x += 9) {
      const base = 47 + row * 4;
      c.rect(x, base - 4, 6, 4, "W");
      c.tri(x - 1, base - 4, x + 6, base - 4, x + 2.5, base - 7, "g");
      c.rect(x + 2, base - 2, 2, 2, "G");
    }
  }
  // the big snowy hill with the red sled on top
  c.ellipse(100, 76, 46, 30, "z");
  c.ellipse(101, 77, 44, 29, "x");
  c.dither(56, 46, 72, 26, "p", "x");
  c.ellipse(104, 74, 32, 24, "x");
  c.line(98, 47, 80, 60, "z").line(100, 47, 82, 60, "z");
  c.rect(98, 43, 7, 2, "r");
  c.hline(98, 104, 42, "p");
  c.hline(97, 105, 45, "R");
  c.set(97, 44, "R").set(105, 44, "R");
  // a warm cabin full of memories
  c.rect(70, 41, 14, 9, "T");
  c.tri(68, 41, 86, 41, 77, 33, "R");
  c.hline(68, 86, 41, "x");
  c.tri(70, 37, 76, 34, 72, 36, "x");
  c.rect(73, 44, 3, 3, frame === 1 ? "a" : "f");
  c.rect(79, 44, 3, 3, "f");
  c.rect(76, 45, 2, 5, "r");
  c.rect(81, 32, 2, 4, "d");
  for (let i = 0; i < 3; i++) c.set(82 + ((i + frame) % 2), 30 - i * 2 - frame, "e");
  // coloured lights strung along the roof
  ["r", "a", "S", "V", "y", "r", "S"].forEach((col, i) => c.set(70 + i * 2, 40, (i + frame) % 3 === 0 ? "f" : col));
  // snowy ground (battle platform)
  ridge(c, 59, [[1, 0.08, 2], [0.5, 0.2, 0]], "x", "x");
  c.dither(0, 62, W, 10, "z", "x");
  c.ellipse(64, 66, 34, 4, "x");
  // drifting snow
  const r = rng(101);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W);
    const y = (Math.floor(r() * H) + frame * 3) % H;
    c.set(x + (frame % 2), y, "x");
  }
  // drain the colour on the left of a shimmering boundary
  for (let y = 0; y < H; y++) {
    const edge = Math.round(54 + 7 * Math.sin(y * 0.12 + frame * 0.7) + 3 * Math.sin(y * 0.31));
    for (let x = 0; x < edge; x++) c.set(x, y, toGrey(c.get(x, y)));
    const spark = ["f", "y", "p", "s", "v"][(y + frame) % 5];
    if ((y * 7 + frame * 3) % 5 === 0) c.set(edge, y, spark);
    if ((y * 3 + frame) % 9 === 0) c.set(edge + 1, y, "f");
  }
  return c;
}

// ---------------------------------------------------------------------------
// Poetry: a frozen lake under the moon, aurora above, two paths meeting at a signpost.
function frozenLake(frame: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  gradient(c, [
    ["0", 9],
    ["1", 20],
    ["2", 30],
    ["3", 37],
    ["4", 42],
  ]);
  drawStars(c, makeStars(41, 45, 36), frame);
  // aurora ribbons, gently waving
  for (let x = 0; x < W; x++) {
    const y = Math.round(14 + 4 * Math.sin(x * 0.07 + frame * 0.6) + 2 * Math.sin(x * 0.19));
    for (let k = 0; k < 7; k++) {
      if (k < 2) c.set(x, y + k, "s");
      else if ((x + k + frame) % 2 === 0) c.set(x, y + k, k > 4 ? "3" : "S");
    }
  }
  moon(c, 24, 12, 7, "2");
  // mountains with snow caps
  const peaks = ridge(c, 36, [[5, 0.06, 0.5], [3, 0.15, 2], [1, 0.4, 0]], "5");
  peaks.forEach((y, x) => {
    if (y < 34) {
      c.vline(x, y, y + 1, "x");
      if ((x + y) % 2 === 0) c.set(x, y + 2, "z");
    }
    // shaded east faces
    if (x > 0 && peaks[x - 1] < y) c.vline(x, y, y + 4, "6");
  });
  ridge(c, 41, [[1.5, 0.09, 3], [1, 0.21, 1]], "i");
  ridge(c, 43, [[1, 0.13, 1]], "j");
  // the frozen lake
  gradient(c, [
    ["C", 48],
    ["D", 53],
    ["C", 58],
  ], 0, W, 44);
  c.hline(0, W - 1, 44, "c");
  // moon reflection and cracks
  for (let y = 45; y < 58; y++) if ((y + frame) % 2 === 0) c.hline(22, 26, y, y % 4 === 0 ? "x" : "c");
  c.line(50, 48, 62, 52, "x").line(62, 52, 70, 50, "x").line(90, 46, 98, 55, "c").line(98, 55, 108, 54, "c");
  const glints: [number, number][] = [
    [40, 46],
    [80, 50],
    [110, 47],
    [60, 55],
  ];
  glints.forEach(([x, y], i) => (i + frame) % FRAMES === 0 && c.set(x, y, "x").set(x - 1, y, "c").set(x + 1, y, "c"));
  // snowbank foreground
  ridge(c, 58, [[1.5, 0.07, 0], [0.7, 0.23, 1]], "x", "x");
  c.dither(0, 62, W, 10, "z", "x");
  c.ellipse(64, 66, 32, 4, "x");
  // two roads diverge: a little signpost on the left
  c.vline(12, 50, 62, "T");
  c.rect(6, 51, 6, 2, "t");
  c.set(5, 52, "t");
  c.rect(13, 54, 6, 2, "t");
  c.set(19, 55, "t");
  c.hline(6, 11, 51, "y").hline(13, 18, 54, "y");
  c.rect(10, 49, 5, 1, "x"); // snow cap
  // falling snow
  const r = rng(202);
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(r() * W);
    const y = (Math.floor(r() * 60) + frame * 2) % 60;
    c.set(x, y, "x");
  }
  return c;
}

// ---------------------------------------------------------------------------
// Grammar: an inventor's workshop at night with turning gears and a round window.
function gear(c: PixelCanvas, cx: number, cy: number, r: number, teeth: number, turn: number, col: string, dark: string): void {
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2 + turn;
    const x = cx + Math.cos(a) * (r + 1);
    const y = cy + Math.sin(a) * (r + 1);
    c.rect(Math.round(x - 1), Math.round(y - 1), 2, 2, col);
  }
  c.ellipse(cx, cy, r, r, col);
  c.ellipse(cx, cy, r * 0.55, r * 0.55, dark);
  c.ellipse(cx, cy, r * 0.2, r * 0.2, col);
}

function workshop(frame: number): PixelCanvas {
  const c = new PixelCanvas(W, H, "I");
  // plank wall
  for (let x = 0; x < W; x += 9) c.vline(x, 0, 56, "J");
  const r = rng(9);
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * W), Math.floor(r() * 54), "J");
  c.dither(0, 0, W, 10, "J", "I");
  // round window with the night sky
  c.ellipse(64, 22, 17, 17, "d");
  const win = new PixelCanvas(W, H);
  win.ellipse(64, 22, 15, 15, "1");
  win.ellipse(64, 27, 14, 9, "2");
  win.dither(50, 26, 30, 12, "1", "2");
  drawStars(win, makeStars(13, 16, 36, 50, 79), frame, (x, y) => win.get(x, y) !== ".");
  win.ellipse(70, 15, 3, 3, "f");
  win.ellipse(71.5, 14, 2.5, 2.5, "1");
  c.stamp(win, 0, 0);
  c.vline(64, 7, 37, "d");
  c.hline(49, 79, 22, "d");
  c.ellipse(64, 22, 1, 1, "d");
  // shelves with jars and books (left)
  for (const y of [18, 32]) {
    c.rect(4, y, 34, 2, "d");
    c.hline(4, 37, y, "K");
  }
  const books = ["r", "S", "V", "a", "L", "B", "r", "y"];
  books.forEach((col, i) => c.rect(6 + i * 3, 11 + (i % 3), 2, 7 - (i % 3), col));
  c.rect(30, 12, 5, 6, "s");
  c.rect(31, 11, 3, 1, "T");
  c.rect(32, 14, 2, 3, "S"); // jar
  c.rect(7, 26, 6, 6, "c");
  c.rect(8, 25, 4, 1, "T");
  c.rect(8, 29, 4, 2, "B");
  c.rect(16, 27, 4, 5, "a");
  c.ellipse(26, 29, 3, 3, "A");
  c.set(26, 28, "y"); // globe
  c.vline(26, 32, 31, "d");
  // turning gears (right)
  const turn = (frame / FRAMES) * ((Math.PI * 2) / 8);
  gear(c, 104, 16, 8, 8, turn, "g", "G");
  gear(c, 117, 27, 5, 6, -turn * 1.6, "A", "d");
  gear(c, 98, 32, 4, 6, -turn * 2, "e", "G");
  // hanging lamp with glow
  c.vline(36, 0, 6, "d");
  c.rect(33, 7, 7, 2, "A");
  c.rect(34, 9, 5, 2, frame === 1 ? "Y" : "y");
  for (let y = 11; y < 26; y++)
    for (let x = 30 - (y - 11); x <= 42 + (y - 11); x++) if ((x + y) % 2 === 0 && c.get(x, y) === "I") c.set(x, y, "K");
  // floor
  c.rect(0, 56, W, 16, "t");
  for (let y = 58; y < H; y += 3) c.hline(0, W - 1, y, "K");
  for (let i = -6; i < 8; i++) c.line(64 + i * 4, 56, 64 + i * 14, 71, "T");
  c.hline(0, W - 1, 56, "d");
  c.rect(0, 54, W, 2, "J");
  // workbench left and a crate right
  c.rect(0, 44, 22, 3, "T");
  c.hline(0, 21, 44, "K");
  c.rect(2, 47, 2, 9, "d").rect(18, 47, 2, 9, "d");
  c.rect(5, 40, 3, 4, "g");
  c.rect(10, 41, 7, 3, "B");
  c.set(12, 40, "y");
  c.rect(108, 44, 14, 12, "T");
  c.line(108, 44, 121, 55, "d").line(121, 44, 108, 55, "d");
  c.hline(108, 121, 44, "K");
  // sparks from the bench
  const sparks: [number, number][] = [
    [13, 38],
    [15, 36],
    [11, 37],
  ];
  c.set(sparks[frame][0], sparks[frame][1], "f");
  return c;
}

// ---------------------------------------------------------------------------
// Spelling Bee: a meadow of beehives at sunset.
function meadow(frame: number): PixelCanvas {
  const c = new PixelCanvas(W, H);
  gradient(c, [
    ["2", 7],
    ["9", 17],
    ["8", 28],
    ["7", 40],
    ["f", 46],
  ]);
  // retro striped sun on the horizon
  for (let y = 26; y <= 46; y++)
    for (let x = 48; x <= 80; x++) {
      const d = Math.hypot(x - 64, y - 42);
      if (d <= 14 && !(y > 34 && (y - 34) % 4 === 0)) c.set(x, y, d < 11 ? "f" : "y");
    }
  // soft clouds drifting
  const cloud = (x: number, y: number, w: number) => {
    c.ellipse(x, y, w, 2, "p");
    c.ellipse(x - w / 3, y - 1.5, w / 2, 2, "p");
    c.hline(Math.round(x - w), Math.round(x + w), y + 2, "9");
  };
  cloud(20 + frame, 12, 9);
  cloud(102 - frame, 9, 12);
  cloud(86 + frame, 20, 6);
  // far hills, mid meadow
  ridge(c, 42, [[2.5, 0.05, 1], [1.2, 0.13, 0]], "9");
  ridge(c, 46, [[2, 0.07, 2], [1, 0.17, 1]], "Q");
  ridge(c, 51, [[1.5, 0.06, 0], [0.8, 0.21, 2]], "M", "P");
  c.dither(0, 49, W, 6, "Q", "M");
  // fence line
  for (let x = 2; x < W; x += 7) c.rect(x, 47, 1, 4, "d");
  c.hline(0, W - 1, 48, "T");
  // near meadow (battle platform)
  ridge(c, 58, [[1, 0.09, 1], [0.6, 0.25, 0]], "P", "l");
  c.dither(0, 64, W, 8, "M", "P");
  c.ellipse(64, 65, 30, 3.5, "l");
  c.dither(34, 62, 60, 7, "P", "l");
  // beehives (skeps) on stands
  const skep = (x: number, y: number, s: number) => {
    c.rect(x - s - 1, y + 1, s * 2 + 3, 2, "T");
    c.vline(x - s, y + 3, y + 7, "d").vline(x + s, y + 3, y + 7, "d");
    c.ellipse(x, y - s + 1, s, s, "a");
    c.rect(x - s, y - s + 1, s * 2 + 1, s, "a");
    for (let k = y - s * 2 + 3; k <= y; k += 2) c.hline(x - s, x + s, k, "A");
    c.rect(x - 1, y - 1, 2, 2, "d");
    c.set(x, y - s * 2 + 1, "y");
  };
  skep(14, 55, 5);
  skep(28, 57, 4);
  skep(112, 55, 6);
  // flowers
  const r = rng(55);
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(r() * W);
    const y = 59 + Math.floor(r() * 13);
    if (x > 40 && x < 88 && y < 68) continue;
    const col = ["p", "y", "w", "v", "r"][Math.floor(r() * 5)];
    c.set(x, y, col);
    if (r() < 0.4) c.set(x, y + 1, "L");
  }
  // bees buzzing around the hives
  const bees: [number, number][] = [
    [20, 44],
    [33, 47],
    [104, 42],
    [118, 45],
    [9, 47],
  ];
  bees.forEach(([x, y], i) => {
    const dx = Math.round(2 * Math.sin(frame * 2.1 + i));
    const dy = Math.round(Math.cos(frame * 1.7 + i));
    c.set(x + dx, y + dy, "y").set(x + dx + 1, y + dy, "k").set(x + dx, y + dy - 1, "w");
  });
  return c;
}

// ---------------------------------------------------------------------------
// Short Stories: a library hall at night. Moonlight through an arched window,
// a ticking grandfather clock, and loose pages drifting through the air.
function library(frame: number): PixelCanvas {
  const c = new PixelCanvas(W, H, "J");
  const r = rng(71);
  // panelled back wall
  for (let x = 0; x < W; x += 6) c.vline(x, 0, 55, "d");
  c.dither(0, 0, W, 8, "d", "J");
  // tall bookshelves left and right
  const BOOKS = ["r", "R", "S", "V", "L", "a", "B", "t", "U", "p", "h", "u"];
  const shelf = (x0: number, x1: number) => {
    c.rect(x0, 2, x1 - x0 + 1, 54, "d");
    for (let y = 4; y < 54; y += 10) {
      c.rect(x0 + 1, y, x1 - x0 - 1, 8, "E");
      let x = x0 + 2;
      while (x < x1 - 1) {
        const w = 1 + Math.floor(r() * 3);
        const h = 5 + Math.floor(r() * 3);
        const col = BOOKS[Math.floor(r() * BOOKS.length)];
        if (r() < 0.08 && x + 4 < x1) {
          c.line(x, y + 7, x + 3, y + 3, col).line(x + 1, y + 7, x + 4, y + 3, col);
          x += 5;
          continue;
        }
        c.rect(x, y + 8 - h, w, h, col);
        c.hline(x, x + w - 1, y + 8 - h, "e");
        if (h > 6) c.set(x, y + 9 - h + 2, "y");
        x += w + (r() < 0.15 ? 1 : 0);
      }
      c.rect(x0, y + 8, x1 - x0 + 1, 2, "T");
      c.hline(x0, x1, y + 8, "t");
    }
  };
  shelf(0, 34);
  shelf(93, 127);
  // a ladder leaning on the left shelf
  c.line(30, 10, 38, 56, "t").line(35, 10, 43, 56, "t");
  for (let y = 14; y < 56; y += 6) c.hline(Math.round(31 + (y - 10) * 0.174), Math.round(35 + (y - 10) * 0.174), y, "t");
  // tall arched window with the night sky
  c.rect(45, 12, 38, 40, "d");
  c.ellipse(63.5, 13, 19, 12, "d");
  const win = new PixelCanvas(W, H);
  win.rect(48, 13, 32, 37, "1");
  win.ellipse(63.5, 13, 16, 10, "1");
  gradient(win, [
    ["0", 14],
    ["1", 30],
    ["2", 50],
  ], 48, 32, 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (win.get(x, y) !== "." && !(y >= 13 || Math.hypot((x - 63.5) / 16, (y - 13) / 10) <= 1)) win.set(x, y, ".");
  drawStars(win, makeStars(17, 22, 48, 48, 80), frame, (x, y) => win.get(x, y) !== ".");
  moon(win, 70, 14, 4, "1");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (win.get(x, y) !== "." && (y >= 13 || Math.hypot((x - 63.5) / 16, (y - 13) / 10) <= 1)) c.set(x, y, win.get(x, y));
  c.vline(63, 4, 50, "d").vline(64, 4, 50, "d");
  for (const y of [24, 37]) c.hline(48, 79, y, "d");
  c.rect(44, 50, 40, 3, "T");
  c.hline(44, 83, 50, "t");
  // moonlight falling onto the floor
  for (let y = 53; y < H; y++) {
    const spread = (y - 53) * 0.9;
    for (let x = Math.floor(48 - spread); x <= Math.ceil(80 + spread); x++) if ((x + y) % 2 === 0 && c.get(x, y) === "J") c.set(x, y, "d");
  }
  // grandfather clock with a swinging pendulum
  c.rect(84, 14, 9, 42, "T");
  c.rect(83, 12, 11, 3, "d");
  c.ellipse(88, 20, 3.5, 3.5, "W");
  c.vline(88, 17, 20, "k").hline(88, 90, 20, "k");
  c.rect(86, 26, 5, 24, "d");
  const swing = [-2, 0, 2][frame];
  c.line(88, 26, 88 + swing, 44, "a");
  c.ellipse(88 + swing, 45, 1.5, 1.5, "y");
  c.rect(84, 54, 9, 2, "d");
  // reading lamp with a warm pool of light
  c.vline(14, 40, 58, "d");
  c.tri(10, 40, 18, 40, 14, 35, "a");
  c.hline(11, 17, 40, "y");
  for (let y = 41; y < 60; y++)
    for (let x = 6 - (y - 41) / 2; x <= 22 + (y - 41) / 2; x++) if ((x + y) % 2 === 0 && c.get(Math.round(x), y) !== "d") c.set(x, y, "K");
  // armchair
  c.rect(17, 48, 12, 8, "U");
  c.rect(17, 44, 3, 12, "X").rect(26, 46, 3, 10, "X");
  c.hline(20, 25, 48, "Z");
  // wooden floor and a round rug (battle platform)
  c.rect(0, 56, W, 16, "T");
  for (let y = 58; y < H; y += 3) c.hline(0, W - 1, y, "d");
  c.hline(0, W - 1, 56, "t");
  c.ellipse(64, 64, 34, 5, "U");
  c.ellipse(64, 64, 30, 3.5, "Z");
  c.ellipse(64, 64, 26, 2.5, "U");
  for (let x = 36; x < 92; x += 4) c.set(x, 64, "a");
  // a soft wash of moonlight across the floor
  for (let y = 57; y < H; y++) {
    const spread = (y - 53) * 0.9;
    for (let x = Math.floor(48 - spread); x <= Math.ceil(80 + spread); x++) {
      const cur = c.get(x, y);
      if ((x + 2 * y) % 6 === 0) c.set(x, y, cur === "T" ? "t" : cur === "d" ? "T" : cur === "U" ? "Z" : cur);
    }
  }
  // loose pages drifting through the air
  const pages: [number, number][] = [
    [40, 20],
    [86, 8],
    [24, 30],
    [104, 26],
    [56, 6],
  ];
  pages.forEach(([x, y], i) => {
    const px = x + Math.round(2 * Math.sin(frame * 2 + i));
    const py = y + ((frame + i) % 3);
    c.rect(px, py, 3, 2, "w");
    c.set(px + ((frame + i) % 2 ? 2 : 0), py + 2, "W");
    c.set(px + 1, py, "e");
  });
  return c;
}

const SCENES: Record<string, (frame: number) => PixelCanvas> = {
  "word-treasury": treasureCave,
  "number-the-stars": harbour,
  "the-giver": memories,
  poetry: frozenLake,
  grammar: workshop,
  spelling: meadow,
  "short-stories": library,
};

const cache = new Map<string, Sprite>();

export const BACKDROP_IDS = Object.keys(SCENES);

/** The battle backdrop for a unit (falls back to the harbour for unknown units). */
export function backdropFor(unitId: string): Sprite {
  const id = unitId in SCENES ? unitId : "number-the-stars";
  let s = cache.get(id);
  if (!s) {
    s = sprite(...Array.from({ length: FRAMES }, (_, f) => SCENES[id](f)));
    cache.set(id, s);
  }
  return s;
}
