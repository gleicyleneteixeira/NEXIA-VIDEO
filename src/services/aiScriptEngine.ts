// Motor de copywriting de retenção viral do SaaS NEXIA VIDEO.
//
// Constrói o prompt enviado ao modelo de IA conforme a ORIGEM DO CONTEÚDO:
//  - mode 'idea'          -> ideia bruta do usuário (criar variações inéditas)
//  - mode 'extracted_audio' / 'raw_text' -> transcrição de vídeo viral já validado
//    (remodelar fielmente a estrutura vencedora, não inventar do zero).

export type ScriptMode = "idea" | "extracted_audio" | "raw_text";

export interface ScriptGenerationParams {
  mode: ScriptMode;
  rawContent: string;
  count: number;
  niche?: string;
  objectives?: string[];
  publicoAlvo?: string;
  produtoServico?: string;
}

export function buildRemodelPrompt(params: ScriptGenerationParams): string {
  const isRemodelMode = params.mode === "extracted_audio" || params.mode === "raw_text";

  return `
Você é o motor de copywriting especialista em retenção viral do SaaS NEXIA VIDEO.

=== ORIGEM DO CONTEÚDO ENVIADO ===
Modo Selecionado: ${params.mode.toUpperCase()}
Conteúdo do Usuário:
"""
${params.rawContent}
"""

${isRemodelMode ? `
⚠️ ATENÇÃO: O CONTEÚDO ACIMA É A TRANSCRIÇÃO DE UM VÍDEO VIRAL QUE JÁ PROVOU QUE FUNCIONA.
Sua missão NÃO é inventar um vídeo do zero, mas sim REMODELAR este conteúdo validado.

DIRETRIZES DE REMODELAGEM FIEL:
1. EXTRAÇÃO DO GANCHO ORIGINAL:
   - Identifique a primeira frase / pergunta inicial (os primeiros 3 a 5 segundos) do texto fornecido. Este é o GANCHO VIRAL ORIGINAL.

2. ROTEIRO #1 (REMODELAGEM DIRETA - COPIA FIEL):
   - Slot 1 (Gancho): COPIE EXATAMENTE O GANCHO ORIGINAL. Mantenha 100% igual, sem alterar nenhuma palavra.
   - Slot 2 (Desenvolvimento / Dor / Solução): Mantenha rigorosamente a MESMA explicação e ordem do texto original. Troque apenas pequenas palavras por sinônimos equivalentes para manter exatamente o mesmo sentido e fluidez natural de fala.
   - Slot 3 (CTA): Mantenha a mesma intenção de chamada de ação do vídeo original.

3. ROTEIROS #2 ATÉ #${params.count} (VARIAÇÕES COMPLEMENTARES):
   - Crie novos ganchos impactantes sobre o mesmo assunto.
   - Mantenha a essência e o conhecimento prático do texto original no desenvolvimento, adaptando a linguagem.
` : `
⚠️ ATENÇÃO: O CONTEÚDO ACIMA É UMA IDEIA BRUTA ENVIADA PELO USUÁRIO.
Sua missão é criar ${params.count} roteiros totalmente inéditos, criativos e com ganchos viscerais do zero baseados nesta ideia.
`}

=== REGRAS OBRIGATÓRIAS DE INTERCAMBIABILIDADE DE BLOCOS ===
Independente do modo, cada bloco gerado em cada variação DEVE SER AUTÔNOMO E GRAMATICALMENTE FECHADO (Matriz Combinatória A/B):
- **Gancho (Slot 1):** Deve ser uma afirmação ou pergunta completa. NUNCA termine com pontuação suspensa ou conectores abertos.
- **Desenvolvimento (Slot 2):** Não pode depender de termos pronominais como "esse teste que falei acima", "como eu disse no começo". Deve fazer sentido completo sozinho.
- **CTA (Slot 3):** Não pode pressupor promessas específicas que não estejam no próprio bloco.

Gere a resposta estritamente no formato JSON com ${params.count} variações contendo: index, isExactRemodel, headline, hook, painOrDesire, solution, cta.
`;
}
