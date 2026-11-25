import { describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { toClientItem } from "@/lib/content/client";
import { decoyLetter, isNextLetter, mcqGame, nextLetter, spellKey, STAR_RULES, starColumns, starEligible } from "@/lib/game/starCatch";

const q = (options: string[]) => ({ type: "mcq", prompt: "Choose the best word.", options });

describe("star catch rules", () => {
  it("plays multiple choice with 2–4 short answers as stars", () => {
    expect(starEligible(q(["anthem", "ritual", "transgression"]))).toBe(true);
    expect(starEligible(q(["only one"]))).toBe(false);
    expect(starEligible(q(["a", "b", "c", "d", "e"]))).toBe(false);
    expect(starEligible(q(["fine", "x".repeat(STAR_RULES.maxOptionChars + 1)]))).toBe(false);
    expect(starEligible({ type: "typed", prompt: "?" })).toBe(false);
  });

  it("alternates blocks of three between Star Catch and the runner", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => mcqGame(n, true))).toEqual(["stars", "stars", "stars", "runner", "runner", "runner", "stars"]);
    expect(mcqGame(0, false)).toBe("runner");
  });

  it("checks letters with prefix hashes, without the word", () => {
    const key = spellKey("spell.t1.w3", "Orchard")!;
    expect(key.n).toBe(7);
    expect(JSON.stringify(key)).not.toContain("orchard");
    let prefix = "";
    for (const ch of "orchard") {
      expect(nextLetter("spell.t1.w3", key, prefix)).toBe(ch);
      expect(isNextLetter("spell.t1.w3", key, prefix, ch)).toBe(true);
      expect(isNextLetter("spell.t1.w3", key, prefix, ch === "x" ? "y" : "x")).toBe(false);
      prefix += ch;
    }
    expect(nextLetter("spell.t1.w3", key, prefix)).toBeNull();
    // the same word under another item has different hashes
    expect(spellKey("spell.t1.w4", "orchard")!.h[0]).not.toBe(key.h[0]);
    expect(spellKey("x", "ice cream")).toBeUndefined();
  });

  it("works for every spelling word, and the browser never gets the word", () => {
    for (const { item } of buildCatalog(units).entries) {
      if (item.type !== "dictation") continue;
      const c = toClientItem(item, "seed");
      if (c.type !== "dictation") throw new Error("type");
      expect(c.spell, item.id).toBeDefined();
      expect(JSON.stringify(c.spell)).not.toMatch(new RegExp(`"${item.word}"`, "i"));
      let prefix = "";
      for (let i = 0; i < c.spell!.n; i++) prefix += nextLetter(item.id, c.spell!, prefix) ?? "?";
      expect(prefix).toBe(item.word.toLowerCase());
    }
  });

  it("drops wrong letters that are never the right one or already falling", () => {
    for (let i = 0; i < 200; i++) {
      const d = decoyLetter("e", ["a", "i"]);
      expect(d).toMatch(/^[a-z]$/);
      expect(["e", "a", "i"]).not.toContain(d);
    }
  });

  it("spreads the answer stars across the field", () => {
    const cols = starColumns(4, 160);
    expect(cols.map((c) => c.x)).toEqual([...cols.map((c) => c.x)].sort((a, b) => a - b));
    expect(cols[0].x).toBeGreaterThanOrEqual(10);
    expect(cols[3].x).toBeLessThanOrEqual(150);
  });
});
