import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { logger } from "@/lib/logger";
import { GRADER_SYSTEM_PROMPT, buildGradeUserMessage } from "./prompt";
import { LlmUnavailableError, llmGradeJsonSchema, llmGradeSchema, type LlmClient, type LlmGrade, type LlmGradeRequest } from "./types";

export const DEFAULT_GEMINI_GRADER_MODEL = "gemini-3.5-flash";

export class GeminiLlmClient implements LlmClient {
  readonly name: string;
  private readonly ai: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model = DEFAULT_GEMINI_GRADER_MODEL,
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.name = `gemini:${model}`;
  }

  async grade(request: LlmGradeRequest): Promise<LlmGrade> {
    const maxAttempts = 3;
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.model,
          contents: buildGradeUserMessage(request),
          config: {
            systemInstruction: GRADER_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseJsonSchema: llmGradeJsonSchema,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
        const text = response.text;
        if (!text) throw new LlmUnavailableError("empty response from grader", true);
        return llmGradeSchema.parse(JSON.parse(text));
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;
        // 429 = free-tier rate limit, 5xx = transient; both are worth a retry with backoff.
        const retryable = status === 429 || (status !== undefined && status >= 500) || (error instanceof LlmUnavailableError && error.retryable);
        logger.warn("grader call failed", { provider: this.name, attempt, status, retryable });
        if (!retryable || attempt >= maxAttempts) {
          throw new LlmUnavailableError(error instanceof Error ? error.message : "grader failed", retryable);
        }
        await new Promise((r) => setTimeout(r, 800 * 2 ** (attempt - 1)));
      }
    }
  }
}
