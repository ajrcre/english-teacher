"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { toRects, type Sprite } from "@/lib/pixel/canvas";
import { cx } from "@/lib/ui";

/**
 * Renders pixel art as crisp SVG rectangles at a whole-number scale.
 * Multi-frame sprites animate at `fps` (paused for people who prefer reduced motion).
 */
export function PixelSprite({
  sprite,
  scale = 4,
  fps = 2,
  frame,
  className,
  style,
  title,
  silhouette = false,
}: {
  sprite: Sprite;
  scale?: number;
  fps?: number;
  /** Show this frame only (no animation). */
  frame?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Draw every pixel in one flat colour (for items not collected yet). */
  silhouette?: boolean;
}) {
  const [tick, setTick] = useState(0);
  const animate = frame === undefined && sprite.frames.length > 1 && fps > 0;

  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000 / fps);
    return () => clearInterval(id);
  }, [animate, fps]);

  const index = frame ?? (animate ? tick % sprite.frames.length : 0);
  const rects = useMemo(() => sprite.frames.map((f) => toRects(f)), [sprite]);

  return (
    <svg
      viewBox={`0 0 ${sprite.w} ${sprite.h}`}
      width={sprite.w * scale}
      height={sprite.h * scale}
      className={cx("pixelated shrink-0", className)}
      style={style}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {rects[Math.min(index, rects.length - 1)].map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={silhouette ? "currentColor" : r.c} />
      ))}
    </svg>
  );
}
