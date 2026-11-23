import { toClientItem, type ClientItem, type ItemResponse } from "@/lib/content/client";
import { testById, type TestDef } from "@/content/tests";
import type { Catalog } from "@/lib/content/catalog";
import { daysUntil, testIsActive, testItemIds } from "@/lib/content/testScope";
import { LLM_GRADED_TYPES, type Item, type ItemType } from "@/lib/content/schema";
import type { ProgressRow, Repositories, StatsRow } from "@/lib/db/repositories";
import { BOSS_RULES, type ChestContents } from "@/lib/gamification/collection";
import { GamificationEngine, type Rewards, type StatsState } from "@/lib/gamification/engine";
import { levelInfo, type LevelInfo } from "@/lib/gamification/levels";
import { GraderUnavailableError } from "@/lib/grading/graders/llmGraders";
import type { GraderRegistry } from "@/lib/grading/registry";
import type { GradeResult, Verdict } from "@/lib/grading/types";
import { logger } from "@/lib/logger";
import type { ProgressState, Scheduler } from "@/lib/scheduling/leitner";
import { bossEligibility, buildSession, type BossEligibility, type ProgressLite, type SessionMode } from "@/lib/scheduling/sessionBuilder";
import { dayKey } from "@/lib/time";
import { grantChest, RewardError } from "./rewards";

export const DAILY_RULES = {
  dailyTargetSeconds: 20 * 60,
  goalRoundMinAnswers: 6,
  maxSecondsPerAnswer: 240,
  maxLlmCallsPerDay: 80,
};

export interface DailyStatus {
  today: string;
  secondsToday: number;
  roundsToday: number;
  goalMet: boolean;
  /** 20 minutes reached: the app suggests stopping for today. */
  done: boolean;
  newItemsToday: number;
  dueCount: number;
  mistakeCount: number;
}

export interface StatsSummary extends LevelInfo {
  stars: number;
  /** Stars left to spend in the shop. */
  starsBalance: number;
  combo: number;
  streak: number;
  shields: number;
}

export interface AnswerFeedback extends GradeResult {
  source?: string;
  explanation?: string;
  he?: string;
  speak?: string;
  keyPoints?: string[];
}

export type SubmitResult =
  | {
      status: "graded";
      feedback: AnswerFeedback;
      mastered: boolean;
      box: number;
      rewards: Rewards;
      stats: StatsSummary;
      daily: DailyStatus;
    }
  | {
      /** The answer checker is unavailable: the student compares with the model answer and self-assesses. */
      status: "self_check";
      modelAnswer: string;
      keyPoints: string[];
      reason: string;
    };

function toState(row: ProgressRow | undefined): ProgressState | null {
  if (!row) return null;
  return {
    box: row.box,
    dueAt: row.dueAt,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    lastVerdict: (row.lastVerdict as Verdict | null) ?? null,
    lastPromotedDay: row.lastPromotedDay,
    isMistake: row.isMistake,
    masteredAt: row.masteredAt,
  };
}

function toStatsState(row: StatsRow): StatsState {
  const { studentId: _s, updatedAt: _u, ...rest } = row;
  return rest;
}

export function summarize(stats: StatsState): StatsSummary {
  return { ...levelInfo(stats.xp), stars: stats.stars, starsBalance: Math.max(0, stats.stars - stats.starsSpent), combo: stats.combo, streak: stats.streak, shields: stats.shields };
}

