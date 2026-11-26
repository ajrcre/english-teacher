import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "./index";
import { attempts, badgesEarned, bossDefeats, contentFlags, dailyActivity, inventory, itemProgress, parents, rateLimits, studentStats, students } from "./schema";

export type ParentRow = typeof parents.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type ProgressRow = typeof itemProgress.$inferSelect;
export type StatsRow = typeof studentStats.$inferSelect;
export type DayRow = typeof dailyActivity.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type BossRow = typeof bossDefeats.$inferSelect;

/** Repository pattern: all SQL lives here, services work with plain rows. */
export class UserRepository {
  constructor(private readonly db: Db) {}

  async createParent(input: { email: string; name: string; passwordHash: string; familyCode: string }): Promise<ParentRow> {
    const [row] = await this.db.insert(parents).values(input).returning();
    return row;
  }

  async findParentByEmail(email: string): Promise<ParentRow | undefined> {
    const [row] = await this.db.select().from(parents).where(eq(parents.email, email)).limit(1);
    return row;
  }

  async findParentById(id: string): Promise<ParentRow | undefined> {
    const [row] = await this.db.select().from(parents).where(eq(parents.id, id)).limit(1);
    return row;
  }

  async findParentByFamilyCode(code: string): Promise<ParentRow | undefined> {
    const [row] = await this.db.select().from(parents).where(eq(parents.familyCode, code)).limit(1);
    return row;
  }

  async createStudent(input: { parentId: string; name: string; avatar: string; pinHash: string; focusUnit?: string | null }): Promise<StudentRow> {
    const [row] = await this.db.insert(students).values(input).returning();
    await this.db.insert(studentStats).values({ studentId: row.id }).onConflictDoNothing();
    return row;
  }

  async listStudents(parentId: string): Promise<StudentRow[]> {
    return this.db.select().from(students).where(eq(students.parentId, parentId)).orderBy(students.createdAt);
  }

  async findStudent(id: string): Promise<StudentRow | undefined> {
    const [row] = await this.db.select().from(students).where(eq(students.id, id)).limit(1);
    return row;
  }

  async updateStudent(id: string, patch: Partial<Pick<StudentRow, "name" | "avatar" | "pinHash" | "focusUnit" | "activeTest" | "soundOn" | "frame" | "hat">>): Promise<void> {
    await this.db.update(students).set(patch).where(eq(students.id, id));
  }

  async deleteStudent(id: string): Promise<void> {
    await this.db.delete(students).where(eq(students.id, id));
  }
}

export class ProgressRepository {
  constructor(private readonly db: Db) {}

  async allProgress(studentId: string): Promise<ProgressRow[]> {
    return this.db.select().from(itemProgress).where(eq(itemProgress.studentId, studentId));
  }

  async getProgress(studentId: string, itemId: string): Promise<ProgressRow | undefined> {
    const [row] = await this.db
      .select()
      .from(itemProgress)
      .where(and(eq(itemProgress.studentId, studentId), eq(itemProgress.itemId, itemId)))
      .limit(1);
    return row;
  }

  async saveProgress(row: typeof itemProgress.$inferInsert): Promise<void> {
    const { studentId: _s, itemId: _i, firstSeenAt: _f, ...update } = row;
    await this.db
      .insert(itemProgress)
      .values(row)
      .onConflictDoUpdate({ target: [itemProgress.studentId, itemProgress.itemId], set: update });
  }

  async getStats(studentId: string): Promise<StatsRow> {
    const [row] = await this.db.select().from(studentStats).where(eq(studentStats.studentId, studentId)).limit(1);
    if (row) return row;
    const [created] = await this.db.insert(studentStats).values({ studentId }).onConflictDoNothing().returning();
    return created ?? (await this.getStats(studentId));
  }

