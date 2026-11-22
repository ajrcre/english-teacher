import { describe, expect, it } from "vitest";
import { LeitnerScheduler, type ProgressState } from "@/lib/scheduling/leitner";
import { addDays, dayStart } from "@/lib/time";

const s = new LeitnerScheduler();
const day1 = "2026-11-01";
const at = (day: string) => new Date(day + "T10:00:00Z");

describe("LeitnerScheduler", () => {
  it("promotes a new item on a correct answer and schedules it for tomorrow", () => {
    const out = s.apply(null, "correct", day1, at(day1));
    expect(out.isNew).toBe(true);
    expect(out.next.box).toBe(1);
    expect(out.next.dueAt).toEqual(dayStart(addDays(day1, 1)));
    expect(out.becameMastered).toBe(false);
  });

  it("resets to box 0, due now and flags a mistake on a wrong answer", () => {
    const first = s.apply(null, "correct", day1, at(day1)).next;
    const later = addDays(day1, 1);
    const out = s.apply(first, "incorrect", later, at(later));
    expect(out.next.box).toBe(0);
    expect(out.next.dueAt).toEqual(at(later));
    expect(out.next.isMistake).toBe(true);
    expect(out.becameMistake).toBe(true);
  });

  it("treats partial as wrong for scheduling", () => {
    const out = s.apply(null, "partial", day1, at(day1));
    expect(out.next.box).toBe(0);
    expect(out.next.isMistake).toBe(true);
  });

  it("only promotes once per day, so mastery needs three separate days", () => {
    let st: ProgressState | null = null;
    st = s.apply(st, "correct", day1, at(day1)).next;
    st = s.apply(st, "correct", day1, at(day1)).next; // same day again
    expect(st.box).toBe(1);
    const d2 = addDays(day1, 1);
    st = s.apply(st, "correct", d2, at(d2)).next;
    expect(st.box).toBe(2);
    const d4 = addDays(day1, 4);
    const out = s.apply(st, "correct", d4, at(d4));
    expect(out.next.box).toBe(3);
    expect(out.becameMastered).toBe(true);
    expect(s.isMastered(out.next)).toBe(true);
  });

  it("re-practises a mistake: fixing it clears the flag and reports the fix", () => {
    const wrong = s.apply(null, "incorrect", day1, at(day1)).next;
    const fixed = s.apply(wrong, "correct", day1, at(day1));
    expect(fixed.mistakeFixed).toBe(true);
    expect(fixed.next.isMistake).toBe(false);
    expect(fixed.next.box).toBe(1);
  });

  it("reports lost mastery when a mastered item is answered wrong", () => {
    const mastered: ProgressState = { box: 3, dueAt: at(day1), correctCount: 3, wrongCount: 0, lastVerdict: "correct", lastPromotedDay: "2026-10-20", isMistake: false, masteredAt: at("2026-10-20") };
    const out = s.apply(mastered, "incorrect", day1, at(day1));
    expect(out.lostMastery).toBe(true);
    expect(out.next.masteredAt).toBeNull();
  });
});
