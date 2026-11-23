import { PixelCanvas, sprite, type Sprite } from "../canvas";
import { TRANSPARENT } from "../palette";

/**
 * One shadow creature per unit. Each has swallowed a lesson's star; beating it in a boss
 * battle wins the star back. 40×40, facing left (towards Nova), wrapped in a flickering
 * dark aura with glowing eyes. Every boss has a 4-frame idle, an attack pose and a hurt pose.
 */
export interface BossDef {
  unitId: string;
  name: string;
  /** One line of story shown before the battle. */
  intro: string;
  /** Idle loop (4 frames). */
  sprite: Sprite;
  attack: Sprite;
  hurt: Sprite;
}

export const BOSS_SIZE = 40;
const S = BOSS_SIZE;

type Pose = { kind: "idle"; f: number } | { kind: "attack" } | { kind: "hurt" };
const BOB = [0, -1, -1, 0];
const bob = (p: Pose) => (p.kind === "idle" ? BOB[p.f % 4] : 0);
const fr = (p: Pose) => (p.kind === "idle" ? p.f : 0);

/** A flickering dark aura hugging the silhouette (drawn after the outline). */
function aura(c: PixelCanvas, frame: number, col = "m"): void {
  const src = c.clone();
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (src.get(x, y) !== TRANSPARENT) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2 && src.get(x + dx, y + dy) !== TRANSPARENT) near = true;
      if (near && (x + y + frame) % 3 === 0) c.set(x, y, col);
    }
}

/** A glowing eye: coloured with a hot centre. */
function glowEye(c: PixelCanvas, x: number, y: number, col = "r", hot = "f", w = 2): void {
  c.rect(x, y, w, 2, col);
  c.set(x, y, hot);
}

/** Light and shadow ramps for the boss palette (lit from the top-left). */
const LIGHT: Record<string, string> = { m: "u", u: "V", V: "v", G: "g", g: "e", e: "W", h: "L", L: "l", D: "C", C: "c", b: "D", R: "r", r: "p", A: "a", a: "Y", O: "o", N: "b", S: "s", T: "t", d: "T" };
const DARK: Record<string, string> = { u: "m", V: "u", v: "V", g: "G", e: "g", L: "h", C: "D", D: "b", c: "C", r: "R", a: "A", o: "O", s: "S", S: "h", t: "T", T: "d", W: "e", w: "W" };

function finish(c: PixelCanvas, p: Pose, auraCol = "m"): PixelCanvas {
  c.shade(LIGHT, DARK);
  c.outline("k");
  aura(c, p.kind === "idle" ? p.f : 1, auraCol);
  return c;
}

// --- Spelling: the Hush Queen, a wasp queen who stings the letters out of words ---------
function queen(p: Pose): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const up = bob(p);
  const flap = fr(p) % 2;
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  // torn wings
  const wy = hurt ? 14 : 10 + up - flap;
  c.ellipse(25, wy, 8, hurt ? 4 : 5 + flap, "G");
  c.ellipse(32, wy + 4, 5, 3, "G");
  c.line(18, wy + 1, 32, wy - 3 - flap, "g").line(18, wy + 1, 31, wy + 3, "g").line(24, wy, 27, wy - 4 - flap, "g").line(26, wy + 4, 36, wy + 5, "g");
  // torn edges
  for (const [x, y] of [
    [31, wy - 4],
    [32, wy - 3],
    [33, wy + 1],
    [36, wy + 3],
    [29, wy + 5],
  ])
    c.set(x, y, TRANSPARENT);
  // abdomen (curls forward to sting when attacking)
  const ax = atk ? 20 : 25;
  const ay = atk ? 30 : 27 + up;
  c.ellipse(ax, ay, 9, 7, "m");
  for (let y = ay - 7; y <= ay + 7; y++) for (let x = ax - 9; x <= ax + 9; x++) if (c.get(x, y) === "m" && (y - ay + 20) % 5 < 2) c.set(x, y, "A");
  // stinger lance
  if (atk) c.line(13, 34, 2, 36, "w").line(13, 35, 3, 37, "g");
  else c.line(32, 33 + up, 37, 38, "w").line(31, 33 + up, 36, 38, "g");
  // thorax and legs
  c.ellipse(16, 20 + up, 6, 5, "m");
  c.ellipse(14, 18 + up, 2, 1.5, "u");
  for (let i = 0; i < 3; i++) c.line(13 + i * 3, 24 + up, 10 + i * 3 - (atk ? 3 : 0), 30 + up, "k");
  // head with mandibles
  const hx = atk ? 7 : 9;
  const hy = 13 + up + (hurt ? 2 : 0);
  c.ellipse(hx, hy, 5.5, 5, "m");
  c.ellipse(hx - 1, hy - 2, 2, 1, "u");
  if (hurt) {
    c.line(hx - 4, hy - 1, hx - 2, hy + 1, "r").line(hx - 4, hy + 1, hx - 2, hy - 1, "r");
    c.line(hx + 1, hy - 1, hx + 3, hy + 1, "r").line(hx + 1, hy + 1, hx + 3, hy - 1, "r");
  } else {
    glowEye(c, hx - 4, hy - 1, "r", "f", 3);
    glowEye(c, hx + 1, hy - 1, "r", "f", 3);
    c.line(hx - 5, hy - 3, hx - 1, hy - 2, "k").line(hx + 4, hy - 3, hx + 1, hy - 2, "k");
  }
  const jaw = atk ? 3 : 1;
  c.line(hx - 3, hy + 4, hx - 5, hy + 5 + jaw, "w").line(hx + 1, hy + 4, hx + 1, hy + 5 + jaw, "w");
  // spiked crown
  c.rect(hx - 4, hy - 7, 9, 2, "A");
  for (const dx of [-4, -1, 2, 4]) c.line(hx + dx, hy - 7, hx + dx, hy - 10 + (dx === -1 ? -1 : 0), "A");
  c.set(hx, hy - 7, "r");
  // antennae
  c.line(hx - 2, hy - 8, hx - 6, hy - 13, "k").line(hx + 2, hy - 8, hx + 1, hy - 14, "k");
  return finish(c, p);
}