  /** Saves engine stats. Never writes starsSpent: only RewardsRepository.spendStars changes it, atomically. */
  async saveStats(studentId: string, patch: Partial<Omit<StatsRow, "studentId">>): Promise<void> {
    const { starsSpent: _spent, ...rest } = patch;
    await this.db
      .update(studentStats)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(studentStats.studentId, studentId));
  }

  async getDay(studentId: string, day: string): Promise<DayRow> {
    const [row] = await this.db
      .select()
      .from(dailyActivity)
      .where(and(eq(dailyActivity.studentId, studentId), eq(dailyActivity.day, day)))
      .limit(1);
    return (
      row ?? { studentId, day, seconds: 0, answers: 0, correct: 0, xp: 0, newItems: 0, roundsCompleted: 0, llmCalls: 0 }
    );
  }

  async recentDays(studentId: string, sinceDay: string): Promise<DayRow[]> {
    return this.db
      .select()
      .from(dailyActivity)
      .where(and(eq(dailyActivity.studentId, studentId), gte(dailyActivity.day, sinceDay)))
      .orderBy(dailyActivity.day);
  }

  /** Atomically add to today's counters. */
  async bumpDay(
    studentId: string,
    day: string,
    delta: Partial<Pick<DayRow, "seconds" | "answers" | "correct" | "xp" | "newItems" | "roundsCompleted" | "llmCalls">>,
  ): Promise<DayRow> {
    const v = { seconds: 0, answers: 0, correct: 0, xp: 0, newItems: 0, roundsCompleted: 0, llmCalls: 0, ...delta };
    const [row] = await this.db
      .insert(dailyActivity)
      .values({ studentId, day, ...v })
      .onConflictDoUpdate({
        target: [dailyActivity.studentId, dailyActivity.day],
        set: {
          seconds: sql`${dailyActivity.seconds} + ${v.seconds}`,
          answers: sql`${dailyActivity.answers} + ${v.answers}`,
          correct: sql`${dailyActivity.correct} + ${v.correct}`,
          xp: sql`${dailyActivity.xp} + ${v.xp}`,
          newItems: sql`${dailyActivity.newItems} + ${v.newItems}`,
          roundsCompleted: sql`${dailyActivity.roundsCompleted} + ${v.roundsCompleted}`,
          llmCalls: sql`${dailyActivity.llmCalls} + ${v.llmCalls}`,
        },
      })
      .returning();
    return row;
  }

  async recordAttempt(row: typeof attempts.$inferInsert): Promise<void> {
    await this.db.insert(attempts).values(row);
  }

  async recentAttempts(studentId: string, limit = 50) {
    return this.db.select().from(attempts).where(eq(attempts.studentId, studentId)).orderBy(desc(attempts.createdAt)).limit(limit);
  }

  /** Recent answer durations, used to learn the student's pace per item type. */
  async recentDurations(studentId: string): Promise<{ itemId: string; seconds: number }[]> {
    return this.db
      .select({ itemId: attempts.itemId, seconds: attempts.seconds })
      .from(attempts)
      .where(eq(attempts.studentId, studentId))
      .orderBy(desc(attempts.createdAt))
      .limit(300);
  }

  async earnedBadges(studentId: string) {
    return this.db.select().from(badgesEarned).where(eq(badgesEarned.studentId, studentId)).orderBy(badgesEarned.earnedAt);
  }

  async addBadges(studentId: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.db
      .insert(badgesEarned)
      .values(ids.map((badgeId) => ({ studentId, badgeId })))
      .onConflictDoNothing();
  }
}

/** Stickers, shop purchases and boss victories. */
export class RewardsRepository {
  constructor(private readonly db: Db) {}

  async inventory(studentId: string): Promise<InventoryRow[]> {
    return this.db.select().from(inventory).where(eq(inventory.studentId, studentId)).orderBy(inventory.acquiredAt);
  }

  /** Adds one of an item (stickers stack; avatars, frames and hats stay at 1). */
  async addItem(studentId: string, itemId: string, kind: "sticker" | "avatar" | "frame" | "hat"): Promise<void> {
    await this.db
      .insert(inventory)
      .values({ studentId, itemId, kind })
      .onConflictDoUpdate({ target: [inventory.studentId, inventory.itemId], set: { count: sql`${inventory.count} + 1` } });
  }

  /** Spends stars only if the balance covers the price. Returns false (and changes nothing) otherwise. */
  async spendStars(studentId: string, price: number): Promise<boolean> {
    const rows = await this.db
      .update(studentStats)
      .set({ starsSpent: sql`${studentStats.starsSpent} + ${price}`, updatedAt: new Date() })
      .where(and(eq(studentStats.studentId, studentId), sql`${studentStats.stars} - ${studentStats.starsSpent} >= ${price}`))
      .returning({ id: studentStats.studentId });
    return rows.length > 0;
  }

  async refundStars(studentId: string, price: number): Promise<void> {
    await this.db
      .update(studentStats)
      .set({ starsSpent: sql`greatest(0, ${studentStats.starsSpent} - ${price})` })
      .where(eq(studentStats.studentId, studentId));
  }

  /** Adds a streak shield if below the cap. */
  async addShield(studentId: string, max: number): Promise<boolean> {
    const rows = await this.db
      .update(studentStats)
      .set({ shields: sql`${studentStats.shields} + 1` })
      .where(and(eq(studentStats.studentId, studentId), lt(studentStats.shields, max)))
      .returning({ id: studentStats.studentId });
    return rows.length > 0;
  }

