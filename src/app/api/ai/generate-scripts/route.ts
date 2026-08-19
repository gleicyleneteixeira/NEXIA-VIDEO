import { NextRequest, NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `Voce e o Diretor de Copywriting do SaaS NEXIA VIDEO.
Sua unica funcao e receber o input do usuario (mesmo que seja uma ideia vaga, um desabafo desorganizado, sem pontuacao ou um texto longo) e criar roteiros virais e persuasivos para Reels/TikTok/Shorts.

DIRETRIZES DE CRIAcaO:
1. INTERPRETACAO SEMANTICA:
   - Se o input for longo e com contrastes (ex: SP acha facil vs MG reprova), extraia o motivo real e use essa historia dentro do roteiro.
   - Se o input for uma unica palavra vaga (ex: "FGTS", "unhas", "advocacia"), crie um contexto completo de dor, desejo e solucao para aquele nicho.
   - NUNCA corte o input no meio e nunca resuma ao ponto de perder o sentido. Todo texto do briefing deve ser considerado.
2. ESTRUTURA DOS 3 ATOS (cada objeto do array = 1 video):
   - HOOK (Gancho - Primeiros 3s): Uma unica pergunta cortante, quebra de mito ou choque de curiosidade. NUNCA comece todos os roteiros com "Vem ca". Varie os estilos de gancho entre os videos.
   - DESENVOLVIMENTO (Dor + Solucao integradas): Paragrafo fluido e conversacional conectando o problema real e a saida pratica/metodo/produto. Sem cortes no meio da frase, com excelente portugues falado e concordancia perfeita.
   - CTA (Chamada): Direta, com urgencia, oferta relampago, escassez ou comando claro.
3. FORMATO DE SAIDA (ESTRITAMENTE JSON):
   Retorne APENAS um array JSON valido, sem crases (json), sem texto antes ou depois.
   Exemplo de cada objeto:
   {
     "angleName": "Nome do Angulo",
     "headline": "Titulo do Video",
     "hook": "Texto do Gancho",
     "development": "Texto do Desenvolvimento completo",
     "cta": "Texto da CTA",
     "sceneDirection": "Direcao para o criador gravar",
     "bRollSuggestions": ["broll 1", "broll 2", "broll 3"],
     "hashtags": ["tag1", "tag2", "tag3"]
   }
   Cada roteiro DEVE ser completo e falavel em voz alta.`;

const RECOMMENDED_FREE_MODELS = [
  "google/gemini-2.5-flash:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

const PAID_FALLBACK_MODELS = [
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-3.1-24b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "openai/gpt-4o-mini",
];

const DEFAULT_MODEL = "google/gemini-2.5-flash:free";

function buildUserPrompt(params: {
  topic: string;
  niche?: string;
  objective?: string;
  objectives?: string[];
  duration?: string;
  count: number;
  publicoAlvo?: string;
  produtoServico?: string;
}): string {
  const objectives = [...(params.objectives || [])];
  if (params.objective && !objectives.includes(params.objective)) {
    objectives.push(params.objective);
  }
  const hasMultiple = objectives.length > 1;

  const lines: string[] = [];
  lines.push("NICHO/PERFIL: " + (params.niche || "Geral"));
  if (params.publicoAlvo) lines.push("PUBLICO-ALVO: " + params.publicoAlvo);
  if (params.produtoServico) lines.push("PRODUTO/OFERTA: " + params.produtoServico);
  if (objectives.length === 1) lines.push("OBJETIVO: " + objectives[0]);
  else if (objectives.length > 1)
    lines.push("OBJETIVOS (distribua entre os videos, 1 por roteiro): " + objectives.join(", "));
  lines.push("DURACAO: " + (params.duration || "30s"));
  lines.push("QUANTIDADE DE ROTEIROS: " + params.count);
  if (hasMultiple) {
    lines.push(
      "IMPORTANTE: como ha varios objetivos, inclua em CADA objeto do array o campo extra \"objective_foco\" nomeando o objetivo daquele video especifico."
    );
  }
  lines.push(
    "INPUT / BRIEFING BRUTO DO USUARIO (use TODO o texto, sem resumir):\n\"\"\"\n" +
      params.topic +
      "\n\"\"\""
  );

  return lines.join("\n");
}

function parseJsonResponse(content: string): Record<string, unknown>[] | null {
  if (!content) return null;

  let cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
    try {
      cleanContent = JSON.parse(cleanContent);
    } catch {}
  }

  const firstBracket = cleanContent.indexOf("[");
  const lastBracket = cleanContent.lastIndexOf("]");

  let jsonString = "";
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    jsonString = cleanContent.slice(firstBracket, lastBracket + 1);
  } else {
    const firstBrace = cleanContent.indexOf("{");
    const lastBrace = cleanContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = "[" + cleanContent.slice(firstBrace, lastBrace + 1) + "]";
    } else {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}

  let fixed = jsonString
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\r/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\t/g, " ")
    .replace(/,\s*([\]}])/g, "$1")
    .replace(/'/g, '"')
    .replace(/\\+"/g, '"')
    .replace(/  +/g, " ")
    .trim();

  let openBrackets = 0;
  let openBraces = 0;
  let inString = false;
  for (const ch of fixed) {
    if (ch === '"' && !inString) {
      inString = true;
      continue;
    }
    if (ch === '"' && inString) {
      inString = false;
      continue;
    }
    if (!inString) {
      if (ch === "[") openBrackets++;
      if (ch === "]") openBrackets--;
      if (ch === "{") openBraces++;
      if (ch === "}") openBraces--;
    }
  }
  if (openBrackets > 0 || openBraces > 0) {
    fixed = fixed.replace(/,\s*$/, "");
    while (openBraces > 0) {
      fixed += "}";
      openBraces--;
    }
    while (openBrackets > 0) {
      fixed += "]";
      openBrackets--;
    }
  }

  try {
    const parsed = JSON.parse(fixed);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}

  const objects: Record<string, unknown>[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < fixed.length; i++) {
    if (fixed[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (fixed[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const cleaned = fixed.slice(start, i + 1).replace(/,\s*([}\]])/g, "$1");
          const obj = JSON.parse(cleaned);
          if (obj && typeof obj === "object" && !Array.isArray(obj)) {
            objects.push(obj);
          }
        } catch {}
        start = -1;
      }
    }
  }
  return objects.length > 0 ? objects : null;
}

