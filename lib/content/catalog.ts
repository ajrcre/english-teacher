import { units as rawUnits } from "@/content/units";
import type { CatalogEntry } from "@/lib/scheduling/sessionBuilder";
import { unitSchema, type Item, type Lesson, type Unit } from "./schema";

export interface ItemRef {
  item: Item;
  lessonId: string;
  unitId: string;
  order: number;
}

export interface Catalog {
  units: Unit[];
  entries: CatalogEntry[];
  itemById: Map<string, ItemRef>;
  lessonById: Map<string, { lesson: Lesson; unit: Unit }>;
  unitById: Map<string, Unit>;
}

/** Parses and validates all content once; throws with a clear message on bad data or duplicate ids. */
export function buildCatalog(input: unknown[]): Catalog {
  const units = input.map((u, i) => {
    const parsed = unitSchema.safeParse(u);
    if (!parsed.success) {
      throw new Error(`content unit #${i} is invalid: ${parsed.error.issues.slice(0, 5).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    }
    return parsed.data;
  });
  const itemById = new Map<string, ItemRef>();
  const lessonById = new Map<string, { lesson: Lesson; unit: Unit }>();
  const unitById = new Map<string, Unit>();
  const entries: CatalogEntry[] = [];
  let order = 0;
  for (const unit of units) {
    if (unitById.has(unit.id)) throw new Error(`duplicate unit id ${unit.id}`);
    unitById.set(unit.id, unit);
    for (const lesson of unit.lessons) {
      if (lessonById.has(lesson.id)) throw new Error(`duplicate lesson id ${lesson.id}`);
      lessonById.set(lesson.id, { lesson, unit });
      for (const item of lesson.items) {
        if (itemById.has(item.id)) throw new Error(`duplicate item id ${item.id}`);
        if (item.type === "mcq" && item.answer >= item.options.length) throw new Error(`item ${item.id}: answer index out of range`);
        if (item.type === "mcq" && new Set(item.options).size !== item.options.length) throw new Error(`item ${item.id}: duplicate options`);
        if (item.type === "sort") {
          for (const e of item.entries) if (!item.buckets.includes(e.bucket)) throw new Error(`item ${item.id}: unknown bucket ${e.bucket}`);
        }
        const ref = { item, lessonId: lesson.id, unitId: unit.id, order: order++ };
        itemById.set(item.id, ref);
        entries.push(ref);
      }
    }
  }
  return { units, entries, itemById, lessonById, unitById };
}

let catalog: Catalog | null = null;

export function getCatalog(): Catalog {
  catalog ??= buildCatalog(rawUnits);
  return catalog;
}
