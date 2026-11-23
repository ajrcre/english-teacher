import { ESTIMATED_SECONDS, LLM_GRADED_TYPES, type Item, type ItemType } from "@/lib/content/schema";
import { addDays, dayStart } from "@/lib/time";

export type SessionMode = "review" | "explore" | "lesson" | "mistakes";

export interface CatalogEntry {
  item: Item;
  lessonId: string;
  unitId: string;
  /** Global authoring order, used to introduce new items in sequence. */
  order: number;
}

export interface ProgressLite {
  itemId: string;
  box: number;
  dueAt: Date;
  isMistake: boolean;
  wrongCount: number;
  lastSeenAt: Date;
}

export interface BuildInput {
  mode: SessionMode;
  catalog: readonly CatalogEntry[];
  progress: ReadonlyMap<string, ProgressLite>;
  now: Date;
  today: string;
  focusUnitId?: string | null;
  lessonId?: string | null;
  /** New items already introduced today. */
  newItemsToday: number;
  budgetSeconds?: number;
  /** The student's measured average seconds per item type (overrides the defaults). */
  secondsByType?: Partial<Record<ItemType, number>>;
  /**
   * Test prep: there is a deadline, so more new items per day are allowed and the review-backlog
   * brake is off. The time budget of each round still limits how much is actually asked.
   */
  testPrep?: boolean;
}

export interface SessionEntry {
  itemId: string;
  lessonId: string;
  isNew: boolean;
  estSeconds: number;
}

export interface SessionPlan {
  mode: SessionMode;
  entries: SessionEntry[];
  estimatedSeconds: number;
  newCount: number;
}

export const SESSION_RULES = {
  roundSeconds: 600,
  maxLlmItemsPerRound: 3,
  maxNewPerDay: 20,
  /** If tomorrow's reviews would take longer than this, slow down new items. */
  backlogSoftSeconds: 600,
  backlogHardSeconds: 900,
  reducedNewPerDay: 5,
  maxNewPerDayTestPrep: 40,
  spellingSliceSeconds: 120,
  spellingUnitId: "spelling",
  masteryBox: 3,
} as const;

function estimate(item: Item, secondsByType?: Partial<Record<ItemType, number>>): number {
  const measured = secondsByType?.[item.type];
  const base = ESTIMATED_SECONDS[item.type];
  // Blend toward the student's own pace, but never trust a wildly off average.
  return measured ? Math.round(Math.min(Math.max((base + measured) / 2, base * 0.5), base * 2)) : base;
}

/** How many new items may still be introduced today, given the review backlog. */
export function allowedNewItems(input: Pick<BuildInput, "catalog" | "progress" | "today" | "newItemsToday" | "secondsByType" | "testPrep">): number {
  if (input.testPrep) return Math.max(0, SESSION_RULES.maxNewPerDayTestPrep - input.newItemsToday);
  const byId = new Map(input.catalog.map((c) => [c.item.id, c.item]));
  const endOfTomorrow = dayStart(addDays(input.today, 2));
  let tomorrowLoad = 0;
  for (const p of input.progress.values()) {
    const item = byId.get(p.itemId);
    if (item && p.dueAt < endOfTomorrow) tomorrowLoad += estimate(item, input.secondsByType);
  }
  let cap: number = SESSION_RULES.maxNewPerDay;
  if (tomorrowLoad > SESSION_RULES.backlogHardSeconds) cap = 0;
  else if (tomorrowLoad > SESSION_RULES.backlogSoftSeconds) cap = SESSION_RULES.reducedNewPerDay;
  return Math.max(0, cap - input.newItemsToday);
}

class PlanAccumulator {
  readonly entries: SessionEntry[] = [];
  private readonly used = new Set<string>();
  seconds = 0;
  llmCount = 0;
  newCount = 0;

  constructor(
    private readonly budget: number,
    private readonly secondsByType: BuildInput["secondsByType"],
  ) {}

  get remaining(): number {
    return this.budget - this.seconds;
  }

  has(id: string): boolean {
    return this.used.has(id);
  }

  /** Adds the item if it fits the time budget and the open-question limit. */
  tryAdd(c: CatalogEntry, isNew: boolean): boolean {
    if (this.used.has(c.item.id)) return false;
    const est = estimate(c.item, this.secondsByType);
    const isLlm = LLM_GRADED_TYPES.has(c.item.type);
    if (isLlm && this.llmCount >= SESSION_RULES.maxLlmItemsPerRound) return false;
    if (this.entries.length > 0 && this.seconds + est > this.budget) return false;
    this.entries.push({ itemId: c.item.id, lessonId: c.lessonId, isNew, estSeconds: est });
    this.used.add(c.item.id);
    this.seconds += est;
    if (isLlm) this.llmCount++;
    if (isNew) this.newCount++;
    return true;
  }

  fill(candidates: readonly CatalogEntry[], isNew: boolean, maxCount = Infinity): void {
    let added = 0;
    for (const c of candidates) {
      if (added >= maxCount || this.remaining <= 0) break;
      if (this.tryAdd(c, isNew)) added++;
    }
  }
}