function normalizeVariation(v: Record<string, unknown>): Record<string, unknown> {
  const obj = { ...v };

  if (!obj.development && (obj.dor || obj.desejo)) {
    obj.development = [obj.dor, obj.desejo].filter(Boolean).join("\n\n");
  }

  const sceneDirection = obj.sceneDirection || obj.scene_direction;
  const bRolls = obj.bRollSuggestions || obj.brolls;

  if (sceneDirection) obj.scene_direction = sceneDirection;
  if (!obj.sceneDirection) obj.sceneDirection = sceneDirection;
  if (bRolls) obj.brolls = bRolls;
  if (!obj.bRollSuggestions) obj.bRollSuggestions = bRolls;

  delete obj.dor;
  delete obj.desejo;

  obj.angleName = (obj.angleName as string) || "Roteiro Viral";
  obj.headline = (obj.headline as string) || "";
  obj.hook = (obj.hook as string) || "";
  obj.development = (obj.development as string) || "";
  obj.cta = (obj.cta as string) || "";
  obj.sceneDirection = (obj.sceneDirection as string) ||
    "Gravar olhando direto para a camera, tom energetico e natural.";
  obj.scene_direction = obj.sceneDirection;
  obj.bRollSuggestions =
    Array.isArray(obj.bRollSuggestions) && obj.bRollSuggestions.length > 0
      ? obj.bRollSuggestions
      : ["Corte de apoio 1", "Corte de apoio 2", "Corte de apoio 3"];
  obj.brolls = obj.bRollSuggestions;
  obj.hashtags =
    Array.isArray(obj.hashtags) && obj.hashtags.length > 0
      ? obj.hashtags
      : ["Viral", "Dicas", "Reels", "Fyp"];

  return obj;
}

