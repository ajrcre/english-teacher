/**
 * Fitting the mini-games' pixel fields to the screen (pure functions, shared by the games and tests).
 *
 * A field has a fixed logical width; its logical height is chosen once, when a question starts,
 * to match the space the screen has for it (taller on a phone held upright), within limits.
 * The field is then scaled up crisply to fill that space.
 */

export interface Box {
  w: number;
  h: number;
}

/** The logical height that best fills a box, for a field `w` logical pixels wide. */
export function fieldHeight(box: Box, w: number, min: number, max: number): number {
  if (box.w <= 0 || box.h <= 0) return min;
  return Math.round(Math.min(max, Math.max(min, (w * box.h) / box.w)));
}

/** The on-screen size of a `w`×`h` field scaled to fit inside a box, keeping its shape. */
export function fitBox(box: Box, w: number, h: number): Box {
  const scale = Math.max(0, Math.min(box.w / w, box.h / h));
  return { w: Math.floor(w * scale), h: Math.floor(h * scale) };
}

/** A point on screen in the field's logical pixels (may lie outside the field). */
export function toField(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }, w: number, h: number) {
  return {
    x: rect.width > 0 ? ((clientX - rect.left) / rect.width) * w : w / 2,
    y: rect.height > 0 ? ((clientY - rect.top) / rect.height) * h : h / 2,
  };
}

/** Taps that belong to a control (buttons, links, fields, or anything marked data-no-steer) don't steer. */
export function isControl(target: EventTarget | null): boolean {
  return typeof Element !== "undefined" && target instanceof Element && !!target.closest("button, a, input, select, textarea, [data-no-steer]");
}
