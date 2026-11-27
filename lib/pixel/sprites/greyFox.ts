import { PixelCanvas, sprite, type Sprite } from "../canvas";
import { TRANSPARENT } from "../palette";
import { ANCHOR_X, ANCHOR_Y, hatCanvas } from "./hats";

/**
 * The Grey Fox: the test-prep boss. A cute but very cool grey fox with a poker face (solid red
 * eyes, no pupils) and a tall hat with a big E (the hat he drops when he is beaten). Short and
 * round, he stands on his hind legs, arms crossed. He asks his questions in speech bubbles and
 * throws a bubble at Nova when she gets one wrong. 34×42, facing left (towards Nova).
 */
export interface FoeDef {
  name: string;
  /** One line of story shown before the battle. */
  intro: string;
  /** Idle loop (4 frames). */
  sprite: Sprite;
  /** Talking: mouth open and shut (2 frames). */
  talk: Sprite;
  /** Winding up to throw a speech bubble. */
  attack: Sprite;
  /** Throwing a speech bubble: wind up, swing over, let go, follow through (4 frames). */
  throw: Sprite;
  /** Throwing a grey star in his Star Catch: the same swing, a grey star in his paw (4 frames). */
  throwStar: Sprite;
  /** The same, facing right (he throws from the left of the field); his hat still reads E. */
  throwStarRight: Sprite;
  /** Angry, he eats Nova's pause button: jaws wide open, then chewing (3 frames). */
  eat: Sprite;
  /** Hit: he doesn't even flinch (eyes shut for a moment, arms still crossed). */
  hurt: Sprite;
  /** Beaten: he walks off, facing away from Nova and without his hat (4 frames). */
  walk: Sprite;
}

/** He stands on his hind legs, short and round (a big head on a small body). */
export const FOX_W = 34;
export const FOX_H = 42;
type Pose = { kind: "idle"; f: number } | { kind: "talk"; f: number } | { kind: "attack" } | { kind: "throw"; f: number; star?: boolean; facingRight?: boolean } | { kind: "hurt" } | { kind: "walk"; f: number } | { kind: "eat"; f: number };

/** Where his paw holds what he throws, in the frame where he swings it up high (frame 1). */
export const THROW_PAW = { x: 27, y: 4 };

const LIGHT: Record<string, string> = { G: "g", g: "e", e: "W", R: "r", r: "p" };
const DARK: Record<string, string> = { g: "G", e: "g", W: "e" };