// --- Grammar: the Cog Golem, an iron hulk with a molten heart -------------------------
function golem(p: Pose): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const up = bob(p);
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  const lean = hurt ? 2 : 0;
  // legs
  c.rect(12 + lean, 30, 6, 9, "G").rect(23 + lean, 30, 6, 9, "G");
  c.rect(10 + lean, 36, 9, 3, "g").rect(22 + lean, 36, 9, 3, "g");
  // torso
  c.rect(9 + lean, 14 + up, 23, 17, "G");
  c.rect(10 + lean, 15 + up, 21, 2, "g");
  // molten core, pulsing
  const pulse = fr(p) % 2;
  c.ellipse(20.5 + lean, 22 + up, 4 + pulse, 4 + pulse, "O");
  c.ellipse(20.5 + lean, 22 + up, 2.5, 2.5, hurt ? "a" : "o");
  c.ellipse(20.5 + lean, 22 + up, 1, 1, "f");
  for (const [dx, dy] of [
    [0, -6],
    [0, 6],
    [-6, 0],
    [6, 0],
  ])
    c.rect(20 + lean + dx, 21 + up + dy, 2, 2, "A");
  // shoulder spikes
  c.tri(7 + lean, 15 + up, 12 + lean, 15 + up, 8 + lean, 8 + up, "g");
  c.tri(29 + lean, 15 + up, 34 + lean, 15 + up, 33 + lean, 8 + up, "g");
  // arms: the left fist punches forward when attacking
  if (atk) {
    c.rect(0, 16, 10, 5, "G");
    c.rect(0, 14, 5, 9, "g");
    c.set(1, 15, "e").set(1, 18, "e");
  } else {
    c.rect(4 + lean, 16 + up, 5, 12, "G");
    c.rect(2 + lean, 27 + up, 8, 6, "g");
  }
  c.rect(32 + lean, 16 + up, 5, 12, "G");
  c.rect(31 + lean, 27 + up, 8, 6, "g");
  // head with a burning visor
  c.rect(14 + lean, 5 + up, 13, 10, "g");
  c.rect(14 + lean, 5 + up, 13, 2, "e");
  c.rect(15 + lean, 9 + up, 11, 3, "k");
  if (hurt) c.hline(16 + lean, 24 + lean, 10 + up, fr(p) ? "A" : "O");
  else {
    c.hline(16 + lean, 24 + lean, 10 + up, "r");
    c.set(17 + lean, 10 + up, "f").set(22 + lean, 10 + up, "f");
  }
  c.vline(20 + lean, 1 + up, 4 + up, "G");
  c.rect(19 + lean, 0, 3, 2, "r");
  // steam from the joints
  if (fr(p) === 2 || atk) c.set(8, 12 + up, "e").set(33, 11 + up, "e");
  if (hurt) c.set(10, 6, "y").set(30, 9, "y").set(12, 3, "a");
  return finish(c, p);
}

