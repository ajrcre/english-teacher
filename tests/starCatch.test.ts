import { describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { toClientItem } from "@/lib/content/client";
import { decoyLetter, fillMask, isNextLetter, isPair, matchKey, mcqGame, nextLetter, pickDecoy, spellKey, STAR_RULES, starColumns, starEligible, withDecoy, foxGreyX, FOX_STAR_RULES, GREY_STAR } from "@/lib/game/starCatch";

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
    expect(spellKey("x", "ice-cream-sundae-deluxe")).toBeUndefined();
    expect(spellKey("x", "two words!")).toBeUndefined();
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

  it("adds a borrowed third star to two-answer questions only", () => {
    const pool = ["can hear", "is costing", "Have", "x".repeat(STAR_RULES.maxOptionChars + 1)];
    const d = pickDecoy("q1", ["have", "am having"], pool);
    expect(["can hear", "is costing"]).toContain(d);
    expect(pickDecoy("q1", ["have", "am having"], pool)).toBe(d); // stable
    expect(pickDecoy("q1", ["a", "b", "c"], pool)).toBeNull();
    expect(pickDecoy("q1", ["have", "am having"], ["have"])).toBeNull();
    const stars = withDecoy("q1", ["have", "am having"], d);
    expect(stars).toHaveLength(3);
    expect(stars).toEqual(expect.arrayContaining(["have", "am having", d]));
    expect(withDecoy("q1", ["a", "b", "c", "d"], "z")).toEqual(["a", "b", "c", "d"]);
  });

  it("fills in spaces and marks for answers of more than one word", () => {
    const key = spellKey("gr.t1", "Had gone", 16)!;
    expect(key.n).toBe(7);
    expect(key.mask).toBe("___ ____");
    expect(fillMask(key, "hadgone")).toBe("had gone");
    expect(fillMask(key, "hadg")).toBe("had g");
    expect(spellKey("gr.t2", "isn't", 16)!.mask).toBe("___'_");
    expect(spellKey("gr.t3", "potatoes", 16)!.mask).toBeUndefined();
  });

  it("works for every typed answer it covers, and the browser never gets the answer", () => {
    let covered = 0;
    for (const { item } of buildCatalog(units).entries) {
      if (item.type !== "typed") continue;
      const c = toClientItem(item, "seed");
      if (c.type !== "typed" || !c.spell) continue;
      covered++;
      expect(JSON.stringify(c)).not.toContain(JSON.stringify(item.answers[0]));
      let letters = "";
      for (let i = 0; i < c.spell.n; i++) letters += nextLetter(item.id, c.spell, letters) ?? "?";
      expect(fillMask(c.spell, letters)).toBe(item.answers[0].trim().toLowerCase());
    }
    expect(covered).toBeGreaterThan(180);
  });

  it("checks matching pairs with hashes, for every matching question it covers", () => {
    let covered = 0;
    for (const { item } of buildCatalog(units).entries) {
      if (item.type !== "match") continue;
      const c = toClientItem(item, "seed");
      if (c.type !== "match" || !c.pairKey) continue;
      covered++;
      const short = c.pairKey.fall === "right" ? 1 : 0;
      expect(Math.max(...item.pairs.map((p) => p[short].length))).toBeLessThanOrEqual(STAR_RULES.maxOptionChars + 2);
      for (const [l, r] of item.pairs) expect(isPair(item.id, c.pairKey, l, r)).toBe(true);
      const [[l0], [, r1]] = item.pairs;
      expect(isPair(item.id, c.pairKey, l0, r1)).toBe(false);
    }
    expect(covered).toBeGreaterThan(35);
    expect(matchKey("x", [["a", "b"]])).toBeUndefined();
  });
});

describe("the Grey Fox's Star Catch", () => {
  it("drops grey stars inside the field, often near Nova", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const xs = Array.from({ length: 200 }, () => foxGreyX(rand, 80, 160));
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(16);
      expect(x).toBeLessThanOrEqual(144);
    }
    expect(xs.filter((x) => Math.abs(x - 80) <= 18).length).toBeGreaterThan(60);
    expect(foxGreyX(() => 0.1, 2, 160)).toBe(16);
  });

  it("drops the answer stars fast once they let go, and grey ones a little slower", () => {
    expect(FOX_STAR_RULES.dropMs).toBeLessThan(FOX_STAR_RULES.greyDropMs);
    expect(FOX_STAR_RULES.greyEveryMs[0]).toBeLessThan(FOX_STAR_RULES.greyEveryMs[1]);
    expect(GREY_STAR.length).toBeGreaterThan(0);
  });
});
