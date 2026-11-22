import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { logger } from "@/lib/logger";
import { GRADER_SYSTEM_PROMPT, buildGradeUserMessage } from "./prompt";
import { LlmUnavailableError, llmGradeSchema, type LlmClient, type LlmGrade, type LlmGradeRequest } from "./types";

export const DEFAULT_ANTHROPIC_GRADER_MODEL = "claude-haiku-5-5";

export class AnthropicLlmClient implements LlmClient {
  readonly name: string;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model = DEFAULT_ANTHROPIC_GRADER_MODEL,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2 });
    this.name = `anthropic:${model}`;
  }

  async grade(request: LlmGradeRequest): Promise<LlmGrade> {
    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 2048,
        system: [{ type: "text", text: GRADER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildGradeUserMessage(request) }],
        output_config: { effort: "low", format: zodOutputFormat(llmGradeSchema) },
      });
      if (response.stop_reason === "refusal") {
        throw new LlmUnavailableError("grader declined the request", false);
      }
      if (!response.parsed_output) throw new LlmUnavailableError("grader returned no structured output", true);
      return response.parsed_output;
    } catch (error) {
      if (error instanceof LlmUnavailableError) throw error;
      const retryable = error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError;
      const status = error instanceof Anthropic.APIError ? error.status : undefined;
      logger.warn("grader call failed", { provider: this.name, status, retryable });
      throw new LlmUnavailableError(error instanceof Error ? error.message : "grader failed", retryable);
    }
  }
}
