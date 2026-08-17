/**
 * Banco de Matrizes Editoriais (100% offline) — "30 Posts Prontos".
 *
 * 30 templates distribuídos em 5 pilares editoriais: Atração, Educação,
 * Autoridade, Venda e Conexão (6 de cada). Os textos usam placeholders
 * {nicho}, {servico}, {beneficio} e {dor}, substituídos em tempo de execução
 * por `generateOfflineCalendar` — nenhuma API externa de IA é necessária.
 */

export type EditorialPillar = "atracao" | "educacao" | "autoridade" | "venda" | "conexao";

export interface ContentTemplate {
  day: number;
  pillar: EditorialPillar;
  pillarLabel: string;
  format: string;
  hookTemplate: string;
  bodyTemplate: string;
  ctaTemplate: string;
}

export interface ContentPostItem {
  id: string;
  dayNumber: number;
  scheduledDate: string;
  pillar: EditorialPillar;
  pillarLabel: string;
  format: string;
  hook: string;
  scriptOutline: string;
  caption: string;
  callToAction: string;
  /** Arte 1080×1080 gerada pelo renderizador Canvas (dataURL PNG). */
  previewImageUrl?: string;
}

export const EDITORIAL_PILLARS: Record<
  EditorialPillar,
  { label: string; color: string; description: string }
> = {
  atracao: { label: "Atração", color: "#ec4899", description: "Ganchos e conteúdo que pausam o scroll" },
  educacao: { label: "Educação", color: "#3b82f6", description: "Entrega de valor e passo a passo" },
  autoridade: { label: "Autoridade", color: "#8b5cf6", description: "Prova, credibilidade e diferenciação" },
  venda: { label: "Venda", color: "#22c55e", description: "Oferta, convencimento e conversão" },
  conexao: { label: "Conexão", color: "#f59e0b", description: "História, bastidores e comunidade" },
};

export const CONTENT_PILLARS_ORDER: EditorialPillar[] = [
  "atracao",
  "educacao",
  "autoridade",
  "venda",
  "conexao",
];

const ATRACAO: {
  format: string;
  hookTemplate: string;
  bodyTemplate: string;
  ctaTemplate: string;
}[] = [
  {
    format: "Reel",
    hookTemplate: "Se você trabalha com {nicho}, pare de fazer isso agora",
    bodyTemplate:
      "Abertura com {dor}. Mostre o erro comum e por que ele custa {beneficio}. Transição para a solução em 3 pontos rápidos. Encerramento com reforço.",
    ctaTemplate: "Comenta 'QUERO' que eu te mostro como usar {servico} na prática.",
  },
  {
    format: "Shorts",
    hookTemplate: "5 sinais de que você precisa de {servico} hoje",
    bodyTemplate:
      "Liste os 5 sinais ligados a {dor} em {nicho}. Cada um com 1 frase que desperta identificação. Feche reforçando que esses sinais somem com {beneficio}.",
    ctaTemplate: "Salva esse post para revisar depois — e segue a página para mais.",
  },
  {
    format: "Reel",
    hookTemplate: "Ninguém te contou isso sobre {nicho} (e por isso você ainda não tem {beneficio})",
    bodyTemplate:
      "Revelação contraintuitiva. Explique a causa raiz de {dor}. Apresente {servico} como atalho justo para {beneficio}.",
    ctaTemplate: "Comenta 'MAPA' que te envio o guia de {nicho}.",
  },
  {
    format: "Carrossel",
    hookTemplate: "Pare de acreditar no mito mais perigoso do {nicho}",
    bodyTemplate:
      "Desconstrua o mito com dados e lógica. Mostre o que fazer no lugar usando {servico}. Resultado esperado: {beneficio} em poucas semanas.",
    ctaTemplate: "Marca alguém que precisa ver isso. E se inscreva para não perder o próximo.",
  },
  {
    format: "Reel",
    hookTemplate: "Todo mundo fala de {nicho}, mas só quem usa {servico} consegue {beneficio}",
    bodyTemplate:
      "Comparação direta: caminho comum cheio de {dor} vs caminho com {servico}. Depoimento breve. Abre a porta para a conversa.",
    ctaTemplate: "Chama no direct 'EU QUERO' e vamos conversar sobre o seu caso.",
  },
  {
    format: "Shorts",
    hookTemplate: "Isso vai mudar a forma como você pensa sobre {nicho}",
    bodyTemplate:
      "Provocação + história curta. Quebra de paradigma sobre {dor}. Atalho prático com {servico} para chegar em {beneficio}.",
    ctaTemplate: "Compartilha com quem está começando em {nicho}.",
  },
];

