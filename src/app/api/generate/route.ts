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
Cada bloco (hook, dor, desejo, cta) DEVE respeitar essa metrica. Seja conciso ou elaborado conforme a duracao.
NAO ultrapasse o limite de palavras. Releia e ajuste antes de responder.`
    : "";

  const base = `Voce e um roteirista profissional de videos para redes sociais (YouTube Shorts, TikTok, Instagram Reels).
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
REGRAS DE MODULARIDADE RIGOROSA (OBRIGATORIO SEGUIR)
═══════════════════════════════════════════════════════════════════

O sistema de geracao combina os blocos via FFmpeg: Hooks x Dores x Desejos x CTAs.
Cada bloco de UM video pode ser combinado com QUALQUER bloco de OUTRO video.
Portanto, os blocos NAO podem ser historias fechadas. Devem ser MODULOS UNIVERSAIS INTERCAMBIAVEIS.

─── 1. HOOKS (Ganchos de 3s) ────────────────────────────────────
- Devem ser interrupcoes de padrao diretas sobre o tema geral.
- Proibido: fazer perguntas que exijam resposta imediata no proprio Hook.
- Proibido: citar dados ultra-especificos no Hook que dependam de uma continuacao exata na Dor.
- O Hook deve terminar em um tom SUSPENSO que se conecte semanticamente com QUALQUER Dor gerada.
- Use frases como: "Se voce vai fazer X, pare tudo agora!", "O maior erro de quem Y e este aqui!", "Ninguem te conta isso sobre X..."

─── 2. DORES (O Problema) ───────────────────────────────────────
- Devem abordar o sentimento/obstaculo COMUM sem pressupor a frase exata do Hook.
- A frase DEVE fluir perfeitamente vindo de QUALQUER um dos Hooks gerados.
- Proibido: usar conectivos que dependam do texto anterior (como "Por isso...", "E e que...").
- Comece a frase como se fosse o inicio de um pensamento autonomo.

─── 3. DESEJOS (A Solucao) ──────────────────────────────────────
- Apresentam o beneficio principal da oferta de forma INDEPENDENTE.
- Proibido: referenciar a Dor por palavras (como "A solucao para isso...", "Para resolver...").
- Descreva o beneficio como um fato autonomo: "Com [Produto], voce [beneficio direto]."
- O Desejo deve funcionar sozinho, sem necessidade de contexto anterior.

─── 4. CTAs (Chamadas para Acao) ────────────────────────────────
- Devem ser comandos DIRETOS e UNIVERSAIS para o objetivo selecionado.
- Proibido: criar CTAs que dependam do contexto da Dor ou Desejo anterior.
- Use verbos de acao fortes: "Clique no link...", "Garanta agora...", "Siga para mais..."
- O CTA deve funcionar vindo de QUALQUER Desejo anterior.

═══════════════════════════════════════════════════════════════════
TESTE DE COERENCIA GRAMATICAL E CONTEXTUAL (AUTO-VALIDACAO)
═══════════════════════════════════════════════════════════════════

ANTES de retornar o JSON, voce DEVE realizar o seguinte teste mental:
1. Pegue o Hook do video 1, a Dor do video 2, o Desejo do video 3 e o CTA do video 4.
2. Leia em voz alta como se fossem um unico texto continuo.
3. Se sobrar pontas soltas, descontinuidade de tempo verbal ou falta de nexo, REESCREVA os blocos.
4. Repita o teste com outras combinacoes ate garantir 100% de fluidez em QUALQUER permutacao.
5. Cada bloco DEVE soar natural vindo de qualquer outro bloco, como se tivesse sido escrito juntos.

═══════════════════════════════════════════════════════════════════
MODO DE GRAVACAO FRAGMENTADA (EM LOTE)
═══════════════════════════════════════════════════════════════════

O usuario ira gravar os blocos SEPARADAMENTE em lote (todos os Hooks de uma vez, todas as Dores de uma vez, etc.) e depois o FFmpeg ira combinar QUALQUER Hook com QUALQUER Dor, QUALQUER Desejo e QUALQUER CTA.
Isso significa que:
- O Hook 1 deve funcionar PERFEITAMENTE com a Dor 3, o Desejo 5 e o CTA 2.
- O Hook 3 deve funcionar PERFEITAMENTE com a Dor 1, o Desejo 2 e o CTA 4.
- NAO pode haver NENHUMA referencia cruzada entre blocos do mesmo video original.
- Cada bloco e uma UNIDADE 100% AUTONOMA e INDEPENDENTE.
- Se qualquer combinacao gerar frase sem nexo, o bloco esta ERRADO e deve ser reescrito.`;

  const objectiveRule = hasMultipleObjectives
    ? `\n\nREGRAS IMPORTANTES PARA OBJETIVOS MULTIPLOS:
O usuario selecionou VARIOS objetivos para distribuir entre os videos.
- Alterne e distribua os objetivos entre os videos gerados.
- Cada video do array DEVE ter o campo "objective_foco" indicando qual objetivo daquele video.
- A estrutura do copy (Hook, Dor, Desejo, CTA) DEVE se adaptar estritamente ao objetivo daquele video especifico.
- Exemplo: se o objetivo e "Converter em Vendas", o CTA deve ser mais direto e voltado para conversao. Se e "Viralizar", o hook deve ser mais impactante e provocativo.
- Nao repita o mesmo objetivo em videos consecutivos se houver variedade suficiente.`
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
      apiKey,
    } = body;

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

    const userPrompt = "Tema do video: " + theme + contextStr + "\n\nGere " + (quantity || 3) + " variacoes de roteiro para video. Retorne APENAS o JSON array.";

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
