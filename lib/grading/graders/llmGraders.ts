import type { ItemResponse } from "@/lib/content/client";
import type { Item } from "@/lib/content/schema";
import { logger } from "@/lib/logger";
import { LlmUnavailableError, type LlmClient, type LlmGradeRequest } from "../llm/types";
import { normalizeSpacing } from "../text";
import { ResponseMismatchError, type GradeResult, type Grader } from "../types";
import { emptyAnswer, exactOrNull } from "./ruleGraders";

type LlmItem = Extract<Item, { type: "open" | "rewrite" | "proofread" }>;

export class GraderUnavailableError extends Error {
  constructor(readonly retryable: boolean) {
    super("The answer checker is busy right now.");
  }
}

/**
 * Template method: each LLM-graded type says how to build the request and how to
 * short-circuit obvious cases; the shared flow calls the model and maps its reply.
 */
abstract class LlmBackedGrader<T extends LlmItem> implements Grader<T> {
  constructor(private readonly llm: () => LlmClient | null) {}

  protected abstract answerText(response: ItemResponse): string;
  protected abstract modelAnswer(item: T): string;
  protected abstract toRequest(item: T, answer: string): LlmGradeRequest;
  /** Return a grade without calling the model when the answer is obviously right. */
  protected shortcut(_item: T, _answer: string): GradeResult | null {
    return null;
  }

  async grade(item: T, response: ItemResponse): Promise<GradeResult> {
    const answer = this.answerText(response).trim();
    const model = this.modelAnswer(item);
    if (answer.length < 2) return emptyAnswer(model);
    const quick = this.shortcut(item, answer);
    if (quick) return quick;

    const client = this.llm();
    if (!client) throw new GraderUnavailableError(false);
    try {
      const g = await client.grade(this.toRequest(item, answer));
      return {
        verdict: g.verdict,
        score: g.score,
        feedback: g.feedback_en,
        feedbackHe: g.feedback_he || undefined,
        modelAnswer: model,
        notes: g.language_notes.slice(0, 3),
        byLlm: true,
      };
    } catch (error) {
      logger.error("llm grading failed", { itemId: item.id, provider: client.name });
      throw new GraderUnavailableError(error instanceof LlmUnavailableError ? error.retryable : true);
    }
  }
}

function textOf(response: ItemResponse, type: "open" | "rewrite" | "proofread"): string {
  if (response.type !== type) throw new ResponseMismatchError(type, response.type);
  return response.text;
}

export class OpenAnswerGrader extends LlmBackedGrader<Extract<Item, { type: "open" }>> {
  protected answerText(r: ItemResponse) {
    return textOf(r, "open");
  }
  protected modelAnswer(item: Extract<Item, { type: "open" }>) {
    return item.expected;
  }
  protected toRequest(item: Extract<Item, { type: "open" }>, answer: string): LlmGradeRequest {
    return { task: "open", question: item.question, context: item.context, expected: item.expected, keyPoints: item.keyPoints, studentAnswer: answer };
  }
}

export class RewriteGrader extends LlmBackedGrader<Extract<Item, { type: "rewrite" }>> {
  protected answerText(r: ItemResponse) {
    return textOf(r, "rewrite");
  }
  protected modelAnswer(item: Extract<Item, { type: "rewrite" }>) {
    return item.answers[0];
  }
  protected shortcut(item: Extract<Item, { type: "rewrite" }>, answer: string): GradeResult | null {
    const hit = exactOrNull(item.answers, answer);
    return hit ? { verdict: "correct", score: 1, feedback: "Perfect sentence!", modelAnswer: hit, notes: [] } : null;
  }
  protected toRequest(item: Extract<Item, { type: "rewrite" }>, answer: string): LlmGradeRequest {
    return {
      task: "rewrite",
      question: `${item.prompt}${item.starter ? ` Start with: "${item.starter}"` : ""}`,
      context: `Original sentence: ${item.original}`,
      expected: item.answers.join("  OR  "),
      keyPoints: ["Keeps the meaning of the original sentence", "Uses the required structure correctly", ...(item.starter ? [`Starts with "${item.starter}"`] : [])],
      studentAnswer: answer,
    };
  }
}

export class ProofreadGrader extends LlmBackedGrader<Extract<Item, { type: "proofread" }>> {
  protected answerText(r: ItemResponse) {
    return textOf(r, "proofread");
  }
  protected modelAnswer(item: Extract<Item, { type: "proofread" }>) {
    return item.expected;
  }
  protected shortcut(item: Extract<Item, { type: "proofread" }>, answer: string): GradeResult | null {
    if (normalizeSpacing(answer) === normalizeSpacing(item.expected)) {
      return { verdict: "correct", score: 1, feedback: "Every mistake fixed. Excellent editing!", modelAnswer: item.expected, notes: [] };
    }
    if (normalizeSpacing(answer) === normalizeSpacing(item.text)) {
      return { verdict: "incorrect", score: 0, feedback: "The text was not changed. Look for the mistakes and fix them.", modelAnswer: item.expected, notes: [] };
    }
    return null;
  }
  protected toRequest(item: Extract<Item, { type: "proofread" }>, answer: string): LlmGradeRequest {
    return { task: "proofread", question: item.prompt, context: `Text with mistakes:\n${item.text}`, expected: item.expected, keyPoints: item.keyFixes, studentAnswer: answer };
  }
}
