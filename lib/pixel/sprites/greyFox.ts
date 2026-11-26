import { PixelCanvas, sprite, type Sprite } from "../canvas";
import { TRANSPARENT } from "../palette";
import { ANCHOR_X, ANCHOR_Y, hatCanvas } from "./hats";

/**
 * The Grey Fox: the test-prep boss. A cute but very cool grey fox: big shiny red eyes with a
 * smug half-lidded look, a sly smirk, a red scarf, and a tall hat with a big E (the hat he
 * drops when he is beaten). He stands tall on his hind legs, arms crossed. He asks his questions in speech bubbles and
 * throws a bubble at Nova when she gets one wrong. 36×52, facing left (towards Nova).
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
  hurt: Sprite;
}

/** He stands tall on his hind legs: a taller sprite than the other bosses. */
export const FOX_W = 36;
export const FOX_H = 52;
type Pose = { kind: "idle"; f: number } | { kind: "talk"; f: number } | { kind: "attack" } | { kind: "throw"; f: number } | { kind: "hurt" };

const LIGHT: Record<string, string> = { G: "g", g: "e", e: "W", R: "r", r: "p" };
const DARK: Record<string, string> = { g: "G", e: "g", W: "e" };

/** A flickering red-black aura hugging the silhouette. */
function aura(c: PixelCanvas, frame: number): void {
  const src = c.clone();
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (src.get(x, y) !== TRANSPARENT) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2 && src.get(x + dx, y + dy) !== TRANSPARENT) near = true;
      if (near && (x + y + frame) % 3 === 0) c.set(x, y, (x + frame) % 2 ? "R" : "m");
    }
}

