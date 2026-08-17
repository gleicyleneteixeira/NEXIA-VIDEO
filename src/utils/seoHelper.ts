/**
 * Geração determinística de hashtags e legendas com estrutura de SEO
 * para redes sociais, baseada no nicho do usuário. 100% offline.
 */

const NICHE_HASHTAGS: Record<string, string[]> = {
  bancario: [
    "#fgts", "#saqueaniversario", "#antecipacaofgts", "#financas", "#dinheirorapido",
    "#credito", "#planejamentofinanceiro", "#consultoriabancaria", "#rendaextra", "#emprestimo",
    "#saquefgts", "#educacaofinanceira", "#organizacaofinanceira", "#meta",
    "#prosperidade", "#dinheirointeligente", "#prazos", "#fgtsdigital",
  ],
  imobiliaria: [
    "#mercadoimobiliario", "#corretordeimoveis", "#imoveis", "#casapropria", "#apartamento",
    "#investimentoimobiliario", "#morarbem", "#arquitetura", "#lar",
    "#financiamentocasa", "#sonhodacasa", "#primeiroimovel", "#lancamento", "#imobiliaria",
    "#dezemsa", "#viveremcasa", "#valorizacao", "#negocioimobiliario",
  ],
  advocacia: [
    "#direito", "#advocacia", "#direitodoconsumidor", "#direitotrabalhista", "#justica",
    "#advogado", "#consultoriajuridica", "#direitocivil", "#leis",
    "#direitos", "#advogadofamilia", "#direitoprevidenciario", "#juridico", "#contratos",
    "#protecaolegal", "#direitobancario", "#orientacaojuridica", "#escritoriodeadvocacia",
  ],
  saude: [
    "#saude", "#bemestar", "#qualidadedevida", "#vidasaudavel", "#nutricao",
    "#medicina", "#cuidados", "#estilodevida", "#prevencao",
    "#saudemental", "#checkup", "#autocuidado", "#bemestaremocional", "#atividadefisica",
    "#alimentacaosaudavel", "#dr", "#clinica", "#cuidandodesaude",
  ],
  marketing: [
    "#marketingdigital", "#socialmedia", "#criacaodeconteudo", "#trafegopago", "#empreendedorismo",
    "#vendas", "#branding", "#negociosonline",
    "#marketing", "#conteudo", "#estrategiadigital", "#seo", "#copywriting", "#instagram",
    "#redessociais", "#algoritmo", "#crescimento", "#digital",
  ],
  beleza: [
    "#beleza", "#estetica", "#skincare", "#cabelos", "#maquiagem",
    "#tendencias", "#autocuidado", "#autoestima", "#bemestar",
    "#tratamentodebeleza", "#clinicaestetica", "#pele", "#perfil", "#transformacao",
    "#rejuvenescimento", "#visagismo", "#spa", "#dicasdebeleza",
  ],
  moda: [
    "#moda", "#estilo", "#lookdodia", "#tendencias", "#roupas",
    "#fashion", "#outfit", "#estilo", "#personalstyle", "#armario",
    "#modafeminina", "#modamasculina", "#alfaiataria", "#inverno", "#verao",
    "#sesuar", "#compras", "#dicasdemoda",
  ],
  fitness: [
    "#fitness", "#treino", "#academia", "#hipertrofia", "#emagrecimento",
    "#saude", "#qualidadedevida", "#disciplina", "#motivacao", "#pesos",
    "#treinopersonalizado", "#nutricaovesportiva", "#desempenho", "#energia", "#bioimpedancia",
    "#resultados", "#constancia", "#estilodevida",
  ],
};

const FALLBACK_HASHTAGS = [
  "#negocios", "#sucesso", "#empreendedorismo", "#dicas", "#inovacao",
  "#estrategia", "#crescimento", "#conteudo", "#redessociais", "#inspiracao",
  "#vendas", "#marketingdigital", "#proposito", "#constancia", "#resultados",
  "#aprenda", "#comofazer", "#diaadia",
];

const normalizeNiche = (niche: string): string => niche.toLowerCase().trim();

/**
 * Retorna o bloco de 15 a 20 hashtags determinístico para o nicho.
 * Faz match por palavra-chave; sem match usa o fallback genérico de negócios.
 */
export function getSeoHashtags(niche: string): string {
  const clean = normalizeNiche(niche);
  const matchedKey = Object.keys(NICHE_HASHTAGS).find((key) => clean.includes(key));
  const tags = matchedKey ? NICHE_HASHTAGS[matchedKey] : FALLBACK_HASHTAGS;
  return tags.join(" ");
}

/**
 * Lista de hashtags (sem o #) para usar como palavras-chave de SEO.
 */
export function getSeoKeywords(niche: string): string[] {
  const clean = normalizeNiche(niche);
  const matchedKey = Object.keys(NICHE_HASHTAGS).find((key) => clean.includes(key));
  const tags = matchedKey ? NICHE_HASHTAGS[matchedKey] : FALLBACK_HASHTAGS;
  return [...new Set(tags.slice(0, 10).map((t) => t.replace("#", "")))];
}

/**
 * Monta a legenda completa com estrutura de SEO para redes sociais:
 * gancho + corpo (educativo/venda) + CTA + bloco de hashtags.
 */
export function buildSeoCaption(input: {
  hook: string;
  body: string;
  callToAction: string;
  hashtags: string;
}): string {
  const cta = input.callToAction.trim();
  return [
    input.hook.trim(),
    input.body.trim(),
    cta ? `👉 ${cta}` : "",
    ".\n.\n.",
    input.hashtags.trim(),
  ]
    .filter((p) => p.length > 0)
    .join("\n\n");
}