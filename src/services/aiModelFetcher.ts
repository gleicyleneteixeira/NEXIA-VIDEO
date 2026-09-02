import type { AIProvider, AIModel } from "@/types/aiProviders";
import { AI_PROVIDERS } from "@/types/aiProviders";

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function getApiKey(provider: AIProvider): string | null {
  const config = AI_PROVIDERS[provider];
  if (!config.apiKeyLocalStorage) return null;
  try {
    return localStorage.getItem(config.apiKeyLocalStorage);
  } catch {
    return null;
  }
}

function isFreeModel(model: AIModel, provider: AIProvider): boolean {
  if (provider === "groq") return true;
  if (provider === "ollama") return true;
  if (provider === "openrouter") {
    const id = model.id.toLowerCase();
    return id.includes(":free") || id.includes("free") || model.isFree;
  }
  return false;
}

function mapOpenRouterModel(raw: any): AIModel {
  const id: string = raw.id || "";
  const isFree = id.includes(":free") || id.includes("free");
  return {
    id,
    name: raw.name || id,
    provider: "openrouter",
    isFree,
    maxTokens: raw.top_provider?.max_completion_tokens || 4096,
    contextWindow: raw.context_length || 4096,
    supportsStreaming: raw.top_provider?.is_streamable ?? true,
  };
}

function mapGroqModel(raw: any): AIModel {
  return {
    id: raw.id || "",
    name: raw.name || raw.id || "",
    provider: "groq",
    isFree: true,
    maxTokens: raw.top_provider?.max_completion_tokens || 32768,
    contextWindow: raw.context_length || 8192,
    supportsStreaming: true,
  };
}

function mapOllamaModel(raw: any): AIModel {
  return {
    id: raw.name || raw.model || "",
    name: raw.name || raw.model || "",
    provider: "ollama",
    isFree: true,
    maxTokens: 4096,
    contextWindow: 4096,
    supportsStreaming: true,
  };
}

export async function fetchOpenRouterModels(): Promise<AIModel[]> {
  const apiKey = getApiKey("openrouter");
  if (!apiKey) return [];

  try {
    const response = await fetchWithTimeout(
      `${AI_PROVIDERS.openrouter.baseUrl}/models`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
      FETCH_TIMEOUT_MS
    );

    if (!response.ok) return [];
    const data = await response.json();
    const models = (data.data || []).map(mapOpenRouterModel);
    return models.filter((m: AIModel) => isFreeModel(m, "openrouter"));
  } catch {
    return [];
  }
}

export async function fetchGroqModels(): Promise<AIModel[]> {
  const apiKey = getApiKey("groq");
  if (!apiKey) return [];

  try {
    const response = await fetchWithTimeout(
      `${AI_PROVIDERS.groq.baseUrl}/models`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
      FETCH_TIMEOUT_MS
    );

    if (!response.ok) return [];
    const data = await response.json();
    const models = (data.data || []).map(mapGroqModel);
    return models.filter((m: AIModel) => isFreeModel(m, "groq"));
  } catch {
    return [];
  }
}

export async function fetchOllamaModels(): Promise<AIModel[]> {
  try {
    const response = await fetchWithTimeout(
      `${AI_PROVIDERS.ollama.baseUrl}/models`,
      {},
      FETCH_TIMEOUT_MS
    );

    if (!response.ok) return [];
    const data = await response.json();
    const models = (data.data || []).map(mapOllamaModel);
    return models;
  } catch {
    return [];
  }
}

export async function fetchModelsForProvider(provider: AIProvider): Promise<AIModel[]> {
  switch (provider) {
    case "openrouter":
      return fetchOpenRouterModels();
    case "groq":
      return fetchGroqModels();
    case "ollama":
      return fetchOllamaModels();
    default:
      return [];
  }
}

export async function fetchAllAvailableModels(): Promise<AIModel[]> {
  const results = await Promise.allSettled([
    fetchOpenRouterModels(),
    fetchGroqModels(),
    fetchOllamaModels(),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<AIModel[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

export function getFreeModelsFromList(models: AIModel[]): AIModel[] {
  return models.filter((m) => m.isFree);
}
