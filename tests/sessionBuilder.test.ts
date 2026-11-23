import { describe, expect, it } from "vitest";
import { itemSchema, type Item } from "@/lib/content/schema";
import { allowedNewItems, bossEligibility, buildSession, SESSION_RULES, type CatalogEntry, type ProgressLite } from "@/lib/scheduling/sessionBuilder";

const now = new Date("2026-11-10T12:00:00Z");
const today = "2026-11-10";

function mk(id: string, type: "mcq" | "open" | "dictation", unitId = "u1", lessonId = "l1"): CatalogEntry {
  const raw =
    type === "mcq"
      ? { id, type, prompt: "?", options: ["a", "b"], answer: 0 }
      : type === "open"
        ? { id, type, question: "?", expected: "x", keyPoints: ["x"] }
        : { id, type, word: id, sentence: id };
  return { item: itemSchema.parse(raw) as Item, unitId, lessonId, order: 0 };
}

function catalog(): CatalogEntry[] {
  const list: CatalogEntry[] = [];
  for (let i = 0; i < 60; i++) list.push(mk(`m${i}`, "mcq"));
  for (let i = 0; i < 10; i++) list.push(mk(`o${i}`, "open"));
  for (let i = 0; i < 30; i++) list.push(mk(`s${i}`, "dictation", "spelling", "spell1"));
  return list.map((c, i) => ({ ...c, order: i }));
}

const progress = (entries: [string, Partial<ProgressLite>][]) =>
  new Map(entries.map(([id, p]) => [id, { itemId: id, box: 1, dueAt: now, isMistake: false, wrongCount: 0, lastSeenAt: now, ...p }]));

describe("buildSession", () => {
  it("keeps a round within ~10 minutes", () => {
    const plan = buildSession({ mode: "explore", catalog: catalog(), progress: new Map(), now, today, newItemsToday: 0 });
    expect(plan.estimatedSeconds).toBeLessThanOrEqual(SESSION_RULES.roundSeconds);
    expect(plan.entries.length).toBeGreaterThan(5);
  });

  it("puts at most 3 open questions in a round", () => {
    const onlyOpen = catalog().filter((c) => c.item.type === "open" || c.item.type === "mcq");
    const plan = buildSession({ mode: "lesson", lessonId: "l1", catalog: onlyOpen, progress: new Map(), now, today, newItemsToday: 0 });
    const opens = plan.entries.filter((e) => e.itemId.startsWith("o"));
    expect(opens.length).toBeLessThanOrEqual(SESSION_RULES.maxLlmItemsPerRound);
  });

  it("caps new items at 20 per day", () => {
    const plan = buildSession({ mode: "explore", catalog: catalog(), progress: new Map(), now, today, newItemsToday: 18 });
    expect(plan.newCount).toBeLessThanOrEqual(2);
  });

  it("throttles new items when tomorrow's review backlog is large", () => {
    const many = progress(catalog().slice(0, 50).map((c) => [c.item.id, { dueAt: now }]));
    const cap = allowedNewItems({ catalog: catalog(), progress: many, today, newItemsToday: 0 });
    expect(cap).toBeLessThanOrEqual(SESSION_RULES.reducedNewPerDay);
  });

  it("puts due mistakes first in a review round", () => {
    const p = progress([
      ["m1", { box: 2 }],
      ["m2", { box: 0, isMistake: true, wrongCount: 1 }],
      ["m3", { box: 1, dueAt: new Date("2026-12-01T00:00:00Z") }],
    ]);
    const plan = buildSession({ mode: "review", catalog: catalog(), progress: p, now, today, newItemsToday: 0 });
    expect(plan.entries[0].itemId).toBe("m2");
    expect(plan.entries.map((e) => e.itemId)).not.toContain("m3");
  });

  it("includes a small slice of spelling in explore rounds", () => {
    const plan = buildSession({ mode: "explore", catalog: catalog(), progress: new Map(), now, today, newItemsToday: 0, focusUnitId: "u1" });
    expect(plan.entries.some((e) => e.itemId.startsWith("s"))).toBe(true);
  });

  it("mistake gym only contains flagged or unmastered wrong items", () => {
    const p = progress([
      ["m1", { isMistake: true }],
      ["m2", { wrongCount: 2, box: 1 }],
      ["m3", { wrongCount: 1, box: 3 }],
      ["m4", {}],
    ]);
    const plan = buildSession({ mode: "mistakes", catalog: catalog(), progress: p, now, today, newItemsToday: 0 });
    expect(plan.entries.map((e) => e.itemId).sort()).toEqual(["m1", "m2"]);
  });
});

describe("spreadOut", () => {
  it("spreads picked entries through the list", async () => {
    const { spreadOut } = await import("@/lib/scheduling/sessionBuilder");
    const out = spreadOut(["s1", "s2", "a", "b", "c", "d", "e", "f"], (x) => x.startsWith("s"));
    expect(out).toHaveLength(8);
    expect(out[0]).not.toBe("s1");
    expect(out.indexOf("s2") - out.indexOf("s1")).toBeGreaterThan(1);
  });
});

describe("boss battles", () => {
  // Lesson l1 in catalog() has 60 multiple-choice and 10 open questions.
  const seenMcq = (n: number, extra: [string, Partial<ProgressLite>][] = []) => progress([...Array.from({ length: n }, (_, i): [string, Partial<ProgressLite>] => [`m${i}`, {}]), ...extra]);

  it("stays locked until half the lesson has been seen", () => {
    expect(bossEligibility(catalog(), seenMcq(20), "l1").available).toBe(false);
    const e = bossEligibility(catalog(), seenMcq(35), "l1");
    expect(e.needed).toBe(35);
    expect(e.available).toBe(true);
    expect(e.hp).toBe(8);
  });

  it("uses only seen, quick questions with mistakes first", () => {
    const p = seenMcq(40, [
      ["o1", {}],
      ["m30", { isMistake: true, box: 0 }],
    ]);
    const plan = buildSession({ mode: "boss", lessonId: "l1", catalog: catalog(), progress: p, now, today, newItemsToday: 0 });
    expect(plan.entries).toHaveLength(8);
    expect(plan.entries[0].itemId).toBe("m30");
    expect(plan.entries.every((e) => e.itemId.startsWith("m") && !e.isNew)).toBe(true);
  });

  it("never offers a boss for a lesson of only open questions", () => {
    const opens = catalog().filter((c) => c.item.type === "open");
    const p = progress(opens.map((c) => [c.item.id, {}]));
    const e = bossEligibility(opens, p, "l1");
    expect(e.available).toBe(false);
    expect(e.needed).toBe(0);
  });
});
