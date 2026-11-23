import { PixelCanvas, sprite, type Sprite } from "../canvas";

/**
 * Nova the fox in pixel form: the student's hero in battles. Faces right (towards the boss).
 * Idle loop of 4 frames (tail swish, lantern flicker, a blink), plus attack and hurt poses.
 */
type Pose = { kind: "idle"; f: number } | { kind: "attack" } | { kind: "hurt" };

const LIGHT: Record<string, string> = { o: "Y", O: "o", W: "w", d: "T" };
const DARK: Record<string, string> = { o: "O", W: "e", w: "W" };

function nova(p: Pose): PixelCanvas {
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
  return c;
}

export const novaSprite: Sprite = sprite(...[0, 1, 2, 3].map((f) => nova({ kind: "idle", f })));
export const novaAttack: Sprite = sprite(nova({ kind: "attack" }));
export const novaHurt: Sprite = sprite(nova({ kind: "hurt" }));
