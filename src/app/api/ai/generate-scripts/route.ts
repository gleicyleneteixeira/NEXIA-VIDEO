import { NextRequest, NextResponse } from "next/server";
import { buildViralScriptPrompt } from "@/services/aiScriptEngine";

const SYSTEM_INSTRUCTION = `Voce e o Diretor de Copywriting do SaaS NEXIA VIDEO.
Sua unica funcao e receber o input do usuario (mesmo que seja uma ideia vaga, um desabafo desorganizado, sem pontuacao ou um texto longo) e criar roteiros virais e persuasivos para Reels/TikTok/Shorts.

CONTRATO DE CONTEXTO GLOBAL:
A UNICA fonte de verdade e de contexto para todos os blocos e o campo "Tema / Ideia Central" inserido pelo usuario.

O Tema/Ideia Central estabelece o universo semantico, o produto, as dores e a solucao que DEVEM estar presentes no ecossistema do roteiro.

Independencia de Blocos: Nenhum bloco (Gancho, Desenvolvimento ou CTA) deve extrair contexto de outro bloco irmao. Todos os blocos devem extrair seu contexto exclusivamente do Tema / Ideia Central do projeto.

DIRETRIZES DE CRIACAO:
1. INTERPRETACAO SEMANTICA:
   - Se o input for longo e com contrastes (ex: SP acha facil vs MG reprova), extraia o motivo real e use essa historia dentro do roteiro.
   - Se o input for uma unica palavra vaga (ex: "FGTS", "unhas", "advocacia"), crie um contexto completo de dor, desejo e solucao para aquele nicho.
   - NUNCA corte o input no meio e nunca resuma ao ponto de perder o sentido. Todo texto do briefing deve ser considerado.
 2. ESTRUTURA DOS 4 BLOCOS MODULARES (cada objeto do array = 1 video):
    Gere 4 blocos TOTALMENTE INDEPENDENTES. O usuario vai combinar QUALQUER
    variacao do Slot 1 com QUALQUER variacao do Slot 2, Slot 3 e Slot 4
    (ex: 5x5x5x5 = 625 combinacoes), sem travas gramaticais. Por isso,
    NENHUM bloco pode depender de outro para fazer sentido.
    - SLOT 1 - HOOK (Gancho - Primeiros 3s): Uma unica pergunta cortante, quebra de mito ou choque de curiosidade. Frase 100% finalizada gramaticalmente. PROIBIDO terminar com pontuacao suspensa, conjuncoes ou conectores abertos ("porque...", "e o motivo e...", "mas...").
    - SLOT 2 - DOR / DESEJO / DUVIDA: Inicie de forma autonoma e contextualizada, nomeando claramente o problema com substantivos proprios. PROIBIDO usar pronomes que referenciem a ultima palavra do gancho ("Isso acontece...", "Esse problema...", "Como vimos antes...").
    - SLOT 3 - SOLUCAO: Apresente o metodo, produto ou virada de chave de forma limpa e independente de qual Dor foi dita. Frase completa e autonoma.
    - SLOT 4 - CTA (Chamada): Comando direto e independente de acao imediata. Sem depender de informacao especifica da Solucao.
 3. DURACAO E EXTENSAO (REGRAS CRITICAS DE TAMANHO):
    O briefing informara a DURACAO ALVO (15s, 30s, 60s ou 90s). Essa duracao
    DEFINE A EXTENSAO EXATA de CADA bloco. Considere velocidade media de fala
    humana de 2,5 palavras por segundo.
    - NAO entregue texto raso se o usuario selecionou 60s ou 90s. Desenvolva o
      tema com exemplos, argumentos e detalhes praticos nos blocos de Dor/Desejo
      e Solucao para bater a meta de palavras da duracao escolhida.
    - Cada bloco (Gancho, Dor/Desejo/Duvida, Solucao, CTA) DEVE respeitar a faixa
      de palavras exigida para a duracao. Se a duracao for 15s, seja ultra-curto;
      se for 90s, seja denso e completo. O usuario prompt traz a meta exata por bloco.
    - A soma das palavras dos 4 blocos deve ficar DENTRO da meta total da duracao.
 4. FORMATO DE SAIDA (ESTRITAMENTE JSON):
    Retorne APENAS um array JSON valido, sem crases (json), sem texto antes ou depois.
    Exemplo de cada objeto:
    {
      "angleName": "Nome do Angulo",
      "headline": "Titulo do Video",
      "hook": "Texto do Gancho (Slot 1)",
      "painOrDesire": "Texto da Dor/Desejo/Duvida (Slot 2)",
      "solution": "Texto da Solucao (Slot 3)",
      "cta": "Texto da CTA (Slot 4)",
      "seoCaption": "TODO o texto falado do roteiro completo (Gancho + Dor/Desejo + Solucao + CTA), com emojis naturais espalhados para dar vida. NAO crie uma legenda resumida ou separada. A descricao do post e EXATAMENTE o que o criador vai falar no video, ponto final.",
      "sceneDirection": "Direcao para o criador gravar",
      "bRollSuggestions": ["broll 1", "broll 2", "broll 3"],
      "hashtags": ["tag1", "tag2", "tag3"]
    }
    Cada roteiro DEVE ser completo e falavel em voz alta. O campo "seoCaption" e OBRIGATORIO:
    deve ser a COPIA EXATA de TODO o texto falado do roteiro (hook + painOrDesire + solution + cta),
    incluindo os mesmos ganchos, frases e fechamento. A unica diferenca e que o seoCaption pode
    ter emojis naturais intercalados no texto para dar vida ao post. NUNCA resuma, parafraseie ou
    crie uma descricao "sobre" o video — a descricao E o proprio roteiro falado.

IDIOMA E HASHTAGS:
- TODO o conteudo retornado DEVE ser em PORTUGUES BRASILEIRO. NUNCA gere texto em outro idioma.
- As hashtags DEVEM ser em portugues, relevantes ao tema, e SEO-friendly paraReels/TikTok/Shorts.
- Use hashtags populares do nicho brasileiro. Exemplos genericos quando adequado: #Reels #TikTok #Viral #Dicas #Fyp.
- NUNCA use hashtags em ingles ou outro idioma que nao seja portugues.
- As hashtags DEVEM refletir o Tema/Ideia Central do roteiro.

REGRAS DE MODULARIDADE (CRITICO):
O usuario podera combinar QUALQUER Gancho (Slot 1) + QUALQUER Dor/Desejo/Duvida (Slot 2) + QUALQUER Solucao (Slot 3) + QUALQUER CTA (Slot 4).
Portanto, TODAS as combinacoes possiveis devem produzir roteiros coerentes, naturais e completos, sem travas gramaticais.

CADA BLOCO DEVE:
- Extrair contexto EXCLUSIVAMENTE do Tema/Ideia Central
- Ser semanticamente independente dos outros blocos
- Apresentar claramente seu proprio contexto (assunto, problema, solucao)
- Funcionar perfeitamente depois de QUALQUER bloco anterior
- Funcionar perfeitamente antes de QUALQUER bloco posterior
- Usar substantivos explicitos em vez de pronomes sem antecedente proprio

CADA GANCHO (Slot 1) DEVE:
- Ser uma frase completa ou pergunta completa
- Apresentar claramente o assunto
- Nao terminar com reticencias ou conectivos abertos ("porque", "e", "mas")
- Nao depender de continuacao

CADA DOR/DESEJO/DUVIDA (Slot 2) DEVE:
- Iniciar de forma autonoma e contextualizada, nomeando o problema com substantivos proprios
- NUNCA comecar com "Isso", "Esse problema", "Como vimos", "Ele", "Um deles"
- Estabelecer seu proprio contexto sem pressupor leitura previa do Gancho
- Terminar de forma que QUALQUER Solucao possa ser colocada depois

CADA SOLUCAO (Slot 3) DEVE:
- Apresentar o metodo/produto/virada de forma limpa e independente
- Nao comecar com "Isso", "Como falamos", "Pensando nisso"
- Nao responder diretamente a apenas uma Dor especifica
- Terminar de forma que QUALQUER CTA possa ser colocado depois

CADA CTA (Slot 4) DEVE:
- Ser direto e independente
- Nao depender de informacao especifica da Solucao
- Nao usar construcoes como "Agora que voce aprendeu...", "Depois de conhecer...", "Se voce quer treinar..."
- Funcionar com qualquer combinacao anterior

PROIBIDO EM QUALQUER BLOCO:
- Referencias anafóricas sem antecedente dentro do proprio bloco ("Esse teste", "Essa tecnica", "Isso", "Ele", "Aquele", "Um deles")
- Responder diretamente a pergunta de apenas um Gancho
- Continuar frase iniciada em outro bloco
- Depender de personagem, objeto ou situacao apresentada em outro bloco
- Terminar Ganchos com reticencias ou conectivos abertos
- Terminar Dor/Solucao com frases que preparem uma transicao especifica

VALIDACAO INTERNA:
Apos gerar os blocos, teste mentalmente combinacoes cruzadas (ex: Hook 1 + Dor 3 + Solucao 2 + CTA 5).
Se qualquer combinacao falhar por contexto ausente, referencia sem antecedente, continuidade artificial ou mudanca brusca de assunto, reescreva o bloco responsavel.
O criterio final: "Qualquer combinacao dos 4 slots parece ter sido escrita especificamente para aquela combinacao?" Se NAO, reescrever.

COESAO REGIONAL E CONTEXTUAL (SLOT 1 vs SLOT 2/3) - REGRA CRITICA:
O usuario vai combinar QUALQUER Gancho (Slot 1) com QUALQUER Dor (Slot 2) e Solucao (Slot 3).
Por isso, e PROIBIDO travar o nome de um estado, cidade ou localidade especifica dentro do
SLOT 2 (Dor/Desejo/Duvida) ou do SLOT 3 (Solucao), A MENOS QUE TODOS os Ganchos (Slot 1) do
lote se refiram a essa MESMA regiao.
- Se o lote tiver Ganchos de regioes diferentes (ex: um fala "Sao Paulo" e outro "Minas Gerais"),
  OBRIGATORIAMENTE mantenha SLOT 2 e SLOT 3 neutros, usando termos universais como:
  "a banca da sua regiao", "o Detran do seu estado", "os exames teoricos locais",
  "o orgao responsavel pela sua cidade", "a legislacao do seu municipio".
- Ganchos de contraste/estatistica (ex: "apenas 30%") devem ser seguidos por um SLOT 2 formulado
  para acolher TANTO estatisticas altas QUANTO baixas (ex: "Mesmo com esses numeros, a verdade e
  que muita gente continua reprovando por..."). Nunca amarre a Dor a um numero especifico do Gancho.
- VALIDACAO DE COESAO: o SLOT 2 NAO pode contradizer a premissa levantada no SLOT 1. Se o Gancho
  cita uma regiao/estatistica, a Dor deve ser compativel, sem citar outra regiao conflitante.`;

