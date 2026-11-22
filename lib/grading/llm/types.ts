import { z } from "zod";

export type LlmTask = "open" | "rewrite" | "proofread";

export interface LlmGradeRequest {
  task: LlmTask;
  /** The question or instruction the student answered. */
  question: string;
  /** Passage, sentence to rewrite or text to proofread. */
  context?: string;
  expected: string;
  keyPoints: string[];
  studentAnswer: string;
}

export const llmGradeSchema = z.object({
  verdict: z.enum(["correct", "partial", "incorrect"]),
  score: z.number().min(0).max(1),
  feedback_en: z.string(),
  feedback_he: z.string(),
  language_notes: z.array(z.string()),
});

export type LlmGrade = z.infer<typeof llmGradeSchema>;

/** Adapter interface: the graders don't know which provider is behind it. */
export interface LlmClient {
  readonly name: string;
  grade(request: LlmGradeRequest): Promise<LlmGrade>;
}

export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** Plain JSON Schema for providers that take one (mirrors llmGradeSchema). */
export const llmGradeJsonSchema = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["correct", "partial", "incorrect"] },
    score: { type: "number", minimum: 0, maximum: 1 },
    feedback_en: { type: "string" },
    feedback_he: { type: "string" },
    language_notes: { type: "array", items: { type: "string" } },
  },
  required: ["verdict", "score", "feedback_en", "feedback_he", "language_notes"],
  additionalProperties: false,
} as const;
