/**
 * Geometry of the hand-drawn adventure map. Pure functions, no DOM: coordinates are in "map pixels"
 * (the artwork is 700 x 1254), so the same numbers work at every screen size.
 */
export const MAP_W = 700;
export const MAP_H = 1254;

export type Point = readonly [number, number];
export type Surface = "dirt" | "grass" | "snow" | "wood";

/** The winding road traced from the drawing, top to bottom. */
export const ROAD: readonly Point[] = [
  [350, 205], [318, 238], [345, 260], [405, 270], [440, 292], [442, 322], [398, 346], [338, 358], [308, 376], [335, 396],
  [405, 412], [446, 432], [452, 458], [425, 478], [372, 492], [318, 507], [262, 525], [232, 550], [246, 582], [300, 602],
  [365, 615], [410, 642], [392, 692], [362, 742], [328, 782], [288, 815], [258, 832], [240, 862], [248, 902], [290, 928],
  [350, 945], [385, 985], [398, 1020], [375, 1050], [335, 1082], [300, 1108], [276, 1140], [300, 1185], [350, 1220], [405, 1250],
];

export interface PlaceLayout {
  /** Centre of the place's highlight ellipse. */
  c: Point;
  /** Radii of the highlight ellipse. */
  r: Point;
  /** Where the progress pin sits. */
  pin: Point;
  /** Index into ROAD where the place's side track joins the road. */
  join: number;
  /** Side track from the road to the place; the last point is where Nova stands. */
  spur: readonly Point[];
}

/** One entry per unit id. The order below is the order of the pin numbers on the map. */
export const PLACES: Readonly<Record<string, PlaceLayout>> = {
  "number-the-stars": { c: [150, 1065], r: [160, 125], pin: [150, 962], join: 35, spur: [[262, 1112], [228, 1100]] },
  "the-giver": { c: [575, 1115], r: [135, 130], pin: [575, 1012], join: 33, spur: [[418, 1062], [455, 1068]] },
  "short-stories": { c: [170, 715], r: [160, 125], pin: [118, 598], join: 25, spur: [[262, 814], [240, 808]] },
  poetry: { c: [570, 625], r: [135, 125], pin: [560, 520], join: 21, spur: [[440, 655], [475, 668]] },
  grammar: { c: [140, 285], r: [110, 190], pin: [225, 118], join: 9, spur: [[290, 412], [250, 432], [215, 445]] },
  spelling: { c: [585, 250], r: [120, 170], pin: [650, 170], join: 11, spur: [[490, 426], [535, 420], [575, 418]] },
  "word-treasury": { c: [350, 150], r: [150, 110], pin: [350, 70], join: 0, spur: [[350, 215]] },
};

export const PLACE_ORDER = Object.keys(PLACES);

export const standOf = (id: string): Point => {
  const spur = PLACES[id].spur;
  return spur[spur.length - 1];
};

/** Smooth a polyline into a Catmull-Rom curve sampled roughly every `step` map pixels. */
export function catmull(pts: readonly Point[], step = 5): Point[] {
  const out: Point[] = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (a: 0 | 1) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** The walk from one place to another: down the side track, along the road, up the next side track. */
export function planRoute(fromId: string, toId: string): Point[] {
  const A = PLACES[fromId];
  const B = PLACES[toId];
  const pts: Point[] = [standOf(fromId)];
  for (let i = A.spur.length - 2; i >= 0; i--) pts.push(A.spur[i]);
  pts.push(ROAD[A.join]);
  const dir = B.join >= A.join ? 1 : -1;
  for (let i = A.join + dir; dir > 0 ? i <= B.join : i >= B.join; i += dir) pts.push(ROAD[i]);
  for (const p of B.spur) pts.push(p);
  return catmull(pts);
}

export function pathLength(route: readonly Point[]): number {
  let s = 0;
  for (let i = 1; i < route.length; i++) s += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
  return s;
}

export function segDist(px: number, py: number, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

export function roadDist(x: number, y: number): number {
  let d = Infinity;
  for (let i = 1; i < ROAD.length; i++) d = Math.min(d, segDist(x, y, ROAD[i - 1], ROAD[i]));
  return d;
}

type Rect = readonly [number, number, number, number];
const inRect = (x: number, y: number, [x0, y0, x1, y1]: Rect) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

const WOOD_RECTS: readonly Rect[] = [[335, 455, 440, 495], [0, 1090, 262, 1135]]; // the bridge and the jetty
const SNOW_RECT: Rect = [430, 880, 700, 1254]; // the village in the snow

/** What Nova is standing on. `isSnowAt` lets the browser add a pixel check of the artwork for the snowy hill and forest. */
export function surfaceAt(x: number, y: number, isSnowAt?: ((x: number, y: number) => boolean) | null): Surface {
  if (WOOD_RECTS.some((r) => inRect(x, y, r))) return "wood";
  if (inRect(x, y, SNOW_RECT)) return "snow";
  if (isSnowAt?.(x, y)) return "snow";
  return roadDist(x, y) < 17 ? "dirt" : "grass";
}

export const SURFACE_LABEL: Record<Surface, string> = { dirt: "gravel path", grass: "leaves & grass", snow: "snow", wood: "wooden planks" };

// ---- soundscape zones ----
export type AmbientName = "meadow" | "river" | "sea" | "snow" | "bees" | "workshop" | "cave";
export const AMBIENT_NAMES: readonly AmbientName[] = ["meadow", "river", "sea", "snow", "bees", "workshop", "cave"];

const RIVER: readonly (readonly Point[])[] = [
  [[0, 455], [60, 470], [130, 488], [190, 462], [240, 455]],
  [[330, 478], [430, 482], [520, 500], [610, 480], [700, 455]],
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** How loud each background sound should be where Nova stands (0..1). */
export function zoneGains(x: number, y: number): Record<AmbientName, number> {
  let rd = Infinity;
  for (const pl of RIVER) for (let i = 1; i < pl.length; i++) rd = Math.min(rd, segDist(x, y, pl[i - 1], pl[i]));
  const near = (cx: number, cy: number, r: number) => clamp01(1 - Math.hypot(x - cx, y - cy) / r);
  return {
    meadow: 0.5 + 0.35 * (1 - Math.max(near(600, 1050, 300), near(110, 1190, 260))),
    river: clamp01(1 - rd / 190),
    sea: near(110, 1190, 360),
    snow: Math.max(near(600, 1060, 300), near(570, 620, 230)),
    bees: near(575, 300, 230),
    workshop: near(140, 300, 250),
    cave: near(350, 150, 210),
  };
}
