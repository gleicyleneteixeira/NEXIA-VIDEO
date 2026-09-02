// Motor de copywriting de retenção viral do SaaS NEXIA VIDEO.
//
// Constrói o prompt enviado ao modelo de IA conforme a ORIGEM DO CONTEÚDO:
//  - mode 'idea'           -> ideia bruta do usuário (criar variações inéditas)
//  - mode 'extracted_audio' / 'raw_text' -> transcrição de vídeo viral já validado
//    (remodelar fielmente a estrutura vencedora, preservando o gancho original).

export type ScriptMode = "idea" | "extracted_audio" | "raw_text";

export interface ScriptGenerationParams {
  mode: ScriptMode;
  rawContent: string;
  count: number;
  duration?: string;
  niche?: string;
  objectives?: string[];
  publicoAlvo?: string;
  produtoServico?: string;
}

function getTargetWordCount(duration: string, originalTextLength: number): string {
  switch (duration) {
    case "15s":
      return "35 a 45 palavras (Ultra Dinâmico)";
    case "30s":
      return "70 a 90 palavras (Padrão Reels)";
    case "60s":
      return "140 a 170 palavras (Desenvolvimento Completo)";
    case "90s_plus": {
      const minWords = Math.max(220, Math.round(originalTextLength * 0.9));
      return `MÍNIMO DE ${minWords} PALAVRAS (Sem limite máximo). Cobra TODOS os pontos do texto original.`;
    }
    default:
      return "Compatível com a extensão do texto original de referência.";
  }
}

function getModularConstraintPrompt(): string {
  return `=== REGRA INVIOLÁVEL DE MONTAGEM TIPO QUEBRA-CABEÇA ===
Cada bloco do roteiro (Hook, Pain, Solution, CTA) é uma PEÇA INDEPENDENTE que será combinada via algoritmo combinatório (Produto Cartesiano).

SUA OBRIGAÇÃO DE VALIDAÇÃO INTERNA:
Antes de entregar o JSON final, execute um teste mental cruzando as peças:
- [Gancho #5] + [Dor #1] + [Solução #3] + [CTA #2]
- [Gancho #2] + [Dor #4] + [Solução #1] + [CTA #5]

Se em QUALQUER combinação cruzada o texto soar desconexo, com pronomes sem referência, ou trocando de assunto, REESCREVA OS BLOCOS.
Todas as variações do Slot 1 devem se encaixar perfeitamente com todas as do Slot 2, Slot 3 e Slot 4.`;
}

