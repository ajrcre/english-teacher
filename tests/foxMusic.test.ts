import { describe, expect, it } from "vitest";
import { foxMusicMood, hz, JINGLES, lineLength, LOOP_EIGHTHS, midi, MOODS, parseLine } from "@/lib/game/foxMusic";

describe("the Grey Fox's battle music", () => {
  it("reads note names", () => {
    expect(midi("A4")).toBe(69);
    expect(midi("C4")).toBe(60);
    expect(midi("C#5")).toBe(73);
    expect(midi("Bb3")).toBe(58);
    expect(hz(69)).toBe(440);
    expect(hz(81)).toBeCloseTo(880);
    expect(() => midi("H2")).toThrow();
  });

  it("parses a line: rests, held notes and bars", () => {
    expect(parseLine("A4 ~ . C5 | E5 ~ ~ .")).toEqual([
      { at: 0, note: 69, len: 2 },
      { at: 3, note: 72, len: 1 },
      { at: 4, note: 76, len: 3 },
    ]);
    expect(parseLine("A4", 12)[0].note).toBe(81);
  });

  it("every mood loops over exactly four bars, with notes in a sensible range", () => {
    for (const [name, m] of Object.entries(MOODS)) {
      for (const line of [m.lead, m.bass, m.drums]) expect(lineLength(line), name).toBe(LOOP_EIGHTHS);
      for (const n of [...parseLine(m.lead, m.leadUp), ...parseLine(m.bass)]) {
        expect(hz(n.note)).toBeGreaterThan(30);
        expect(hz(n.note)).toBeLessThan(2000);
      }
      expect(m.drums.split(/[\s|]+/).filter(Boolean).every((d) => ["k", "s", "h", "."].includes(d))).toBe(true);
    }
    expect(MOODS.angry.bpm).toBeGreaterThan(MOODS.calm.bpm);
    expect(MOODS.showdown.bpm).toBeLessThan(MOODS.calm.bpm);
    for (const j of Object.values(JINGLES)) expect(parseLine(j.lead).length).toBeGreaterThan(2);
  });

  it("follows the battle: calm, angry at half his lives, a showdown at his last", () => {
    expect(foxMusicMood(0, 12)).toBe("calm");
    expect(foxMusicMood(5, 12)).toBe("calm");
    expect(foxMusicMood(6, 12)).toBe("angry");
    expect(foxMusicMood(10, 12)).toBe("angry");
    expect(foxMusicMood(11, 12)).toBe("showdown");
  });
});