/**
 * Builds one ~10-minute round. Pure function: all state comes in through `input`,
 * which keeps it easy to test and independent of the database.
 */
export function buildSession(input: BuildInput): SessionPlan {
  const budget = input.budgetSeconds ?? SESSION_RULES.roundSeconds;
  const acc = new PlanAccumulator(budget, input.secondsByType);
  const { catalog, progress, now } = input;

  const seen = (c: CatalogEntry) => progress.get(c.item.id);
  const isDue = (c: CatalogEntry) => {
    const p = seen(c);
    return !!p && p.dueAt <= now;
  };
  const isUnseen = (c: CatalogEntry) => !progress.has(c.item.id);
  const notMastered = (c: CatalogEntry) => {
    const p = seen(c);
    return !!p && p.box < SESSION_RULES.masteryBox;
  };
  const reviewOrder = (a: CatalogEntry, b: CatalogEntry) => {
    const pa = seen(a)!;
    const pb = seen(b)!;
    if (pa.isMistake !== pb.isMistake) return pa.isMistake ? -1 : 1;
    if (pa.box !== pb.box) return pa.box - pb.box;
    return pa.dueAt.getTime() - pb.dueAt.getTime();
  };
  const byOrder = (a: CatalogEntry, b: CatalogEntry) => a.order - b.order;
  const leastRecent = (a: CatalogEntry, b: CatalogEntry) => seen(a)!.lastSeenAt.getTime() - seen(b)!.lastSeenAt.getTime();

  const unitOf = new Map(catalog.map((c) => [c.item.id, c.unitId]));
  const focus = input.focusUnitId ?? null;
  const inFocus = (c: CatalogEntry) => !focus || c.unitId === focus;
  const newCap = allowedNewItems(input);

  const newItemsPreferFocus = () => {
    const unseen = catalog.filter(isUnseen).sort(byOrder);
    return [...unseen.filter(inFocus), ...unseen.filter((c) => !inFocus(c))];
  };

  switch (input.mode) {
    case "review": {
      acc.fill(catalog.filter(isDue).sort(reviewOrder), false);
      if (acc.remaining > 60) acc.fill(newItemsPreferFocus(), true, newCap - acc.newCount);
      break;
    }
    case "explore": {
      const spelling = SESSION_RULES.spellingUnitId;
      const takeSpelling = focus !== spelling;
      if (takeSpelling) {
        // A small slice of Spelling Bee: due spelling words first, then new ones.
        const slice = new PlanAccumulator(SESSION_RULES.spellingSliceSeconds, input.secondsByType);
        slice.fill(catalog.filter((c) => c.unitId === spelling && isDue(c)).sort(reviewOrder), false);
        slice.fill(catalog.filter((c) => c.unitId === spelling && isUnseen(c)).sort(byOrder), true, Math.min(4, newCap));
        for (const e of slice.entries) acc.tryAdd(catalog.find((c) => c.item.id === e.itemId)!, e.isNew);
      }
      const nonSpelling = (c: CatalogEntry) => !takeSpelling || c.unitId !== spelling;
      acc.fill(newItemsPreferFocus().filter(nonSpelling), true, newCap - acc.newCount);
      // No more new items allowed today: keep practising instead of stopping early.
      acc.fill(catalog.filter(isDue).sort(reviewOrder), false);
      acc.fill(catalog.filter((c) => inFocus(c) && notMastered(c)).sort(leastRecent), false);
      break;
    }
    case "lesson": {
      const inLesson = catalog.filter((c) => c.lessonId === input.lessonId);
      acc.fill(inLesson.filter(isDue).sort(reviewOrder), false);
      acc.fill(inLesson.filter(isUnseen).sort(byOrder), true);
      acc.fill(inLesson.filter(notMastered).sort(leastRecent), false);
      acc.fill(inLesson.filter((c) => !!seen(c)).sort(leastRecent), false);
      break;
    }
    case "mistakes": {
      const flagged = catalog.filter((c) => {
        const p = seen(c);
        return !!p && (p.isMistake || (p.wrongCount > 0 && p.box < SESSION_RULES.masteryBox));
      });
      acc.fill(flagged.sort(reviewOrder), false);
      break;
    }
  }

  const entries = input.mode === "explore" ? spreadOut(acc.entries, (e) => unitOf.get(e.itemId) === SESSION_RULES.spellingUnitId) : acc.entries;
  return { mode: input.mode, entries, estimatedSeconds: acc.seconds, newCount: acc.newCount };
}

/** Spread the entries matching `pick` evenly through the list (e.g. spelling words between other questions). */
export function spreadOut<T>(list: T[], pick: (x: T) => boolean): T[] {
  const picked = list.filter(pick);
  const rest = list.filter((x) => !pick(x));
  if (!picked.length || !rest.length) return list;
  const out: T[] = [];
  const step = (rest.length + 1) / (picked.length + 1);
  let next = step;
  let p = 0;
  rest.forEach((x, i) => {
    while (p < picked.length && i + 1 >= next) {
      out.push(picked[p++]);
      next += step;
    }
    out.push(x);
  });
  while (p < picked.length) out.push(picked[p++]);
  return out;
}
