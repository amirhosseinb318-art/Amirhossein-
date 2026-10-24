import { serverEnv } from "@/lib/config";
import { ModelError, withRetry, type CompletionRequest, type CompletionResult, type ModelAdapter } from "../types";

/** Anthropic Messages API adapter. */
export class AnthropicAdapter implements ModelAdapter {
  readonly id = "anthropic";
  readonly providerLabel = "Anthropic";
  readonly fallback = false;
  readonly model: string;
  private apiKey: string;

  constructor(config: { apiKey: string; model: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    return withRetry(
      async () => {
        let response: Response;
        try {
          response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": this.apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: this.model,
              max_tokens: 1400,
              temperature: 0.1,
              system: request.system,
              messages: [{ role: "user", content: request.user }],
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
          content?: Array<{ type: string; text?: string }>;
        };
        const text = (data.content ?? [])
          .filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join("\n");
        if (!text.trim()) {
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

export function anthropicAdapterFromEnv(): AnthropicAdapter | null {
  const apiKey = serverEnv.aiApiKey;
  if (!apiKey) return null;
  return new AnthropicAdapter({
    apiKey,
    model: serverEnv.aiModel ?? "claude-sonnet-4-5",
  });
}
