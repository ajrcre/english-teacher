import type { ScheduleOutcome, Verdict } from "@/lib/scheduling/leitner";
import { addDays } from "@/lib/time";
import { BADGES, type BadgeContext } from "./badges";
import { levelForXp, titleForLevel } from "./levels";

export interface StatsState {
  xp: number;
  stars: number;
  combo: number;
  bestCombo: number;
  streak: number;
  bestStreak: number;
  lastGoalDay: string | null;
  shields: number;
  lastShieldWeek: string | null;
  mistakesFixed: number;
  itemsMastered: number;
  answersTotal: number;
  answersCorrect: number;
}

export const EMPTY_STATS: StatsState = {
  xp: 0,
  stars: 0,
  combo: 0,
  bestCombo: 0,
  streak: 0,
  bestStreak: 0,
  lastGoalDay: null,
  shields: 0,
  lastShieldWeek: null,
  mistakesFixed: 0,
  itemsMastered: 0,
  answersTotal: 0,
  answersCorrect: 0,
};

export type GameEvent =
  | {
      type: "answer";
      verdict: Verdict;
      difficulty: 1 | 2 | 3;
      llmGraded: boolean;
      outcome: Pick<ScheduleOutcome, "becameMastered" | "lostMastery" | "mistakeFixed">;
      /** Lessons that became fully mastered because of this answer. */
      lessonsCompleted: { lessonId: string; unitId: string }[];
      lessonsMasteredTotal: number;
    }
  | { type: "round_complete"; roundsToday: number; lessonsMasteredTotal: number };

export type RewardEvent =
  | { kind: "combo"; value: number }
  | { kind: "mistake_fixed" }
  | { kind: "mastered" }
  | { kind: "star_lit"; lessonId: string }
  | { kind: "goal_met"; streak: number }
  | { kind: "full_mission" }
  | { kind: "shield_used" }
  | { kind: "shield_earned" }
  | { kind: "level_up"; level: number; title: string }
  | { kind: "badge"; id: string };

export interface Rewards {
  xp: number;
  stars: number;
  badges: string[];
  events: RewardEvent[];
}

export interface EngineContext {
  today: string;
  alreadyEarned: ReadonlySet<string>;
  roundsToday: number;
}

/** Observer: each listener reacts to a game event and adds its rewards. */
export interface RewardListener {
  on(event: GameEvent, stats: StatsState, rewards: Rewards, ctx: EngineContext): void;
}

export const XP_RULES = {
  base: { 1: 10, 2: 15, 3: 20 } as Record<1 | 2 | 3, number>,
  llmBase: 25,
  wrong: 2,
  mistakeFixedBonus: 5,
  masteredXp: 5,
  masteredStars: 1,
  starLitXp: 50,
  starLitStars: 5,
  roundXp: 20,
  fullMissionXp: 50,
  fullMissionStars: 3,
  maxShields: 2,
};

export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 2;
  if (combo >= 5) return 1.5;
  return 1;
}

const answerListener: RewardListener = {
  on(e, s, r) {
    if (e.type !== "answer") return;
    s.answersTotal++;
    const base = e.llmGraded ? XP_RULES.llmBase : XP_RULES.base[e.difficulty];
    if (e.verdict === "correct") {
      s.answersCorrect++;
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      r.xp += Math.round(base * comboMultiplier(s.combo));
      if (s.combo === 5 || s.combo === 10 || (s.combo > 10 && s.combo % 10 === 0)) r.events.push({ kind: "combo", value: s.combo });
    } else {
      s.combo = 0;
      r.xp += e.verdict === "partial" ? Math.round(base / 2) : XP_RULES.wrong;
    }
  },
};

const masteryListener: RewardListener = {
  on(e, s, r) {
    if (e.type !== "answer") return;
    if (e.outcome.mistakeFixed) {
      s.mistakesFixed++;
      r.xp += XP_RULES.mistakeFixedBonus;
      r.events.push({ kind: "mistake_fixed" });
    }
    if (e.outcome.becameMastered) {
      s.itemsMastered++;
      r.xp += XP_RULES.masteredXp;
      r.stars += XP_RULES.masteredStars;
      r.events.push({ kind: "mastered" });
    }
    if (e.outcome.lostMastery) s.itemsMastered = Math.max(0, s.itemsMastered - 1);
    for (const l of e.lessonsCompleted) {
      r.xp += XP_RULES.starLitXp;
      r.stars += XP_RULES.starLitStars;
      r.events.push({ kind: "star_lit", lessonId: l.lessonId });
    }
  },
};

/** Daily goal = one round; it drives the streak. A missed day can be covered by a shield. */
const streakListener: RewardListener = {
  on(e, s, r, ctx) {
    if (e.type !== "round_complete") return;
    r.xp += XP_RULES.roundXp;
    if (e.roundsToday === 2) {
      r.xp += XP_RULES.fullMissionXp;
      r.stars += XP_RULES.fullMissionStars;
      r.events.push({ kind: "full_mission" });
    }
    if (s.lastGoalDay === ctx.today) return;
    const yesterday = addDays(ctx.today, -1);
    const dayBefore = addDays(ctx.today, -2);
    if (s.lastGoalDay === yesterday) {
      s.streak++;
    } else if (s.lastGoalDay === dayBefore && s.shields > 0 && s.streak > 0) {
      s.shields--;
      s.streak++;
      r.events.push({ kind: "shield_used" });
    } else {
      s.streak = 1;
    }
    s.lastGoalDay = ctx.today;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    r.events.push({ kind: "goal_met", streak: s.streak });
    if (s.streak % 7 === 0 && s.shields < XP_RULES.maxShields) {
      s.shields++;
      r.events.push({ kind: "shield_earned" });
    }
  },
};

export class GamificationEngine {
  constructor(private readonly listeners: RewardListener[] = [answerListener, masteryListener, streakListener]) {}

  /** Applies one event. Returns the updated stats (a copy) and the rewards earned. */
  process(event: GameEvent, current: StatsState, ctx: EngineContext): { stats: StatsState; rewards: Rewards } {
    const stats: StatsState = { ...current };
    const rewards: Rewards = { xp: 0, stars: 0, badges: [], events: [] };
    const levelBefore = levelForXp(stats.xp);

    for (const l of this.listeners) l.on(event, stats, rewards, ctx);

    stats.xp += rewards.xp;
    stats.stars += rewards.stars;
    const levelAfter = levelForXp(stats.xp);
    if (levelAfter > levelBefore) rewards.events.push({ kind: "level_up", level: levelAfter, title: titleForLevel(levelAfter) });

    const badgeCtx: BadgeContext = {
      stats,
      roundsToday: event.type === "round_complete" ? event.roundsToday : ctx.roundsToday,
      lessonsCompleted: event.type === "answer" ? event.lessonsCompleted : [],
      lessonsMasteredTotal: event.lessonsMasteredTotal,
    };
    for (const b of BADGES) {
      if (!ctx.alreadyEarned.has(b.id) && b.check(badgeCtx)) {
        rewards.badges.push(b.id);
        rewards.events.push({ kind: "badge", id: b.id });
      }
    }
    return { stats, rewards };
  }
}

export const gamification = new GamificationEngine();
