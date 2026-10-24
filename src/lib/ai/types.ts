export interface CompletionRequest {
  system: string;
  user: string;
  timeoutMs: number;
}

export interface CompletionResult {
  text: string;
  provider: string;
  model: string;
  fallback: boolean;
}

export interface ModelAdapter {
  readonly id: string;
  readonly providerLabel: string;
  readonly model: string;
  readonly fallback: boolean;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

export class ModelError extends Error {
  readonly retryable: boolean;
  readonly provider: string;
  constructor(message: string, options: { retryable?: boolean; provider: string }) {
    super(message);
    this.name = "ModelError";
    this.retryable = options.retryable ?? false;
    this.provider = options.provider;
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number },
): Promise<T> {
  const retries = options.retries ?? 1;
  const baseDelay = options.baseDelayMs ?? 600;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof ModelError ? error.retryable : false;
      if (!retryable || attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelay * (attempt + 1)));
    }
  }
  throw lastError;
}