/** Facade over content, scheduling, grading and rewards for one student's practice. */
export class PracticeService {
  constructor(
    private readonly repos: Repositories,
    private readonly catalog: Catalog,
    private readonly graders: GraderRegistry,
    private readonly scheduler: Scheduler,
    private readonly engine: GamificationEngine,
    private readonly clock: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  private today(): string {
    return dayKey(this.clock());
  }

  private readonly scopeCache = new Map<string, Set<string>>();

  /** The student's switched-on class test and its questions, or null (no test, or its day has passed). */
  private async activeScope(studentId: string): Promise<{ test: TestDef; ids: Set<string> } | null> {
    const student = await this.repos.users.findStudent(studentId);
    const test = student?.activeTest ? testById(student.activeTest) : undefined;
    if (!test || !testIsActive(test, this.today())) return null;
    let ids = this.scopeCache.get(test.id);
    if (!ids) this.scopeCache.set(test.id, (ids = testItemIds(this.catalog, test)));
    return { test, ids };
  }

  private lessonMasteryCounts(rows: ProgressRow[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (this.scheduler.isMastered(r) && this.catalog.itemById.has(r.itemId)) {
        counts.set(r.lessonId, (counts.get(r.lessonId) ?? 0) + 1);
      }
    }
    return counts;
  }

  private masteredLessons(rows: ProgressRow[]): Set<string> {
    const done = new Set<string>();
    for (const [lessonId, n] of this.lessonMasteryCounts(rows)) {
      const l = this.catalog.lessonById.get(lessonId);
      if (l && n >= l.lesson.items.length) done.add(lessonId);
    }
    return done;
  }

  async dailyStatus(studentId: string, rows?: ProgressRow[]): Promise<DailyStatus> {
    const today = this.today();
    const now = this.clock();
    const [day, progress] = await Promise.all([this.repos.progress.getDay(studentId, today), rows ? Promise.resolve(rows) : this.repos.progress.allProgress(studentId)]);
    const scope = await this.activeScope(studentId);
    const known = progress.filter((r) => this.catalog.itemById.has(r.itemId) && (!scope || scope.ids.has(r.itemId)));
    return {
      today,
      secondsToday: day.seconds,
      roundsToday: day.roundsCompleted,
      goalMet: day.roundsCompleted >= 1,
      done: day.seconds >= DAILY_RULES.dailyTargetSeconds,
      newItemsToday: day.newItems,
      dueCount: known.filter((r) => r.dueAt <= now).length,
      mistakeCount: known.filter((r) => r.isMistake || (r.wrongCount > 0 && !this.scheduler.isMastered(r))).length,
    };
  }

  private async paceByType(studentId: string): Promise<Partial<Record<ItemType, number>>> {
    const rows = await this.repos.progress.recentDurations(studentId);
    const sums = new Map<ItemType, { total: number; n: number }>();
    for (const r of rows) {
      const ref = this.catalog.itemById.get(r.itemId);
      if (!ref || r.seconds <= 0) continue;
      const s = sums.get(ref.item.type) ?? { total: 0, n: 0 };
      s.total += r.seconds;
      s.n++;
      sums.set(ref.item.type, s);
    }
    const out: Partial<Record<ItemType, number>> = {};
    for (const [type, s] of sums) if (s.n >= 5) out[type] = s.total / s.n;
    return out;
  }

  async startSession(
    studentId: string,
    opts: { mode: SessionMode; lessonId?: string | null; focusUnitId?: string | null },
  ): Promise<{ mode: SessionMode; items: (ClientItem & { lessonId: string; isNew: boolean })[]; estimatedSeconds: number; daily: DailyStatus; seed: string }> {
    const now = this.clock();
    const rows = await this.repos.progress.allProgress(studentId);
    const progress = new Map<string, ProgressLite>(rows.map((r) => [r.itemId, r]));
    const [daily, pace, scope] = await Promise.all([this.dailyStatus(studentId, rows), this.paceByType(studentId), opts.mode === "lesson" || opts.mode === "boss" ? null : this.activeScope(studentId)]);
    const plan = buildSession({
      mode: opts.mode,
      // With a test switched on, rounds use only what is on the test. Opening a lesson yourself is always allowed.
      catalog: scope ? this.catalog.entries.filter((e) => scope.ids.has(e.item.id)) : this.catalog.entries,
      testPrep: !!scope,
      progress,
      now,
      today: daily.today,
      focusUnitId: opts.focusUnitId,
      lessonId: opts.lessonId,
      newItemsToday: daily.newItemsToday,
      secondsByType: pace,
    });
    const seed = `${studentId.slice(0, 8)}:${now.getTime()}`;
    const items = plan.entries.map((e) => {
      const ref = this.catalog.itemById.get(e.itemId)!;
      return { ...toClientItem(ref.item, seed), lessonId: e.lessonId, isNew: e.isNew };
    });
    if (opts.mode === "boss" && opts.lessonId) await this.repos.rewards.startBossBattle(studentId, opts.lessonId, now);
    logger.info("session started", { studentId, mode: opts.mode, items: items.length, estimatedSeconds: plan.estimatedSeconds });
    return { mode: opts.mode, items, estimatedSeconds: plan.estimatedSeconds, daily, seed };
  }

  private enrich(item: Item, result: GradeResult): AnswerFeedback {
    return {
      ...result,
      source: item.source,
      explanation: item.explanation,
      he: item.he,
      speak: item.speak,
      keyPoints: item.type === "open" ? item.keyPoints : item.type === "proofread" ? item.keyFixes : undefined,
    };
  }

  async submitAnswer(
    studentId: string,
    input: { itemId: string; response: ItemResponse; seconds: number; mode: SessionMode; selfVerdict?: "correct" | "incorrect" },
  ): Promise<SubmitResult> {
    const ref = this.catalog.itemById.get(input.itemId);
    if (!ref) throw new Error("unknown item");
    const { item } = ref;
    const today = this.today();
    const now = this.clock();
    const usesLlm = LLM_GRADED_TYPES.has(item.type);

    let result: GradeResult;
    if (input.selfVerdict && usesLlm) {
      const model = item.type === "rewrite" ? item.answers[0] : item.type === "open" || item.type === "proofread" ? item.expected : "";
      result = {
        verdict: input.selfVerdict,
        score: input.selfVerdict === "correct" ? 1 : 0,
        feedback: input.selfVerdict === "correct" ? "Nice — you checked your own answer." : "Good honest check. This one will come back for practice.",
        modelAnswer: model,
        notes: [],
      };
    } else {
      if (usesLlm) {
        const day = await this.repos.progress.getDay(studentId, today);
        if (day.llmCalls >= DAILY_RULES.maxLlmCallsPerDay) return this.selfCheck(item, "daily-limit");
      }
      try {
        result = await this.graders.grade(item, input.response);
      } catch (error) {
        if (error instanceof GraderUnavailableError) return this.selfCheck(item, error.retryable ? "busy" : "unavailable");
        throw error;
      }
    }

    const prevRow = await this.repos.progress.getProgress(studentId, item.id);
    const outcome = this.scheduler.apply(toState(prevRow), result.verdict, today, now);
    await this.repos.progress.saveProgress({
      studentId,
      itemId: item.id,
      lessonId: ref.lessonId,
      ...outcome.next,
      lastSeenAt: now,
      ...(prevRow ? {} : { firstSeenAt: now }),
    });

    // Did this answer light a whole lesson?
    let lessonsCompleted: { lessonId: string; unitId: string }[] = [];
    let lessonsMasteredTotal = 0;
    const allRows = await this.repos.progress.allProgress(studentId);
    const mastered = this.masteredLessons(allRows);
    lessonsMasteredTotal = mastered.size;
    if (outcome.becameMastered && mastered.has(ref.lessonId)) lessonsCompleted = [{ lessonId: ref.lessonId, unitId: ref.unitId }];

    const statsRow = await this.repos.progress.getStats(studentId);
    const earned = new Set((await this.repos.progress.earnedBadges(studentId)).map((b) => b.badgeId));
    const dayBefore = await this.repos.progress.getDay(studentId, today);
    const { stats, rewards } = this.engine.process(
      { type: "answer", verdict: result.verdict, difficulty: item.difficulty, llmGraded: usesLlm, outcome, lessonsCompleted, lessonsMasteredTotal },
      toStatsState(statsRow),
      { today, alreadyEarned: earned, roundsToday: dayBefore.roundsCompleted },
    );
    const seconds = Math.max(0, Math.min(Math.round(input.seconds), DAILY_RULES.maxSecondsPerAnswer));
    await Promise.all([
      this.repos.progress.saveStats(studentId, stats),
      this.repos.progress.addBadges(studentId, rewards.badges),
      this.repos.progress.bumpDay(studentId, today, {
        seconds,
        answers: 1,
        correct: result.verdict === "correct" ? 1 : 0,
        xp: rewards.xp,
        newItems: outcome.isNew ? 1 : 0,
        llmCalls: result.byLlm ? 1 : 0,
      }),
      this.repos.progress.recordAttempt({
        createdAt: now,
        studentId,
        itemId: item.id,
        lessonId: ref.lessonId,
        mode: input.mode,
        response: input.response,
        verdict: result.verdict,
        score: result.score,
        feedback: { feedback: result.feedback, notes: result.notes, byLlm: !!result.byLlm, self: !!input.selfVerdict },
        seconds,
      }),
    ]);
    logger.info("answer graded", { studentId, itemId: item.id, verdict: result.verdict, byLlm: !!result.byLlm, box: outcome.next.box });

    return {
      status: "graded",
      feedback: this.enrich(item, result),
      mastered: this.scheduler.isMastered(outcome.next),
      box: outcome.next.box,
      rewards,
      stats: summarize(stats),
      daily: await this.dailyStatus(studentId, allRows),
    };
  }

  private selfCheck(item: Item, reason: string): SubmitResult {
    const modelAnswer = item.type === "rewrite" ? item.answers[0] : item.type === "open" || item.type === "proofread" ? item.expected : "";
    const keyPoints = item.type === "open" ? item.keyPoints : item.type === "proofread" ? item.keyFixes : [];
    logger.warn("self check fallback", { itemId: item.id, reason });
    return { status: "self_check", modelAnswer, keyPoints, reason };
  }

  async completeRound(studentId: string, input: { mode: SessionMode; answered: number }): Promise<{ rewards: Rewards; stats: StatsSummary; daily: DailyStatus; counted: boolean }> {
    const today = this.today();
    const statsRow = await this.repos.progress.getStats(studentId);
    if (input.mode === "boss" || input.answered < DAILY_RULES.goalRoundMinAnswers) {
      return { rewards: { xp: 0, stars: 0, badges: [], events: [] }, stats: summarize(toStatsState(statsRow)), daily: await this.dailyStatus(studentId), counted: false };
    }
    const day = await this.repos.progress.bumpDay(studentId, today, { roundsCompleted: 1 });
    const rows = await this.repos.progress.allProgress(studentId);
    const earned = new Set((await this.repos.progress.earnedBadges(studentId)).map((b) => b.badgeId));
    const { stats, rewards } = this.engine.process(
      { type: "round_complete", roundsToday: day.roundsCompleted, lessonsMasteredTotal: this.masteredLessons(rows).size },
      toStatsState(statsRow),
      { today, alreadyEarned: earned, roundsToday: day.roundsCompleted },
    );
    // Every counted round ends with a treasure chest.
    const chest = await grantChest(this.repos, studentId, "wood", this.random);
    this.addChest(stats, rewards, chest);
    await Promise.all([
      this.repos.progress.saveStats(studentId, stats),
      this.repos.progress.addBadges(studentId, rewards.badges),
      this.repos.progress.bumpDay(studentId, today, { xp: rewards.xp }),
    ]);
    logger.info("round completed", { studentId, mode: input.mode, answered: input.answered, roundsToday: day.roundsCompleted });
    return { rewards, stats: summarize(stats), daily: await this.dailyStatus(studentId, rows), counted: true };
  }

  private addChest(stats: StatsState, rewards: Rewards, chest: ChestContents): void {
    stats.stars += chest.stars;
    rewards.stars += chest.stars;
    rewards.events.push({ kind: "chest", contents: chest });
  }

  async bossStatus(studentId: string, lessonId: string): Promise<BossEligibility> {
    const rows = await this.repos.progress.allProgress(studentId);
    return bossEligibility(this.catalog.entries, new Map(rows.map((r) => [r.itemId, r])), lessonId);
  }

  /**
   * Claims a boss victory. The server checks the battle from the recorded answers: the last
   * `hp` correct boss answers for this lesson, within the time window, with fewer than
   * `hearts` mistakes among them. Hearts left are worked out here, not trusted from the client.
   */
  async completeBoss(studentId: string, lessonId: string): Promise<{ rewards: Rewards; stats: StatsSummary; heartsLeft: number; first: boolean; rewarded: boolean }> {
    const ref = this.catalog.lessonById.get(lessonId);
    if (!ref) throw new RewardError(404, "Lesson not found");
    const now = this.clock();
    const today = this.today();
    const rows = await this.repos.progress.allProgress(studentId);
    const { hp } = bossEligibility(this.catalog.entries, new Map(rows.map((r) => [r.itemId, r])), lessonId);
    if (hp < BOSS_RULES.minItems) throw new RewardError(409, "This lesson has no boss yet");

    const record = await this.repos.rewards.boss(studentId, lessonId);
    const windowStart = now.getTime() - BOSS_RULES.windowMinutes * 60_000;
    if (!record?.battleStartedAt || record.battleStartedAt.getTime() < windowStart) throw new RewardError(409, "Start a boss battle first");
    let correct = 0;
    let wrong = 0;
    for (const v of await this.repos.rewards.recentBossVerdicts(studentId, lessonId, record.battleStartedAt)) {
      if (v === "correct") correct++;
      else wrong++;
    }
    if (correct < hp) throw new RewardError(409, "The battle isn't finished yet");
    if (wrong >= BOSS_RULES.hearts) throw new RewardError(409, "Out of hearts — try the battle again");
    const heartsLeft = BOSS_RULES.hearts - wrong;

    const first = record.timesDefeated === 0;
    const rewarded = first || record.lastRewardDay !== today;
    const statsRow = await this.repos.progress.getStats(studentId);
    if (!rewarded) {
      await this.repos.rewards.recordBossWin(studentId, lessonId, heartsLeft, null);
      return { rewards: { xp: 0, stars: 0, badges: [], events: [{ kind: "boss_defeated", first: false, heartsLeft }] }, stats: summarize(toStatsState(statsRow)), heartsLeft, first, rewarded };
    }

    const earned = new Set((await this.repos.progress.earnedBadges(studentId)).map((b) => b.badgeId));
    const day = await this.repos.progress.getDay(studentId, today);
    const { stats, rewards } = this.engine.process(
      { type: "boss_defeated", first, heartsLeft, lessonsMasteredTotal: this.masteredLessons(rows).size },
      toStatsState(statsRow),
      { today, alreadyEarned: earned, roundsToday: day.roundsCompleted },
    );
    if (first) this.addChest(stats, rewards, await grantChest(this.repos, studentId, "boss", this.random, ref.unit.id));
    await Promise.all([
      this.repos.progress.saveStats(studentId, stats),
      this.repos.progress.addBadges(studentId, rewards.badges),
      this.repos.progress.bumpDay(studentId, today, { xp: rewards.xp }),
      this.repos.rewards.recordBossWin(studentId, lessonId, heartsLeft, today),
    ]);
    logger.info("boss defeated", { studentId, lessonId, first, heartsLeft });
    return { rewards, stats: summarize(stats), heartsLeft, first, rewarded };
  }

  /** Data for the constellation map: per-lesson mastery and overall stats. */
  async overview(studentId: string) {
    const rows = await this.repos.progress.allProgress(studentId);
    const masteredCounts = this.lessonMasteryCounts(rows);
    const seenCounts = new Map<string, number>();
    for (const r of rows) if (this.catalog.itemById.has(r.itemId)) seenCounts.set(r.lessonId, (seenCounts.get(r.lessonId) ?? 0) + 1);
    const [statsRow, daily, badges, bossRows] = await Promise.all([
      this.repos.progress.getStats(studentId),
      this.dailyStatus(studentId, rows),
      this.repos.progress.earnedBadges(studentId),
      this.repos.rewards.bosses(studentId),
    ]);
    const progressMap = new Map(rows.map((r) => [r.itemId, r]));
    const bossWins = new Map(bossRows.map((b) => [b.lessonId, b]));
    const units = this.catalog.units.map((u) => {
      const lessons = u.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        subtitle: l.subtitle,
        source: l.source,
        total: l.items.length,
        seen: seenCounts.get(l.id) ?? 0,
        mastered: masteredCounts.get(l.id) ?? 0,
        boss: { ...bossEligibility(this.catalog.entries, progressMap, l.id), bestHearts: bossWins.get(l.id)?.timesDefeated ? bossWins.get(l.id)!.bestHearts : null },
      }));
      const total = lessons.reduce((a, l) => a + l.total, 0);
      const masteredTotal = lessons.reduce((a, l) => a + l.mastered, 0);
      return { id: u.id, title: u.title, tagline: u.tagline, note: u.note, accent: u.accent, lessons, total, mastered: masteredTotal };
    });
    const scope = await this.activeScope(studentId);
    const test = scope && {
      id: scope.test.id,
      title: scope.test.title,
      date: scope.test.date,
      daysLeft: daysUntil(scope.test, daily.today),
      total: scope.ids.size,
      mastered: rows.filter((r) => scope.ids.has(r.itemId) && this.scheduler.isMastered(r)).length,
      seen: rows.filter((r) => scope.ids.has(r.itemId)).length,
      notInApp: [...scope.test.notInApp],
    };
    return { units, stats: summarize(toStatsState(statsRow)), statsRaw: toStatsState(statsRow), daily, test, badges: badges.map((b) => ({ id: b.badgeId, earnedAt: b.earnedAt })) };
  }
}