function fox(p: Pose): PixelCanvas {
  const c = new PixelCanvas(FOX_W, FOX_H);
  const f = p.kind === "idle" || p.kind === "talk" || p.kind === "throw" ? p.f : 0;
  const thr = p.kind === "throw" ? p.f : -1;
  const hurt = p.kind === "hurt";
  const up = p.kind === "idle" ? [0, -1, -1, 0][f % 4] : 0;
  // leans back to wind up, forward to throw; recoils when hit (the legs stay planted)
  const lean = thr === 0 ? 2 : thr === 1 ? 1 : thr === 2 ? -3 : thr === 3 ? -2 : p.kind === "attack" ? -1 : hurt ? 2 : 0;

  // a big fluffy tail curling up behind him, swishing, with a cream tip
  const sw = p.kind === "idle" && f % 2 ? 1 : 0;
  c.ellipse(27 + sw, 40, 4.5, 6, "g");
  c.ellipse(30 + sw, 32, 4, 5, "g");
  c.ellipse(31 + sw, 26, 3, 3.5, "W");
  // standing tall on two hind legs, cream feet pointing forward
  c.rect(13, 37, 3, 11, "G").rect(20, 37, 3, 11, "G");
  c.ellipse(12, 48, 3, 1.5, "W").ellipse(19, 48, 3, 1.5, "W");
  // upright, slim body (darker than his head) with a cream tummy
  const bx = 18 + Math.round(lean / 2);
  c.ellipse(bx, 31 + up, 6, 8.5, "G");
  c.ellipse(bx - 2, 32 + up, 3.5, 6.5, "e");

  // a big round head (cute proportions)
  const hx = 16 + lean;
  const hy = 16 + up + (hurt ? 1 : 0);
  // ears: big and pointy with pink insides, flattened when he's hit
  if (hurt) {
    c.tri(hx - 3, hy - 5, hx + 4, hy - 9, hx + 3, hy - 3, "g");
    c.tri(hx + 3, hy - 4, hx + 11, hy - 7, hx + 7, hy - 1, "g");
  } else {
    c.tri(hx - 9, hy - 1, hx - 10, hy - 13, hx - 3, hy - 6, "g");
    c.tri(hx + 5, hy - 6, hx + 11, hy - 13, hx + 9, hy, "g");
    c.tri(hx - 8, hy - 3, hx - 9, hy - 10, hx - 5, hy - 6, "p");
    c.tri(hx + 6, hy - 6, hx + 10, hy - 10, hx + 8, hy - 2, "p");
  }
  c.ellipse(hx, hy, 9, 7.5, "g");
  // cream face mask and a short snout with a shiny black nose
  c.ellipse(hx - 3, hy + 3, 6, 4, "e");
  c.ellipse(hx - 8, hy + 3, 2.5, 2, "e");
  c.rect(hx - 11, hy + 1, 2, 2, "k");
  c.set(hx - 11, hy + 1, "g");
  // a red scarf, its end flying out behind: the cool part
  c.hline(hx - 3, hx + 7, hy + 7, "r").hline(hx - 2, hx + 7, hy + 8, "R");
  const flap = f % 2; // the ends flap in the wind
  c.line(hx + 7, hy + 7, hx + 12, hy + 4 + flap, "r").line(hx + 12, hy + 4 + flap, hx + 17, hy + 3 - flap, "r");
  c.line(hx + 7, hy + 8, hx + 12, hy + 5 + flap, "R").line(hx + 12, hy + 5 + flap, hx + 17, hy + 4 - flap, "R");
  c.line(hx + 7, hy + 9, hx + 11, hy + 9 - flap, "r").line(hx + 11, hy + 9 - flap, hx + 15, hy + 8, "R");

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

  // front paws (arms): crossed over his chest while he waits, pointing while he talks,
  // swinging the bubble when he throws
  const sx = bx + 3; // shoulder
  const sy = 27 + up;
  const arm = (x: number, y: number, holding = false) => {
    c.line(sx, sy + 2, x, y + 2, "k");
    c.line(sx, sy, x, y, "g").line(sx, sy + 1, x, y + 1, "g").line(sx + 1, sy + 1, x + 1, y + 1, "g");
    c.ellipse(x, y, 2, 2, "W");
    if (holding) {
      c.ellipse(x + 1, y - 4, 3.5, 3, "w");
      c.set(x + 1, y - 5, "V").set(x + 1, y - 3, "V");
    }
  };
  if (thr === 0) arm(30, 18, true); // wound back behind him
  else if (thr === 1) arm(27, 7, true); // swung up high
  else if (thr === 2) arm(2, 26, false); // flung forward: the bubble is away
  else if (thr === 3) arm(6, 34, false); // follow-through
  else if (p.kind === "attack") arm(4, 28, false);
  else if (p.kind === "talk") arm(3, 25 + (f % 2), false); // points at Nova
  else if (!hurt) {
    // arms crossed: the cool pose
    c.hline(bx - 7, bx + 5, 28 + up, "g").hline(bx - 7, bx + 5, 29 + up, "g").hline(bx - 6, bx + 4, 30 + up, "k");
    c.hline(bx - 6, bx + 6, 31 + up, "g").hline(bx - 6, bx + 6, 32 + up, "g").hline(bx - 5, bx + 5, 33 + up, "k");
    c.ellipse(bx - 7, 28.5 + up, 1.6, 1.4, "W").ellipse(bx + 6, 31.5 + up, 1.6, 1.4, "W");
  } else arm(26, 36, false); // flung back when hit

  c.shade(LIGHT, DARK);
  c.outline("k");
  // his hat, worn at the back of his head, knocked up when he's hit
  const hat = hatCanvas("e", "front");
  c.stamp(hat, Math.round(hx + 1) - ANCHOR_X, Math.round(hy - 6) - ANCHOR_Y + (hurt ? -2 : 0));
  aura(c, p.kind === "idle" ? f : p.kind === "talk" ? f + 1 : 2);
  return c;
}

export const GREY_FOX: FoeDef = {
  name: "The Grey Fox",
  intro: "He guards every question on the test. Answer his riddles to knock his E hat off!",
  sprite: sprite(fox({ kind: "idle", f: 0 }), fox({ kind: "idle", f: 1 }), fox({ kind: "idle", f: 2 }), fox({ kind: "idle", f: 3 })),
  talk: sprite(fox({ kind: "talk", f: 0 }), fox({ kind: "talk", f: 1 })),
  attack: sprite(fox({ kind: "attack" })),
  throw: sprite(...[0, 1, 2, 3].map((f) => fox({ kind: "throw", f }))),
  hurt: sprite(fox({ kind: "hurt" })),
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
