import { PixelCanvas, sprite, type Sprite } from "../canvas";
import { BOSSES } from "./bosses";

/** Sticker art, 16×16 (legendary boss stickers reuse the boss sprite at 32×32). */
const N = 16;
const draw = (fn: (c: PixelCanvas) => void): Sprite => {
  const c = new PixelCanvas(N, N);
  fn(c);
  c.outline("k");
  return sprite(c);
};

const ART: Record<string, Sprite> = {
  // Number the Stars
  "star-necklace": draw((c) => {
    c.line(3, 1, 7, 8, "g").line(12, 1, 8, 8, "g");
    c.tri(4.5, 10, 11.5, 10, 8, 4, "a");
    c.tri(4.5, 7, 11.5, 7, 8, 13, "a");
    c.set(7, 8, "y").set(8, 8, "y").set(7, 9, "y");
  }),
  "fishing-boat": draw((c) => {
    c.vline(7, 1, 9, "T");
    c.tri(8, 2, 8, 9, 13, 9, "W");
    c.tri(6, 3, 6, 9, 2, 9, "e");
    c.rect(1, 10, 14, 2, "T");
    c.rect(2, 12, 12, 1, "d");
    c.hline(0, 15, 14, "B");
    c.set(3, 14, "c").set(10, 14, "c");
  }),
  "secret-packet": draw((c) => {
    c.rect(2, 4, 12, 8, "W");
    c.line(2, 4, 8, 9, "e").line(13, 4, 8, 9, "e");
    c.vline(8, 4, 11, "r").hline(2, 13, 8, "r");
    c.rect(7, 7, 3, 3, "R");
  }),
  // The Giver
  "red-sled": draw((c) => {
    c.rect(2, 6, 11, 3, "r");
    c.hline(2, 12, 6, "p");
    c.vline(4, 9, 11, "g").vline(11, 9, 11, "g");
    c.hline(1, 14, 12, "g");
    c.vline(14, 10, 11, "g");
  }),
  apple: draw((c) => {
    c.ellipse(7.5, 9, 5, 5, "r");
    c.ellipse(5.5, 7, 1.5, 1.5, "p");
    c.vline(8, 2, 4, "d");
    c.ellipse(10.5, 3, 2, 1, "L");
  }),
  "memory-snowflake": draw((c) => {
    c.vline(7, 1, 14, "c").hline(1, 14, 7, "c");
    c.line(3, 3, 12, 12, "x").line(12, 3, 3, 12, "x");
    c.set(7, 7, "w");
    for (const [x, y] of [
      [6, 2],
      [8, 2],
      [6, 13],
      [8, 13],
      [2, 6],
      [2, 8],
      [13, 6],
      [13, 8],
    ])
      c.set(x, y, "c");
  }),
  // Short Stories
  "flying-saucer": draw((c) => {
    c.ellipse(7.5, 6, 3, 2.5, "c");
    c.set(6, 5, "x");
    c.ellipse(7.5, 9, 7, 2, "g");
    c.hline(2, 13, 8, "e");
    for (const x of [3, 6, 9, 12]) c.set(x, 9, "y");
    c.dither(5, 12, 6, 3, "y");
  }),
  "pocket-watch": draw((c) => {
    c.ellipse(7.5, 9, 6, 6, "a");
    c.ellipse(7.5, 9, 4.5, 4.5, "W");
    c.rect(7, 1, 2, 2, "a");
    c.vline(7, 6, 9, "k").line(7, 9, 10, 10, "k");
    c.set(7, 5, "g").set(11, 9, "g").set(4, 9, "g").set(7, 13, "g");
  }),
  "red-sweater": draw((c) => {
    c.rect(4, 3, 8, 11, "r");
    c.tri(4, 3, 0, 9, 4, 9, "r");
    c.tri(11, 3, 15, 9, 11, 9, "r");
    c.rect(0, 9, 3, 2, "R").rect(13, 9, 3, 2, "R");
    c.rect(6, 2, 4, 2, "R");
    c.hline(4, 11, 13, "R");
    c.hline(5, 10, 7, "p");
  }),
  // Poetry
  quill: draw((c) => {
    c.line(3, 13, 13, 1, "W");
    for (let i = 0; i < 9; i++) c.line(5 + i, 11 - i, 7 + i, 12 - i, "w");
    c.line(4, 12, 13, 2, "e");
    c.line(1, 15, 3, 13, "d");
  }),
  signpost: draw((c) => {
    c.vline(7, 2, 15, "T");
    c.rect(2, 3, 8, 3, "t");
    c.set(1, 4, "t");
    c.rect(6, 8, 8, 3, "t");
    c.set(14, 9, "t");
    c.hline(3, 8, 4, "T").hline(7, 12, 9, "T");
  }),
  "sleigh-bell": draw((c) => {
    c.ellipse(7.5, 8, 5.5, 5.5, "a");
    c.ellipse(5.5, 6, 1.5, 1.5, "y");
    c.hline(3, 12, 9, "A");
    c.rect(7, 10, 2, 2, "k");
    c.rect(6, 1, 4, 2, "r");
  }),
  // Grammar
  gear: draw((c) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.rect(Math.round(7 + Math.cos(a) * 6), Math.round(7 + Math.sin(a) * 6), 2, 2, "g");
    }
    c.ellipse(7.5, 7.5, 5, 5, "g");
    c.ellipse(7.5, 7.5, 2, 2, "G");
    c.ellipse(5.5, 5, 1, 1, "e");
  }),
  pencil: draw((c) => {
    for (let i = 0; i < 9; i++) c.rect(3 + i, 10 - i, 3, 2, "a");
    c.line(4, 11, 12, 3, "A");
    c.rect(12, 1, 2, 2, "p");
    c.tri(1, 15, 2, 11, 5, 13, "W");
    c.set(1, 14, "k");
  }),
  magnifier: draw((c) => {
    c.ellipse(6, 6, 5, 5, "g");
    c.ellipse(6, 6, 3.5, 3.5, "c");
    c.set(4, 4, "x").set(5, 4, "x");
    c.line(10, 10, 14, 14, "T").line(11, 10, 14, 13, "T");
  }),
  // Spelling Bee
  honeybee: draw((c) => {
    c.ellipse(5, 4, 3, 2.5, "c");
    c.ellipse(10, 4, 3, 2.5, "c");
    c.ellipse(7.5, 9, 6, 4, "a");
    for (const x of [6, 9]) c.vline(x, 6, 12, "k");
    c.ellipse(2, 9, 2, 2, "k");
    c.set(2, 8, "w");
  }),
  "honey-jar": draw((c) => {
    c.rect(3, 5, 10, 10, "a");
    c.rect(4, 6, 2, 6, "y");
    c.rect(2, 3, 12, 2, "T");
    c.rect(4, 2, 8, 1, "t");
    c.rect(6, 9, 4, 3, "W");
    c.vline(9, 1, 6, "Y");
  }),
  honeycomb: draw((c) => {
    const hex = (x: number, y: number, col: string) => {
      c.rect(x + 1, y, 3, 5, col);
      c.rect(x, y + 1, 5, 3, col);
    };
    hex(1, 1, "a");
    hex(6, 1, "Y");
    hex(11, 1, "a");
    hex(3, 6, "Y");
    hex(8, 6, "a");
    hex(1, 11, "a");
    hex(6, 11, "y");
    hex(11, 11, "Y");
  }),
  // Word Treasury
  gem: draw((c) => {
    c.tri(1, 6, 14, 6, 7.5, 15, "S");
    c.rect(3, 3, 10, 3, "s");
    c.tri(1, 6, 3, 3, 3, 6, "s");
    c.tri(14, 6, 12, 3, 12, 6, "s");
    c.line(5, 6, 7, 13, "s");
    c.set(5, 4, "w").set(6, 4, "w");
  }),
  "gold-coin": draw((c) => {
    c.ellipse(7.5, 7.5, 6, 6, "a");
    c.ellipse(7.5, 7.5, 4, 4, "Y");
    c.vline(7, 4, 11, "A").vline(8, 4, 11, "A");
    c.set(4, 4, "y").set(5, 3, "y");
  }),
  "treasure-map": draw((c) => {
    c.rect(2, 3, 12, 10, "W");
    c.vline(2, 3, 12, "e").vline(13, 3, 12, "e");
    c.rect(1, 2, 2, 12, "t").rect(13, 2, 2, 12, "t");
    c.dither(4, 5, 7, 6, "e");
    c.line(4, 10, 9, 6, "T");
    c.line(9, 5, 11, 7, "r").line(11, 5, 9, 7, "r");
  }),
};

for (const b of BOSSES) ART[`boss-${b.unitId}`] = sprite(b.sprite.frames[0]);

export function stickerArt(id: string): Sprite {
  return ART[id] ?? ART["gold-coin"];
}

export const STICKER_ART_IDS = Object.keys(ART);
