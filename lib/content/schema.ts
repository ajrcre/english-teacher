import { z } from "zod";

/**
 * Content model: Unit (constellation) -> Lesson (star) -> Item (question).
 * Items carry their answers; `toClientItem` strips them before anything is
 * sent to the browser, so nothing can act as a hint before answering.
 */

const itemBase = {
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, "ids are lowercase slugs"),
  /** Shown after answering: where to look it up ("Workbook p. 16", "Book, ch. 4"). */
  source: z.string().optional(),
  /** Short English explanation, shown after answering. */
  explanation: z.string().optional(),
  /** Hebrew gloss or rule note, shown only after answering. */
  he: z.string().optional(),
  /** Word to pronounce with the speaker button after answering. */
  speak: z.string().optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  /** "draft" answers were written for the app and await a parent's check. */
  reviewStatus: z.enum(["ok", "draft"]).default("ok"),
};

export const mcqItem = z.object({
  ...itemBase,
  type: z.literal("mcq"),
  prompt: z.string(),
  /** Optional sentence with the target word in **bold** or a ___ blank. */
  sentence: z.string().optional(),
  options: z.array(z.string()).min(2).max(6),
  answer: z.number().int().nonnegative(),
});

export const typedItem = z.object({
  ...itemBase,
  type: z.literal("typed"),
  prompt: z.string(),
  sentence: z.string().optional(),
  /** Accepted answers; the first one is shown as the model answer. */
  answers: z.array(z.string()).min(1),
  /** Accept a one-letter slip (flagged with a spelling note). */
  allowTypo: z.boolean().default(true),
});

export const matchItem = z.object({
  ...itemBase,
  type: z.literal("match"),
  prompt: z.string(),
  pairs: z.array(z.tuple([z.string(), z.string()])).min(2).max(7),
});

export const sortItem = z.object({
  ...itemBase,
  type: z.literal("sort"),
  prompt: z.string(),
  buckets: z.array(z.string()).min(2).max(5),
  entries: z.array(z.object({ text: z.string(), bucket: z.string() })).min(2).max(12),
});

export const sequenceItem = z.object({
  ...itemBase,
  type: z.literal("sequence"),
  prompt: z.string(),
  steps: z.array(z.string()).min(3).max(8),
});

export const dictationItem = z.object({
  ...itemBase,
  type: z.literal("dictation"),
  word: z.string(),
  /** Spoken after the word to give it context; never shown as text before answering. */
  sentence: z.string(),
});

export const openItem = z.object({
  ...itemBase,
  type: z.literal("open"),
  question: z.string(),
  /** Short passage or quotation shown with the question (optional). */
  context: z.string().optional(),
  expected: z.string(),
  keyPoints: z.array(z.string()).min(1),
});

export const rewriteItem = z.object({
  ...itemBase,
  type: z.literal("rewrite"),
  prompt: z.string(),
  original: z.string(),
  /** Text the answer must start with, e.g. "Today is not". */
  starter: z.string().optional(),
  answers: z.array(z.string()).min(1),
});

export const proofreadItem = z.object({
  ...itemBase,
  type: z.literal("proofread"),
  prompt: z.string(),
  text: z.string(),
  expected: z.string(),
  keyFixes: z.array(z.string()).min(1),
});

export const itemSchema = z.discriminatedUnion("type", [
  mcqItem,
  typedItem,
  matchItem,
  sortItem,
  sequenceItem,
  dictationItem,
  openItem,
  rewriteItem,
  proofreadItem,
]);

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  /** e.g. "Chapters 1–2" or "Workbook pp. 139–144" */
  source: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export const unitSchema = z.object({
  id: z.string(),
  title: z.string(),
  tagline: z.string(),
  /** Short note shown on the unit page (e.g. "Have your copy of the book handy"). */
  note: z.string().optional(),
  accent: z.enum(["amber", "teal", "rose", "sky", "lime", "violet", "sand"]),
  lessons: z.array(lessonSchema).min(1),
});

export type Item = z.infer<typeof itemSchema>;
export type ItemInput = z.input<typeof itemSchema>;
export type ItemType = Item["type"];
export type Lesson = z.infer<typeof lessonSchema>;
export type LessonInput = z.input<typeof lessonSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type UnitInput = z.input<typeof unitSchema>;

/** Item types graded by the language model rather than by rules. */
export const LLM_GRADED_TYPES: ReadonlySet<ItemType> = new Set(["open", "rewrite", "proofread"]);

/** Typical seconds a 7th grader needs per item type (used for the 20-minute budget). */
export const ESTIMATED_SECONDS: Record<ItemType, number> = {
  mcq: 20,
  typed: 30,
  match: 45,
  sort: 50,
  sequence: 45,
  dictation: 20,
  open: 90,
  rewrite: 60,
  proofread: 90,
};
