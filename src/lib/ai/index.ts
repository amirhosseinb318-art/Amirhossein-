import { aiConfigured, serverEnv } from "@/lib/config";
import type { ModelAdapter } from "./types";
import { openAIAdapterFromEnv } from "./providers/openai";
import { anthropicAdapterFromEnv } from "./providers/anthropic";

/**
 * Provider-independent adapter selection. Configuration is entirely
 * environment-driven so the same build works with OpenAI-compatible endpoints,
 * Anthropic, or no provider at all (heuristic fallback, clearly labelled).
 */
export function getModelAdapter(): ModelAdapter | null {
  const provider = serverEnv.aiProvider;
  if (provider === "none" || provider === "off") return null;
  if (provider === "anthropic") return anthropicAdapterFromEnv();
  if (provider === "openai" || provider === "openai-compatible") return openAIAdapterFromEnv();
  if (provider === "auto") {
    return aiConfigured() ? openAIAdapterFromEnv() : null;
  }
  return null;
}

export function providerStatus(): {
  configured: boolean;
  provider: string;
  model: string | null;
  mode: "model" | "heuristic";
} {
  const adapter = getModelAdapter();
  return {
    configured: Boolean(adapter),
    provider: adapter ? adapter.providerLabel : "heuristic",
    model: adapter?.model ?? null,
    mode: adapter ? "model" : "heuristic",
  };
}
