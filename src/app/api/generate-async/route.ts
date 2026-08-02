import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DURATIONS: Record<string, { label: string; words: number; hint: string }> = {
  "15s": { label: "15 segundos (Ultra-rapido)", words: 35, hint: "Apenas hook + CTA. Frases curtas, impacto maximo, ritmo acelerado. Sem desenvolvimento." },
  "30s": { label: "30 segundos (Padrao Reels/TikTok)", words: 70, hint: "Hook + Dor + CTA. Ritmo rapido, 1-2 frases por bloco. Direto ao ponto." },
  "60s": { label: "60 segundos (Desenvolvimento Completo)", words: 140, hint: "Hook + Dor + Desejo + CTA completo. Desenvolvimento medio com detalhes suficientes." },
  "90s": { label: "90 segundos (Aprofundado)", words: 210, hint: "Estrutura completa com exemplos, dados ou storytelling. Hook elaborado, CTA com urgencia." },
};

function buildSystemPrompt(hasMultipleObjectives: boolean, durationConfig: { label: string; words: number; hint: string } | null, quantity: number) {
  const quantityRule = `\n\nQUANTIDADE OBRIGATORIA:
Você DEVE gerar exatamente ${quantity} objetos (variações de roteiro) diferentes dentro do array JSON. Não abrevie, não pare na primeira. O array retornado deve ter tamanho igual a ${quantity}.`;

  const durationRule = durationConfig
    ? `\n\nREGRAS DE DURACAO E TAMANHO:
O video deve ter EXATAMENTE ${durationConfig.label}.
Nivel de detalhe: ${durationConfig.hint}
Limite de palavras por video: ~${durationConfig.words} palavras (baseado em ~140 palavras por minuto).
Cada bloco (hook, dor, desejo, cta) DEVE respeitar essa metrica. Seja conciso ou elaborado conforme a duracao.
NAO ultrapasse o limite de palavras. Releia e ajuste antes de responder.`
    : "";

  const base = `Voce e um roteirista profissional de videos para redes sociais (YouTube Shorts, TikTok, Instagram Reels). Seus roteiros sao famosos por NARRATIVAS ENVOLVENTES que prendem o espectador do primeiro ao ultimo segundo.
Sempre responda APENAS com um JSON array valido, sem markdown, sem texto antes ou depois.

Cada elemento do array representa 1 video e deve ter exatamente esta estrutura:
[
  {
    "hook": "Frase impactante de 3 segundos para prender atencao",
    "dor": "Frase focada no problema/desafio do publico",
    "desejo": "Apresentacao da solucao/beneficio",
    "cta": "Comando final para o publico agir",
    "headline": "Texto curto para headline/capa do video (max 10 palavras)",
    "caption": "Legenda para Instagram/TikTok com tom adequado",
    "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "scene_direction": "Instrucao de como gravar: posicao, energia, gestos, olhar para camera",
    "brolls": ["Sugestao 1 de corte de apoio", "Sugestao 2 de corte de apoio", "Sugestao 3 de corte de apoio"]${hasMultipleObjectives ? `,
    "objective_foco": "Nome do objetivo foco deste video especifico"` : ""}
  }
]

═══════════════════════════════════════════════════════════════════
REGRAS DE NARRATIVA ENVOLVENTE (PRIORIDADE MAXIMA)
═══════════════════════════════════════════════════════════════════

Cada video DEVE contar uma HISTORIA que prenda do inicio ao fim:

1. HOOK (Gancho) - Os primeiros 3 segundos sao DECISIVOS:
   - Comece com FASE DE CHOQUE: algo inesperado, polêmico ou que quebra expectativa
   - Use gatilhos emocionais fortes: curiosidade, medo, raiva, desejo
   - O hook deve criar uma TENSAO que so sera resolvida no CTA

2. DOR (Problema) - Aumente a tensao:
   - Descreva a situacao do publico de forma VISCERAL e ESPECIFICA
   - Crie uma sensacao de URGENCIA

3. DESEJO (Solucao) - A liberacao da tensao:
   - Apresente a solucao como a RESPOSTA NATURAL para a situacao
   - Mostre beneficios de forma CONCRETA

4. CTA (Chamada para Acao) - O payoff final:
   - Use LINGUAGEM DE ACAO IMEDIATA
   - Reforce o BENEFICIO PRINCIPAL em 1 frase

═══════════════════════════════════════════════════════════════════
REGRAS DE MODULARIDADE RIGOROSA (OBRIGATORIO SEGUIR)
═══════════════════════════════════════════════════════════════════

O sistema de geracao combina os blocos via FFmpeg: Hooks x Dores x Desejos x CTAs.
Cada bloco de UM video pode ser combinado com QUALQUER bloco de OUTRO video.
Portanto, os blocos NAO podem ser historias fechadas. Devem ser MODULOS UNIVERSAIS INTERCAMBIAVEIS.

═══════════════════════════════════════════════════════════════════
QUALIDADE DE ESCRITA
═══════════════════════════════════════════════════════════════════

- Use LINGUAGEM COLLOQUIAL BRASILEIRA
- Frases curtas e diretas (max 15 palavras por frase)
- Cada bloco deve ter ENTRE 2 a 4 frases
- Tom CONFIANTE e ENERGICO`;

  const objectiveRule = hasMultipleObjectives
    ? `\n\nREGRAS IMPORTANTES PARA OBJETIVOS MULTIPLOS:
O usuario selecionou VARIOS objetivos para distribuir entre os videos.
- Alterne e distribua os objetivos entre os videos gerados.
- Cada video do array DEVE ter o campo "objective_foco".`
    : `\n\nIMPORTANTE: O campo "objective_foco" NAO deve ser incluido no JSON quando apenas um unico objetivo for fornecido.`;

  return base + quantityRule + durationRule + objectiveRule + `\n\nImportante: Retorne EXATAMENTE um array JSON. Nao inclua nenhum texto fora do array.`;
}

