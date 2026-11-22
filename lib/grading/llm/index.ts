import { AnthropicLlmClient } from "./anthropicClient";
import { GeminiLlmClient } from "./geminiClient";
import type { LlmClient } from "./types";

let override: LlmClient | null = null;
let cached: LlmClient | null = null;

/** Factory: picks the provider from LLM_PROVIDER ("gemini" by default, or "anthropic"). */
export function getLlmClient(): LlmClient | null {
  if (override) return override;
  if (cached) return cached;
  const provider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    cached = key ? new AnthropicLlmClient(key, process.env.ANTHROPIC_GRADER_MODEL || undefined) : null;
  } else {
    const key = process.env.GEMINI_API_KEY;
    cached = key ? new GeminiLlmClient(key, process.env.GEMINI_GRADER_MODEL || undefined) : null;
  }
  return cached;
}

export function setLlmClientForTests(client: LlmClient | null): void {
  override = client;
}

export * from "./types";
