import type { ItemResponse } from "@/lib/content/client";
import type { Item, ItemType } from "@/lib/content/schema";
import type { Verdict } from "@/lib/scheduling/leitner";

export type { Verdict };

/** Per-part feedback for multi-part items (match, sort, sequence). */
export type GradeDetails =
  | { kind: "pairs"; correctPairs: [string, string][]; wrongLeft: string[] }
  | { kind: "buckets"; correct: Record<string, string>; wrong: string[] }
  | { kind: "order"; correctOrder: string[] };

export interface GradeResult {
  verdict: Verdict;
  /** 0..1 */
  score: number;
  /** One or two short sentences in simple English. */
  feedback: string;
  /** Optional one-sentence Hebrew explanation. */
  feedbackHe?: string;
  /** The answer to show after submitting. */
  modelAnswer: string;
  /** Spelling / grammar notes about the student's English (not counted against them). */
  notes: string[];
  details?: GradeDetails;
  /** True when a language model produced this grade. */
  byLlm?: boolean;
}

export interface Grader<T extends Item = Item> {
  grade(item: T, response: ItemResponse): Promise<GradeResult>;
}

export type GraderFor<K extends ItemType> = Grader<Extract<Item, { type: K }>>;

export class ResponseMismatchError extends Error {
  constructor(itemType: string, responseType: string) {
    super(`response type ${responseType} does not match item type ${itemType}`);
  }
}