function fox(p: Pose): PixelCanvas {
  const c = new PixelCanvas(FOX_W, FOX_H);
  const f = p.kind === "idle" || p.kind === "talk" || p.kind === "throw" || p.kind === "walk" || p.kind === "eat" ? p.f : 0;
  const eat = p.kind === "eat";
  const thr = p.kind === "throw" ? p.f : -1;
  /** Hit: he doesn't care. Same pose as waiting, eyes shut for a moment. */
  const hurt = p.kind === "hurt";
  const walk = p.kind === "walk";
  const up = p.kind === "idle" ? [0, -1, -1, 0][f % 4] : walk ? [0, -1, 0, -1][f % 4] : 0;
  // leans back to wind up, forward to throw (the legs stay planted)
  const lean = thr === 0 ? 2 : thr === 1 ? 1 : thr === 2 ? -3 : thr === 3 ? -2 : p.kind === "attack" ? -1 : eat ? -2 : 0;

  // a big fluffy tail curling up behind him, swishing, with a cream tip
  const sw = p.kind === "idle" && f % 2 ? 1 : 0;
  c.ellipse(26 + sw, 33, 4.5, 5, "g");
  c.ellipse(29 + sw, 27, 3.5, 4, "g");
  c.ellipse(30 + sw, 22, 2.5, 3, "W");
  // short stubby legs on two feet (stepping when he walks off)
  const stepA = walk && f % 2 === 0 ? 1 : 0;
  const stepB = walk && f % 2 === 1 ? 1 : 0;
  c.rect(13, 35 - stepA, 3, 4, "G").rect(20, 35 - stepB, 3, 4, "G");
  c.ellipse(12, 39.5 - stepA, 2.5, 1.5, "W").ellipse(19, 39.5 - stepB, 2.5, 1.5, "W");
  // a small round body (darker than his head) with a cream tummy
  const bx = 18 + Math.round(lean / 2);
  c.ellipse(bx, 30 + up, 6.5, 6, "G");
  c.ellipse(bx - 2, 31 + up, 3.5, 4.5, "e");

  // a big round head (cute proportions)
  const hx = 16 + lean;
  const hy = 16 + up;
  // ears: big and pointy with pink insides
  c.tri(hx - 9, hy - 1, hx - 10, hy - 13, hx - 3, hy - 6, "g");
  c.tri(hx + 5, hy - 6, hx + 11, hy - 13, hx + 9, hy, "g");
  c.tri(hx - 8, hy - 3, hx - 9, hy - 10, hx - 5, hy - 6, "p");
  c.tri(hx + 6, hy - 6, hx + 10, hy - 10, hx + 8, hy - 2, "p");
  c.ellipse(hx, hy, 9, 7.5, "g");
  // cream face mask and a short snout with a shiny black nose
  c.ellipse(hx - 3, hy + 3, 6, 4, "e");
  c.ellipse(hx - 8, hy + 3, 2.5, 2, "e");
  c.rect(hx - 11, hy + 1, 2, 2, "k");
  c.set(hx - 11, hy + 1, "g");
  // a poker face: narrow eyes of solid glowing red (no pupils) under flat, heavy lids, and a straight mouth that
  // never gives anything away (not when he talks, not when he throws, not even when he's hit)
  const ey = hy - 1;
  const eye = (x: number) => {
    c.rect(x, ey, 3, 2, "*"); // solid glowing red: no pupils
    c.hline(x - 1, x + 3, ey - 1, "k"); // flat lid
  };
  if (hurt || (p.kind === "idle" && f === 3)) {
    // eyes shut, still unbothered
    c.hline(hx - 8, hx - 4, ey, "k").hline(hx - 2, hx + 2, ey, "k");
  } else {
    eye(hx - 7);
    eye(hx - 1);
  }
  // the mouth: one flat line; talking only opens it a crack
  const talk = p.kind === "talk" && f % 2 === 0;
  c.hline(hx - 7, hx - 3, hy + 5, "k");
  if (talk || thr === 2) c.hline(hx - 6, hx - 4, hy + 6, "R");
  if (eat) {
    // angry brows, slanting down to his snout
    c.line(hx - 9, ey - 3, hx - 5, ey - 2, "k").line(hx + 3, ey - 3, hx - 1, ey - 2, "k");
    if (f === 0) {
      // jaws wide open, teeth showing
      c.rect(hx - 10, hy + 4, 7, 4, "R");
      c.hline(hx - 10, hx - 3, hy + 3, "k").hline(hx - 10, hx - 3, hy + 8, "k");
      c.set(hx - 9, hy + 4, "w").set(hx - 6, hy + 4, "w").set(hx - 8, hy + 7, "w").set(hx - 5, hy + 7, "w");
    } else {
      // chewing: puffed cheeks, a wobbly mouth
      c.ellipse(hx - 4, hy + 4, 3.5, 2.5, "e");
      const w = f === 1 ? 0 : 1;
      c.line(hx - 8, hy + 5 + w, hx - 6, hy + 6 - w, "k").line(hx - 6, hy + 6 - w, hx - 4, hy + 5 + w, "k");
    }
  }

  // front paws (arms): crossed over his chest while he waits, pointing while he talks,
  // swinging the bubble when he throws
  const sx = bx + 3; // shoulder
  const sy = 26 + up;
  const arm = (x: number, y: number, holding = false) => {
    c.line(sx, sy + 2, x, y + 2, "k");
    c.line(sx, sy, x, y, "g").line(sx, sy + 1, x, y + 1, "g").line(sx + 1, sy + 1, x + 1, y + 1, "g");
    c.ellipse(x, y, 2, 2, "W");
    if (holding && p.kind === "throw" && p.star) {
      // a small grey star, held up to throw
      const gx = x + 1;
      const gy = y - 4;
      c.ellipse(gx, gy, 1.6, 1.6, "g");
      c.vline(gx, gy - 3, gy - 2, "g");
      c.hline(gx - 3, gx - 2, gy - 1, "g").hline(gx + 2, gx + 3, gy - 1, "g");
      c.set(gx - 2, gy + 2, "g").set(gx + 2, gy + 2, "g");
      c.set(gx, gy, "e");
    } else if (holding) {
      c.ellipse(x + 1, y - 4, 3.5, 3, "w");
      c.set(x + 1, y - 5, "V").set(x + 1, y - 3, "V");
    }
  };
  if (thr === 0) arm(29, 18, true); // wound back behind him
  else if (thr === 1) arm(26, 8, true); // swung up high
  else if (thr === 2) arm(2, 26, false); // flung forward: the bubble is away
  else if (thr === 3) arm(6, 32, false); // follow-through
  else if (p.kind === "attack") arm(4, 27, false);
  else if (eat) arm(3, 23 - (f % 2), false); // paws up to his mouth
  else if (p.kind === "talk") arm(3, 25 + (f % 2), false); // points at Nova
  else {
    // arms crossed: the cool pose
    c.hline(bx - 7, bx + 5, 27 + up, "g").hline(bx - 7, bx + 5, 28 + up, "g").hline(bx - 6, bx + 4, 29 + up, "k");
    c.hline(bx - 6, bx + 6, 30 + up, "g").hline(bx - 6, bx + 6, 31 + up, "g").hline(bx - 5, bx + 5, 32 + up, "k");
    c.ellipse(bx - 7, 27.5 + up, 1.6, 1.4, "W").ellipse(bx + 6, 30.5 + up, 1.6, 1.4, "W");
  }

  c.shade(LIGHT, DARK);
  c.outline("k");
  // his hat, worn at the back of his head (left behind when he walks off)
  if (walk) return flipped(c);
  const hat = hatCanvas("e", "front");
  if (p.kind === "throw" && p.facingRight) {
    // mirror him, not his hat (so the E still reads the right way round)
    const m = flipped(c);
    m.stamp(hat, FOX_W - 1 - Math.round(hx + 1) - ANCHOR_X, Math.round(hy - 6) - ANCHOR_Y);
    return m;
  }
  c.stamp(hat, Math.round(hx + 1) - ANCHOR_X, Math.round(hy - 6) - ANCHOR_Y);
  return c;
}