// --- Word Treasury: the Hoard Wyrm, a dragon guarding stolen words --------------------
function wyrm(p: Pose): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const up = bob(p);
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  const wingUp = fr(p) % 2;
  // gold hoard
  c.ellipse(22, 37, 17, 3, "A");
  for (let x = 7; x < 38; x += 3) c.set(x, 36 + (x % 2), "a");
  // wings with bony spars
  c.tri(18, 14 + up, 37, 1 - wingUp * 2, 34, 22 + up, "u");
  c.tri(26, 14 + up, 39, 8 - wingUp, 37, 24 + up, "u");
  c.line(20, 14 + up, 37, 1 - wingUp * 2, "V").line(28, 15 + up, 39, 8 - wingUp, "V");
  // tail with a spiked tip
  c.ellipse(32, 32, 6, 3, "m");
  c.tri(36, 29, 39, 26, 39, 31, "V");
  // body and belly plates
  c.ellipse(22, 26 + up, 10, 10, "m");
  c.ellipse(19, 28 + up, 5, 7, "V");
  for (let y = 23; y < 35; y += 3) c.hline(15, 23, y + up, "u");
  // spines down the back
  for (let i = 0; i < 5; i++) c.tri(24 + i * 2, 17 + up + i * 2, 27 + i * 2, 17 + up + i * 2, 27 + i * 2, 13 + up + i * 2, "V");
  // neck and head (lunges forward when attacking)
  const hx = atk ? 11 : 10;
  const hy = (atk ? 15 : 11) + up + (hurt ? -2 : 0);
  c.ellipse(15, 18 + up, 5, 6, "m");
  c.ellipse(hx + 2, hy, 7, 5, "m");
  c.ellipse(hx - 3, hy + 2, 4, 2.5, "m"); // snout
  // horns
  c.tri(hx + 4, hy - 4, hx + 7, hy - 3, hx + 10, hy - 11, "W");
  c.tri(hx + 1, hy - 4, hx + 3, hy - 4, hx + 3, hy - 10, "e");
  // eye
  if (hurt) c.hline(hx, hx + 2, hy - 1, "a");
  else {
    glowEye(c, hx, hy - 2, "a", "f", 3);
    c.line(hx - 1, hy - 4, hx + 3, hy - 3, "k");
  }
  // jaw and fangs
  if (atk) {
    c.rect(hx - 7, hy + 3, 9, 3, "R");
    for (let x = hx - 6; x < hx + 2; x += 2) c.set(x, hy + 3, "w").set(x + 1, hy + 5, "w");
    // fire breath
    c.ellipse(1, hy + 5, 3, 4, "o");
    c.tri(hx - 7, hy + 1, hx - 7, hy + 8, 0, hy + 10, "o");
    c.tri(hx - 7, hy + 2, hx - 7, hy + 7, 0, hy + 1, "o");
    c.ellipse(1, hy + 5, 2, 2.5, "a");
    c.tri(hx - 7, hy + 3, hx - 7, hy + 6, 1, hy + 5, "a");
    c.line(hx - 7, hy + 4, 1, hy + 5, "y").set(1, hy + 5, "f");
  } else {
    c.hline(hx - 6, hx, hy + 3, "k");
    c.set(hx - 5, hy + 4, "w").set(hx - 2, hy + 4, "w");
  }
  // smoke from the nostril
  if (!atk && fr(p) >= 2) c.set(hx - 7, hy - (fr(p) - 1), "g").set(hx - 8, hy - fr(p), "e");
  // claws on the gold, gripping a gem
  c.rect(14, 34, 8, 2, "m");
  c.set(14, 36, "w").set(17, 36, "w").set(20, 36, "w");
  c.rect(17, 32, 2, 2, fr(p) % 2 ? "s" : "S");
  return finish(c, p);
}

