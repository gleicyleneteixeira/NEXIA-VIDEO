export type AIProvider = "openrouter" | "groq" | "ollama";

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  baseUrl: string;
  requiresApiKey: boolean;
  freeModelsOnly: boolean;
  apiKeyEnvVar?: string;
  apiKeyLocalStorage?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  isFree: boolean;
  maxTokens: number;
  contextWindow: number;
  supportsStreaming: boolean;
}

export interface AIProviderState {
  provider: AIProvider;
  isEnabled: boolean;
  apiKey: string;
  models: AIModel[];
  selectedModelId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AIExecutionRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIExecutionResponse {
  content: string;
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIFallbackConfig {
  providers: AIProvider[];
  maxRetriesPerProvider: number;
  timeoutMs: number;
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    freeModelsOnly: false,
    apiKeyLocalStorage: "nexia_openrouter_token_v1",
  },
  groq: {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    freeModelsOnly: true,
    apiKeyLocalStorage: "nexia_groq_token_v1",
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    requiresApiKey: false,
    freeModelsOnly: true,
  },
};

export const DEFAULT_FALLBACK_CONFIG: AIFallbackConfig = {
  providers: ["openrouter", "groq", "ollama"],
  maxRetriesPerProvider: 1,
  timeoutMs: 30000,
};
