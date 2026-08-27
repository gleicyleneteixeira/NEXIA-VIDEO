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
  niche?: string;
  objectives?: string[];
  publicoAlvo?: string;
  produtoServico?: string;
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
🎯 MODO SELECIONADO: REMODELAGEM DE VÍDEO VIRAL
O conteúdo fornecido é a transcrição de um vídeo que JÁ FOI VALIDADO pelo mercado.
REGRAS OBRIGATÓRIAS DE REMODELAGEM:
1. ROTEIRO #1 (REMODELAGEM FIEL):
   - GANCHO: COPIE EXATAMENTE O GANCHO ORIGINAL (os primeiros 1-3 segundos). Não mude uma única palavra.
   - DESENVOLVIMENTO/SOLUÇÃO: Mantém a mesma lógica e ordem do vídeo original, substituindo apenas palavras secundárias por sinônimos fluídos.
2. ROTEIROS #2 ATÉ #${params.count} (VARIAÇÕES DE ÂNGULO):
   - Crie ganchos novos com o mesmo gatilho central.
   - Mantenha a essência do conhecimento e da solução do vídeo original.
` : `
🎯 MODO SELECIONADO: NOVA IDEIA (CRIAÇÃO DO ZERO)
Crie ${params.count} variações com abordagens psicológicas totalmente distintas (ex: Variação 1: Foco no Erro; Variação 2: Foco na Curiosidade; Variação 3: Foco no Atalho/Resultado).
`}

=== REGRAS DE ENGENHARIA VIRAL E SUBTILEZA DE CTAs ===
1. GANCHOS ESTRUTURADOS (0-3s): quebra de padrão, lacuna de curiosidade, provocação de dor ou contradição imediata. Variação natural de aberturas (proibido limitar-se a "Vem cá" ou frases repetitivas).
2. DESENVOLVIMENTO E RETENÇÃO: conexão direta entre o problema e o mecanismo de solução sem introduções lentas.
3. CTAs SUBTIS E CONTEXTUAIS (REGRA ANTIFORÇADA):
   - PROIBIDO: chamadas genéricas/forçadas como "Curta, comente, compartilhe, siga e ative o sininho".
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
- CTA: chamada de ação SUBTIL e NATURAL (uma única ação por vídeo). NUNCA diga "curta, comente e compartilhe" juntos.

=== REGRA MÁXIMA DE COMPATIBILIDADE UNIVERSAL DOS BLOCOS ===
Cada bloco deve funcionar de forma AUTÔNOMA.
NÃO use conectores pendentes ("como eu disse no gancho", "esse método que citei", "a moça do vídeo").
Garanta que QUALQUER Gancho possa se conectar com QUALQUER Dor, Desenvolvimento, Solução, Benefício e CTA deste mesmo lote sem perder o sentido.

=== FORMATO DE SAÍDA (JSON ESTRITO) ===
Retorne rigorosamente um array JSON com ${params.count} variações. Cada objeto deve conter:
index (number), isExactRemodel (boolean — true apenas no Roteiro #1 de remodelagem fiel), hook, pain, development, solution, benefit, cta, fullScriptText (texto completo unindo os blocos),
headline, seoCaption (legenda pronta com emojis, sem hashtags), sceneDirection, bRollSuggestions (array), hashtags (array).
`;
}