// --- Number the Stars: the Fog Serpent, risen from the cold sea ------------------------
function serpent(p: Pose): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  const f = fr(p);
  const neckX = (y: number) => {
    const t = (34 - y) / 24;
    return 22 + Math.sin(y * 0.3 + f * 0.6) * 4 - (atk ? t * t * 10 : 0) + (hurt ? t * 4 : 0);
  };
  // coils breaking the waves
  c.ellipse(30, 33, 6, 5, "h");
  c.ellipse(30, 35, 4, 2, "N");
  c.ellipse(8, 35, 4, 3, "h");
  // neck, an S-curve that strikes forward
  for (let y = 34; y >= 10; y--) {
    const x = neckX(y);
    c.ellipse(x, y, 4, 1, "h");
    c.set(Math.round(x - 3), y, "S");
    if (y % 3 === 0) c.set(Math.round(x + 1), y, "N");
  }
  // dorsal fins
  for (let y = 14; y < 32; y += 4) {
    const x = neckX(y);
    c.tri(x + 3, y + 2, x + 3, y - 1, x + 8, y - 2, "V");
  }
  // head
  const hx = atk ? 9 : hurt ? 22 : 16;
  const hy = atk ? 12 : hurt ? 6 : 8;
  c.ellipse(hx, hy, 7, 4.5, "h");
  c.ellipse(hx - 4, hy + 1, 4, 3, "h");
  // frill
  c.tri(hx + 4, hy - 3, hx + 10, hy - 8, hx + 8, hy + 1, "V");
  c.tri(hx + 2, hy - 4, hx + 4, hy - 10, hx + 6, hy - 3, "u");
  // eyes
  if (hurt) c.line(hx - 1, hy - 2, hx + 1, hy, "s").line(hx - 1, hy, hx + 1, hy - 2, "s");
  else {
    glowEye(c, hx - 2, hy - 2, "s", "x", 3);
    c.line(hx - 3, hy - 4, hx + 2, hy - 3, "k");
  }
  // jaws and fangs
  const open = atk ? 5 : 1;
  c.rect(hx - 9, hy + 2, 8, open, "R");
  c.hline(hx - 9, hx - 1, hy + 2 + open, "h");
  for (let x = hx - 8; x < hx - 1; x += 2) c.set(x, hy + 2, "w").set(x + 1, hy + 1 + open, "w");
  // waves
  for (let x = 0; x < S; x++) {
    const y = 36 + Math.round(Math.sin(x * 0.5 + f * 1.5));
    c.vline(x, y, S - 1, "b");
    c.set(x, y, "c");
  }
  return finish(c, p);
}

// --- The Giver: the Grey Hush, a wraith of Sameness that drains all colour -------------
function hush(p: Pose): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const up = bob(p);
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  const f = fr(p);
  // tattered cloak
  c.ellipse(21, 14 + up, 9, 9, "G");
  c.tri(10, 14 + up, 32, 14 + up, 21, 3 + up, "G");
  c.rect(12, 14 + up, 18, 16, "G");
  for (let x = 12; x < 30; x++) {
    const len = 3 + Math.round(3 * Math.abs(Math.sin(x * 0.8 + f)));
    if (x % 3 !== 0) c.vline(x, 30 + up, 30 + up + len, "G");
  }
  // cloak folds
  for (const [x, top] of [
    [15, 17],
    [19, 20],
    [24, 18],
    [27, 16],
  ])
    c.vline(x, top + up, 31 + up, "m");
  c.line(14, 7 + up, 21, 3 + up, "g").line(21, 3 + up, 28, 9 + up, "g");
  // hood opening: a void with pinpoint eyes
  c.ellipse(19, 13 + up, 5, 5.5, "k");
  if (hurt) c.hline(16, 22, 13 + up, "g");
  else {
    c.rect(16, 12 + up, 2, 1, "x").rect(21, 12 + up, 2, 1, "x");
    if (f !== 3) c.set(16, 12 + up, "w").set(22, 12 + up, "w");
  }
  // long clawed arms
  if (atk) {
    c.line(13, 18, 1, 16, "G").line(13, 19, 1, 18, "G");
    for (let i = 0; i < 3; i++) c.line(1, 16 + i, 0, 14 + i * 2, "e");
    c.line(28, 18, 20, 24, "G");
  } else {
    c.line(13, 18 + up, 6, 26 + up, "G").line(14, 18 + up, 7, 26 + up, "G");
    for (let i = 0; i < 3; i++) c.line(6 + i, 26 + up, 5 + i, 30 + up, "e");
    c.line(28, 18 + up, 34, 26 + up, "G").line(27, 18 + up, 33, 26 + up, "G");
    for (let i = 0; i < 3; i++) c.line(33 + i, 26 + up, 34 + i, 30 + up, "e");
  }
  // the stolen apple, slowly going grey
  if (!atk) {
    c.ellipse(35, 28 + up, 2, 2, f % 2 ? "r" : "R");
    c.set(35, 25 + up, "L");
  }
  // in pain it flickers out of existence
  if (hurt) {
    // glitches like a bad signal: shifted scanlines with gaps
    const src = c.clone();
    for (let y = 0; y < S; y++) {
      const shift = y % 6 < 2 ? 2 : y % 6 === 3 ? -1 : 0;
      for (let x = 0; x < S; x++) c.set(x, y, y % 6 === 5 ? TRANSPARENT : src.get(x - shift, y));
    }
  }
  return finish(c, p, "G");
}

