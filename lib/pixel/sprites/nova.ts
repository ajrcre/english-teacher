import { PixelCanvas, sprite, type Sprite } from "../canvas";
import { ANCHOR_X, ANCHOR_Y, hatCanvas, type HatId } from "./hats";

/** Empty rows above every Nova sprite, so a tall hat fits (same size with or without a hat). */
const FRONT_PAD = 5;
const SIDE_PAD = 6;

/** Puts the drawing on a taller canvas and stamps the hat with its bottom-centre at (hx, hatBottom). */
function withHat(c: PixelCanvas, pad: number, hat: HatId | null, view: "front" | "side", hx: number, hatBottom: number): PixelCanvas {
  const out = new PixelCanvas(c.w, c.h + pad);
  out.stamp(c, 0, pad);
  if (hat) out.stamp(hatCanvas(hat, view), Math.round(hx) - ANCHOR_X, pad + Math.round(hatBottom) - ANCHOR_Y);
  return out;
}

/**
 * Nova the fox in pixel form: the student's hero in battles. Faces right (towards the boss).
 * Idle loop of 4 frames (tail swish, lantern flicker, a blink), plus attack and hurt poses.
 */
type Pose = { kind: "idle"; f: number } | { kind: "attack" } | { kind: "hurt" };

const LIGHT: Record<string, string> = { o: "Y", O: "o", W: "w", d: "T" };
const DARK: Record<string, string> = { o: "O", W: "e", w: "W" };

function nova(p: Pose, hat: HatId | null = null): PixelCanvas {
  const c = new PixelCanvas(28, 26);
  const atk = p.kind === "attack";
  const hurt = p.kind === "hurt";
  const f = p.kind === "idle" ? p.f : 0;
  const dx = atk ? 2 : hurt ? -1 : 0; // lean into the attack, recoil when hit
  const dy = hurt ? 1 : 0;
  // tail curls up behind, swishing
  const tailY = f === 1 || f === 2 ? 17 : 18;
  c.ellipse(19.5 + dx - (atk ? 1 : 0), tailY + dy - (atk ? 2 : 0), 4, 3, "o");
  c.ellipse(22 + dx - (atk ? 1 : 0), tailY - 2 + dy - (atk ? 2 : 0), 1.5, 1.5, "w");
  // body and chest
  c.ellipse(12.5 + dx, 18 + dy, 5, 5, "o");
  c.ellipse(12.5 + dx, 19 + dy, 2.5, 3.5, "W");
  // head (pushed forward on attack)
  const hx = 12.5 + dx + (atk ? 1 : 0);
  const hy = 10 + dy;
  c.ellipse(hx, hy, 6, 4.5, "o");
  // ears (flattened when hurt)
  if (hurt) {
    c.tri(hx - 6, hy - 1, hx - 3, hy - 5, hx - 1.5, hy - 3, "o");
    c.tri(hx + 1.5, hy - 3, hx + 3, hy - 5, hx + 6, hy - 1, "o");
  } else {
    c.tri(hx - 6, hy - 2, hx - 4, hy - 8.5, hx - 1.5, hy - 3.5, "o");
    c.tri(hx + 1.5, hy - 3.5, hx + 4, hy - 8.5, hx + 6, hy - 2, "o");
    c.tri(hx - 4.5, hy - 4, hx - 3.8, hy - 6.5, hx - 2.5, hy - 4, "O");
    c.tri(hx + 2.5, hy - 4, hx + 3.8, hy - 6.5, hx + 4.5, hy - 4, "O");
  }
  // muzzle and cheeks
  c.ellipse(hx, hy + 2, 3, 1.8, "W");
  c.set(hx - 5.5, hy + 1, "W").set(hx + 5.5, hy + 1, "W");
  // eyes
  const ex = Math.round(hx - 3.5);
  const ey = Math.round(hy - 1);
  if (hurt) {
    // squeezed shut: > <
    c.set(ex, ey, "k").set(ex + 1, ey + 1, "k").set(ex, ey + 2, "k");
    c.set(ex + 7, ey, "k").set(ex + 6, ey + 1, "k").set(ex + 7, ey + 2, "k");
  } else if (f === 3) {
    c.hline(ex, ex + 1, ey + 1, "k").hline(ex + 6, ex + 7, ey + 1, "k");
  } else {
    c.rect(ex, ey, 2, 2, "k").rect(ex + 6, ey, 2, 2, "k");
    c.set(ex, ey, "w").set(ex + 6, ey, "w");
    if (atk) c.line(ex - 1, ey - 2, ex + 2, ey - 1, "k").line(ex + 8, ey - 2, ex + 5, ey - 1, "k"); // determined brows
  }
  c.rect(Math.round(hx - 0.5), hy + 1, 2, 1, "k");
  if (!hurt) c.set(ex, hy + 2, "p").set(ex + 7, hy + 2, "p");
  if (atk) c.hline(Math.round(hx - 1), Math.round(hx + 1), hy + 3, "k"); // open mouth: a battle cry
  // paws
  c.rect(9 + dx, 22 + dy, 2, 1, "W").rect(14 + dx, 22 + dy, 2, 1, "W");
  // lantern: on the ground, or swung up high to strike
  const glow = f === 1 ? "Y" : "y";
  if (atk) {
    c.line(17 + dx, 15, 21 + dx, 9, "d");
    c.rect(20 + dx, 3, 5, 6, "y");
    c.rect(21 + dx, 4, 3, 4, "w");
    c.hline(20 + dx, 24 + dx, 2, "A").hline(20 + dx, 24 + dx, 9, "A");
  } else {
    c.rect(2, 16, 5, 6, glow);
    c.rect(3, 17, 3, 4, f === 1 ? "y" : "w");
    c.hline(2, 6, 15, "A").hline(2, 6, 22, "A");
    c.vline(4, 13, 14, "d").set(3, 13, "d").set(5, 13, "d");
  }
  c.shade(LIGHT, DARK);
  c.outline("k");
  // light: a soft speck by the lantern, or a burst of rays when attacking
  if (atk) {
    for (const [x, y] of [
      [26, 1],
      [27, 5],
      [26, 9],
      [19, 1],
      [22, 0],
    ])
      c.set(x + dx - 2, y, "f");
  } else if (f !== 1) c.set(0, 18, "Y");
  return withHat(c, FRONT_PAD, hat, "front", hx, hy - 4);
}

