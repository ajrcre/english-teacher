import { mirrored, PixelCanvas, sprite, type Sprite } from "../canvas";

const HEART = ["..kk...kk..", ".krrk.krrk.", "krpprkrrrrk", "krprrrrrrRk", "krrrrrrrrRk", ".krrrrrrRk.", "..krrrrRk..", "...krrRk...", "....kRk....", ".....k....."];

export const heartFull: Sprite = sprite(HEART);
export const heartEmpty: Sprite = sprite(PixelCanvas.fromRows(HEART).swap("r", "G").swap("p", "g").swap("R", "m").rows());

export const pixelStar: Sprite = sprite(["....k....", "...kyk...", "...kak...", "kkkkaakkk", "kyaaaaaAk", ".kaaaaAk.", "..kaaaAk.", ".kaaAkAAk", ".kAk..kAk", ".kk....kk"].map((r) => r.padEnd(9, ".").slice(0, 9)));

/** Treasure chest, closed and open; tiers recolour the wood. */
const CHEST_CLOSED = [
  "..kkkkkk",
  ".kTTTTTT",
  "kTtttttt",
  "kTtttttt",
  "kTTTTTTT",
  "kAaaaaaa",
  "kdTTTTky",
  "kdttttyk",
  "kdttttkk",
  "kdTTTTTT",
  "kdtttttt",
  "kAaaaaaa",
  "kdTTTTTT",
  ".kkkkkkk",
];

const CHEST_OPEN = [
  "..kkkkkk",
  ".kTTTTTT",
  "kTdddddd",
  "kkkkkkkk",
  "kYyyYyyy",
  "kAyYayaY",
  "kdTTTTky",
  "kdttttyk",
  "kdttttkk",
  "kdTTTTTT",
  "kdtttttt",
  "kAaaaaaa",
  "kdTTTTTT",
  ".kkkkkkk",
];

export type ChestTier = "wood" | "boss";

function chestCanvas(half: string[], tier: ChestTier): PixelCanvas {
  const c = mirrored(half);
  if (tier === "boss") c.swap("T", "V").swap("t", "v").swap("d", "u");
  return c;
}

export const chests: Record<ChestTier, { closed: Sprite; open: Sprite }> = {
  wood: { closed: sprite(chestCanvas(CHEST_CLOSED, "wood")), open: sprite(chestCanvas(CHEST_OPEN, "wood")) },
  boss: { closed: sprite(chestCanvas(CHEST_CLOSED, "boss")), open: sprite(chestCanvas(CHEST_OPEN, "boss")) },
};

/** A little sword for the "attack" moment. */
export const sword: Sprite = sprite([
  "........kk",
  ".......kwk",
  "......kwck",
  ".....kwck.",
  ".k..kwck..",
  "kak.kck...",
  ".kakkk....",
  "..kak.....",
  ".kdkak....",
  "kdk..k....",
  ".k........",
]);

/** Streak shield for the shop. */
export const shield: Sprite = (() => {
  const c = new PixelCanvas(14, 16);
  c.rect(1, 1, 12, 8, "B");
  c.tri(1, 8, 13, 8, 7, 15, "B");
  c.rect(2, 2, 5, 6, "c");
  c.tri(2, 8, 7, 8, 7, 13, "c");
  c.vline(7, 2, 13, "D");
  // a little flame: it guards your streak
  c.tri(5, 10, 9, 10, 7, 4, "a");
  c.tri(6, 10, 8, 10, 7, 7, "y");
  c.outline("k");
  return sprite(c);
})();
