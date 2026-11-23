import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "./index";
import { attempts, badgesEarned, contentFlags, dailyActivity, itemProgress, parents, rateLimits, studentStats, students } from "./schema";

export type ParentRow = typeof parents.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type ProgressRow = typeof itemProgress.$inferSelect;
export type StatsRow = typeof studentStats.$inferSelect;
export type DayRow = typeof dailyActivity.$inferSelect;

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

  async updateStudent(id: string, patch: Partial<Pick<StudentRow, "name" | "avatar" | "pinHash" | "focusUnit" | "activeTest" | "soundOn">>): Promise<void> {
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

  async saveStats(studentId: string, patch: Partial<Omit<StatsRow, "studentId">>): Promise<void> {
    await this.db
      .update(studentStats)
      .set({ ...patch, updatedAt: new Date() })
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
  flags: ContentFlagRepository;
  rateLimiter: RateLimiter;
}

export function createRepositories(db: Db): Repositories {
  return {
    users: new UserRepository(db),
    progress: new ProgressRepository(db),
    flags: new ContentFlagRepository(db),
    rateLimiter: new RateLimiter(db),
  };
}
