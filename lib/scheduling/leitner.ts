import { addDays, dayStart } from "@/lib/time";

export type Verdict = "correct" | "partial" | "incorrect";

/** The scheduling-relevant slice of an item_progress row. */
export interface ProgressState {
  box: number;
  dueAt: Date;
  correctCount: number;
  wrongCount: number;
  lastVerdict: Verdict | null;
  lastPromotedDay: string | null;
  isMistake: boolean;
  masteredAt: Date | null;
}

export interface ScheduleOutcome {
  next: ProgressState;
  /** The item reached the mastery box. */
  becameMastered: boolean;
  /** A previously mastered item was answered wrong. */
  lostMastery: boolean;
  /** The item was flagged as a mistake by this answer. */
  becameMistake: boolean;
  /** A flagged mistake was answered correctly. */
  mistakeFixed: boolean;
  /** First time the student has ever seen this item. */
  isNew: boolean;
}

/** Strategy interface, so the spacing algorithm can be swapped (e.g. for SM-2). */
export interface Scheduler {
  readonly masteryBox: number;
  apply(prev: ProgressState | null, verdict: Verdict, today: string, now: Date): ScheduleOutcome;
  isMastered(state: Pick<ProgressState, "box">): boolean;
}

/**
 * Leitner boxes 0–5 with review gaps of 0, 1, 3, 7, 14 and 30 days.
 * - Wrong (or partial): back to box 0, due now, flagged as a mistake.
 * - Right: up one box, but at most one promotion per day, so reaching the
 *   mastery box (3) takes correct answers on three separate days.
 */
export class LeitnerScheduler implements Scheduler {
  static readonly INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;
  readonly masteryBox = 3;

  isMastered(state: Pick<ProgressState, "box">): boolean {
    return state.box >= this.masteryBox;
  }

  apply(prev: ProgressState | null, verdict: Verdict, today: string, now: Date): ScheduleOutcome {
    const isNew = prev === null;
    const state: ProgressState = prev ?? {
      box: 0,
      dueAt: now,
      correctCount: 0,
      wrongCount: 0,
      lastVerdict: null,
      lastPromotedDay: null,
      isMistake: false,
      masteredAt: null,
    };
    const wasMastered = this.isMastered(state);

    if (verdict !== "correct") {
      const next: ProgressState = {
        ...state,
        box: 0,
        dueAt: now,
        wrongCount: state.wrongCount + 1,
        lastVerdict: verdict,
        isMistake: true,
        masteredAt: null,
      };
      return { next, becameMastered: false, lostMastery: wasMastered, becameMistake: !state.isMistake, mistakeFixed: false, isNew };
    }

    const canPromote = state.lastPromotedDay !== today;
    const box = canPromote ? Math.min(state.box + 1, LeitnerScheduler.INTERVAL_DAYS.length - 1) : state.box;
    const interval = LeitnerScheduler.INTERVAL_DAYS[box];
    const next: ProgressState = {
      ...state,
      box,
      dueAt: interval === 0 ? now : dayStart(addDays(today, interval)),
      correctCount: state.correctCount + 1,
      lastVerdict: "correct",
      lastPromotedDay: canPromote ? today : state.lastPromotedDay,
      isMistake: false,
      masteredAt: state.masteredAt,
    };
    const becameMastered = !wasMastered && this.isMastered(next);
    if (becameMastered) next.masteredAt = now;
    return { next, becameMastered, lostMastery: false, becameMistake: false, mistakeFixed: state.isMistake, isNew };
  }
}

export const defaultScheduler: Scheduler = new LeitnerScheduler();