async function callOpenRouter(
  apiKeys: string[],
  models: string[],
  systemPrompt: string,
  userPrompt: string,
  expectedQuantity: number
): Promise<{ variations: Record<string, unknown>[]; usedModel: string } | { error: string }> {
  const MODEL_TIMEOUT = 60000;
  let bestResult: { variations: Record<string, unknown>[]; usedModel: string } | null = null;
  const errorDetails: string[] = [];

  for (const key of apiKeys) {
    if (!key?.trim()) continue;
    for (const model of models) {
      const apiController = new AbortController();
      const apiTimeout = setTimeout(() => apiController.abort(), MODEL_TIMEOUT);

      try {
        const maxTokens = Math.min(8192, 2000 + expectedQuantity * 1100);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + key,
            "HTTP-Referer": "https://contenthub.app",
            "X-Title": "ContentHub",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.8,
          }),
          signal: apiController.signal,
        });

        if (!res.ok) {
          let detail = "HTTP " + res.status;
          let hintSlug: string | null = null;
          try {
            const errData = await res.json();
            const msg =
              errData?.error?.message || errData?.message ||
              (typeof errData?.error === "string" ? errData.error : "");
            if (msg) detail += ": " + String(msg).slice(0, 160);

            // OpenRouter indica o slug equivalente quando o :free está indisponivel
            const match = /use this slug instead:\s*([\w.\-/:]+)/i.exec(String(msg || ""));
            if (match?.[1]) hintSlug = match[1].trim();
          } catch {}
          errorDetails.push(`[${model}] ${detail}`);

          if (hintSlug && !models.includes(hintSlug)) {
            models.push(hintSlug);
            errorDetails.push(`[${model}] -> tentando alternativa: ${hintSlug}`);
          }

          if (res.status === 429 || res.status === 401 || res.status === 403) {
            break;
          }
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";

        if (data.error?.message) {
          errorDetails.push(`[${model}] ${String(data.error.message).slice(0, 160)}`);
        }

        if (!content || content.trim().length === 0) {
          errorDetails.push(`[${model}] resposta vazia`);
          continue;
        }

        const variations = parseJsonResponse(content);
        if (variations && variations.length > 0) {
          if (variations.length >= expectedQuantity) {
            return { variations, usedModel: model };
          }
          if (!bestResult || variations.length > bestResult.variations.length) {
            bestResult = { variations, usedModel: model };
          }
          errorDetails.push(`[${model}] retornou ${variations.length}/${expectedQuantity} roteiros`);
        } else {
          errorDetails.push(`[${model}] JSON nao parseado (${content.length} chars)`);
        }
      } catch (err) {
        errorDetails.push(
          `[${model}] ${err instanceof Error ? (err.name === "AbortError" ? "timeout (60s)" : err.message.slice(0, 120)) : "erro desconhecido"}`
        );
        continue;
      } finally {
        clearTimeout(apiTimeout);
      }
    }
  }

  if (bestResult) return bestResult;

  const uniqueDetails = [...new Set(errorDetails)].slice(0, 5);
  const summary =
    uniqueDetails.length > 0
      ? uniqueDetails.join(" | ")
      : "Nenhuma requisicao foi concluida";

  return {
    error:
      "Todos os modelos e keys falharam. Nenhum retornou JSON valido. Detalhes: " +
      summary,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      niche,
      duration,
      duracao,
      objective,
      objectives,
      count,
      publicoAlvo,
      produtoServico,
      model,
      apiKey,
      apiKeys,
    } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "Briefing / Tema e obrigatorio" }, { status: 400 });
    }

    const keyList: string[] = [];
    if (Array.isArray(apiKeys) && apiKeys.length > 0) {
      keyList.push(...apiKeys.filter((k: string) => k?.trim()));
    }
    if (apiKey?.trim() && !keyList.includes(apiKey)) {
      keyList.push(apiKey);
    }

    if (keyList.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma API Key do OpenRouter configurada" },
        { status: 400 }
      );
    }

    const quantity = Math.max(1, Math.min(20, Math.floor(count || 5)));
    const objectiveList: string[] = Array.isArray(objectives)
      ? objectives.filter((o: string) => o?.trim())
      : [];
    if (typeof objective === "string" && objective.trim() && !objectiveList.includes(objective)) {
      objectiveList.push(objective);
    }

    const userPrompt = buildUserPrompt({
      topic,
      niche: typeof niche === "string" ? niche : undefined,
      objective,
      objectives: objectiveList,
      duration: duration || duracao,
      count: quantity,
      publicoAlvo: typeof publicoAlvo === "string" ? publicoAlvo : undefined,
      produtoServico: typeof produtoServico === "string" ? produtoServico : undefined,
    });

    const selectedModel =
      model && model !== "google/gemma-4-26b-a4b-it:free" ? model : DEFAULT_MODEL;

    const modelsToTry = [selectedModel];
    for (const rm of RECOMMENDED_FREE_MODELS) {
      if (!modelsToTry.includes(rm)) modelsToTry.push(rm);
    }
    for (const pm of PAID_FALLBACK_MODELS) {
      if (!modelsToTry.includes(pm)) modelsToTry.push(pm);
    }

    const result = await callOpenRouter(keyList, modelsToTry, SYSTEM_INSTRUCTION, userPrompt, quantity);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const variations = result.variations.map(normalizeVariation);

    if (objectiveList.length > 0) {
      variations.forEach((v: Record<string, unknown>, i: number) => {
        if (!v.objective_foco || typeof v.objective_foco !== "string") {
          v.objective_foco = objectiveList[i % objectiveList.length];
        }
      });
    }

    return NextResponse.json({ success: true, variations, usedModel: result.usedModel });
  } catch (err) {
    console.error("Erro em /api/ai/generate-scripts:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao processar com IA" },
      { status: 500 }
    );
  }
}