const BLOCKED_MODELS = [
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "inclusionai/ling-3.0-flash:free",
  "inclusionai/ling-3.0-light:free",
  "chub/gpt-3.5-turbo:free",
  "sao10k/l3-lucy-8b:free",
  "cognitivecomputations/dolphin-2.6-mistral-7b:free"
];

const RECOMMENDED_FREE_MODELS = [
  "google/gemini-2.5-flash:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free"
];

async function fetchFreeModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models?sort=top-weekly", {
      headers: { "Authorization": "Bearer " + apiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const models: string[] = (data.data || [])
      .map((m: { id: string }) => m.id)
      .filter((id: string) => id.endsWith(":free") && !BLOCKED_MODELS.includes(id));
    return models;
  } catch {
    return [];
  }
}

function parseJsonResponse(content: string): Record<string, unknown>[] | null {
  if (!content) return null;

  let cleanContent = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
    try { cleanContent = JSON.parse(cleanContent); } catch {}
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

  // Try direct parse
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}

  // Try fixing truncated JSON: add missing closing brackets
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

  // Count open/close brackets to fix truncated JSON
  let openBrackets = 0, openBraces = 0, inString = false;
  for (const ch of fixed) {
    if (ch === '"' && !inString) { inString = true; continue; }
    if (ch === '"' && inString) { inString = false; continue; }
    if (!inString) {
      if (ch === '[') openBrackets++;
      if (ch === ']') openBrackets--;
      if (ch === '{') openBraces++;
      if (ch === '}') openBraces--;
    }
  }
  // If truncated, close what's open
  if (openBrackets > 0 || openBraces > 0) {
    // Remove trailing comma if any
    fixed = fixed.replace(/,\s*$/, "");
    while (openBraces > 0) { fixed += "}"; openBraces--; }
    while (openBrackets > 0) { fixed += "]"; openBrackets--; }
  }

  try {
    const parsed = JSON.parse(fixed);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}

  // Last resort: extract individual objects with nested bracket support
  const objects: Record<string, unknown>[] = [];
  let depth = 0, start = -1;
  for (let i = 0; i < fixed.length; i++) {
    if (fixed[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (fixed[i] === '}') {
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

interface CallResult {
  variations: Record<string, unknown>[];
  usedKey: string;
  usedModel: string;
}

async function callOpenRouter(
  apiKeys: string[],
  models: string[],
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
  expectedQuantity: number
): Promise<CallResult | { error: string }> {
  const MODEL_TIMEOUT = 45000;
  let bestResult: CallResult | null = null;

  for (const key of apiKeys) {
    if (!key?.trim()) continue;

    for (const model of models) {
      if (signal.aborted) {
        return { error: "Requisicao cancelada." };
      }

      console.log(`🔑 Model: ${model} | Key: ...${key.slice(-6)}`);

      const modelController = new AbortController();
      const modelTimeout = setTimeout(() => modelController.abort(), MODEL_TIMEOUT);

      const onParentAbort = () => modelController.abort();
      signal.addEventListener("abort", onParentAbort, { once: true });

      try {
        const startTime = Date.now();
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key,
            "HTTP-Referer": "https://contenthub.app",
            "X-Title": "ContentHub",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 16000,
            temperature: 0.8,
          }),
          signal: modelController.signal,
        });

        const elapsed = Date.now() - startTime;

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.error?.message || `Erro HTTP ${res.status}`;
          console.warn(`⚠️ ${model} HTTP ${res.status} (${elapsed}ms): ${errMsg}`);
          if (res.status === 429 || res.status === 401 || res.status === 403) {
            break;
          }
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        console.log(`📄 ${model} (${elapsed}ms) RAW:`, content);

        if (!content || content.trim().length === 0) {
          console.warn(`⚠️ ${model} retornou conteudo vazio, tentando proximo...`);
          continue;
        }

        const variations = parseJsonResponse(content);
        if (variations && variations.length > 0) {
          console.log(`✅ JSON valido com ${variations.length} variacoes (esperado ${expectedQuantity}) do modelo ${model}`);

          if (variations.length >= expectedQuantity) {
            return { variations, usedKey: key, usedModel: model };
          }

          if (!bestResult || variations.length > bestResult.variations.length) {
            bestResult = { variations, usedKey: key, usedModel: model };
          }

          console.log(`⚠️ ${model} retornou apenas ${variations.length}/${expectedQuantity}, tentando proximo modelo...`);
          continue;
        }

        console.warn(`⚠️ ${model} retornou JSON invalido, tentando proximo...`);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (signal.aborted) {
            return { error: "Requisicao cancelada." };
          }
          console.warn(`⚠️ ${model} timeout apos ${MODEL_TIMEOUT / 1000}s, tentando proximo...`);
          continue;
        }
        console.warn(`⚠️ Falha de conexao com ${model}:`, err);
      } finally {
        clearTimeout(modelTimeout);
        signal.removeEventListener("abort", onParentAbort);
      }

      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (bestResult) {
    console.log(`⚠️ Usando melhor resultado: ${bestResult.variations.length} variacoes do modelo ${bestResult.usedModel}`);
    return bestResult;
  }
  return { error: "Todos os modelos e keys falharam. Nenhum retornou JSON valido." };
}

export async function POST(request: NextRequest) {
  let recordId: string | undefined = undefined;
  try {
    const body = await request.json();
    recordId = body?.recordId;
    const { payload } = body;

    if (!payload) {
      return NextResponse.json({ error: "payload e obrigatorio" }, { status: 400 });
    }

    const {
      theme,
      quantity,
      objectives,
      nicho,
      publicoAlvo,
      produtoServico,
      model,
      apiKey,
      apiKeys,
      duracao,
    } = payload;

    const keyList: string[] = [];
    if (Array.isArray(apiKeys) && apiKeys.length > 0) {
      keyList.push(...apiKeys.filter((k: string) => k?.trim()));
    }
    if (apiKey?.trim() && !keyList.includes(apiKey)) {
      keyList.push(apiKey);
    }

    if (keyList.length === 0) {
      return NextResponse.json({ error: "Nenhuma API Key do OpenRouter configurada" }, { status: 400 });
    }

    if (!theme?.trim()) {
      return NextResponse.json({ error: "Tema e obrigatorio" }, { status: 400 });
    }

    const objectiveList: string[] = Array.isArray(objectives) ? objectives.filter((o: string) => o?.trim()) : [];
    const hasMultipleObjectives = objectiveList.length > 1;
    const durationConfig = duracao && DURATIONS[duracao] ? DURATIONS[duracao] : null;

    const contextParts: string[] = [];
    if (nicho) contextParts.push("Nicho/Area: " + nicho);
    if (publicoAlvo) contextParts.push("Publico-alvo: " + publicoAlvo);
    if (produtoServico) contextParts.push("Produto/Oferta: " + produtoServico);
    if (objectiveList.length === 1) {
      contextParts.push("Objetivo: " + objectiveList[0]);
    } else if (objectiveList.length > 1) {
      contextParts.push("Objetivos para distribuir entre os videos: " + objectiveList.join(", "));
    }
    if (durationConfig) {
      contextParts.push("Duracao desejada por video: " + durationConfig.label);
    }

    const contextStr = contextParts.length > 0
      ? "\n\nContexto adicional:\n" + contextParts.join("\n")
      : "";

    const userPrompt = "Tema do video: " + theme + contextStr + "\n\nATENCAO: Gere EXATAMENTE " + (quantity || 3) + " variacoes de roteiro em UM SOLO JSON array com " + (quantity || 3) + " objetos. NAO retorne apenas 1. Retorne " + (quantity || 3) + " variacoes dentro do array JSON.";

    const selectedModel = model && model !== "google/gemma-4-26b-a4b-it:free" ? model : "google/gemini-2.5-flash:free";
    const systemPrompt = buildSystemPrompt(hasMultipleObjectives, durationConfig, quantity || 3);

    // Dynamic: fetch available free models from OpenRouter, then try user's model first
    const freeModels = await fetchFreeModels(keyList[0]);
    console.log("📋 Modelos gratuitos disponiveis:", freeModels.length);

    const modelsToTry = [selectedModel];
    
    // 1. Add high-quality recommended free models first
    for (const rm of RECOMMENDED_FREE_MODELS) {
      if (!modelsToTry.includes(rm)) {
        modelsToTry.push(rm);
      }
    }
    
    // 2. Add other free models from API that are not blocked
    for (const fm of freeModels) {
      if (!modelsToTry.includes(fm) && !BLOCKED_MODELS.includes(fm)) {
        modelsToTry.push(fm);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    console.log("🚀 Chamando OpenRouter | Models:", modelsToTry.length, "| Keys:", keyList.length);

    const result = await callOpenRouter(keyList, modelsToTry, systemPrompt, userPrompt, controller.signal, quantity || 3);
    clearTimeout(timeoutId);

    if ("error" in result) {
      console.error("❌ Todos os modelos/keys falharam:", result.error);
      
      // Update database status to error
      if (recordId) {
        try {
          const supabase = await createClient();
          await supabase
            .from("generated_scripts")
            .update({ status: "error", error_message: result.error })
            .eq("id", recordId);
          console.log("✅ Registro marcado como erro no Supabase pelo servidor");
        } catch (dbErr) {
          console.error("❌ Erro ao salvar erro no Supabase pelo servidor:", dbErr);
        }
      }
      
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const { variations, usedModel, usedKey } = result;
    console.log("✅ JSON parseado com", variations.length, "variacoes do modelo:", usedModel);

    if (objectiveList.length > 0) {
      variations.forEach((v: Record<string, unknown>, i: number) => {
        if (!v.objective_foco || typeof v.objective_foco !== "string") {
          v.objective_foco = objectiveList[i % objectiveList.length];
        }
      });
    }

    // Update database status to completed
    if (recordId) {
      try {
        const supabase = await createClient();
        const { error: dbErr } = await supabase
          .from("generated_scripts")
          .update({
            status: "completed",
            cards_data: variations,
            completed_at: new Date().toISOString(),
          })
          .eq("id", recordId);
        if (dbErr) throw dbErr;
        console.log("✅ Registro atualizado para completed no Supabase pelo servidor");
      } catch (dbErr) {
        console.error("❌ Erro ao salvar resultado no Supabase pelo servidor:", dbErr);
      }
    }

    return NextResponse.json({ success: true, variations, usedModel });
  } catch (err) {
    console.error("❌ Generate async error:", err);
    const errMsg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timeout: IA nao respondeu."
          : err.message
        : "Erro interno";
    // Update database status to error
    if (recordId) {
      try {
        const supabase = await createClient();
        await supabase
          .from("generated_scripts")
          .update({ status: "error", error_message: errMsg })
          .eq("id", recordId);
        console.log("✅ Registro marcado como erro no Supabase pelo servidor");
      } catch (dbErr) {
        console.error("❌ Erro ao salvar erro no Supabase pelo servidor:", dbErr);
      }
    }

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
