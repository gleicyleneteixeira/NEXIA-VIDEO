import type {
  AIProvider,
  AIModel,
  AIExecutionRequest,
  AIExecutionResponse,
  AIFallbackConfig,
} from "@/types/aiProviders";
import { AI_PROVIDERS, DEFAULT_FALLBACK_CONFIG } from "@/types/aiProviders";

function getApiKey(provider: AIProvider): string | null {
  const config = AI_PROVIDERS[provider];
  if (!config.apiKeyLocalStorage) return null;
  try {
    return localStorage.getItem(config.apiKeyLocalStorage);
  } catch {
    return null;
  }
}

async function executeOpenRouter(
  request: AIExecutionRequest,
  modelId: string,
  apiKey: string
): Promise<AIExecutionResponse> {
  const response = await fetch(`${AI_PROVIDERS.openrouter.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "NexIA Video",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        ...(request.systemPrompt
          ? [{ role: "system" as const, content: request.systemPrompt }]
          : []),
        { role: "user" as const, content: request.prompt },
      ],
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      stream: request.stream ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || "",
    model: data.model || modelId,
    provider: "openrouter",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined,
  };
}

async function executeGroq(
  request: AIExecutionRequest,
  modelId: string,
  apiKey: string
): Promise<AIExecutionResponse> {
  const response = await fetch(`${AI_PROVIDERS.groq.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        ...(request.systemPrompt
          ? [{ role: "system" as const, content: request.systemPrompt }]
          : []),
        { role: "user" as const, content: request.prompt },
      ],
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      stream: request.stream ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || "",
    model: data.model || modelId,
    provider: "groq",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined,
  };
}

async function executeOllama(
  request: AIExecutionRequest,
  modelId: string
): Promise<AIExecutionResponse> {
  const response = await fetch(`${AI_PROVIDERS.ollama.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        ...(request.systemPrompt
          ? [{ role: "system" as const, content: request.systemPrompt }]
          : []),
        { role: "user" as const, content: request.prompt },
      ],
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      stream: request.stream ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || "",
    model: data.model || modelId,
    provider: "ollama",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined,
  };
}

export async function executeWithProvider(
  provider: AIProvider,
  request: AIExecutionRequest,
  modelId: string
): Promise<AIExecutionResponse> {
  const apiKey = getApiKey(provider);

  if (provider === "openrouter") {
    if (!apiKey) throw new Error("OpenRouter API key not configured");
    return executeOpenRouter(request, modelId, apiKey);
  }

  if (provider === "groq") {
    if (!apiKey) throw new Error("Groq API key not configured");
    return executeGroq(request, modelId, apiKey);
  }

  if (provider === "ollama") {
    return executeOllama(request, modelId);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export async function executeWithFallback(
  request: AIExecutionRequest,
  config: AIFallbackConfig = DEFAULT_FALLBACK_CONFIG,
  availableModels?: Map<AIProvider, AIModel[]>
): Promise<AIExecutionResponse> {
  const models = availableModels || new Map();
  const errors: Array<{ provider: AIProvider; error: string }> = [];

  for (const provider of config.providers) {
    const providerModels = models.get(provider) || [];
    const freeModels = providerModels.filter((m: AIModel) => m.isFree);
    const modelsToTry = freeModels.length > 0 ? freeModels : providerModels;

    if (modelsToTry.length === 0) {
      errors.push({ provider, error: "No models available" });
      continue;
    }

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < config.maxRetriesPerProvider; attempt++) {
        try {
          const result = await Promise.race([
            executeWithProvider(provider, request, model.id),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), config.timeoutMs)
            ),
          ]);
          return result;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          errors.push({ provider, error: errorMsg });
        }
      }
    }
  }

  const errorSummary = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
  throw new Error(`All providers failed: ${errorSummary}`);
}
