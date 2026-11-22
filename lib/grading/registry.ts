import type { ItemResponse } from "@/lib/content/client";
import type { Item, ItemType } from "@/lib/content/schema";
import { getLlmClient } from "./llm";
import type { LlmClient } from "./llm/types";
import { OpenAnswerGrader, ProofreadGrader, RewriteGrader } from "./graders/llmGraders";
import { dictationGrader, matchGrader, mcqGrader, sequenceGrader, sortGrader, typedGrader } from "./graders/ruleGraders";
import type { GradeResult, Grader } from "./types";

/** Strategy registry: one grader per item type. */
export class GraderRegistry {
  private readonly graders = new Map<ItemType, Grader>();

  constructor(llm: () => LlmClient | null = getLlmClient) {
    this.register("mcq", mcqGrader);
    this.register("typed", typedGrader);
    this.register("dictation", dictationGrader);
    this.register("match", matchGrader);
    this.register("sort", sortGrader);
    this.register("sequence", sequenceGrader);
    this.register("open", new OpenAnswerGrader(llm));
    this.register("rewrite", new RewriteGrader(llm));
    this.register("proofread", new ProofreadGrader(llm));
  }

  register<K extends ItemType>(type: K, grader: Grader<Extract<Item, { type: K }>>): void {
    this.graders.set(type, grader as Grader);
  }

  get(type: ItemType): Grader {
    const g = this.graders.get(type);
    if (!g) throw new Error(`no grader for ${type}`);
    return g;
  }

  grade(item: Item, response: ItemResponse): Promise<GradeResult> {
    return this.get(item.type).grade(item, response);
  }
}

export const graderRegistry = new GraderRegistry();
