import { PixelCanvas, sprite, type Sprite } from "../canvas";

/** Shop avatars: pixel portraits on a round night-sky tile, 24×24. */
const N = 24;

function tile(fn: (c: PixelCanvas) => void): Sprite {
  const c = new PixelCanvas(N, N);
  c.ellipse(11.5, 11.5, 11.5, 11.5, "N");
  c.ellipse(11.5, 14, 10, 8, "b");
  c.set(4, 6, "y").set(19, 4, "Y").set(20, 9, "y");
  const head = new PixelCanvas(N, N);
  fn(head);
  head.outline("k");
  c.stamp(head, 0, 0);
  // keep the round tile edge clean
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - 11.5, y - 11.5) > 11.8) c.set(x, y, ".");
  return sprite(c);
}

export const SHOP_AVATAR_ART: Record<string, Sprite> = {
  dragon: tile((c) => {
    c.tri(6, 9, 8, 9, 5, 3, "W");
    c.tri(15, 9, 17, 9, 18, 3, "W");
    c.ellipse(11.5, 13, 7, 6, "L");
    c.ellipse(11.5, 17, 5, 3, "l");
    c.set(9, 17, "k").set(14, 17, "k");
    c.rect(8, 11, 2, 2, "y").rect(14, 11, 2, 2, "y");
    c.set(9, 12, "k").set(14, 12, "k");
    c.hline(7, 16, 21, "L");
    for (const x of [10, 13]) c.set(x, 6, "S");
  }),
  phoenix: tile((c) => {
    c.tri(11, 8, 13, 8, 9, 1, "a");
    c.tri(10, 8, 12, 8, 13, 2, "o");
    c.tri(12, 8, 14, 8, 16, 3, "a");
    c.ellipse(11.5, 13, 6, 6, "o");
    c.ellipse(11.5, 16, 4, 3, "Y");
    c.rect(8, 11, 2, 2, "k").rect(14, 11, 2, 2, "k");
    c.set(8, 11, "w").set(14, 11, "w");
    c.tri(10, 14, 13, 14, 11.5, 18, "a");
    c.ellipse(11.5, 21, 7, 2, "r");
  }),
  panda: tile((c) => {
    c.ellipse(6, 7, 2.5, 2.5, "G");
    c.ellipse(17, 7, 2.5, 2.5, "G");
    c.ellipse(11.5, 13, 7.5, 6.5, "w");
    c.ellipse(8, 12, 2, 2.5, "G");
    c.ellipse(15, 12, 2, 2.5, "G");
    c.set(8, 11, "w").set(15, 11, "w");
    c.ellipse(11.5, 16, 2.5, 1.5, "W");
    c.rect(11, 15, 2, 1, "k");
    c.ellipse(11.5, 22, 6, 2, "G");
  }),
  cat: tile((c) => {
    c.tri(5, 10, 9, 7, 6, 2, "g");
    c.tri(14, 7, 18, 10, 17, 2, "g");
    c.tri(6.5, 8, 8, 7, 6.6, 5, "p");
    c.tri(15, 7, 16.5, 8, 16.4, 5, "p");
    c.ellipse(11.5, 13, 7, 6, "g");
    for (const y of [9, 11]) c.hline(10, 13, y, "G");
    c.rect(8, 12, 2, 2, "l").rect(14, 12, 2, 2, "l");
    c.set(9, 12, "k").set(14, 12, "k");
    c.set(11, 15, "p").set(12, 15, "p");
    c.hline(3, 6, 15, "e").hline(17, 20, 15, "e");
    c.ellipse(11.5, 21, 6, 2, "e");
  }),
};