const RECOMMENDED_FREE_MODELS = [
  "google/gemini-2.5-flash:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

const GROQ_FREE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "mixtral-8x7b-32768",
];

const PAID_FALLBACK_MODELS = [
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-3.1-24b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "openai/gpt-4o-mini",
];

const OLLAMA_MODELS = [
  "llama3.2",
  "llama3.1",
  "mistral",
  "gemma2",
  "phi3",
];

const DEFAULT_MODEL = "google/gemini-2.5-flash:free";

function buildDurationInstruction(duration: string): string {
  const d = (duration || "30s").trim();
  const header = `O usuario selecionou a DURACAO ALVO de: ${d}.
Sua missao e GERAR UM CONTEUDO COM A EXTENSAO EXATA PARA PREENCHER ESSE TEMPO.
Considere a velocidade media de fala humana de 2,5 palavras por segundo.
Nao entregue um texto raso se o usuario selecionou 60s ou 90s. Desenvolva o tema com exemplos, argumentos e detalhes praticos no bloco de Dor/Desejo/Duvida e no de Solucao para bater a meta de palavras da duracao escolhida.`;

  switch (d) {
    case "15s":
      return (
        header +
        `
META TOTAL: video dinamico de 35 a 45 palavras.
- SLOT 1 (Gancho): 1 frase direta (7-10 palavras).
- SLOT 2 (Dor/Desejo/Duvida) + SLOT 3 (Solucao): explicativo ultra-curto (20-25 palavras).
- SLOT 4 (CTA): chamada de 1 linha (8-10 palavras).`
      );
    case "60s":
      return (
        header +
        `
META TOTAL: conteudo denso e explicativo de 140 a 170 palavras.
- SLOT 1 (Gancho): historia rapida ou quebra de padrao bem trabalhada (20-25 palavras).
- SLOT 2 (Dor/Desejo/Duvida) + SLOT 3 (Solucao): desenvolvimento aprofundado com exemplos praticos, motivo real do erro e passo a passo da solucao (100-120 palavras).
- SLOT 4 (CTA): fechamento persuasivo (20 palavras).`
      );
    case "90s":
      return (
        header +
        `
META TOTAL: aula/masterclass de 210 a 250 palavras.
- SLOT 1 (Gancho): introducao envolvente e contextualizada (25-30 palavras).
- SLOT 2 (Dor/Desejo/Duvida) + SLOT 3 (Solucao): analise detalhada, exemplos de aplicacao, estudo de caso ou explicacao minuciosa de gatilhos (160-180 palavras).
- SLOT 4 (CTA): convite estruturado com oferta/escassez (25-30 palavras).`
      );
    case "90s_plus":
      return (
        header +
        `
META TOTAL: conteudo estendido e sem limite (220+ palavras).
- SLOT 1 (Gancho): introducao envolvente e contextualizada (25-30 palavras).
- SLOT 2 (Dor/Desejo/Duvida) + SLOT 3 (Solucao): desenvolvimento PROFUNDO e COMPLETO, cobrindo TODOS os pontos do texto original sem omitir nenhuma dica, questao ou exemplo (180-250+ palavras).
- SLOT 4 (CTA): fechamento persuasivo com oferta/escassez (25-30 palavras).
- REGRA CRITICA: Se o modo for remodelagem, PRESERVE INTEGRALMENTE todo o conteudo do texto de referencia. Nao resuma, nao omita detalhes. Reescreva mantendo a mesma densidade informativa.`
      );
    case "30s":
    default:
      return (
        header +
        `
META TOTAL: video padrao Reels de 70 a 90 palavras.
- SLOT 1 (Gancho): pergunta ou afirmacao forte (12-15 palavras).
- SLOT 2 (Dor/Desejo/Duvida) + SLOT 3 (Solucao): explicacao contextualizada em 2 ou 3 frases (45-55 palavras).
- SLOT 4 (CTA): chamada de acao completa com beneficio (12-15 palavras).`
      );
  }
}

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
  lines.push(buildDurationInstruction(params.duration || "30s"));
  lines.push("QUANTIDADE DE ROTEIROS: " + params.count);
  if (hasMultiple) {
    lines.push(
      "IMPORTANTE: como ha varios objetivos, inclua em CADA objeto do array o campo extra \"objective_foco\" nomeando o objetivo daquele video especifico."
    );
  }
  lines.push(
    "CONTRATO DE CONTEXTO GLOBAL: O Tema/Ideia Central abaixo e a UNICA fonte de contexto. " +
    "Todos os blocos (Gancho, Dor/Desejo/Duvida, Solucao, CTA) devem extrair contexto EXCLUSIVAMENTE deste Tema. " +
    "Nenhum bloco pode depender de outro bloco. Os 4 slots (hook, painOrDesire, solution, cta) devem ser " +
    "totalmente independentes e intercambiaveis. Qualquer combinacao dos 4 slots deve parecer ter sido " +
    "escrita especificamente para aquela combinacao."
  );
  lines.push(
    "COESAO REGIONAL: se algum Gancho (Slot 1) citar uma regiao/estado/cidade, mantenha a Dor (Slot 2) e a " +
    "Solucao (Slot 3) NEUTRAS (ex: 'o Detran do seu estado', 'a banca da sua regiao'), A MENOS QUE TODOS os " +
    "Ganchos do lote sejam da mesma regiao. Nunca contradiga a regiao citada no Gancho."
  );
  lines.push(
    "INPUT / BRIEFING BRUTO DO USUARIO (use TODO o texto, sem resumir):\n\"\"\"\n" +
      params.topic +
      "\n\"\"\""
  );

  return lines.join("\n");
}

