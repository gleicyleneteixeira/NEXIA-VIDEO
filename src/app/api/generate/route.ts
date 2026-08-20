import { NextRequest, NextResponse } from "next/server";

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
Cada bloco (hook, development, cta) DEVE respeitar essa metrica. Seja conciso ou elaborado conforme a duracao.
NAO ultrapasse o limite de palavras. Releia e ajuste antes de responder.`
    : "";

  const base = `Voce e o copywriter senior do SaaS NEXIA VIDEO, especialista em videos virais e conversao para Reels, TikTok e Shorts.

Sua tarefa: ler o briefing ou ideia livre do usuario (nao importa o nicho) e criar roteiros COMPLETOS, 100% coerentes, com excelente portugues falado (tom de conversa natural de live/Stories).

REGRAS DE OURO:
1. ENTENDIMENTO REAL: Extraia o contexto profundo do briefing do usuario. Se ele citar contrastes, dores reais, produtos ou ofertas especificas, use esses elementos DENTRO do roteiro. NUNCA ignore o briefing e nunca substitua por temas genericos.
2. ESTRUTURA EM 3 ATOS POR ROTEIRO:
   - HOOK (Gancho): 1 unica pergunta impactante, quebra de mito ou choque nos primeiros 3 segundos. Varie as aberturas entre os videos.
   - DESENVOLVIMENTO: Dor + Solucao conectadas em um UNICO paragrafo fluido e facil de falar em voz alta.
   - CTA: Chamada direta com gatilho de oferta relampago, escassez ou comando para link da bio/comentarios.
3. CONCORDANCIA PERFEITA: Portugues falado correto, com genero, numero e tempos verbais consistentes. NENHUMA frase quebrada.
4. SAIDA ESTRITA: Retorne APENAS um array JSON valido, sem markdown.

Cada elemento do array representa 1 video e deve ter exatamente esta estrutura:
[
  {
    "angleName": "Nome do angulo psicologico deste roteiro",
    "headline": "Titulo chamativo (max 10 palavras)",
    "hook": "Gancho fluido e natural",
    "development": "Desenvolvimento completo conectando dor e solucao em um unico paragrafo",
    "cta": "Chamada para acao",
    "scene_direction": "Direcao de cena para gravacao: posicao, energia, gestos, olhar para camera",
    "brolls": ["Sugestao 1 de corte de apoio", "Sugestao 2", "Sugestao 3"],
    "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]${hasMultipleObjectives ? `,
    "objective_foco": "Nome do objetivo foco deste video especifico"` : ""}
  }
]`;

  const objectiveRule = hasMultipleObjectives
    ? `\n\nREGRAS IMPORTANTES PARA OBJETIVOS MULTIPLOS:
O usuario selecionou VARIOS objetivos para distribuir entre os videos.
- Alterne e distribua os objetivos entre os videos gerados.
- Cada video do array DEVE ter o campo "objective_foco".
- O copy (hook, development, cta) DEVE se adaptar ao objetivo daquele video.`
    : `\n\nIMPORTANTE: O campo "objective_foco" NAO deve ser incluido no JSON quando apenas um unico objetivo for fornecido.`;

  return base + quantityRule + durationRule + objectiveRule + `\n\nImportante: Retorne EXATAMENTE um array JSON. Nao inclua nenhum texto fora do array.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      theme,
      quantity,
      objectives,
      objective,
      duracao,
      nicho,
      publicoAlvo,
      produtoServico,
      model,
      apiKey: bodyApiKey,
    } = body;

    const apiKey =
      (bodyApiKey && String(bodyApiKey).trim()) ||
      request.headers.get("x-ai-custom-token")?.trim() ||
      "";

    if (!theme || typeof theme !== "string") {
      return NextResponse.json({ error: "Tema e obrigatorio" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key do OpenRouter e obrigatoria" },
        { status: 400 }
      );
    }

    // Normalize objectives
    const objectiveList: string[] = (() => {
      if (Array.isArray(objectives) && objectives.length > 0) {
        return objectives.filter((o: string) => o && o.trim());
      }
      if (typeof objective === "string" && objective.trim()) {
        return [objective.trim()];
      }
      return [];
    })();

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

    const userPrompt = "Briefing / Ideia do usuario (use TODO o texto, sem resumir):\n\n" + theme + contextStr + "\n\nGere " + (quantity || 3) + " roteiros COMPLETOS. Retorne APENAS o JSON array.";

    const selectedModel = model && model !== "google/gemma-4-26b-a4b-it:free" ? model : "google/gemini-2.5-flash:free";
    const systemPrompt = buildSystemPrompt(hasMultipleObjectives, durationConfig, quantity || 3);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": "https://contenthub.app",
        "X-Title": "ContentHub",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errData?.error?.message || "Erro na API OpenRouter: " + response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Resposta da IA nao contem JSON valido", raw: content },
        { status: 422 }
      );
    }

    const variations = JSON.parse(jsonMatch[0]);

    // Fallback: assign objective_foco round-robin if missing
    if (objectiveList.length > 0) {
      variations.forEach((v: Record<string, unknown>, i: number) => {
        if (!v.objective_foco || typeof v.objective_foco !== "string") {
          v.objective_foco = objectiveList[i % objectiveList.length];
        }
      });
    }

    return NextResponse.json({ variations });
  } catch (err) {
    console.error("Generate API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