// --- Poetry: the Frost Owl, who freezes poems mid-line ---------------------------------
function owl(p: Pose): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const up = bob(p);
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  const f = fr(p);
  // great wings, flared when attacking
  const spread = atk ? 3 : f % 2;
  c.tri(12, 12 + up, 1 - spread, 30 + up, 14, 32 + up, "b");
  c.tri(28, 12 + up, 39 + spread, 30 + up, 26, 32 + up, "b");
  for (let i = 0; i < 4; i++) {
    c.line(12 - i * 2, 16 + up + i * 3, 4 - i - spread, 30 + up, "D");
    c.line(28 + i * 2, 16 + up + i * 3, 36 + i + spread, 30 + up, "D");
  }
  // ice spikes on the wings
  c.tri(3 - spread, 26 + up, 6 - spread, 26 + up, 2 - spread, 20 + up, "c");
  c.tri(34 + spread, 26 + up, 37 + spread, 26 + up, 38 + spread, 20 + up, "c");
  // body
  c.ellipse(20, 22 + up, 9, 12, "b");
  c.ellipse(20, 25 + up, 6, 8, "D");
  for (let y = 20; y < 32; y += 3) for (let x = 16; x < 25; x += 3) c.tri(x, y + up, x + 2, y + up, x + 1, y + 2 + up, "b");
  // horned head
  c.ellipse(20, 11 + up, 8, 6, "b");
  c.tri(12, 9 + up, 15, 7 + up, 10, 0 + up, "c");
  c.tri(25, 7 + up, 28, 9 + up, 30, 0 + up, "c");
  c.set(11, 2 + up, "x").set(29, 2 + up, "x");
  // facial disc and glaring eyes
  c.ellipse(16.5, 11 + up, 3.5, 3, "m");
  c.ellipse(23.5, 11 + up, 3.5, 3, "m");
  if (hurt) {
    c.hline(15, 18, 11 + up, "c").hline(22, 25, 11 + up, "c");
  } else {
    // slanted, glowing eyes under a heavy brow
    c.tri(14, 10 + up, 19, 12 + up, 14, 13 + up, "c");
    c.tri(26, 10 + up, 21, 12 + up, 26, 13 + up, "c");
    c.set(15, 12 + up, "x").set(16, 12 + up, "x").set(24, 12 + up, "x").set(25, 12 + up, "x");
    c.line(12, 8 + up, 19, 11 + up, "k").line(28, 8 + up, 21, 11 + up, "k");
    c.line(12, 9 + up, 18, 11 + up, "m").line(28, 9 + up, 22, 11 + up, "m");
  }
  // hooked beak
  c.tri(18.5, 14 + up, 21.5, 14 + up, 19.5, 18 + up, "A");
  c.set(19, 18 + up, "k");
  // talons gripping an icy branch
  c.hline(6, 34, 37, "c");
  c.hline(6, 34, 38, "D");
  for (const x of [15, 17, 23, 25]) c.vline(x, 34 + up, 36, "A");
  // ice shards fired forward when attacking
  if (atk)
    for (const [x, y] of [
      [3, 12],
      [0, 17],
      [5, 6],
    ])
      c.line(x, y, x + 4, y + 1, "x").set(x, y, "c");
  // drifting snow
  c.set((3 + f * 2) % S, 3 + f, "x").set((34 - f) % S, 6 + f * 2, "x");
  return finish(c, p, "u");
}