function validateBlockIndependence(
  variations: Record<string, unknown>[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const PROHIBITED_DEV_STARTS = [
    /^isso\b/i,
    /^essa\s/i,
    /^esse\s/i,
    /^este\s/i,
    /^esta\s/i,
    /^ele\s/i,
    /^ela\s/i,
    /^um deles/i,
    /^os outros/i,
    /^o primeiro/i,
    /^o segundo/i,
    /^o terceiro/i,
    /^como vimos/i,
    /^como explicado/i,
    /^essa tecnica/i,
    /^essa pessoa/i,
    /^esse caso/i,
    /^esse teste/i,
  ];

  const HOOK_ENDINGS =
    /\.\.\.$|,\s*$|\bporque\s*$|\be\s*$|\bmas\s*$|\bpor isso\s*$|\bentao\s*$/i;

  const DEV_ANSWERS_HOOK =
    /^(sim,|nao,|exatamente|claro|obviamente|como (dito|visto|explicado))/i;

  const CTA_DEPENDENCY =
    /^(agora que|depois de|com isso|assim|portanto|sendo assim)/i;

  variations.forEach((v, idx) => {
    const hook = String(v.hook || "").trim();
    const pain = String(v.painOrDesire || "").trim();
    const solution = String(v.solution || "").trim();
    const cta = String(v.cta || "").trim();

    if (HOOK_ENDINGS.test(hook)) {
      warnings.push(
        `Variacao ${idx + 1}: Gancho termina com conectivo/reticencias (intercambiabilidade comprometida)`
      );
    }

    if (PROHIBITED_DEV_STARTS.some((re) => re.test(pain))) {
      warnings.push(
        `Variacao ${idx + 1}: Dor/Desejo/Duvida comeca com construcao proibida (dependencia com Gancho)`
      );
    }
    if (DEV_ANSWERS_HOOK.test(pain)) {
      warnings.push(
        `Variacao ${idx + 1}: Dor/Desejo/Duvida parece responder a um Gancho especifico`
      );
    }

    if (PROHIBITED_DEV_STARTS.some((re) => re.test(solution))) {
      warnings.push(
        `Variacao ${idx + 1}: Solucao comeca com construcao proibida (dependencia com bloco anterior)`
      );
    }
    if (DEV_ANSWERS_HOOK.test(solution)) {
      warnings.push(
        `Variacao ${idx + 1}: Solucao parece responder a um Gancho/Dor especifico`
      );
    }

    if (CTA_DEPENDENCY.test(cta)) {
      warnings.push(
        `Variacao ${idx + 1}: CTA depende de contexto anterior (viola independencia)`
      );
    }
  });

  return { valid: warnings.length === 0, warnings };
}

// ---- Validação automática de coesão regional/contextual (Slot 1 vs Slot 2/3) ----

const REGION_KEYWORDS: string[] = [
  // estados (sem acento, minusculo)
  "acre", "alagoas", "amapa", "amazonas", "bahia", "ceara", "distrito federal",
  "espirito santo", "goias", "maranhao", "mato grosso do sul", "mato grosso",
  "minas gerais", "paraiba", "parana", "pernambuco", "piaui", "rio de janeiro",
  "rio grande do norte", "rio grande do sul", "rondonia", "roraima",
  "santa catarina", "sao paulo", "sergipe", "tocantins",
  // capitais/grandes cidades comuns
  "belo horizonte", "brasilia", "curitiba", "fortaleza", "goiania", "manaus",
  "belem", "porto alegre", "recife", "salvador", "sao paulo", "rio de janeiro",
];

const REGION_SET = new Set(REGION_KEYWORDS);

function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function findRegions(text: string): string[] {
  if (!text) return [];
  const t = stripAccents(text.toLowerCase());
  const found: string[] = [];
  for (const r of REGION_SET) {
    const escaped = r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`);
    if (re.test(t)) found.push(r);
  }
  return found;
}

function validateRegionalCohesion(
  variations: Record<string, unknown>[]
): string[] {
  const warnings: string[] = [];

  const allHookRegions = new Set<string>();
  variations.forEach((v) => {
    findRegions(String(v.hook || "")).forEach((r) => allHookRegions.add(r));
  });
  const multiRegion = allHookRegions.size > 1;

  variations.forEach((v, idx) => {
    const hookRegions = findRegions(String(v.hook || ""));
    const painSolution = String(v.painOrDesire || "") + " " + String(v.solution || "");
    const psRegions = findRegions(painSolution);

    if (psRegions.length === 0) return;

    if (multiRegion) {
      psRegions.forEach((r) =>
        warnings.push(
          `Variacao ${idx + 1}: Slot 2/3 cita "${r}" em lote multi-regional (deve ser NEUTRO para combinar com qualquer Gancho)`
        )
      );
    } else {
      psRegions.forEach((r) => {
        if (!hookRegions.includes(r)) {
          warnings.push(
            `Variacao ${idx + 1}: Slot 2/3 cita "${r}" que NAO aparece no Gancho (Slot 1) deste video (contradiz a premissa)`
          );
        }
      });
    }
  });

  return warnings;
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

  const painOrDesire = obj.painOrDesire || obj.pain || obj.dor;
  const solution = obj.solution || obj.desejo;
  const development =
    obj.development ||
    [painOrDesire, solution].filter(Boolean).join("\n\n");

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
  obj.painOrDesire = (painOrDesire as string) || "";
  obj.solution = (solution as string) || "";
  obj.development = (development as string) || "";
  obj.cta = (obj.cta as string) || "";
  obj.benefit = (obj.benefit as string) || "";
  obj.isExactRemodel = !!obj.isExactRemodel;
  obj.fullScriptText = (obj.fullScriptText as string) || "";

  const fullBlocks = [obj.hook, obj.painOrDesire, obj.solution, obj.cta]
    .filter(Boolean)
    .join("\n\n");

  const fullScriptText = (obj.fullScriptText as string) || fullBlocks;

  const seoCaption = fullScriptText;
  obj.seoCaption = seoCaption;
  obj.caption = seoCaption;
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

            const match = /use this slug instead:\s*([\w.\-/:]+)/i.exec(String(msg || ""));
            if (match?.[1]) hintSlug = match[1].trim();
          } catch {}
          errorDetails.push(`[openrouter:${model}] ${detail}`);

          if (hintSlug && !models.includes(hintSlug)) {
            models.push(hintSlug);
            errorDetails.push(`[openrouter:${model}] -> tentando alternativa: ${hintSlug}`);
          }

          if (res.status === 429 || res.status === 401 || res.status === 403) {
            break;
          }
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";

        if (data.error?.message) {
          errorDetails.push(`[openrouter:${model}] ${String(data.error.message).slice(0, 160)}`);
        }

        if (!content || content.trim().length === 0) {
          errorDetails.push(`[openrouter:${model}] resposta vazia`);
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
          errorDetails.push(`[openrouter:${model}] retornou ${variations.length}/${expectedQuantity} roteiros`);
        } else {
          errorDetails.push(`[openrouter:${model}] JSON nao parseado (${content.length} chars)`);
        }
      } catch (err) {
        errorDetails.push(
          `[openrouter:${model}] ${err instanceof Error ? (err.name === "AbortError" ? "timeout (60s)" : err.message.slice(0, 120)) : "erro desconhecido"}`
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
      "Todos os modelos OpenRouter falharam. " + summary,
  };
}

async function callGroq(
  apiKey: string,
  models: string[],
  systemPrompt: string,
  userPrompt: string,
  expectedQuantity: number
): Promise<{ variations: Record<string, unknown>[]; usedModel: string } | { error: string }> {
  const MODEL_TIMEOUT = 60000;
  let bestResult: { variations: Record<string, unknown>[]; usedModel: string } | null = null;
  const errorDetails: string[] = [];

  if (!apiKey?.trim()) {
    return { error: "Groq API key nao fornecida" };
  }

  for (const model of models) {
    const apiController = new AbortController();
    const apiTimeout = setTimeout(() => apiController.abort(), MODEL_TIMEOUT);

    try {
      const maxTokens = Math.min(8192, 2000 + expectedQuantity * 1100);
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
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
        try {
          const errData = await res.json();
          const msg = errData?.error?.message || "";
          if (msg) detail += ": " + String(msg).slice(0, 160);
        } catch {}
        errorDetails.push(`[groq:${model}] ${detail}`);
        if (res.status === 429 || res.status === 401 || res.status === 403) break;
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";

      if (!content || content.trim().length === 0) {
        errorDetails.push(`[groq:${model}] resposta vazia`);
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
        errorDetails.push(`[groq:${model}] retornou ${variations.length}/${expectedQuantity} roteiros`);
      } else {
        errorDetails.push(`[groq:${model}] JSON nao parseado (${content.length} chars)`);
      }
    } catch (err) {
      errorDetails.push(
        `[groq:${model}] ${err instanceof Error ? (err.name === "AbortError" ? "timeout (60s)" : err.message.slice(0, 120)) : "erro desconhecido"}`
      );
      continue;
    } finally {
      clearTimeout(apiTimeout);
    }
  }

  if (bestResult) return bestResult;

  const uniqueDetails = [...new Set(errorDetails)].slice(0, 5);
  const summary = uniqueDetails.length > 0 ? uniqueDetails.join(" | ") : "Nenhuma requisicao foi concluida";

  return { error: "Todos os modelos Groq falharam. " + summary };
}

async function callOllama(
  models: string[],
  systemPrompt: string,
  userPrompt: string,
  expectedQuantity: number
): Promise<{ variations: Record<string, unknown>[]; usedModel: string } | { error: string }> {
  const MODEL_TIMEOUT = 90000;
  let bestResult: { variations: Record<string, unknown>[]; usedModel: string } | null = null;
  const errorDetails: string[] = [];

  for (const model of models) {
    const apiController = new AbortController();
    const apiTimeout = setTimeout(() => apiController.abort(), MODEL_TIMEOUT);

    try {
      const maxTokens = Math.min(8192, 2000 + expectedQuantity * 1100);
      const res = await fetch("http://localhost:11434/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.8,
          stream: false,
        }),
        signal: apiController.signal,
      });

      if (!res.ok) {
        let detail = "HTTP " + res.status;
        try {
          const errData = await res.json();
          const msg = errData?.error?.message || "";
          if (msg) detail += ": " + String(msg).slice(0, 160);
        } catch {}
        errorDetails.push(`[ollama:${model}] ${detail}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";

      if (!content || content.trim().length === 0) {
        errorDetails.push(`[ollama:${model}] resposta vazia`);
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
        errorDetails.push(`[ollama:${model}] retornou ${variations.length}/${expectedQuantity} roteiros`);
      } else {
        errorDetails.push(`[ollama:${model}] JSON nao parseado (${content.length} chars)`);
      }
    } catch (err) {
      errorDetails.push(
        `[ollama:${model}] ${err instanceof Error ? (err.name === "AbortError" ? "timeout (90s)" : err.message.slice(0, 120)) : "erro desconhecido"}`
      );
      continue;
    } finally {
      clearTimeout(apiTimeout);
    }
  }

  if (bestResult) return bestResult;

  const uniqueDetails = [...new Set(errorDetails)].slice(0, 5);
  const summary = uniqueDetails.length > 0 ? uniqueDetails.join(" | ") : "Nenhuma requisicao foi concluida";

  return { error: "Todos os modelos Ollama falharam. " + summary };
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
      mode,
      rawContent,
      provider: requestedProvider,
      groqApiKey,
    } = body;

    const isRemodelMode =
      mode === "idea" || mode === "extracted_audio" || mode === "raw_text";
    const effectiveContent =
      isRemodelMode && typeof rawContent === "string" && rawContent.trim()
        ? rawContent
        : topic;

    if (
      !effectiveContent ||
      typeof effectiveContent !== "string" ||
      effectiveContent.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Briefing / Tema / Conteudo e obrigatorio" },
        { status: 400 }
      );
    }

    const openrouterKeys: string[] = [];
    if (Array.isArray(apiKeys) && apiKeys.length > 0) {
      openrouterKeys.push(...apiKeys.filter((k: string) => k?.trim()));
    }
    if (apiKey?.trim() && !openrouterKeys.includes(apiKey)) {
      openrouterKeys.push(apiKey);
    }
    const headerToken = request.headers.get("x-ai-custom-token")?.trim();
    if (headerToken && !openrouterKeys.includes(headerToken)) {
      openrouterKeys.push(headerToken);
    }

    const groqKey = groqApiKey || request.headers.get("x-groq-key") || "";

    const quantity = Math.max(1, Math.min(20, Math.floor(count || 5)));
    const objectiveList: string[] = Array.isArray(objectives)
      ? objectives.filter((o: string) => o?.trim())
      : [];
    if (typeof objective === "string" && objective.trim() && !objectiveList.includes(objective)) {
      objectiveList.push(objective);
    }

    const userPrompt = isRemodelMode
      ? buildViralScriptPrompt({
          mode,
          rawContent: effectiveContent,
          count: quantity,
          duration: duration || duracao,
          niche: typeof niche === "string" ? niche : undefined,
          objectives: objectiveList.length ? objectiveList : undefined,
          publicoAlvo: typeof publicoAlvo === "string" ? publicoAlvo : undefined,
          produtoServico: typeof produtoServico === "string" ? produtoServico : undefined,
        })
      : buildUserPrompt({
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

    const providerPriority = requestedProvider === "groq"
      ? ["groq", "openrouter", "ollama"]
      : requestedProvider === "ollama"
        ? ["ollama", "groq", "openrouter"]
        : ["openrouter", "groq", "ollama"];

    let result: { variations: Record<string, unknown>[]; usedModel: string } | { error: string } | null = null;
    const allErrors: string[] = [];

    for (const provider of providerPriority) {
      if (provider === "openrouter" && openrouterKeys.length > 0) {
        const modelsToTry = [selectedModel];
        for (const rm of RECOMMENDED_FREE_MODELS) {
          if (!modelsToTry.includes(rm)) modelsToTry.push(rm);
        }
        for (const pm of PAID_FALLBACK_MODELS) {
          if (!modelsToTry.includes(pm)) modelsToTry.push(pm);
        }
        result = await callOpenRouter(openrouterKeys, modelsToTry, SYSTEM_INSTRUCTION, userPrompt, quantity);
        if (!("error" in result)) break;
        allErrors.push(`[openrouter] ${result.error}`);
        result = null;
      }

      if (provider === "groq" && groqKey?.trim()) {
        const groqModels = [...GROQ_FREE_MODELS];
        result = await callGroq(groqKey, groqModels, SYSTEM_INSTRUCTION, userPrompt, quantity);
        if (!("error" in result)) break;
        allErrors.push(`[groq] ${result.error}`);
        result = null;
      }

      if (provider === "ollama") {
        result = await callOllama([...OLLAMA_MODELS], SYSTEM_INSTRUCTION, userPrompt, quantity);
        if (!("error" in result)) break;
        allErrors.push(`[ollama] ${result.error}`);
        result = null;
      }
    }

    if (!result) {
      const providerSummary = allErrors.length > 0 ? allErrors.join(" | ") : "Nenhum provider configurado";
      return NextResponse.json(
        { error: "Todos os providers falharam. Detalhes: " + providerSummary },
        { status: 502 }
      );
    }

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

    const modularityCheck = validateBlockIndependence(
      variations as unknown as Record<string, unknown>[]
    );

    const cohesionWarnings = validateRegionalCohesion(
      variations as unknown as Record<string, unknown>[]
    );

    return NextResponse.json({
      success: true,
      variations,
      usedModel: result.usedModel,
      provider: providerPriority.find(p => {
        if (p === "openrouter" && openrouterKeys.length > 0) return true;
        if (p === "groq" && groqKey?.trim()) return true;
        if (p === "ollama") return true;
        return false;
      }) || "openrouter",
      ...(modularityCheck.warnings.length > 0
        ? { _modularityWarnings: modularityCheck.warnings }
        : {}),
      ...(cohesionWarnings.length > 0
        ? { _cohesionWarnings: cohesionWarnings }
        : {}),
    });
  } catch (err) {
    console.error("Erro em /api/ai/generate-scripts:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao processar com IA" },
      { status: 500 }
    );
  }
}