/** The same drawing facing the other way (walking off, away from Nova). */
function flipped(c: PixelCanvas): PixelCanvas {
  const out = new PixelCanvas(c.w, c.h);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) out.set(c.w - 1 - x, y, c.get(x, y));
  return out;
}

export const GREY_FOX: FoeDef = {
  name: "The Grey Fox",
  intro: "He guards every question on the test. Answer his riddles to knock his E hat off!",
  sprite: sprite(fox({ kind: "idle", f: 0 }), fox({ kind: "idle", f: 1 }), fox({ kind: "idle", f: 2 }), fox({ kind: "idle", f: 3 })),
  talk: sprite(fox({ kind: "talk", f: 0 }), fox({ kind: "talk", f: 1 })),
  attack: sprite(fox({ kind: "attack" })),
  throw: sprite(...[0, 1, 2, 3].map((f) => fox({ kind: "throw", f }))),
  throwStar: sprite(...[0, 1, 2, 3].map((f) => fox({ kind: "throw", f, star: true }))),
  throwStarRight: sprite(...[0, 1, 2, 3].map((f) => fox({ kind: "throw", f, star: true, facingRight: true }))),
  eat: sprite(...[0, 1, 2].map((f) => fox({ kind: "eat", f }))),
  hurt: sprite(fox({ kind: "hurt" })),
  walk: sprite(...[0, 1, 2, 3].map((f) => fox({ kind: "walk", f }))),
};

// --- The thrown speech bubble -----------------------------------------------------------

export const BUBBLE_SIZE = 16;

/** A little speech bubble with a "?" in it, tumbling through the air (4 frames: it spins and squashes). */
function flyingBubble(f: number): PixelCanvas {
  const c = new PixelCanvas(BUBBLE_SIZE, BUBBLE_SIZE);
  const squash = [0, 1, 0, -1][f % 4];
  const rx = 6 + squash * 0.6;
  const ry = 4.5 - squash * 0.6;
  c.ellipse(8, 7, rx, ry, "w");
  // the tail swings round as it spins
  const tails = [
    [4, 11, 2, 14],
    [11, 11, 14, 13],
    [12, 4, 15, 2],
    [3, 4, 1, 1],
  ];
  const [tx, ty, ex, ey2] = tails[f % 4];
  c.tri(tx - 1, ty - 1, tx + 2, ty - 1, ex, ey2, "w");
  // "?" in the middle
  c.hline(7, 9, 4, "V").set(9, 5, "V").set(8, 6, "V").set(8, 7, "V").set(8, 9, "V");
  c.set(5, 5, "W").set(6, 4, "W");
  c.shade({ w: "w" }, { w: "W" });
  c.outline("k");
  // speed sparkle trailing behind
  if (f % 2) c.set(15, 8, "f").set(14, 10, "y");
  return c;
}

export const BREAK_SIZE = 24;