const EDUCACAO: {
  format: string;
  hookTemplate: string;
  bodyTemplate: string;
  ctaTemplate: string;
}[] = [
  {
    format: "Carrossel",
    hookTemplate: "Passo a passo: como usar {servico} para conseguir {beneficio}",
    bodyTemplate:
      "Rotina em etapas claras (1, 2, 3). Em cada etapa, o que fazer e o erro típico de {nicho} que gera {dor}. Checkpoint final medindo {beneficio}.",
    ctaTemplate: "Salva o passo a passo e comenta 'PASSO 1' para eu detalhar a primeira etapa.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "As 3 regras de ouro de {nicho} que quase ninguém segue",
    bodyTemplate:
      "Regras 1, 2 e 3 com exemplos reais. Relacione cada regra a evitar {dor}. Mostre como {servico} automatiza as 3 regras no dia a dia.",
    ctaTemplate: "Copia esse post para a sua pasta de conteúdo. Se eu falar tudo, você faz também.",
  },
  {
    format: "Reel",
    hookTemplate: "Como parar de {dor} de vez em {nicho}",
    bodyTemplate:
      "Diagnóstico: por que a dor acontece. Solução em camadas (ferramenta, processo, mentalidade). Onde {servico} encaixa e entrega {beneficio}.",
    ctaTemplate: "Segue a página e salva esse post — eu posto o método completo todo dia.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "Erros em {nicho} que estão roubando o seu {beneficio}",
    bodyTemplate:
      "Lista de erros comuns (incluindo {dor}). O custo real de cada erro. Correção prática e rápida com {servico}.",
    ctaTemplate: "Comenta 'LISTA' que eu mando o checklist completo de {nicho} no seu direct.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "O método simples para conseguir {beneficio} mesmo começando do zero em {nicho}",
    bodyTemplate:
      "Mapa do zero ao resultado: fundamentos, prática, escala. Demonstração de cada fase com {servico}. Menção de {dor} escondida no caminho.",
    ctaTemplate: "Salva, aplica e me conta no comentário o que funcionou para você.",
  },
  {
    format: "Reel",
    hookTemplate: "Por que {servico} é o próximo passo natural para quem já está em {nicho}",
    bodyTemplate:
      "Contexto do mercado. O que a maioria erra ao tentar {beneficio} sozinha (e aí entra {dor}). Como {servico} elimina a fricção do processo.",
    ctaTemplate: "Clica no link da bio e veja se faz sentido para o seu momento.",
  },
];

const AUTORIDADE: {
  format: string;
  hookTemplate: string;
  bodyTemplate: string;
  ctaTemplate: string;
}[] = [
  {
    format: "Depoimento",
    hookTemplate: "Resultado real: de cheio de {dor} para {beneficio} com {servico}",
    bodyTemplate:
      "Números de antes e depois. O que foi feito no processo (framework). Frames de prova. Lição: consistência + ferramenta certa.",
    ctaTemplate: "Quero você no próximo resultado: chama na bio e vem conversar.",
  },
  {
    format: "Carrossel",
    hookTemplate: "Por que {servico} entrega {beneficio} onde outros métodos falham em {nicho}",
    bodyTemplate:
      "Vantagens estruturais do {servico}. Comparação honesta com alternativas. Limitações também — transparência gera autoridade.",
    ctaTemplate: "Comenta 'RESULTADO' que eu mostro o case completo por trás de {servico}.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "O que eu aprendi produzindo conteúdo de {nicho} por anos",
    bodyTemplate:
      "Erros que cometi (e a {dor} que isso causou). O que finalmente funcionou: {servico}. Conselho direto para você focar em {beneficio}.",
    ctaTemplate: "Salva esse post — são anos resumidos em 60 segundos.",
  },
  {
    format: "Depoimento",
    hookTemplate: "Depoimento real: 'Eu tentava {beneficio} sozinho(a) e só tinha {dor}'",
    bodyTemplate:
      "História do cliente em 3 atos: antes, durante e depois. Quebra de barreira. Resultado mensurável com {servico}.",
    ctaTemplate: "Se isso é o que você procura, comenta 'EU QUERO' no post.",
  },
  {
    format: "Estudo de caso",
    hookTemplate: "Estudo de caso: como {servico} transformou {nicho} em máquina de {beneficio}",
    bodyTemplate:
      "Problema inicial, solução aplicada, dados de evolução e manutenção. Insights replicáveis para quem está com {dor}.",
    ctaTemplate: "Se você quer um plano parecido, fala comigo pelo link da bio.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "Autoridade em {nicho} não é sorte, é método. E {servico} faz parte dele",
    bodyTemplate:
      "Framework de autoridade: constância + prova + utilidade. Onde {servico} acelera. O que evita {dor} no caminho.",
    ctaTemplate: "Segue a página e assista a sequência 'Construa Autoridade' fixada no perfil.",
  },
];