export function buildViralScriptPrompt(params: ScriptGenerationParams): string {
  const isRemodel = params.mode === "extracted_audio" || params.mode === "raw_text";

  return `
Você é o Engenheiro de Viralização e Copywriting do SaaS NEXIA VIDEO.

=== TIPO DE ENTRADA E ORIGEM DO CONTEÚDO ===
Modo: ${params.mode.toUpperCase()}
Conteúdo Base do Usuário:
"""
${params.rawContent}
"""

${isRemodel ? `
🎯 MODO SELECIONADO: REMODELAGEM DE VÍDEO VIRAL (${params.duration === "90s_plus" ? "90s+" : params.duration?.toUpperCase() || "60s"})
O conteúdo fornecido é a transcrição de um vídeo que JÁ FOI VALIDADO pelo mercado.

=== REGRA DE DENSIDADE BASEADA NA DURAÇÃO ===
${getTargetWordCount(params.duration || "60s", params.rawContent?.length || 0)}

REGRAS OBRIGATÓRIAS DE REMODELAGEM:

1. INTEGRIDADE ABSOLUTA DE CONTEÚDO (PROIBIDO RESUMIR OU OMITIR DETALHES):
   - Se o conteúdo de referência contiver listas, exemplos, questões, valores ou dicas passo a passo (ex: 5 questões do Detran), VOCÊ DEVE MANTER TODAS AS DICAS/QUESTÕES NO ROTEIRO FINAL.
   - NUNCA substitua o conteúdo explicativo por frases genéricas como "veja aqui esses pontos". Reescreva CADA UMA das dicas/perguntas/respostas usando palavras e sinônimos diferentes, mantendo o exato sentido explicativo.
   - Se o tempo selecionado for 90s+, o roteiro final PODE E DEVE ser longo. Desenvolva todas as frases mantendo o mesmo peso informativo do original.

2. REMODELAGEM DE PALAVRAS (REINVENTAR COM MESMO SENTIDO):
   - Reescreva as frases trocando palavras por sinônimos equivalentes de linguagem oral, mas mantendo 100% da lógica e do significado original.

3. ROTEIRO #1 (REMODELAGEM FIEL):
   - O GANCHO (os primeiros 1-3 segundos) DEVE SER COPIADO EXATAMENTE IGUAL ao gancho inicial do texto original, sem alterar nenhuma palavra.
   - O corpo (Desenvolvimento) deve conter todas as informações e questões do texto original reescritas com fluidez.

4. ROTEIROS #2 ATÉ #${params.count} (NOVOS ÂNGULOS, MESMA ESTRUTURA):
   - Altere a abordagem do Gancho para testar novos gatilhos psicológicos.
   - O desenvolvimento e a solução devem guiar o espectador exatamente pelo mesmo caminho e pelas mesmas respostas do vídeo original, apenas reescrevendo com fluidez.

5. MATRIZ DE COMBINAÇÃO INTERCAMBIÁVEL (QUEBRA-CABEÇA):
   - As frases devem ser gramaticalmente fechadas para que, se o usuário quiser combinar o Gancho do Roteiro 2 com o Desenvolvimento do Roteiro 1, a leitura continue perfeita e coesa.
   - Todo bloco deve ser autossuficiente e nomear diretamente o objeto do contexto (ex: "O teste de atenção concentrada...", "Para passar na prova teórica do Detran...").

⏺️ CONTAGEM EXATA OBRIGATÓRIA:
Você DEVE gerar EXATAMENTE ${params.count} VARIAÇÕES DE ROTEIRO DISTINTAS.
Se o modelo tender a gerar menos que ${params.count}, repita internamente:
"Gere ${params.count} variações, ponto final."
A resposta DEVE ser um array JSON com EXATAMENTE ${params.count} objetos.
NÃO gere apenas 1 variação ou um número menor que ${params.count}.

${getModularConstraintPrompt()}
` : `
🎯 MODO SELECIONADO: NOVA IDEIA (CRIAÇÃO DO ZERO)
Crie ${params.count} variações com abordagens psicológicas totalmente distintas (ex: Variação 1: Foco no Erro; Variação 2: Foco na Curiosidade; Variação 3: Foco no Atalho/Resultado).

⏺️ CONTAGEM EXATA OBRIGATÓRIA:
Você DEVE gerar EXATAMENTE ${params.count} VARIAÇÕES DE ROTEIRO DISTINTAS.
A resposta DEVE ser um array JSON com EXATAMENTE ${params.count} objetos.
NÃO gere apenas 1 variação ou um número menor que ${params.count}.
`}

${getModularConstraintPrompt()}

=== REGRAS DE ENGENHARIA VIRAL E SUBTILEZA DE CTAs ===
1. GANCHOS ESTRUTURADOS (0-3s): quebra de padrão, lacuna de curiosidade, provocação de dor ou contradição imediata. Variação natural de aberturas (proibido limitar-se a "Vem cá" ou frases repetitivas).
2. DESENVOLVIMENTO E RETENÇÃO: conexão direta entre o problema e o mecanismo de solução sem introduções lentas.
3. CTAs SUBTIS E CONTEXTUAIS (REGRA ANTIFORÇADA):
   - PROIBIDO: chamadas genéricas/forçadas como "Curte, comenta, compartilha, segue e ativa o sininho".
   - OBRIGATÓRIO: o CTA deve ser UMA ÚNICA AÇÃO consequência direta do conteúdo:
     • tutorial/dica -> pedir para SALVAR ("Salva esse vídeo pra você consultar depois")
     • identificação/debate -> pedir para COMENTAR ("Deixa nos comentários se isso já aconteceu com você")
     • valor contínuo -> pedir para SEGUIR ("Me segue pra não perder o próximo passo")
     • problema compartilhável -> pedir para ENVIAR/REPUBLICAR ("Manda esse vídeo pra quem tá precisando saber disso")

=== ESTRUTURA OBRIGATÓRIA DE CADA ROTEIRO ===
- GANCHO (0-3s): retenção imediata, sem enrolação.
- DOR / PROBLEMA: identificação imediata com o público.
- DESENVOLVIMENTO: explicação direta do mecanismo/erro.
- SOLUÇÃO: resposta direta para a dor.
- BENEFÍCIO / TRANSFORMAÇÃO: por que isso importa para o espectador.
- CTA: chamada de ação SUBTIL e NATURAL (uma única ação por vídeo). NUNCA diga "curte, comenta e compartilha" juntos.

=== COESÃO COMBINATÓRIA RÍGIDA (QUEBRA-CABEÇA 100% INTERCAMBIÁVEL) ===

REGRA 1 — SUBASSUNTO ÚNICO POR LOTE:
- Todas as variações deste MESMO lote DEVEM abordar rigorosamente o MESMO subassunto/objeto específico.
- ❌ ERRADO: Gancho fala de "Atenção Concentrada", Dor fala de "Memória Rápida" e Solução fala de "Simulado Geral" (quebra o quebra-cabeça).
- ✅ CERTO: Gancho, Dor, Solução e CTA de TODO o lote focam 100% em um único subassunto âncora (ex: "teste de memória rápida do psicotécnico").
- Defina o "subassunto âncora" ANTES de gerar e replique-o em TODAS as variações do lote.

REGRA 2 — AUTONOMIA DE BLOCO (PROIBIDO ANTECEDENTE DEPENDENTE):
- Nenhum bloco pode depender da gramática ou de palavras ditas no bloco anterior.
- PROIBIDO iniciar blocos com: "Ele...", "Esse teste...", "Como vimos...", "Por causa disso...", "Um deles...".
- OBRIGATÓRIO: TODO bloco que mencione o objeto principal deve nomeá-lo EXPLICITAMENTE (ex: "No teste de memória rápida...", "Para passar no teste de memória rápida...").
- Cada bloco (hook, pain, development, solution, benefit, cta) deve fazer sentido lido isoladamente.

REGRA 3 — MATRIZ DE TRANSIÇÃO (PONTE DE EXPECTATIVA):
- Fim do GANCHO (Slot 1): abre tensão/curiosidade sem prometer uma resposta gramatical específica.
- Início da DOR (Slot 2): assume e aprofunda a dor sobre o assunto do lote, de forma direta.
- Início da SOLUÇÃO (Slot 3): apresenta o método/simulado como resposta DIRETA para a dor daquele assunto.
- Início do CTA (Slot 4): chamada de ação direta e autônoma, relacionada ao tema.

REGRA 4 — VALIDAÇÃO CRUZADA OBRIGATÓRIA ANTES DE ENTREGAR:
Antes de retornar o JSON, faça o "teste mental" das combinações cruzadas da matriz:
  • [Gancho 1] + [Dor 3] + [Solução 2] + [CTA 1]
  • [Gancho 3] + [Dor 1] + [Solução 3] + [CTA 2]
Se em QUALQUER combinação houver troca de assunto ou quebra de sentido gramatical, REESCREVA os blocos afetados até a intercambiabilidade ser perfeita.

=== FORMATO DE SAÍDA (JSON ESTRITO) ===
Retorne rigorosamente um array JSON com EXATAMENTE ${params.count} variações. Cada objeto deve conter:
index (number), isExactRemodel (boolean — true apenas no Roteiro #1 de remodelagem fiel), hook, pain, development, solution, benefit, cta, fullScriptText (texto completo unindo os blocos),
headline, seoCaption (COPIA EXATA do fullScriptText — a descricao do post e o proprio roteiro falado, com emojis naturais espalhados, NAO resuma), sceneDirection, bRollSuggestions (array), hashtags (array).

⚠️ VERIFICAÇÃO FINAL: Conte os objetos no array antes de retornar. Se não tiver EXATAMENTE ${params.count} objetos, gere novamente.
`;
}