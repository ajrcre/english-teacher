/**
 * Rules for the lane-runner game (pure functions, shared by the game component and tests).
 * The runner only changes how a multiple-choice answer is given: the server still grades it.
 */

export const RUNNER_RULES = {
  /** Options longer than this don't fit on a gate; such questions keep the classic card. */
  maxOptionChars: 44,
  minLanes: 2,
  maxLanes: 4,
  /** Time for the gates to reach Nova: a base plus reading time per word, scaled by pace. */
  baseMs: 3500,
  msPerWord: 300,
  minApproachMs: 6000,
  maxApproachMs: 13000,
  /** Pace speeds up on a streak and eases off after a mistake (1 = normal). */
  minPace: 0.6,
  maxPace: 1.3,
};

export interface RunnerQuestion {
  type: string;
  prompt?: string;
  sentence?: string;
  options?: string[];
}

/** Can this question be played as gates? Multiple choice with 2–4 options that fit on a gate. */
export function runnerEligible(q: RunnerQuestion): boolean {
  if (q.type !== "mcq" || !q.options) return false;
  const n = q.options.length;
  return n >= RUNNER_RULES.minLanes && n <= RUNNER_RULES.maxLanes && q.options.every((o) => o.length <= RUNNER_RULES.maxOptionChars);
}

/** How long the gates take to arrive, in ms: longer questions get more reading time. */
export function approachMs(q: RunnerQuestion, pace = 1): number {
  const words = `${q.prompt ?? ""} ${q.sentence ?? ""}`.split(/\s+/).filter(Boolean).length;
  const longest = Math.max(0, ...(q.options ?? []).map((o) => o.split(/\s+/).length));
  const raw = RUNNER_RULES.baseMs + (words + longest * 2) * RUNNER_RULES.msPerWord;
  const clamped = Math.min(RUNNER_RULES.maxApproachMs, Math.max(RUNNER_RULES.minApproachMs, raw));
  return Math.round(clamped * Math.min(RUNNER_RULES.maxPace, Math.max(RUNNER_RULES.minPace, pace)));
}

/** Adaptive pace: faster (smaller) on a streak of 3+, slower after a mistake. */
export function nextPace(pace: number, correct: boolean, combo: number): number {
  const p = correct ? (combo >= 3 ? pace * 0.92 : pace) : pace * 1.15;
  return Math.min(RUNNER_RULES.maxPace, Math.max(RUNNER_RULES.minPace, Math.round(p * 1000) / 1000));
}

/**
 * Parallax: how fast each scenery layer moves compared with the ground (which moves with the
 * gates). Further away is slower, the front tufts are faster. On a streak of 3+ the scenery
 * (not the gates) speeds up by `streak`, and the sky glows warm.
 */
export const SCENERY = { sky: 0.3, mid: 0.55, fore: 1.8, streak: 1.6, streakAt: 3, glow: 0.3 };

/** Eases the scenery's speed towards its target (1, or SCENERY.streak on a streak) over ~0.4 s. */
export function easeScenery(current: number, streak: boolean, dt: number): number {
  const target = streak ? SCENERY.streak : 1;
  return current + (target - current) * Math.min(1, Math.max(0, dt) / 400);
}

/** Which lane a key press selects, or null. Lanes are numbered top to bottom from 0. */
export function laneFromKey(key: string, current: number, lanes: number): number | null {
  if (key === "ArrowUp" || key === "w" || key === "W") return Math.max(0, current - 1);
  if (key === "ArrowDown" || key === "s" || key === "S") return Math.min(lanes - 1, current + 1);
  const n = Number(key);
  if (Number.isInteger(n) && n >= 1 && n <= lanes) return n - 1;
  return null;
}

/**
 * The runner field's layout for a logical height chosen to fill the screen: on a tall screen
 * the lanes grow (easier to tap) and the sky band shows more of the unit's world.
 */
export const RUNNER_FIELD = { sky: 40, laneH: 28, maxSky: 56, maxLaneH: 46, floor: 4 };

export function runnerLayout(want: number, lanes: number): { sky: number; laneH: number; h: number } {
  const f = RUNNER_FIELD;
  const base = f.sky + lanes * f.laneH + f.floor;
  const extra = Math.max(0, Math.round(want) - base);
  const laneH = Math.min(f.maxLaneH, f.laneH + Math.floor((extra * 0.75) / lanes));
  const sky = Math.min(f.maxSky, f.sky + Math.max(0, extra - (laneH - f.laneH) * lanes));
  return { sky, laneH, h: sky + lanes * laneH + f.floor };
}

/** The lane under a point of the field (logical y), clamped: above the lanes is the top lane. */
export function laneAt(y: number, sky: number, laneH: number, lanes: number): number {
  return Math.max(0, Math.min(lanes - 1, Math.floor((y - sky) / laneH)));
}

/** Ground colours (palette characters) for the lanes in each unit's world. */
export const LANE_GROUND: Record<string, { a: string; b: string; edge: string; mark: string }> = {
  spelling: { a: "P", b: "M", edge: "Q", mark: "l" },
  "the-giver": { a: "x", b: "z", edge: "C", mark: "w" },
  poetry: { a: "c", b: "C", edge: "D", mark: "x" },
  "number-the-stars": { a: "t", b: "T", edge: "d", mark: "K" },
  grammar: { a: "K", b: "t", edge: "T", mark: "Y" },
  "word-treasury": { a: "H", b: "F", edge: "E", mark: "a" },
  "short-stories": { a: "t", b: "T", edge: "d", mark: "Z" },
  /** The Grey Fox's castle: grey cobbles. */
  "grey-fox": { a: ">", b: "<", edge: "(", mark: "{" },
};

export function laneGround(unitId: string) {
  return LANE_GROUND[unitId] ?? LANE_GROUND.spelling;
}
