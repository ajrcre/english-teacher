"use client";

import { useEffect, useRef } from "react";
import type { Sprite } from "@/lib/pixel/canvas";
import { PALETTE, TRANSPARENT } from "@/lib/pixel/palette";
import { cx } from "@/lib/ui";

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Draws a large sprite (a battle backdrop) onto a <canvas> at its native size and lets CSS
 * scale it up with crisp pixels. Much lighter than thousands of SVG rects. Animates frames.
 */
export function PixelScene({ sprite, fps = 3, className, label }: { sprite: Sprite; fps?: number; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const images = sprite.frames.map((rows) => {
      const img = ctx.createImageData(sprite.w, sprite.h);
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === TRANSPARENT) continue;
          const [r, g, b] = toRgb(PALETTE[ch] ?? "#ff00ff");
          const i = (y * sprite.w + x) * 4;
          img.data[i] = r;
          img.data[i + 1] = g;
          img.data[i + 2] = b;
          img.data[i + 3] = 255;
        }
      });
      return img;
    });
    let frame = 0;
    ctx.putImageData(images[0], 0, 0);
    if (images.length < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      frame = (frame + 1) % images.length;
      ctx.putImageData(images[frame], 0, 0);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [sprite, fps]);

  return <canvas ref={ref} width={sprite.w} height={sprite.h} className={cx("pixelated block h-auto w-full", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