const VENDA: {
  format: string;
  hookTemplate: string;
  bodyTemplate: string;
  ctaTemplate: string;
}[] = [
  {
    format: "Reel",
    hookTemplate: "Se você está cansado(a) de {dor}, hoje eu vou te mostrar uma saída",
    bodyTemplate:
      "Reconhecimento da dor. Apresentação da solução {servico} + {beneficio}. Quebra de entraves (garantia, prazo, investimento). CTA forte.",
    ctaTemplate: "Acessa o link da bio e entra hoje — condição especial para os primeiros.",
  },
  {
    format: "Carrossel",
    hookTemplate: "As 3 razões para começar com {servico} agora (e não daqui a 30 dias)",
    bodyTemplate:
      "Razão 1: {beneficio} acelera. Razão 2: {dor} continua custando caro. Razão 3: janela de condições. A soma é óbvia.",
    ctaTemplate: "Clica no link da bio para aproveitar as condições de hoje.",
  },
  {
    format: "Reel",
    hookTemplate: "Chega de {dor}. {servico} foi criado para acabar com isso",
    bodyTemplate:
      "Frase de destaque + como funciona em 3 passos. Resultado esperado: {beneficio}. O que você recebe hoje. Chamado para scroll para o link.",
    ctaTemplate: "Clica no link da bio, escolhe o formato e comece agora.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "Antes de comprar qualquer coisa em {nicho}, assista isso",
    bodyTemplate:
      "Critérios de decisão: o que uma solução boa precisa ter. Como {servico} atende cada critério. O que evitar para não ter {dor}. Proposta objetiva.",
    ctaTemplate: "Salva para comparar, e veja o {servico} no link da bio.",
  },
  {
    format: "Reel",
    hookTemplate: "Quanto custa não ter {beneficio}? O seu verdadeiro preço é a {dor} que se repete",
    bodyTemplate:
      "Matemática da dor vs investimento. Corte entre sofrer de novo vs resolver com {servico}. Oferta prática e botão.",
    ctaTemplate: "Decide de verdade: link na bio, sem enrolação.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "Para quem quer {beneficio} e está pronto(a) para parar de {dor} em {nicho}",
    bodyTemplate:
      "Quadro detalhado do que é, para quem é e o que você recebe com {servico}. Perguntas frequentes direto ao ponto. Condições e garantia.",
    ctaTemplate: "Garanta seu acesso agora pelo link da bio — vaga limitada.",
  },
];

const CONEXAO: {
  format: string;
  hookTemplate: string;
  bodyTemplate: string;
  ctaTemplate: string;
}[] = [
  {
    format: "Behind the scenes",
    hookTemplate: "A história de por que eu criei {servico} (parte da razão envolve {dor})",
    bodyTemplate:
      "Antes: minha trajetória em {nicho} e a dor que me incomodava. Virada: a ideia de {servico}. O que {beneficio} representou para mim até hoje.",
    ctaTemplate: "Essa história é sua também? Comenta 'EU' que eu mando a parte 2.",
  },
  {
    format: "Reel",
    hookTemplate: "Bastidores: como eu produzo conteúdo de {nicho} (com {servico})",
    bodyTemplate:
      "Rotina real: gravação, edição, publicação. Ferramentas e truques. Erros que geram {dor} e como contorno. Mostra o processo, não só o resultado.",
    ctaTemplate: "Você quer ver mais bastidores? Deixa um coração que eu posto mais.",
  },
  {
    format: "Pergunta",
    hookTemplate: "Me conta nos comentários: qual é a sua maior dor em {nicho}?",
    bodyTemplate:
      "Abertura empática. Explica que {dor} é comum e que {beneficio} é possível. Convite para responder perguntas selecionadas em vídeo.",
    ctaTemplate: "Comenta sua dor — e segue a página para ver a minha resposta sobre {servico}.",
  },
  {
    format: "Vídeo longo",
    hookTemplate: "O que eu gostaria de ter sabido quando comecei em {nicho}",
    bodyTemplate:
      "Carta honesta: erros, perda de tempo com {dor}, descoberta de {servico} e chegada ao {beneficio}. Dicas diretas e acolhedoras.",
    ctaTemplate: "Salva para quem está começando agora em {nicho}.",
  },
  {
    format: "Reel",
    hookTemplate: "O dia em que quase desisti de {nicho} (e o que me fez continuar)",
    bodyTemplate:
      "Momento de crise e {dor}. A virada emocional e prática. O papel de {servico} em destravar {beneficio}. Lição de resiliência.",
    ctaTemplate: "Se chegou até aqui, deixa um comentário contando sua batalha com {nicho}.",
  },
  {
    format: "Reel",
    hookTemplate: "Você não está sozinho(a): milhares de pessoas enfrentam {dor} em {nicho}",
    bodyTemplate:
      "Normalização da dor + palavras de apoio. Caminho pequeno com {servico} + {beneficio}, passo a passo. Uma porta se abrindo com essa fala.",
    ctaTemplate: "Compartilha com alguém que precisa ouvir isso hoje, e segue aqui.",
  },
];

