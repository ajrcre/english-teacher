import { PALETTE, TRANSPARENT } from "./palette";

/** A sprite: one or more frames, each a list of equal-length rows of palette characters. */
export interface Sprite {
  w: number;
  h: number;
  frames: string[][];
}

/** A tiny drawing surface for building pixel art in code (shapes, mirroring, outlines). */
export class PixelCanvas {
  readonly px: string[][];

  constructor(
    readonly w: number,
    readonly h: number,
    fill: string = TRANSPARENT,
  ) {
    this.px = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }

  static fromRows(rows: string[]): PixelCanvas {
    const c = new PixelCanvas(rows[0]?.length ?? 0, rows.length);
    rows.forEach((row, y) => [...row].forEach((ch, x) => (c.px[y][x] = ch)));
    return c;
  }

  clone(): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    this.px.forEach((row, y) => row.forEach((ch, x) => (c.px[y][x] = ch)));
    return c;
  }

  get(x: number, y: number): string {
    return this.px[y]?.[x] ?? TRANSPARENT;
  }

  set(x: number, y: number, c: string): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y][x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  hline(x0: number, x1: number, y: number, c: string): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
    return this;
  }

  vline(x: number, y0: number, y1: number, c: string): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) this.set(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, c);
    return this;
  }

  /** Filled ellipse; centre and radii may be fractional (e.g. 7.5 for an even-width shape). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - (cx + 0.5)) / (rx + 0.25);
        const dy = (y + 0.5 - (cy + 0.5)) / (ry + 0.25);
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Filled triangle by scanline. */
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: string): this {
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    const minX = Math.floor(Math.min(x0, x1, x2));
    const maxX = Math.ceil(Math.max(x0, x1, x2));
    const area = (ax: number, ay: number, bx: number, by: number, px: number, py: number) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    const total = area(x0, y0, x1, y1, x2, y2);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const a = area(x1, y1, x2, y2, px, py) / total;
        const b = area(x2, y2, x0, y0, px, py) / total;
        const g = area(x0, y0, x1, y1, px, py) / total;
        if (a >= -0.01 && b >= -0.01 && g >= -0.01) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Checkerboard dither of colour `c` over a rectangle (only on pixels matching `onlyOn`, if given). */
  dither(x: number, y: number, w: number, h: number, c: string, onlyOn?: string): this {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const X = x + i;
        const Y = y + j;
        if ((X + Y) % 2 === 0 && (!onlyOn || this.get(X, Y) === onlyOn)) this.set(X, Y, c);
      }
    return this;
  }

  /** Replaces every pixel of one colour with another. */
  swap(from: string, to: string): this {
    this.px.forEach((row) => row.forEach((ch, x) => ch === from && (row[x] = to)));
    return this;
  }

  /** Copies the left half onto the right half, mirrored (for symmetric creatures and objects). */
  mirrorX(): this {
    const half = Math.floor(this.w / 2);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < half; x++) this.px[y][this.w - 1 - x] = this.px[y][x];
    return this;
  }

  /** Draws `c` on every transparent pixel that touches a filled one (4-neighbourhood). */
  outline(c = "k"): this {
    const src = this.clone();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (src.get(x, y) !== TRANSPARENT) continue;
        const near = [src.get(x - 1, y), src.get(x + 1, y), src.get(x, y - 1), src.get(x, y + 1)];
        if (near.some((n) => n !== TRANSPARENT && n !== c)) this.set(x, y, c);
      }
    return this;
  }

  /**
   * Simple lighting from the top-left: pixels on an upper/left edge of the shape get the
   * lighter shade, pixels near a lower/right edge get the darker one. Gives flat shapes volume.
   */
  shade(light: Record<string, string>, dark: Record<string, string>): this {
    const src = this.clone();
    const empty = (x: number, y: number) => src.get(x, y) === TRANSPARENT;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const ch = src.get(x, y);
        if (ch === TRANSPARENT) continue;
        if ((empty(x, y - 1) || empty(x - 1, y)) && light[ch]) this.set(x, y, light[ch]);
        else if ((empty(x, y + 1) || empty(x + 1, y) || empty(x, y + 2)) && dark[ch]) this.set(x, y, dark[ch]);
      }
    return this;
  }

  /** Draws another canvas on top (transparent pixels skipped). */
  stamp(other: PixelCanvas, ox: number, oy: number): this {
    other.px.forEach((row, y) => row.forEach((ch, x) => ch !== TRANSPARENT && this.set(ox + x, oy + y, ch)));
    return this;
  }

  /** Moves everything by (dx, dy); pixels that leave the canvas are lost. */
  shifted(dx: number, dy: number): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    this.px.forEach((row, y) => row.forEach((ch, x) => ch !== TRANSPARENT && c.set(x + dx, y + dy, ch)));
    return c;
  }

  rows(): string[] {
    return this.px.map((r) => r.join(""));
  }
}

export function sprite(...frames: (PixelCanvas | string[])[]): Sprite {
  const rows = frames.map((f) => (f instanceof PixelCanvas ? f.rows() : f));
  return { w: rows[0][0].length, h: rows[0].length, frames: rows };
}

/** Builds a canvas from a half-width drawing (left half) mirrored to full width. */
export function mirrored(halfRows: string[], oddCentre = false): PixelCanvas {
  return PixelCanvas.fromRows(
    halfRows.map((r) => {
      const right = [...r].reverse().join("");
      return oddCentre ? r + right.slice(1) : r + right;
    }),
  );
}

/** Checks a sprite: equal row widths and only known palette characters. Returns problems found. */
export function validateSprite(name: string, s: Sprite): string[] {
  const problems: string[] = [];
  s.frames.forEach((rows, f) => {
    if (rows.length !== s.h) problems.push(`${name}[${f}]: ${rows.length} rows, expected ${s.h}`);
    rows.forEach((row, y) => {
      if (row.length !== s.w) problems.push(`${name}[${f}] row ${y}: width ${row.length}, expected ${s.w}`);
      for (const ch of row) if (ch !== TRANSPARENT && !(ch in PALETTE)) problems.push(`${name}[${f}] row ${y}: unknown colour "${ch}"`);
    });
  });
  return problems;
}

/** Run-length merges each row into rectangles, for compact SVG output. */
export function toRects(rows: string[]): { x: number; y: number; w: number; c: string }[] {
  const out: { x: number; y: number; w: number; c: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== TRANSPARENT) out.push({ x, y, w: end - x, c: PALETTE[ch] ?? "#ff00ff" });
      x = end;
    }
  });
  return out;
}