// ---------------------------------------------------------------------------
// Nova from the side, facing right: she walks the journey strip during a round.

type SidePose =
  | { kind: "walk" | "run" | "sit" | "sprint" | "roll" | "dazed" | "leap"; f: number }
  | { kind: "trip" }
  | { kind: "jump" }
  | { kind: "hop"; dir: -1 | 1 };
const SW = 24;
const SH = 16;

function side(p: SidePose, hat: HatId | null = null): PixelCanvas {
  const c = new PixelCanvas(SW, SH);
  const f = "f" in p ? p.f : 0;
  const sprint = p.kind === "sprint";
  const run = p.kind === "run" || sprint;
  const sit = p.kind === "sit" || p.kind === "dazed";
  const dazed = p.kind === "dazed";
  const trip = p.kind === "trip";
  const hop = p.kind === "hop" ? p.dir : 0;
  const leap = p.kind === "leap";
  const jump = p.kind === "jump" || hop !== 0 || leap;
  const bob =
    p.kind === "walk"
      ? [0, -1, 0, -1][f % 4]
      : sprint
        ? [0, -1, -2, -1, 0, -1][f % 6]
        : run
          ? [0, -1, -1, 0][f % 4]
          : leap
            ? (f % 2 ? -3 : -2)
            : hop
              ? (hop < 0 ? -2 : 1)
              : jump
                ? -3
                : 0;

  if (p.kind === "roll") {
    // tumbling head over heels after a wrong gate: a curled-up ball, tail wrapping round
    const a = (f % 2) * Math.PI * 0.9;
    c.ellipse(11.5, 10, 5.5, 5, "o");
    c.ellipse(12.5, 11.5, 3, 2.5, "W");
    const tx = 11.5 + Math.cos(a + 2.4) * 6;
    const ty = 10 + Math.sin(a + 2.4) * 5;
    c.ellipse(tx, ty, 2.2, 1.6, "o");
    c.ellipse(tx + Math.cos(a + 2.4) * 1.5, ty + Math.sin(a + 2.4) * 1.2, 1.2, 1, "w");
    const ex = 11.5 + Math.cos(a) * 3;
    const ey = 10 + Math.sin(a) * 3;
    c.tri(ex - 1, ey - 1, ex + 1, ey - 1, ex + Math.cos(a - 0.6) * 4, ey + Math.sin(a - 0.6) * 4, "o");
    c.line(Math.round(ex) - 1, Math.round(ey) - 1, Math.round(ex) + 1, Math.round(ey) + 1, "k").line(Math.round(ex) - 1, Math.round(ey) + 1, Math.round(ex) + 1, Math.round(ey) - 1, "k");
    c.shade(LIGHT, DARK);
    c.outline("k");
    // motion lines behind the roll
    c.hline(0, 3, 7, "e").hline(1, 4, 12, "e");
    return withHat(c, SIDE_PAD, null, "side", 11.5, 5);
  }

  if (sit) {
    // sitting upright, tail curled round the paws
    c.ellipse(4, 13, 4, 1.6, "o");
    c.ellipse(1.5, 12.5, 1.6, 1.2, "w");
    c.ellipse(11, 10, 4, 4.5, "o");
    c.ellipse(12.5, 11, 2, 3, "W");
    c.rect(10, 14, 2, 1, "d").rect(13, 14, 2, 1, "d");
    const hy = 5 - (f % 2 ? 0 : 0);
    c.ellipse(13.5, hy, 3.6, 3.1, "o");
    c.tri(15.5, hy - 1, 15.5, hy + 2, 19.5, hy + 1, "o");
    c.tri(15.5, hy + 1, 19, hy + 1, 16, hy + 3, "W");
    c.set(19, hy + 1, "k");
    c.tri(11, hy - 2, 13, hy - 2, 11.5, hy - 6, "o");
    c.tri(13.5, hy - 2, 15.5, hy - 2, 15, hy - 6, "o");
    c.set(12, hy - 3, "O").set(14.5, hy - 3, "O");
    if (dazed) c.line(14, hy - 1, 16, hy + 1, "k").line(14, hy + 1, 16, hy - 1, "k");
    else if (f % 2) c.hline(15, 16, hy, "k");
    else c.set(15, hy - 1, "k").set(15, hy, "k");
    c.shade(LIGHT, DARK);
    c.outline("k");
    const out = withHat(c, SIDE_PAD, dazed ? null : hat, "side", 13.5, hy - 2);
    if (dazed) {
      // little stars circling her head
      const r = f % 2 ? [[9, 2], [17, 4], [13, 0]] : [[11, 1], [15, 1], [18, 3]];
      for (const [x, y] of r) out.set(x, y + SIDE_PAD - 3, "y").set(x + 1, y + SIDE_PAD - 3, "f");
    }
    return out;
  }

  const by = 10 + bob + (trip ? 1 : 0);
  // tail: up and bouncing when walking, streaming flat when running
  if (run) {
    c.ellipse(3, by - 1, 3.5, 1.6, "o");
    c.ellipse(0.5, by - 1, 1.4, 1.1, "w");
  } else {
    const ty = by - 3 - (f % 2) + (trip ? 2 : 0);
    c.ellipse(3.5, ty, 2.6, 2, "o");
    c.ellipse(1.5, ty - 1, 1.4, 1.2, "w");
  }
  // body and belly
  c.ellipse(10, by, run ? 6 : 5.5, 3, "o");
  c.ellipse(10.5, by + 1.6, run ? 4 : 3.6, 1.1, "W");
  // legs: two pairs swinging in opposite phase
  const swing = sprint ? [3, 2, 0, -3, -2, 0][f % 6] : run ? [3, 1, -3, -1][f % 4] : leap ? 3 : jump ? 0 : trip ? 3 : [1, 0, -1, 0][f % 4];
  const legTop = by + 2;
  const foot = Math.min(SH - 1, legTop + (jump ? 2 : 3));
  const leg = (x: number, s: number) => {
    c.line(x, legTop, x + s, foot, "o");
    if (run) c.line(x + 1, legTop, x + 1 + s, foot, "o"); // sturdier legs at full stretch
    c.set(x + s, foot, "d");
    if (run) c.set(x + 1 + s, foot, "d");
  };
  if (leap) {
    // stretched out through the gate: front legs reaching forward, back legs pushing off
    c.line(14, legTop, 18, legTop + 1, "o").line(13, legTop, 17, legTop + 2, "o");
    c.line(7, legTop, 3, legTop + 2, "o").line(6, legTop, 2, legTop + 1, "o");
    c.set(18, legTop + 1, "d").set(2, legTop + 1, "d");
  } else if (jump) {
    // tucked up mid-leap
    c.hline(6, 8, legTop + 1, "d").hline(12, 14, legTop + 1, "d");
  } else {
    leg(run ? 5 : 6, -swing);
    leg(8, swing);
    leg(run ? 12 : 13, swing);
    leg(15, -swing);
  }
  // head: drooped forward when tripping
  const hx = 17 + (run || leap ? 1 : 0);
  const hy = by - 3 + (trip ? 3 : 0) + (hop > 0 ? 1 : 0);
  c.ellipse(hx, hy, 3.6, 3.1, "o");
  c.tri(hx + 2, hy - 1, hx + 2, hy + 2, hx + 6, hy + 1, "o");
  c.tri(hx + 2, hy + 1, hx + 5.5, hy + 1, hx + 2.5, hy + 3, "W");
  c.set(Math.min(SW - 1, hx + 6), hy + 1, "k");
  // ears: laid back when running or leaping
  if (run || leap) {
    c.tri(hx - 3, hy - 2, hx, hy - 2, hx - 5, hy - 4, "o");
    c.tri(hx - 1, hy - 2, hx + 1, hy - 2, hx - 2, hy - 5, "o");
  } else {
    c.tri(hx - 2.5, hy - 2, hx - 0.5, hy - 2, hx - 2, hy - 6, "o");
    c.tri(hx, hy - 2, hx + 2, hy - 2, hx + 1.5, hy - 6, "o");
    c.set(hx - 2, hy - 3, "O").set(hx + 1, hy - 3, "O");
  }
  // eye: open, a happy ^ when jumping, squeezed shut when tripping
  if (trip) c.line(hx + 1, hy - 1, hx + 2, hy, "k").line(hx + 1, hy + 1, hx + 2, hy, "k");
  else if (p.kind === "jump" || leap) c.set(hx + 1, hy, "k").set(hx + 2, hy - 1, "k").set(hx + 3, hy, "k");
  else c.set(hx + 1, hy - 1, "k").set(hx + 1, hy, "k");
  c.shade(LIGHT, DARK);
  c.outline("k");
  // a puff of dust behind running feet, stars when tripping
  if (run && f % 2 === 0) c.set(1, SH - 2, "e").set(0, SH - 3, "e");
  if (leap) c.set(1, 3 + (f % 2), "f").set(4, 1, "y").set(21, 2 - (f % 2), "y");
  if (trip) c.set(hx + 3, 1, "y").set(hx - 3, 2, "y");
  return withHat(c, SIDE_PAD, hat, "side", hx - 0.5, hy - 2);
}

