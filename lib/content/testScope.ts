import type { TestDef, TestRule } from "@/content/tests";
import type { Catalog, ItemRef } from "./catalog";

/** Workbook page range of an item's source, e.g. "Workbook p. 141" or "Workbook p. 143–144". */
export function sourcePages(source: string | undefined): [number, number] | null {
  const m = source?.match(/\bpp?\.\s*(\d+)(?:\s*[–-]\s*(\d+))?/);
  if (!m) return null;
  const from = Number(m[1]);
  return [from, m[2] ? Number(m[2]) : from];
}

function ruleIncludes(rule: TestRule, ref: ItemRef): boolean {
  if (ref.lessonId !== rule.lessonId) return false;
  if (!rule.pages) return true;
  const pages = sourcePages(ref.item.source);
  return !!pages && pages[0] <= rule.pages[1] && pages[1] >= rule.pages[0];
}

/** The ids of all questions a test covers. */
export function testItemIds(catalog: Catalog, test: TestDef): Set<string> {
  const out = new Set<string>();
  for (const ref of catalog.itemById.values()) if (test.rules.some((r) => ruleIncludes(r, ref))) out.add(ref.item.id);
  return out;
}

/** The lessons a test covers (some only in part: see testItemIds). */
export function testLessonIds(test: TestDef): Set<string> {
  return new Set(test.rules.map((r) => r.lessonId));
}

/** A test is "on" for a student until the end of the test day. */
export function testIsActive(test: TestDef, today: string): boolean {
  return today <= test.date;
}

export function daysUntil(test: TestDef, today: string): number {
  return Math.round((Date.parse(`${test.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
