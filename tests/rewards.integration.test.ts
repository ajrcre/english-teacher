import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import type { Item } from "@/lib/content/schema";
import type { Db } from "@/lib/db";
import { createRepositories, type Repositories } from "@/lib/db/repositories";
import { GamificationEngine } from "@/lib/gamification/engine";
import { GraderRegistry } from "@/lib/grading/registry";
import { LeitnerScheduler } from "@/lib/scheduling/leitner";
import { PracticeService } from "@/lib/services/practice";
import { RewardError, RewardsService } from "@/lib/services/rewards";

const catalog = buildCatalog(units);
const LESSON = "gr-stative"; // 10 multiple-choice questions: the boss unlocks after 5

let now = new Date("2026-11-10T08:00:00Z");
let repos: Repositories;
let practice: PracticeService;
let rewards: RewardsService;
let studentId: string;

beforeEach(async () => {
  const client = new PGlite("memory://");
  const db = drizzle(client, { schema: (await import("@/lib/db/schema")) });
  await migrate(db, { migrationsFolder: "drizzle" });
  repos = createRepositories(db as unknown as Db);
  now = new Date("2026-11-10T08:00:00Z");
  practice = new PracticeService(repos, catalog, new GraderRegistry(() => null), new LeitnerScheduler(), new GamificationEngine(), () => now, () => 0.3);
  rewards = new RewardsService(repos);
  const parent = await repos.users.createParent({ email: "p@example.com", name: "P", passwordHash: "x", familyCode: "ABC-DEF" });
  studentId = (await repos.users.createStudent({ parentId: parent.id, name: "Maya", avatar: "fox", pinHash: "x" })).id;
});

const items = () => catalog.lessonById.get(LESSON)!.lesson.items as Extract<Item, { type: "mcq" }>[];
const tick = () => (now = new Date(now.getTime() + 5000));

async function answer(item: Extract<Item, { type: "mcq" }>, correct: boolean, mode: "lesson" | "boss") {
  tick();
  const choice = correct ? item.options[item.answer] : item.options[(item.answer + 1) % item.options.length];
  const r = await practice.submitAnswer(studentId, { itemId: item.id, response: { type: "mcq", choice }, seconds: 5, mode });
  if (r.status !== "graded") throw new Error("expected graded");
  return r;
}

async function unlockBoss() {
  for (const it of items().slice(0, 5)) await answer(it, true, "lesson");
}