export interface NovaSprites {
  idle: Sprite;
  attack: Sprite;
  hurt: Sprite;
  walk: Sprite;
  run: Sprite;
  sit: Sprite;
  trip: Sprite;
  jump: Sprite;
  /** Runner game poses. */
  sprint: Sprite;
  hopUp: Sprite;
  hopDown: Sprite;
  leap: Sprite;
  roll: Sprite;
  dazed: Sprite;
}

const sets = new Map<string, NovaSprites>();

/** Every Nova sprite, wearing the given hat (or none). Cached per hat. */
export function novaSprites(hat: HatId | null = null): NovaSprites {
  const key = hat ?? "none";
  let s = sets.get(key);
  if (!s) {
    const four = (fn: (f: number) => PixelCanvas) => sprite(...[0, 1, 2, 3].map(fn));
    s = {
      idle: four((f) => nova({ kind: "idle", f }, hat)),
      attack: sprite(nova({ kind: "attack" }, hat)),
      hurt: sprite(nova({ kind: "hurt" }, hat)),
      walk: four((f) => side({ kind: "walk", f }, hat)),
      run: four((f) => side({ kind: "run", f }, hat)),
      sit: sprite(...[0, 0, 0, 1].map((f) => side({ kind: "sit", f }, hat))),
      trip: sprite(side({ kind: "trip" }, hat)),
      jump: sprite(side({ kind: "jump" }, hat)),
      sprint: sprite(...[0, 1, 2, 3, 4, 5].map((f) => side({ kind: "sprint", f }, hat))),
      hopUp: sprite(side({ kind: "hop", dir: -1 }, hat)),
      hopDown: sprite(side({ kind: "hop", dir: 1 }, hat)),
      leap: sprite(...[0, 1].map((f) => side({ kind: "leap", f }, hat))),
      roll: sprite(...[0, 1].map((f) => side({ kind: "roll", f }, hat))),
      dazed: sprite(...[0, 1].map((f) => side({ kind: "dazed", f }, hat))),
    };
    sets.set(key, s);
  }
  return s;
}

const plain = novaSprites(null);
export const novaSprite: Sprite = plain.idle;
export const novaAttack: Sprite = plain.attack;
export const novaHurt: Sprite = plain.hurt;
export const novaWalk: Sprite = plain.walk;
export const novaRun: Sprite = plain.run;
export const novaSit: Sprite = plain.sit;
export const novaTrip: Sprite = plain.trip;
export const novaJump: Sprite = plain.jump;
