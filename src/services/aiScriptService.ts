"use client";

import { AiKeyService } from "@/services/aiKeyService";

export interface AIProviderConfig {
  name: "OpenRouter" | "Groq" | "OpenAI";
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface GenerateScriptsWithRealAIParams {
  topic: string;
  niche?: string;
  count?: number;
  duracao?: string;
  objectives?: string[];
  publicoAlvo?: string;
  produtoServico?: string;
  model?: string;
  apiKey?: string;
  apiKeys?: string[];
  /** Origem do conteúdo: 'idea' (roteiro livre) ou modo de remodelagem viral */
  mode?: "idea" | "extracted_audio" | "raw_text";
  /** Conteúdo bruto (transcrição/ideia) usado nos modos de remodelagem */
  rawContent?: string;
}

export interface AIScriptVariation {
  angleName: string;
  headline: string;
  hook: string;
  painOrDesire: string;
  pain?: string;
  solution: string;
  cta: string;
  seoCaption: string;
  development?: string;
  benefit?: string;
  isExactRemodel?: boolean;
  fullScriptText?: string;
  scene_direction: string;
  brolls: string[];
  hashtags: string[];
  objective_foco?: string;
}

export interface ScriptFourBlockVariation {
  id: string;
  index: number;
  angleName: string;
  headline: string;
  hook: string;
  painOrDesire: string;
  solution: string;
  cta: string;
  seoCaption: string;
  hashtags: string[];
  sceneDirection?: string;
  bRollSuggestions?: string[];
}

/**
 * Gera roteiros com fallback em cascata entre provedores de IA.
 * Tenta OpenRouter primeiro, depois Groq, e por último lança erro.
 */
export async function generateScriptWithFallback(
  payload: { messages: Record<string, string>[]; temperature?: number }
): Promise<{ data: Record<string, unknown>; providerUsed: string }> {
  const providers: AIProviderConfig[] = [];

  const openRouterKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("@nexia_openrouter_token_v1") || ""
      : "";
  const envOpenRouterKey = process.env.NEXT_PUBLIC_AI_API_KEY || "";
  if (openRouterKey || envOpenRouterKey) {
    providers.push({
      name: "OpenRouter",
      apiKey: openRouterKey || envOpenRouterKey,
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      model: "meta-llama/llama-3.3-70b-instruct",
    });
  }

  const groqKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("@nexia_groq_token_v1") || ""
      : "";
  const envGroqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
  if (groqKey || envGroqKey) {
    providers.push({
      name: "Groq",
      apiKey: groqKey || envGroqKey,
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile",
    });
  }

  if (providers.length === 0) {
    throw new Error("Nenhuma chave de API de IA configurada no sistema.");
  }

  let lastError: any = null;

  for (const provider of providers) {
    try {
      console.log(`🤖 Tentando gerar roteiro via [${provider.name}]...`);

      const response = await fetch(provider.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: payload.messages,
          temperature: payload.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `[${provider.name}] HTTP ${response.status}: ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      console.log(`✅ Sucesso na geracao via [${provider.name}]`);
      return { data, providerUsed: provider.name };
    } catch (err) {
      console.warn(
        `⚠️ Falha no provedor [${provider.name}]. Tentando proximo... Error:`,
        err
      );
      lastError = err;
    }
  }

  throw new Error(
    `Todos os provedores de IA falharam. Ultimo erro: ${lastError?.message || "Erro desconhecido"}`
  );
}

/**
 * Envia o briefing INTEGRAL para a rota de IA (`/api/ai/generate-scripts`), que
 * aciona o modelo (GPT / Gemini / Claude via OpenRouter) para redigir
 * roteiros COMPLETOS em 3 atos — sem interpolação de template {tema}.
 */
export async function generateScriptsWithRealAI(
  params: GenerateScriptsWithRealAIParams
): Promise<AIScriptVariation[]> {
  const res = await fetch("/api/ai/generate-scripts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ai-custom-token": AiKeyService.getToken(),
    },
    body: JSON.stringify({
      ...params,
      rawContent: params.mode ? params.rawContent ?? params.topic : undefined,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Falha na geracao com IA (status ${res.status})`);
  }

  return Array.isArray(data?.variations) ? (data.variations as AIScriptVariation[]) : [];
}