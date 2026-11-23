import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import type { Db } from "@/lib/db";
import { createRepositories, type Repositories } from "@/lib/db/repositories";
import * as schema from "@/lib/db/schema";
import { GamificationEngine } from "@/lib/gamification/engine";
import type { LlmClient } from "@/lib/grading/llm/types";
import { LlmUnavailableError } from "@/lib/grading/llm/types";
import { GraderRegistry } from "@/lib/grading/registry";
import { LeitnerScheduler } from "@/lib/scheduling/leitner";
import { PracticeService } from "@/lib/services/practice";

const catalog = buildCatalog(units);

let now = new Date("2026-11-10T08:00:00Z");
let llm: LlmClient | null = null;
let repos: Repositories;
let service: PracticeService;
let studentId: string;

beforeEach(async () => {
  const client = new PGlite("memory://");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  repos = createRepositories(db as unknown as Db);
  now = new Date("2026-11-10T08:00:00Z");
  llm = null;
  service = new PracticeService(repos, catalog, new GraderRegistry(() => llm), new LeitnerScheduler(), new GamificationEngine(), () => now);
  const parent = await repos.users.createParent({ email: "p@example.com", name: "P", passwordHash: "x", familyCode: "ABC-DEF" });
  studentId = (await repos.users.createStudent({ parentId: parent.id, name: "Maya", avatar: "fox", pinHash: "x", focusUnit: "the-giver" })).id;
});

const mcqId = "giver.v1.c1"; // answer: supplementary

describe("PracticeService", () => {
  it("starts a round without leaking answers", async () => {
    const s = await service.startSession(studentId, { mode: "explore", focusUnitId: "the-giver" });
    expect(s.items.length).toBeGreaterThan(5);
    expect(JSON.stringify(s.items)).not.toMatch(/"answer"|"expected"|"answers"/);
  });

  it("records a mistake, brings it back first in review, and counts the fix", async () => {
    const wrong = await service.submitAnswer(studentId, { itemId: mcqId, response: { type: "mcq", choice: "palpable" }, seconds: 10, mode: "explore" });
    expect(wrong.status).toBe("graded");
    if (wrong.status !== "graded") return;
    expect(wrong.feedback.verdict).toBe("incorrect");
    expect(wrong.feedback.modelAnswer).toBe("supplementary");
    expect(wrong.daily.mistakeCount).toBe(1);

    const review = await service.startSession(studentId, { mode: "review" });
    expect(review.items[0].id).toBe(mcqId);
    const gym = await service.startSession(studentId, { mode: "mistakes" });
    expect(gym.items.map((i) => i.id)).toEqual([mcqId]);

    const right = await service.submitAnswer(studentId, { itemId: mcqId, response: { type: "mcq", choice: "supplementary" }, seconds: 5, mode: "review" });
    if (right.status !== "graded") throw new Error("expected graded");
    expect(right.rewards.events).toContainEqual({ kind: "mistake_fixed" });
    expect((await repos.progress.getStats(studentId)).mistakesFixed).toBe(1);
  });

  it("masters an item only after correct answers on three separate days", async () => {
    const answer = () => service.submitAnswer(studentId, { itemId: mcqId, response: { type: "mcq", choice: "supplementary" }, seconds: 5, mode: "lesson" });
    await answer();
    await answer(); // same day: no extra promotion
    now = new Date("2026-11-11T08:00:00Z");
    await answer();
    now = new Date("2026-11-14T08:00:00Z");
    const third = await answer();
    if (third.status !== "graded") throw new Error("expected graded");
    expect(third.mastered).toBe(true);
    expect(third.rewards.badges).toContain("first-star");
  });

  it("counts a round toward the streak only with enough answers", async () => {
    expect((await service.completeRound(studentId, { mode: "review", answered: 2 })).counted).toBe(false);
    const done = await service.completeRound(studentId, { mode: "review", answered: 8 });
    expect(done.counted).toBe(true);
    expect(done.stats.streak).toBe(1);
    now = new Date("2026-11-11T09:00:00Z");
    expect((await service.completeRound(studentId, { mode: "review", answered: 8 })).stats.streak).toBe(2);
  });

  it("falls back to self-check when the answer checker is unavailable", async () => {
    llm = { name: "down", grade: async () => Promise.reject(new LlmUnavailableError("429", true)) };
    const res = await service.submitAnswer(studentId, { itemId: "giver.ch5.q1", response: { type: "open", text: "telling dreams" }, seconds: 20, mode: "lesson" });
    expect(res.status).toBe("self_check");
    const self = await service.submitAnswer(studentId, { itemId: "giver.ch5.q1", response: { type: "open", text: "telling dreams" }, seconds: 20, mode: "lesson", selfVerdict: "correct" });
    expect(self.status).toBe("graded");
  });

  it("tracks minutes toward the 20-minute day", async () => {
    for (let i = 0; i < 6; i++) {
      await service.submitAnswer(studentId, { itemId: `giver.v1.c${i + 1}`, response: { type: "mcq", choice: "x" }, seconds: 240, mode: "explore" });
    }
    const status = await service.dailyStatus(studentId);
    expect(status.secondsToday).toBe(1440);
    expect(status.done).toBe(true);
  });
});
