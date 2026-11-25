"use client";

import type { Sprite } from "@/lib/pixel/canvas";
import { PALETTE, TRANSPARENT } from "@/lib/pixel/palette";

const rgb = new Map<string, [number, number, number]>();
function toRgb(ch: string): [number, number, number] {
  let c = rgb.get(ch);
  if (!c) {
    const n = parseInt((PALETTE[ch] ?? "#ff00ff").slice(1), 16);
    rgb.set(ch, (c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]));
  }
  return c;
}

const cache = new WeakMap<Sprite, HTMLCanvasElement[]>();

/** Each frame of a sprite as a small canvas, ready for drawImage in a game loop. Cached per sprite. */
export function spriteFrames(s: Sprite): HTMLCanvasElement[] {
  let frames = cache.get(s);
  if (frames) return frames;
  frames = s.frames.map((rows) => {
    const c = document.createElement("canvas");
    c.width = s.w;
    c.height = s.h;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(s.w, s.h);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === TRANSPARENT) continue;
        const [r, g, b] = toRgb(row[x]);
        const i = (y * s.w + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    });
    ctx.putImageData(img, 0, 0);
    return c;
  });
  cache.set(s, frames);
  return frames;
}

/** A sprite frame drawn mirrored left-to-right next to itself: a seamlessly looping strip. */
export function loopStrip(s: Sprite, frame = 0): HTMLCanvasElement {
  const src = spriteFrames(s)[frame];
  const c = document.createElement("canvas");
  c.width = s.w * 2;
  c.height = s.h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  ctx.save();
  ctx.translate(s.w * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  return c;
}
