import { describe, expect, it } from "vitest";
import { EMPTY_STATS, GamificationEngine, comboMultiplier, type GameEvent } from "@/lib/gamification/engine";
import { levelForXp, xpForLevel } from "@/lib/gamification/levels";

const engine = new GamificationEngine();
const ctx = (today = "2026-11-10", earned: string[] = []) => ({ today, alreadyEarned: new Set(earned), roundsToday: 0 });
const answer = (verdict: "correct" | "partial" | "incorrect", extra: Partial<Extract<GameEvent, { type: "answer" }>> = {}): GameEvent => ({
  type: "answer",
  verdict,
  difficulty: 1,
  llmGraded: false,
  outcome: { becameMastered: false, lostMastery: false, mistakeFixed: false },
  lessonsCompleted: [],
  lessonsMasteredTotal: 0,
  ...extra,
});

describe("XP and combos", () => {
  it("gives base XP for correct answers and grows the combo", () => {
    const { stats, rewards } = engine.process(answer("correct"), EMPTY_STATS, ctx());
    expect(rewards.xp).toBe(10);
    expect(stats.combo).toBe(1);
    expect(rewards.badges).toContain("first-light");
  });

  it("multiplies XP at combo 5 and 10", () => {
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(1.5);
    expect(comboMultiplier(10)).toBe(2);
    const { rewards } = engine.process(answer("correct"), { ...EMPTY_STATS, combo: 4 }, ctx());
    expect(rewards.xp).toBe(15);
    expect(rewards.events).toContainEqual({ kind: "combo", value: 5 });
  });

  it("resets the combo on a wrong answer but still gives effort XP", () => {
    const { stats, rewards } = engine.process(answer("incorrect"), { ...EMPTY_STATS, combo: 7 }, ctx());
    expect(stats.combo).toBe(0);
    expect(rewards.xp).toBe(2);
  });

  it("rewards a fixed mistake and mastery", () => {
    const { stats, rewards } = engine.process(answer("correct", { outcome: { becameMastered: true, lostMastery: false, mistakeFixed: true } }), EMPTY_STATS, ctx());
    expect(stats.mistakesFixed).toBe(1);
    expect(stats.itemsMastered).toBe(1);
    expect(rewards.stars).toBe(1);
    expect(rewards.events.map((e) => e.kind)).toEqual(expect.arrayContaining(["mistake_fixed", "mastered"]));
  });

  it("announces level-ups", () => {
    const { rewards } = engine.process(answer("correct"), { ...EMPTY_STATS, xp: 95 }, ctx("2026-11-10", ["first-light"]));
    expect(rewards.events).toContainEqual({ kind: "level_up", level: 2, title: "Stargazer" });
    expect(levelForXp(xpForLevel(5))).toBe(5);
  });
});

describe("streaks", () => {
  const round = (roundsToday = 1): GameEvent => ({ type: "round_complete", roundsToday, lessonsMasteredTotal: 0 });

  it("starts, continues and resets a streak", () => {
    let s = engine.process(round(), EMPTY_STATS, ctx("2026-11-10")).stats;
    expect(s.streak).toBe(1);
    s = engine.process(round(), s, ctx("2026-11-11")).stats;
    expect(s.streak).toBe(2);
    s = engine.process(round(), s, ctx("2026-11-11")).stats; // same day: no change
    expect(s.streak).toBe(2);
    s = engine.process(round(), s, ctx("2026-11-15")).stats;
    expect(s.streak).toBe(1);
  });

  it("uses a shield to cover one missed day", () => {
    const s0 = { ...EMPTY_STATS, streak: 5, lastGoalDay: "2026-11-08", shields: 1 };
    const { stats, rewards } = engine.process(round(), s0, ctx("2026-11-10"));
    expect(stats.streak).toBe(6);
    expect(stats.shields).toBe(0);
    expect(rewards.events).toContainEqual({ kind: "shield_used" });
  });

  it("earns a shield every 7 days and a bonus for the full mission", () => {
    const s0 = { ...EMPTY_STATS, streak: 6, lastGoalDay: "2026-11-09" };
    const { stats, rewards } = engine.process(round(2), s0, ctx("2026-11-10"));
    expect(stats.streak).toBe(7);
    expect(stats.shields).toBe(1);
    expect(rewards.badges).toEqual(expect.arrayContaining(["streak-7", "full-mission"]));
  });
});