// --- Short Stories: the Ink Mimic, a book that bites -----------------------------------
function mimic(p: Pose): PixelCanvas {
  const c = new PixelCanvas(S, S);
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  const f = fr(p);
  const open = atk ? 8 : hurt ? 0 : 2 + (f % 2);
  const up = bob(p);
  // lower half of the book
  c.rect(6, 22 + up, 28, 11, "R");
  c.rect(7, 22 + up, 26, 5, "w");
  for (let x = 8; x < 32; x += 2) c.set(x, 24 + up, "e");
  // upper half (cover) lifting
  c.rect(6, 10 + up - open, 28, 10, "R");
  c.rect(7, 16 + up - open, 26, 4, "w");
  c.hline(6, 33, 10 + up - open, "r");
  // metal corners and a broken clasp
  for (const [x, y] of [
    [6, 10 + up - open],
    [33, 10 + up - open],
    [6, 32 + up],
    [33, 32 + up],
  ])
    c.rect(x - (x > 20 ? 1 : 0), y - (y > 20 ? 1 : 0), 2, 2, "g");
  c.rect(18, 32 + up, 4, 3, "g");
  // the maw: ink-black with jagged teeth
  c.rect(7, 20 + up - open, 26, 2 + open, "k");
  for (let x = 7; x < 33; x += 3) {
    c.tri(x, 20 + up - open, x + 2, 20 + up - open, x + 1, 23 + up - open, "w");
    c.tri(x + 1, 22 + up, x + 3, 22 + up, x + 2, 19 + up, "w");
  }
  // a long tongue lashing forward
  if (atk) {
    c.line(10, 19 + up, 0, 17, "R").line(10, 20 + up, 0, 18, "R");
    c.set(0, 16, "R").set(1, 19, "R");
  } else if (!hurt) c.ellipse(20, 21 + up, 3, 1, "R");
  // glaring eyes on the cover
  if (hurt) {
    c.line(11, 12 + up, 14, 15 + up, "a").line(11, 15 + up, 14, 12 + up, "a");
    c.line(25, 12 + up, 28, 15 + up, "a").line(25, 15 + up, 28, 12 + up, "a");
  } else {
    glowEye(c, 11, 13 + up - open, "a", "f", 3);
    glowEye(c, 26, 13 + up - open, "a", "f", 3);
    c.line(10, 11 + up - open, 14, 12 + up - open, "k").line(29, 11 + up - open, 25, 12 + up - open, "k");
  }
  // ink tentacles below
  for (const [x, phase] of [
    [9, 0],
    [16, 1],
    [24, 2],
    [31, 3],
  ]) {
    const sway = Math.round(Math.sin((f + phase) * 1.4) * 2);
    c.line(x, 33 + up, x + sway, 38, "u");
    c.set(x + sway, 39, "m");
  }
  // ink splatter when hurt
  if (hurt)
    for (const [x, y] of [
      [3, 8],
      [36, 12],
      [2, 20],
      [37, 4],
    ])
      c.rect(x, y, 2, 2, "u");
  return finish(c, p, "u");
}

type Draw = (p: Pose) => PixelCanvas;
const anims = (fn: Draw) => ({
  sprite: sprite(fn({ kind: "idle", f: 0 }), fn({ kind: "idle", f: 1 }), fn({ kind: "idle", f: 2 }), fn({ kind: "idle", f: 3 })),
  attack: sprite(fn({ kind: "attack" })),
  hurt: sprite(fn({ kind: "hurt" })),
});

export const BOSSES: BossDef[] = [
  { unitId: "spelling", name: "The Hush Queen", intro: "She stings the letters right out of your words. Spell them back!", ...anims(queen) },
  { unitId: "grammar", name: "The Cog Golem", intro: "An iron hulk built from broken sentences. Fix the grammar to stop its gears!", ...anims(golem) },
  { unitId: "word-treasury", name: "The Hoard Wyrm", intro: "It guards a mountain of stolen words. Win them back one by one!", ...anims(wyrm) },
  { unitId: "number-the-stars", name: "The Fog Serpent", intro: "It rose from the cold sea and swallowed a star. Be brave like Annemarie!", ...anims(serpent) },
  { unitId: "the-giver", name: "The Grey Hush", intro: "It drains the colour out of everything. Bring the memories back!", ...anims(hush) },
  { unitId: "poetry", name: "The Frost Owl", intro: "Its glare freezes poems mid-line. Thaw them with the right answers!", ...anims(owl) },
  { unitId: "short-stories", name: "The Ink Mimic", intro: "A book that bites! Know your stories to slam its cover shut.", ...anims(mimic) },
];

export const BOSS_BY_UNIT = new Map(BOSSES.map((b) => [b.unitId, b]));

export function bossFor(unitId: string): BossDef {
  return BOSS_BY_UNIT.get(unitId) ?? BOSSES[2];
}
