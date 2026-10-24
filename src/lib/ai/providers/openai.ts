import { serverEnv } from "@/lib/config";
import { ModelError, withRetry, type CompletionRequest, type CompletionResult, type ModelAdapter } from "../types";

/**
 * Adapter for any OpenAI-compatible `/chat/completions` endpoint
 * (OpenAI, Azure OpenAI-compatible gateways, OpenRouter, local vLLM, Ollama).
 */
export class OpenAICompatibleAdapter implements ModelAdapter {
  readonly id = "openai-compatible";
  readonly providerLabel = "OpenAI-compatible";
  readonly fallback = false;
  readonly model: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string; model: string }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    return withRetry(
      async () => {
        let response: Response;
        try {
          response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: this.model,
              temperature: 0.1,
              max_tokens: 1400,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: request.system },
                { role: "user", content: request.user },
              ],
            }),
            signal: AbortSignal.timeout(request.timeoutMs),
            cache: "no-store",
          });
        } catch (error) {
          throw new ModelError(
            `Model request failed: ${error instanceof Error ? error.message : "network error"}`,
            { retryable: true, provider: this.providerLabel },
          );
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new ModelError(
            `Model provider returned HTTP ${response.status}: ${body.slice(0, 200)}`,
            { retryable: response.status === 429 || response.status >= 500, provider: this.providerLabel },
          );
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          throw new ModelError("Model returned an empty response.", {
            retryable: false,
            provider: this.providerLabel,
          });
        }

        return { text, provider: this.providerLabel, model: this.model, fallback: false };
      },
      { retries: 1 },
    );
  }
}

export function openAIAdapterFromEnv(): OpenAICompatibleAdapter | null {
  const apiKey = serverEnv.aiApiKey;
  if (!apiKey) return null;
  const baseUrl = serverEnv.aiBaseUrl ?? "https://api.openai.com/v1";
  const model = serverEnv.aiModel ?? "gpt-4.1-mini";
  return new OpenAICompatibleAdapter({ baseUrl, apiKey, model });
}
