import { describe, expect, it } from "vitest";
import { approachMs, laneFromKey, laneGround, nextPace, RUNNER_RULES, runnerEligible } from "@/lib/game/runner";

const q = (options: string[], sentence = "The criminal had brought ___ on the whole family.") => ({ type: "mcq", prompt: "Choose the best word.", sentence, options });

describe("lane runner rules", () => {
  it("plays multiple choice with 2–4 short options as gates", () => {
    expect(runnerEligible(q(["disgrace", "ritual"]))).toBe(true);
    expect(runnerEligible(q(["a", "b", "c", "d"]))).toBe(true);
    expect(runnerEligible(q(["only one"]))).toBe(false);
    expect(runnerEligible(q(["a", "b", "c", "d", "e"]))).toBe(false);
    expect(runnerEligible(q(["fine", "x".repeat(RUNNER_RULES.maxOptionChars + 1)]))).toBe(false);
    expect(runnerEligible({ type: "typed", prompt: "?" })).toBe(false);
  });

  it("gives longer questions more reading time, within limits", () => {
    const short = approachMs(q(["a", "b"], "Short one."));
    const long = approachMs(q(["a", "b"], "word ".repeat(30)));
    expect(short).toBeGreaterThanOrEqual(RUNNER_RULES.minApproachMs);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(RUNNER_RULES.maxApproachMs);
    expect(approachMs(q(["a", "b"]), 0.6)).toBeLessThan(approachMs(q(["a", "b"]), 1));
  });

  it("speeds up on a streak and eases off after a mistake, within bounds", () => {
    expect(nextPace(1, true, 1)).toBe(1);
    expect(nextPace(1, true, 3)).toBeLessThan(1);
    expect(nextPace(1, false, 0)).toBeGreaterThan(1);
    let p = 1;
    for (let i = 0; i < 50; i++) p = nextPace(p, true, 10);
    expect(p).toBe(RUNNER_RULES.minPace);
    for (let i = 0; i < 50; i++) p = nextPace(p, false, 0);
    expect(p).toBe(RUNNER_RULES.maxPace);
  });

  it("maps keys to lanes", () => {
    expect(laneFromKey("ArrowUp", 1, 3)).toBe(0);
    expect(laneFromKey("ArrowUp", 0, 3)).toBe(0);
    expect(laneFromKey("ArrowDown", 2, 3)).toBe(2);
    expect(laneFromKey("s", 0, 3)).toBe(1);
    expect(laneFromKey("3", 0, 3)).toBe(2);
    expect(laneFromKey("4", 0, 3)).toBeNull();
    expect(laneFromKey("Enter", 0, 3)).toBeNull();
  });

  it("has ground colours for every unit", () => {
    for (const u of ["spelling", "the-giver", "poetry", "number-the-stars", "grammar", "word-treasury", "short-stories"]) expect(laneGround(u).a).toBeTruthy();
  });
});
