"use client";

import { AiKeyService } from "@/services/aiKeyService";

/**
 * Micro-IA opcional de polimento unitário.
 * Refina APENAS 1 variação por vez com prompt ultra-curto, gastando quase
 * zero de tokens e sem travar a interface. O formato de entrada aceita tanto
 * o item do motor instantâneo (GeneratedVariationItem) quanto um Variation
 * mapeado (headline/hook/pain/solution/cta), via tipagem estrutural.
 */

export interface RefinableScript {
  headline: string;
  hook: string;
  development: string;
  cta: string;
}

export interface AiRefinerCredentials {
  model?: string;
  apiKey?: string;
  apiKeys?: string[];
  customInstructions?: string;
}

export const DEFAULT_AI_REFINER_INSTRUCTION =
  "Reescreva mantendo a estrutura de 3 blocos (Gancho, Desenvolvimento [Dor + Solucao integradas], CTA). Use tom coloquial de conversa de live/Stories, frases curtas faceis de falar em voz alta, gancho inicial em forma de pergunta cortante e gatilhos de urgencia/oferta relampago no CTA.";

export async function refineSingleVariationWithAi(
  currentScript: RefinableScript,
  credentials?: AiRefinerCredentials
): Promise<Partial<RefinableScript>> {
  const response = await fetch("/api/ai/refine-script", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ai-custom-token": AiKeyService.getToken(),
    },
    body: JSON.stringify({
      currentScript: {
        headline: currentScript.headline,
        hook: currentScript.hook,
        development: currentScript.development,
        cta: currentScript.cta,
      },
      instructions: credentials?.customInstructions || DEFAULT_AI_REFINER_INSTRUCTION,
      model: credentials?.model,
      apiKey: credentials?.apiKey,
      apiKeys: credentials?.apiKeys,
    }),
  });

  if (!response.ok) {
    const errData = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(errData?.error || "Falha ao refinar com IA");
  }

  return (await response.json()) as Partial<RefinableScript>;
}