const POOLS: Record<
  EditorialPillar,
  { format: string; hookTemplate: string; bodyTemplate: string; ctaTemplate: string }[]
> = {
  atracao: ATRACAO,
  educacao: EDUCACAO,
  autoridade: AUTORIDADE,
  venda: VENDA,
  conexao: CONEXAO,
};

/**
 * Sequência de 30 dias distribuída nos 5 pilares (6 de cada), com leve
 * front-load de Atração/Educação e reforço de Venda na reta final.
 */
const PILLAR_SEQUENCE: EditorialPillar[] = [
  "atracao", "atracao", "educacao", "atracao", "educacao",
  "conexao", "atracao", "educacao", "autoridade", "atracao",
  "autoridade", "conexao", "atracao", "venda", "educacao",
  "autoridade", "venda", "conexao", "educacao", "autoridade",
  "venda", "educacao", "conexao", "autoridade", "venda",
  "venda", "conexao", "conexao", "autoridade", "venda",
];

const sequenceCounts: Partial<Record<EditorialPillar, number>> = {};

export const DEFAULT_30_DAYS_TEMPLATES: ContentTemplate[] = PILLAR_SEQUENCE.map(
  (pillar, index) => {
    const used = sequenceCounts[pillar] ?? 0;
    sequenceCounts[pillar] = used + 1;
    const tpl = POOLS[pillar][used];
    return {
      day: index + 1,
      pillar,
      pillarLabel: EDITORIAL_PILLARS[pillar].label,
      format: tpl.format,
      hookTemplate: tpl.hookTemplate,
      bodyTemplate: tpl.bodyTemplate,
      ctaTemplate: tpl.ctaTemplate,
    };
  }
);

interface GenerateOfflineCalendarParams {
  nicho: string;
  servico: string;
  beneficio: string;
  dor?: string;
  /** Data-base da contagem (padrão: hoje). */
  startDate?: Date;
}

/**
 * Gera o calendário editorial de 30 posts 100% offline, calculando as datas
 * a partir de hoje (ou da data informada) e substituindo os placeholders
 * {nicho}, {servico}, {beneficio} e {dor} pelos dados do usuário.
 */
export function generateOfflineCalendar(params: GenerateOfflineCalendarParams): ContentPostItem[] {
  const nicho = params.nicho.trim() || "o seu nicho";
  const servico = params.servico.trim() || "o seu serviço";
  const beneficio = params.beneficio.trim() || "os seus resultados";
  const dor = (params.dor || "").trim() || "perder tempo";

  const today = params.startDate ?? new Date();

  const replaceVars = (text: string): string =>
    text
      .replaceAll("{nicho}", nicho)
      .replaceAll("{servico}", servico)
      .replaceAll("{beneficio}", beneficio)
      .replaceAll("{dor}", dor);

  return DEFAULT_30_DAYS_TEMPLATES.map((tpl, index) => {
    const postDate = new Date(today);
    postDate.setDate(today.getDate() + index);

    const hook = replaceVars(tpl.hookTemplate);
    const scriptOutline = replaceVars(tpl.bodyTemplate);
    const callToAction = replaceVars(tpl.ctaTemplate);

    return {
      id: `post-${index + 1}-${Date.now()}`,
      dayNumber: tpl.day,
      scheduledDate: postDate.toISOString().split("T")[0],
      pillar: tpl.pillar,
      pillarLabel: tpl.pillarLabel,
      format: tpl.format,
      hook,
      scriptOutline,
      caption: `${hook}\n\n${scriptOutline}\n\n${callToAction}`,
      callToAction,
    };
  });
}