import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const blocoEstrutura = z.object({
  hook: z
    .string()
    .describe("Headline / Hook: gancho para os primeiros 3 segundos do vídeo"),
  dor: z.string().describe("A Dor: o problema/dor do público-alvo"),
  solucao: z
    .string()
    .describe("A Solução: apresentação do produto ou ideia como solução"),
  cta: z.string().describe("CTA: chamada para ação clara e objetiva"),
});

const blocoSeo = z.object({
  headline: z.string().describe("Headline atrativa para a legenda"),
  descricao: z.string().describe("Descrição completa e engajante para a postagem"),
  hashtags: z
    .array(z.string())
    .length(5)
    .describe("Exatamente 5 hashtags estratégicas, cada uma iniciando com #"),
});

const blocoGravacao = z.object({
  comoGravar: z
    .string()
    .describe("Dicas de enquadramento, ângulos, ritmo e como gravar o vídeo"),
  bRoll: z.string().describe("Sugestões de B-Roll (cenas de apoio secundárias)"),
  musica: z.string().describe("Estilo de música de fundo / tom do áudio"),
});

const blocoRecursos = z.object({
  palavrasChave: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe(
      "Palavras-chave sugeridas para buscar em bancos de mídia gratuitos (Pexels, Unsplash, Pixabay, Giphy)"
    ),
});

const roteiroSchema = z.object({
  titulo: z.string().describe("Título curto e descritivo do roteiro"),
  estrutura: blocoEstrutura,
  seo: blocoSeo,
  gravacao: blocoGravacao,
  recursos: blocoRecursos,
});

const responseSchema = z.object({
  roteiros: z.array(roteiroSchema),
});

const SYSTEM_PROMPT = `Você é um estrategista de conteúdo especialista em vídeos curtos (Reels, TikTok, Shopee Vídeos, Shorts).
O usuário fornecerá uma IDEIA DE VÍDEO e a QUANTIDADE DE ROTEIROS desejada.

Para CADA roteiro requisitado, gere a seguinte estrutura padronizada:

1. ESTRUTURA DO ROTEIRO:
   - Headline / Hook (Gancho dos primeiros 3 segundos)
   - A Dor (O problema do público)
   - A Solução (Apresentação do produto/ideia)
   - CTA (Chamada para Ação)

2. SEO E LEGENDA:
   - Headline atrativa para a legenda
   - Descrição engajante para a postagem
   - Exatamente 5 Hashtags estratégicas

3. GUIA DE GRAVAÇÃO E DIREÇÃO:
   - Como gravar o vídeo (ângulos, ritmo, enquadramento)
   - Sugestões de B-Roll (cenas secundárias)
   - Estilo de música de fundo / tom do áudio

4. BANCO DE RECURSOS:
   - Palavras-chave sugeridas para buscar em bancos de mídia gratuitos (Pexels, Unsplash, Pixabay, Giphy).

Responda sempre em português do Brasil. Cada roteiro deve ser distinto e criativo, explorando ângulos diferentes do mesmo tema.`;

export async function POST(req: Request) {
  try {
    const { tema, quantidade, tipoVideo, tomVoz } = await req.json();

    if (!tema || typeof tema !== "string" || !tema.trim()) {
      return Response.json(
        { error: "Informe o tema/ideia central do vídeo." },
        { status: 400 }
      );
    }

    const qtd = [1, 3, 5].includes(Number(quantidade)) ? Number(quantidade) : 1;

    const prompt = `IDEIA DE VÍDEO: ${tema}
QUANTIDADE DE ROTEIROS: ${qtd}
TIPO DE VÍDEO: ${tipoVideo || "não especificado"}
TOM DE VOZ: ${tomVoz || "não especificado"}

Gere exatamente ${qtd} roteiro(s) completo(s) seguindo a estrutura padronizada.`;

    const { object } = await generateObject({
      model: "xai/grok-4.1-fast-non-reasoning",
      schema: responseSchema,
      system: SYSTEM_PROMPT,
      prompt,
    });

    // Garante a quantidade exata solicitada
    const roteiros = object.roteiros.slice(0, qtd);

    return Response.json({ roteiros });
  } catch (error) {
    console.log("[v0] Erro ao gerar roteiros:", error);
    const message =
      error instanceof Error ? error.message : "";
    if (message.includes("credit card") || message.includes("customer_verification")) {
      return Response.json(
        {
          error:
            "A IA (AI Gateway) precisa de um cartão de crédito válido cadastrado na Vercel para liberar os créditos gratuitos. Adicione um cartão no painel da Vercel e tente novamente.",
        },
        { status: 402 }
      );
    }
    return Response.json(
      { error: "Não foi possível gerar os roteiros. Tente novamente." },
      { status: 500 }
    );
  }
}
