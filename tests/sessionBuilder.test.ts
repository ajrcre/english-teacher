import { describe, expect, it } from "vitest";
import { itemSchema, type Item } from "@/lib/content/schema";
import { allowedNewItems, buildSession, SESSION_RULES, type CatalogEntry, type ProgressLite } from "@/lib/scheduling/sessionBuilder";

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
