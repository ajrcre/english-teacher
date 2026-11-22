/** Badge catalogue. `check` runs after every reward event against the updated stats. */

export interface BadgeContext {
  stats: {
    xp: number;
    combo: number;
    bestCombo: number;
    streak: number;
    mistakesFixed: number;
    itemsMastered: number;
    answersCorrect: number;
  };
  roundsToday: number;
  /** Lessons that became fully mastered by this event (lesson id -> unit id). */
  lessonsCompleted: { lessonId: string; unitId: string }[];
  /** Total lessons fully mastered so far (including this event). */
  lessonsMasteredTotal: number;
}

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  /** Art file in /public/art/badges/<icon>.webp */
  icon: string;
  check: (ctx: BadgeContext) => boolean;
}

const unitBadge = (unitId: string, title: string, description: string): BadgeDef => ({
  id: `unit-${unitId}`,
  title,
  description,
  icon: `unit-${unitId}`,
  check: (c) => c.lessonsCompleted.some((l) => l.unitId === unitId),
});

export const BADGES: BadgeDef[] = [
  { id: "first-light", title: "First Light", description: "Answer your first question correctly.", icon: "first-light", check: (c) => c.stats.answersCorrect >= 1 },
  { id: "first-star", title: "First Star", description: "Master your first item.", icon: "first-star", check: (c) => c.stats.itemsMastered >= 1 },
  { id: "constellation", title: "Star Lit", description: "Master every item in a lesson.", icon: "constellation", check: (c) => c.lessonsMasteredTotal >= 1 },
  { id: "combo-5", title: "On a Roll", description: "5 correct answers in a row.", icon: "combo-5", check: (c) => c.stats.bestCombo >= 5 },
  { id: "combo-10", title: "Shooting Star", description: "10 correct answers in a row.", icon: "combo-10", check: (c) => c.stats.bestCombo >= 10 },
  { id: "combo-25", title: "Supernova", description: "25 correct answers in a row.", icon: "combo-25", check: (c) => c.stats.bestCombo >= 25 },
  { id: "streak-3", title: "Three Nights", description: "Reach a 3-day streak.", icon: "streak-3", check: (c) => c.stats.streak >= 3 },
  { id: "streak-7", title: "Full Week", description: "Reach a 7-day streak.", icon: "streak-7", check: (c) => c.stats.streak >= 7 },
  { id: "streak-30", title: "Moon Cycle", description: "Reach a 30-day streak.", icon: "streak-30", check: (c) => c.stats.streak >= 30 },
  { id: "fixer-10", title: "Second Chances", description: "Fix 10 mistakes.", icon: "fixer-10", check: (c) => c.stats.mistakesFixed >= 10 },
  { id: "fixer-50", title: "Never Give Up", description: "Fix 50 mistakes.", icon: "fixer-50", check: (c) => c.stats.mistakesFixed >= 50 },
  { id: "mastered-100", title: "Hundred Stars", description: "Master 100 items.", icon: "mastered-100", check: (c) => c.stats.itemsMastered >= 100 },
  { id: "mastered-500", title: "Galaxy", description: "Master 500 items.", icon: "mastered-500", check: (c) => c.stats.itemsMastered >= 500 },
  { id: "full-mission", title: "Full Mission", description: "Finish both rounds in one day.", icon: "full-mission", check: (c) => c.roundsToday >= 2 },
  unitBadge("number-the-stars", "Brave Like Annemarie", "Light a star in Number the Stars."),
  unitBadge("the-giver", "Receiver of Memory", "Light a star in The Giver."),
  unitBadge("short-stories", "Story Collector", "Light a star in Short Stories."),
  unitBadge("poetry", "Poet's Ear", "Light a star in Poetry."),
  unitBadge("grammar", "Grammar Engineer", "Light a star in the Grammar Lab."),
  unitBadge("spelling", "Spelling Champion", "Master a whole spelling test."),
  unitBadge("word-treasury", "Treasure Hunter", "Light a star in the Word Treasury."),
];

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));