  async bosses(studentId: string): Promise<BossRow[]> {
    return this.db.select().from(bossDefeats).where(eq(bossDefeats.studentId, studentId));
  }

  async boss(studentId: string, lessonId: string): Promise<BossRow | undefined> {
    const [row] = await this.db
      .select()
      .from(bossDefeats)
      .where(and(eq(bossDefeats.studentId, studentId), eq(bossDefeats.lessonId, lessonId)))
      .limit(1);
    return row;
  }

  /** Marks the start of a new battle (creating the lesson's row if needed). */
  async startBossBattle(studentId: string, lessonId: string, at: Date): Promise<void> {
    await this.db
      .insert(bossDefeats)
      .values({ studentId, lessonId, battleStartedAt: at })
      .onConflictDoUpdate({ target: [bossDefeats.studentId, bossDefeats.lessonId], set: { battleStartedAt: at } });
  }

  /** Records a win and closes the battle, so the same answers can't be claimed twice. */
  async recordBossWin(studentId: string, lessonId: string, hearts: number, rewardDay: string | null): Promise<void> {
    await this.db
      .update(bossDefeats)
      .set({
        bestHearts: sql`greatest(${bossDefeats.bestHearts}, ${hearts})`,
        timesDefeated: sql`${bossDefeats.timesDefeated} + 1`,
        battleStartedAt: null,
        ...(rewardDay ? { lastRewardDay: rewardDay } : {}),
      })
      .where(and(eq(bossDefeats.studentId, studentId), eq(bossDefeats.lessonId, lessonId)));
  }

  /** Verdicts of answers given in a mode since a moment, newest first (the Grey Fox spans many lessons). */
  async recentVerdictsByMode(studentId: string, mode: string, since: Date): Promise<string[]> {
    const rows = await this.db
      .select({ verdict: attempts.verdict })
      .from(attempts)
      .where(and(eq(attempts.studentId, studentId), eq(attempts.mode, mode), gte(attempts.createdAt, since)))
      .orderBy(desc(attempts.createdAt), desc(attempts.id))
      .limit(80);
    return rows.map((r) => r.verdict);
  }

  /** Verdicts of boss-mode answers for a lesson since a moment, newest first (to check a claimed victory). */
  async recentBossVerdicts(studentId: string, lessonId: string, since: Date): Promise<string[]> {
    const rows = await this.db
      .select({ verdict: attempts.verdict })
      .from(attempts)
      .where(and(eq(attempts.studentId, studentId), eq(attempts.lessonId, lessonId), eq(attempts.mode, "boss"), gte(attempts.createdAt, since)))
      .orderBy(desc(attempts.createdAt), desc(attempts.id))
      .limit(60);
    return rows.map((r) => r.verdict);
  }
}

export class ContentFlagRepository {
  constructor(private readonly db: Db) {}

  async list(parentId: string) {
    return this.db.select().from(contentFlags).where(eq(contentFlags.parentId, parentId)).orderBy(desc(contentFlags.createdAt));
  }

  async set(parentId: string, itemId: string, status: "approved" | "flagged", note: string | null): Promise<void> {
    await this.db.delete(contentFlags).where(and(eq(contentFlags.parentId, parentId), eq(contentFlags.itemId, itemId)));
    await this.db.insert(contentFlags).values({ parentId, itemId, status, note });
  }
}

/** Fixed-window rate limiter stored in Postgres (works across serverless instances). */
export class RateLimiter {
  constructor(private readonly db: Db) {}

  async hit(key: string, limit: number, windowSeconds: number, now = new Date()): Promise<boolean> {
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);
    const [row] = await this.db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${rateLimits.resetAt} < ${now.toISOString()}::timestamptz then 1 else ${rateLimits.count} + 1 end`,
          resetAt: sql`case when ${rateLimits.resetAt} < ${now.toISOString()}::timestamptz then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
        },
      })
      .returning();
    return row.count <= limit;
  }

  async clear(key: string): Promise<void> {
    await this.db.delete(rateLimits).where(eq(rateLimits.key, key));
  }
}

export interface Repositories {
  users: UserRepository;
  progress: ProgressRepository;
  rewards: RewardsRepository;
  flags: ContentFlagRepository;
  rateLimiter: RateLimiter;
}

export function createRepositories(db: Db): Repositories {
  return {
    users: new UserRepository(db),
    progress: new ProgressRepository(db),
    rewards: new RewardsRepository(db),
    flags: new ContentFlagRepository(db),
    rateLimiter: new RateLimiter(db),
  };
}
