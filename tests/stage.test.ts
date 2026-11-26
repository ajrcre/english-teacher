import { describe, expect, it } from "vitest";
import { laneAt, runnerLayout, RUNNER_FIELD } from "@/lib/game/runner";
import { fieldHeight, fitBox, toField } from "@/lib/game/stage";
import { catcherX } from "@/lib/game/starCatch";

describe("fitting the mini-games to the screen", () => {
  it("picks a taller field for a phone held upright, within limits", () => {
    expect(fieldHeight({ w: 380, h: 560 }, 160, 164, 260)).toBe(236);
    expect(fieldHeight({ w: 380, h: 2000 }, 160, 164, 260)).toBe(260);
    expect(fieldHeight({ w: 900, h: 400 }, 160, 164, 260)).toBe(164);
    expect(fieldHeight({ w: 0, h: 0 }, 160, 164, 260)).toBe(164);
  });

  it("scales the field to fit the space, keeping its shape", () => {
    expect(fitBox({ w: 380, h: 600 }, 160, 160)).toEqual({ w: 380, h: 380 });
    expect(fitBox({ w: 800, h: 400 }, 160, 160)).toEqual({ w: 400, h: 400 });
  });

  it("maps a tap to field pixels, even outside the field", () => {
    const rect = { left: 10, top: 100, width: 320, height: 320 };
    expect(toField(170, 260, rect, 160, 160)).toEqual({ x: 80, y: 80 });
    expect(toField(170, 900, rect, 160, 160).y).toBeGreaterThan(160);
  });

  it("grows the runner's lanes on a tall screen, and never shrinks them", () => {
    const base = runnerLayout(0, 3);
    expect(base).toEqual({ sky: RUNNER_FIELD.sky, laneH: RUNNER_FIELD.laneH, h: RUNNER_FIELD.sky + 3 * RUNNER_FIELD.laneH + RUNNER_FIELD.floor });
    const tall = runnerLayout(220, 3);
    expect(tall.laneH).toBeGreaterThan(RUNNER_FIELD.laneH);
    expect(tall.laneH).toBeLessThanOrEqual(RUNNER_FIELD.maxLaneH);
    expect(tall.sky).toBeLessThanOrEqual(RUNNER_FIELD.maxSky);
    expect(tall.h).toBeLessThanOrEqual(220);
    expect(runnerLayout(5000, 2).h).toBe(RUNNER_FIELD.maxSky + 2 * RUNNER_FIELD.maxLaneH + RUNNER_FIELD.floor);
  });

  it("steers to the lane under a tap; above the lanes is the top lane, below is the bottom", () => {
    expect(laneAt(-50, 40, 30, 3)).toBe(0);
    expect(laneAt(10, 40, 30, 3)).toBe(0);
    expect(laneAt(75, 40, 30, 3)).toBe(1);
    expect(laneAt(125, 40, 30, 3)).toBe(2);
    expect(laneAt(900, 40, 30, 3)).toBe(2);
  });

  it("keeps Nova inside Star Catch's field", () => {
    expect(catcherX(-40, 160)).toBe(12);
    expect(catcherX(80, 160)).toBe(80);
    expect(catcherX(400, 160)).toBe(148);
  });
});
