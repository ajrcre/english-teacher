import { PixelCanvas, sprite, type Sprite } from "../canvas";

/**
 * Sprites for the lane-runner game: answer gates (shimmering, bursting into light when Nova
 * runs through the right one, cracking on a wrong one), dust puffs and sparkles.
 */
const GW = 18;
const GH = 26;

const LIGHT: Record<string, string> = { T: "t", d: "T", u: "V", V: "v", A: "a", a: "Y" };
const DARK: Record<string, string> = { t: "T", T: "d", v: "V", V: "u", a: "A" };

type GateState = { kind: "idle"; f: number } | { kind: "burst"; f: number } | { kind: "cracked" } | { kind: "glow"; f: number };

function gate(st: GateState): PixelCanvas {
  const c = new PixelCanvas(GW, GH);
  const cracked = st.kind === "cracked";
  const burst = st.kind === "burst" ? st.f : -1;
  const glow = st.kind === "glow";
  const f = "f" in st ? st.f : 0;
  // posts and top beam
  const wood = cracked ? "G" : "T";
  c.rect(1, 3, 3, 23, wood).rect(14, 3, 3, 23, wood);
  c.rect(0, 1, 18, 3, cracked ? "G" : "d");
  c.hline(1, 16, 1, cracked ? "g" : "t");
  c.set(0, 0, "a").set(17, 0, "a").set(8, 0, "a").set(9, 0, "a");
  // the portal between the posts
  if (burst < 0) {
    const fill = cracked ? "m" : glow ? "a" : "u";
    c.rect(4, 4, 10, 22, fill);
    for (let y = 4; y < 26; y++)
      for (let x = 4; x < 14; x++) {
        const wave = (x + y + f * 2) % 5;
        if (!cracked && wave === 0) c.set(x, y, glow ? "y" : "V");
        if (!cracked && wave === 1 && (x * y) % 3 === 0) c.set(x, y, glow ? "f" : "v");
      }
  } else {
    // bursting open: the portal empties from the middle out, light spills out
    const open = 2 + burst * 3;
    c.rect(4, 4, 10, 22, "y");
    c.rect(Math.max(4, 9 - open), 4, Math.min(10, open * 2), 22, ".");
  }
  if (cracked) {
    c.line(6, 6, 9, 12, "k").line(9, 12, 7, 17, "k").line(9, 12, 12, 15, "k").line(7, 17, 10, 23, "k");
    c.set(2, 10, "g").set(15, 18, "g");
  }
  c.shade(LIGHT, DARK);
  c.outline("k");
  if (burst >= 0) {
    // light rays and sparks flying out
    const r = 3 + burst * 2;
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
      [0, -1],
    ])
      c.set(9 + dx * r, 13 + dy * r, burst === 2 ? "y" : "f");
  }
  return c;
}

export const gateIdle: Sprite = sprite(gate({ kind: "idle", f: 0 }), gate({ kind: "idle", f: 1 }), gate({ kind: "idle", f: 2 }));
export const gateGlow: Sprite = sprite(gate({ kind: "glow", f: 0 }), gate({ kind: "glow", f: 1 }), gate({ kind: "glow", f: 2 }));
export const gateBurst: Sprite = sprite(gate({ kind: "burst", f: 0 }), gate({ kind: "burst", f: 1 }), gate({ kind: "burst", f: 2 }));
export const gateCracked: Sprite = sprite(gate({ kind: "cracked" }));

/** A puff of dust kicked up by Nova's feet (3 frames, growing and fading). */
export const dust: Sprite = sprite(
  ...[0, 1, 2].map((f) => {
    const c = new PixelCanvas(8, 6);
    const r = 1 + f;
    c.ellipse(4, 3, r, Math.max(1, r - 1), f === 2 ? "e" : "W");
    if (f === 2) c.dither(0, 0, 8, 6, ".", "e");
    return c;
  }),
);

/** A twinkling sparkle (3 frames). */
export const sparkle: Sprite = sprite(
  ...[0, 1, 2].map((f) => {
    const c = new PixelCanvas(7, 7);
    const arm = [1, 3, 2][f];
    c.set(3, 3, "f");
    for (let i = 1; i <= arm; i++) c.set(3 + i, 3, "y").set(3 - i, 3, "y").set(3, 3 + i, "y").set(3, 3 - i, "y");
    return c;
  }),
);
