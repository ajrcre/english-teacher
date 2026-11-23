import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { testById, tests } from "@/content/tests";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { sourcePages, testItemIds, testIsActive, daysUntil } from "@/lib/content/testScope";
import type { Db } from "@/lib/db";
import { createRepositories, type Repositories } from "@/lib/db/repositories";
import * as schema from "@/lib/db/schema";
import { GamificationEngine } from "@/lib/gamification/engine";
import { GraderRegistry } from "@/lib/grading/registry";
import { LeitnerScheduler } from "@/lib/scheduling/leitner";
import { PracticeService } from "@/lib/services/practice";
import { SESSION_RULES, allowedNewItems } from "@/lib/scheduling/sessionBuilder";

const catalog = buildCatalog(units);
const test2 = testById("year7-test-2")!;

describe("test scope", () => {
  it("reads page numbers from item sources", () => {
    expect(sourcePages("Workbook p. 141")).toEqual([141, 141]);
    expect(sourcePages("Workbook p. 143–144")).toEqual([143, 144]);
    expect(sourcePages("Workbook pp. 171–174")).toEqual([171, 174]);
    expect(sourcePages("Workbook p. 6, paragraph 2")).toEqual([6, 6]);
    expect(sourcePages("Number the Stars, chapter 3")).toBeNull();
    expect(sourcePages(undefined)).toBeNull();
  });

  it("only refers to lessons that exist", () => {
    for (const t of tests) for (const r of t.rules) expect(catalog.lessonById.has(r.lessonId), r.lessonId).toBe(true);
  });

  it("covers Test 2 exactly: punctuation, vocabulary 15–16, present tenses 139–142, American/British, Number the Stars 1–3", () => {
    const ids = testItemIds(catalog, test2);
    const perLesson = new Map<string, number>();
    for (const id of ids) perLesson.set(catalog.itemById.get(id)!.lessonId, (perLesson.get(catalog.itemById.get(id)!.lessonId) ?? 0) + 1);
    expect(Object.fromEntries(perLesson)).toEqual({
      "gr-capitals": 9,
      "nts-vocab": 2, // page 15 only; pages 17–18 are not on the test
      "nts-ame-bre": 10,
      "gr-present": 34, // pages 141–142; pages 143–144 are not on the test
      "gr-stative": 10,
      "nts-rescue": 27,
      "nts-ch1-4": 9,
    });
    // Nothing from other pages leaks in.
    for (const id of ids) {
      const ref = catalog.itemById.get(id)!;
      if (ref.lessonId === "gr-present") expect(sourcePages(ref.item.source)![1]).toBeLessThanOrEqual(142);
      if (ref.lessonId === "nts-vocab") expect(sourcePages(ref.item.source)![0]).toBeLessThanOrEqual(16);
    }
  });

  it("is on until the end of the test day", () => {
    expect(testIsActive(test2, "2026-11-29")).toBe(true);
    expect(testIsActive(test2, "2026-11-30")).toBe(false);
    expect(daysUntil(test2, "2026-11-23")).toBe(6);
  });
});

describe("pacing", () => {
  it("allows more new questions per day while preparing for a test, ignoring the review backlog brake", () => {
    const base = { catalog: catalog.entries, progress: new Map(), today: "2026-11-23", newItemsToday: 5 };
    expect(allowedNewItems(base)).toBe(SESSION_RULES.maxNewPerDay - 5);
    expect(allowedNewItems({ ...base, testPrep: true })).toBe(SESSION_RULES.maxNewPerDayTestPrep - 5);
    expect(SESSION_RULES.maxNewPerDayTestPrep).toBeGreaterThan(SESSION_RULES.maxNewPerDay);
  });
});

describe("test prep rounds", () => {
  let repos: Repositories;
  let service: PracticeService;
  let studentId: string;
  let now: Date;

  beforeEach(async () => {
    const db = drizzle(new PGlite("memory://"), { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    repos = createRepositories(db as unknown as Db);
    now = new Date("2026-11-23T08:00:00Z");
    service = new PracticeService(repos, catalog, new GraderRegistry(() => null), new LeitnerScheduler(), new GamificationEngine(), () => now);
    const parent = await repos.users.createParent({ email: "p@example.com", name: "P", passwordHash: "x", familyCode: "ABC-DEF" });
    studentId = (await repos.users.createStudent({ parentId: parent.id, name: "Rotem", avatar: "fox", pinHash: "x", focusUnit: "the-giver" })).id;
  });

  const scope = () => testItemIds(catalog, test2);

  it("without a test, rounds mix every unit", async () => {
    const s = await service.startSession(studentId, { mode: "explore", focusUnitId: null });
    const units = new Set(s.items.map((i) => catalog.itemById.get(i.id)!.unitId));
    expect(units.size).toBeGreaterThan(1);
    expect((await service.overview(studentId)).test).toBeNull();
  });

  it("with the test on, review and explore rounds use only its questions", async () => {
    await repos.users.updateStudent(studentId, { activeTest: test2.id });
    for (const mode of ["review", "explore"] as const) {
      const s = await service.startSession(studentId, { mode, focusUnitId: "the-giver" });
      expect(s.items.length).toBeGreaterThan(8);
      for (const item of s.items) expect(scope().has(item.id), `${mode}: ${item.id}`).toBe(true);
    }
  });

  it("lets a student open any lesson themselves", async () => {
    await repos.users.updateStudent(studentId, { activeTest: test2.id });
    const s = await service.startSession(studentId, { mode: "lesson", lessonId: "giver-ch1-2-vocab" });
    expect(s.items.length).toBeGreaterThan(0);
    for (const item of s.items) expect(catalog.itemById.get(item.id)!.lessonId).toBe("giver-ch1-2-vocab");
  });

  it("rounds are still time-boxed, and everything in them is new on the first day", async () => {
    await repos.users.updateStudent(studentId, { activeTest: test2.id });
    const s = await service.startSession(studentId, { mode: "review", focusUnitId: null });
    expect(s.items.every((i) => i.isNew)).toBe(true);
    expect(s.estimatedSeconds).toBeLessThanOrEqual(660);
  });

  it("reports progress on the test and counts only its questions", async () => {
    await repos.users.updateStudent(studentId, { activeTest: test2.id });
    const o = await service.overview(studentId);
    expect(o.test).toMatchObject({ id: test2.id, daysLeft: 6, total: 101, mastered: 0, seen: 0 });
    expect(o.test!.notInApp).toEqual(["Unseen (reading a new text)", "Writing"]);

    // A mistake inside the test counts; one outside it does not.
    const inside = [...scope()][0];
    const outside = "giver.v1.c1";
    await service.submitAnswer(studentId, { itemId: outside, response: { type: "mcq", choice: "palpable" }, seconds: 5, mode: "explore" });
    expect((await service.dailyStatus(studentId)).mistakeCount).toBe(0);
    expect(scope().has(outside)).toBe(false);
    expect(scope().has(inside)).toBe(true);
  });

  it("switches itself off after the test day", async () => {
    await repos.users.updateStudent(studentId, { activeTest: test2.id });
    now = new Date("2026-11-30T08:00:00Z");
    expect((await service.overview(studentId)).test).toBeNull();
    const s = await service.startSession(studentId, { mode: "explore", focusUnitId: null });
    expect(new Set(s.items.map((i) => catalog.itemById.get(i.id)!.unitId)).size).toBeGreaterThan(1);
  });
});
