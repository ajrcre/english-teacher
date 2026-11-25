import { describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { toClientItem } from "@/lib/content/client";

describe("content", () => {
  const catalog = buildCatalog(units);

  it("validates every unit, lesson and item", () => {
    expect(catalog.units).toHaveLength(7);
    expect(catalog.entries.length).toBeGreaterThan(1400);
  });

  it("never sends answers to the browser", () => {
    for (const { item } of catalog.entries) {
      const json = JSON.stringify(toClientItem(item, "seed"));
      expect(json).not.toMatch(/"answer"|"answers"|"expected"|"keyPoints"|"explanation"|"he"|"keyFixes"/);
      if (item.type === "dictation") {
        const c = toClientItem(item, "seed");
        const visible = Object.entries(c).filter(([k]) => k !== "type").map(([, v]) => (typeof v === "object" ? JSON.stringify(v) : String(v)).toLowerCase());
        for (const v of visible) expect(v).not.toContain(item.word.toLowerCase());
      }
    }
  });

  it("shuffles choices without losing any", () => {
    for (const { item } of catalog.entries) {
      if (item.type !== "mcq") continue;
      const c = toClientItem(item, "x");
      if (c.type !== "mcq") throw new Error("type");
      expect([...c.options].sort()).toEqual([...item.options].sort());
    }
  });
});