/**
 * The bubble shattering on Nova (6 frames): it cracks, splits in two, bursts into chunks,
 * the chunks scatter as shards, then fade to sparks.
 */
function brokenBubble(f: number): PixelCanvas {
  const c = new PixelCanvas(BREAK_SIZE, BREAK_SIZE);
  const cx = 12;
  const cy = 11;
  if (f === 0) {
    c.ellipse(cx, cy, 6.5, 5, "w");
    c.tri(cx - 4, cy + 3, cx - 1, cy + 4, cx - 6, cy + 8, "w");
    c.line(cx - 1, cy - 5, cx + 1, cy - 1, "G").line(cx + 1, cy - 1, cx - 1, cy + 2, "G").line(cx - 1, cy + 2, cx + 2, cy + 5, "G");
    c.line(cx + 1, cy - 1, cx + 5, cy - 2, "G");
  } else if (f === 1) {
    c.ellipse(cx - 3, cy, 3.5, 5, "w");
    c.ellipse(cx + 4, cy + 1, 3.5, 4.5, "w");
    c.vline(cx, cy - 5, cy + 6, ".");
    c.set(cx, cy - 7, "f").set(cx + 1, cy + 8, "f");
  } else if (f === 2) {
    for (const [x, y, r] of [
      [cx - 6, cy - 3, 2.5],
      [cx + 5, cy - 4, 2.2],
      [cx - 5, cy + 4, 2.2],
      [cx + 6, cy + 4, 2.5],
      [cx, cy, 1.6],
    ])
      c.ellipse(x, y, r, r * 0.8, "w");
    c.set(cx - 9, cy, "f").set(cx + 9, cy - 1, "f").set(cx, cy - 8, "y");
  } else if (f === 3) {
    for (const [x, y, x2, y2] of [
      [cx - 9, cy - 6, cx - 7, cy - 5],
      [cx + 8, cy - 7, cx + 9, cy - 5],
      [cx - 10, cy + 5, cx - 8, cy + 6],
      [cx + 9, cy + 6, cx + 10, cy + 8],
      [cx - 2, cy - 9, cx, cy - 9],
      [cx + 1, cy + 8, cx + 2, cy + 10],
    ])
      c.line(x, y, x2, y2, "w");
    c.set(cx, cy, "f").set(cx - 4, cy + 1, "y").set(cx + 4, cy - 2, "y");
  } else if (f === 4) {
    for (const [x, y] of [
      [cx - 11, cy - 8],
      [cx + 10, cy - 9],
      [cx - 11, cy + 7],
      [cx + 11, cy + 9],
      [cx - 1, cy - 11],
      [cx + 2, cy + 11],
    ])
      c.set(x, y, "W").set(x + 1, y, "e");
    c.set(cx - 6, cy - 3, "f").set(cx + 6, cy + 2, "f");
  } else {
    for (const [x, y] of [
      [cx - 7, cy - 6],
      [cx + 8, cy + 4],
      [cx - 2, cy + 9],
      [cx + 3, cy - 10],
    ])
      c.set(x, y, "y");
  }
  if (f <= 3) c.outline("k");
  return c;
}

/** A right answer pops the fox's bubble (4 frames): a bright ring that grows and sparkles away. */
function poppedBubble(f: number): PixelCanvas {
  const c = new PixelCanvas(BREAK_SIZE, BREAK_SIZE);
  const r = 4 + f * 2.5;
  const ring = new PixelCanvas(BREAK_SIZE, BREAK_SIZE).ellipse(12, 12, r, r * 0.85, "y");
  const hole = new PixelCanvas(BREAK_SIZE, BREAK_SIZE).ellipse(12, 12, r - 1.5, (r - 1.5) * 0.85, "y");
  for (let y = 0; y < BREAK_SIZE; y++)
    for (let x = 0; x < BREAK_SIZE; x++) if (ring.get(x, y) !== TRANSPARENT && hole.get(x, y) === TRANSPARENT && (f < 2 || (x + y + f) % 2 === 0)) c.set(x, y, f < 2 ? "f" : "y");
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    const d = r + 2;
    c.set(Math.round(12 + dx * d), Math.round(12 + dy * d * 0.85), "f");
  }
  return c;
}

export const BUBBLE_FLY: Sprite = sprite(...[0, 1, 2, 3].map(flyingBubble));
export const BUBBLE_BREAK: Sprite = sprite(...[0, 1, 2, 3, 4, 5].map(brokenBubble));
export const BUBBLE_POP: Sprite = sprite(...[0, 1, 2, 3].map(poppedBubble));
