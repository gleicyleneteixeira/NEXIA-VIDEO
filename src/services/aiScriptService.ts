"use client";

import { AiKeyService } from "@/services/aiKeyService";

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
}

export interface AIScriptVariation {
  angleName: string;
  headline: string;
  hook: string;
  painOrDesire: string;
  solution: string;
  cta: string;
  seoCaption: string;
  development?: string;
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
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Falha na geracao com IA (status ${res.status})`);
  }

  return Array.isArray(data?.variations) ? (data.variations as AIScriptVariation[]) : [];
}