describe("boss battles", () => {
  it("unlocks after half the lesson and builds a battle from seen questions", async () => {
    expect((await practice.bossStatus(studentId, LESSON)).available).toBe(false);
    await unlockBoss();
    const status = await practice.bossStatus(studentId, LESSON);
    expect(status).toMatchObject({ available: true, hp: 5 });
    const battle = await practice.startSession(studentId, { mode: "boss", lessonId: LESSON });
    expect(battle.items).toHaveLength(5);
    expect(JSON.stringify(battle.items)).not.toMatch(/"answer"/);
  });

  it("checks a victory against the recorded answers and pays out once a day", async () => {
    await unlockBoss();
    await expect(practice.completeBoss(studentId, LESSON)).rejects.toThrow(RewardError);
    await practice.startSession(studentId, { mode: "boss", lessonId: LESSON });
    await expect(practice.completeBoss(studentId, LESSON)).rejects.toThrow(/isn't finished/);

    await practice.startSession(studentId, { mode: "boss", lessonId: LESSON });
    const battle = items().slice(0, 5);
    await answer(battle[0], false, "boss"); // one heart lost
    for (const it of battle) await answer(it, true, "boss");

    const win = await practice.completeBoss(studentId, LESSON);
    expect(win).toMatchObject({ first: true, rewarded: true, heartsLeft: 2 });
    expect(win.rewards.badges).toContain("boss-1");
    const chest = win.rewards.events.find((e) => e.kind === "chest");
    expect(chest && chest.kind === "chest" && chest.contents.sticker).toBe("boss-grammar");
    expect((await rewards.album(studentId)).stickers.find((s) => s.id === "boss-grammar")?.count).toBe(1);
    expect((await repos.progress.getStats(studentId)).bossesDefeated).toBe(1);

    // The same answers can't be claimed twice…
    await expect(practice.completeBoss(studentId, LESSON)).rejects.toThrow(/Start a boss battle/);
    // …and a second win the same day pays no stars.
    await practice.startSession(studentId, { mode: "boss", lessonId: LESSON });
    for (const it of battle) await answer(it, true, "boss");
    const again = await practice.completeBoss(studentId, LESSON);
    expect(again).toMatchObject({ first: false, rewarded: false, heartsLeft: 3 });
    expect(again.rewards.stars).toBe(0);
  });

  it("refuses a victory claimed after losing all hearts", async () => {
    await unlockBoss();
    await practice.startSession(studentId, { mode: "boss", lessonId: LESSON });
    const battle = items().slice(0, 5);
    for (const it of battle.slice(0, 3)) await answer(it, false, "boss");
    for (const it of battle) await answer(it, true, "boss");
    // The last 5 correct answers came after 3 mistakes in the same battle window.
    await expect(practice.completeBoss(studentId, LESSON)).rejects.toThrow(/hearts/);
  });
});

describe("chests and the shop", () => {
  it("ends every counted round with a treasure chest", async () => {
    const done = await practice.completeRound(studentId, { mode: "review", answered: 8 });
    expect(done.rewards.events.some((e) => e.kind === "chest")).toBe(true);
    const short = await practice.completeRound(studentId, { mode: "review", answered: 2 });
    expect(short.rewards.events).toEqual([]);
  });

  it("spends stars, wears purchases and protects the balance", async () => {
    await expect(rewards.buy(studentId, "frame-gold")).rejects.toThrow(/Not enough stars/);
    await repos.progress.saveStats(studentId, { stars: 130 });

    const shop = await rewards.buy(studentId, "frame-gold");
    expect(shop.balance).toBe(60);
    expect((await repos.users.findStudent(studentId))?.frame).toBe("frame-gold");
    await expect(rewards.buy(studentId, "frame-gold")).rejects.toThrow(/already own/);

    // Engine saves never undo a purchase.
    await repos.progress.saveStats(studentId, { stars: 130, starsSpent: 0 });
    expect((await rewards.shop(studentId)).balance).toBe(60);

    await rewards.buy(studentId, "shield");
    const after = await rewards.buy(studentId, "shield");
    expect(after.balance).toBe(0);
    expect(after.shields).toBe(2);
    await expect(rewards.buy(studentId, "px-cat")).rejects.toThrow(/Not enough stars/);
  });

  it("caps streak shields", async () => {
    await repos.progress.saveStats(studentId, { stars: 500, shields: 2 });
    await expect(rewards.buy(studentId, "shield")).rejects.toThrow(/most shields/);
    expect((await rewards.shop(studentId)).balance).toBe(500);
  });

  it("sells hats for Nova, wears them and can take them off", async () => {
    await repos.progress.saveStats(studentId, { stars: 100 });
    expect(await rewards.canUse(studentId, { hat: "hat-wizard" })).toBe(false);
    const shop = await rewards.buy(studentId, "hat-wizard");
    expect(shop.balance).toBe(10);
    expect(shop.items.find((i) => i.id === "hat-wizard")).toMatchObject({ owned: true, equipped: true });
    expect((await repos.users.findStudent(studentId))?.hat).toBe("hat-wizard");
    expect(await rewards.canUse(studentId, { hat: "hat-wizard" })).toBe(true);
    expect(await rewards.canUse(studentId, { hat: "hat-crown" })).toBe(false);
    expect(await rewards.canUse(studentId, { hat: "frame-gold" })).toBe(false);
    expect((await rewards.owned(studentId)).hats).toEqual(["hat-wizard"]);
    await repos.users.updateStudent(studentId, { hat: null });
    expect((await repos.users.findStudent(studentId))?.hat).toBeNull();
  });

  it("only lets students wear what they own", async () => {
    expect(await rewards.canUse(studentId, { avatar: "owl" })).toBe(true);
    expect(await rewards.canUse(studentId, { avatar: "px-dragon" })).toBe(false);
    expect(await rewards.canUse(studentId, { frame: "frame-stars" })).toBe(false);
    expect(await rewards.canUse(studentId, { avatar: "not-a-thing" })).toBe(false);
    await repos.progress.saveStats(studentId, { stars: 200 });
    await rewards.buy(studentId, "px-dragon");
    expect(await rewards.canUse(studentId, { avatar: "px-dragon" })).toBe(true);
    expect((await repos.users.findStudent(studentId))?.avatar).toBe("px-dragon");
  });
});
