// Mapeamento visual para buscas em bancos de imagem
const VISUAL_KEYWORDS_MAP: Record<string, string> = {
  psicotecnico: "psychology test",
  raciocinio: "logic puzzle thinking",
  detran: "driving test car",
  credito: "money finance",
  simulado: "exam paper writing",
  estudo: "student studying",
  aprovacao: "success candidate",
};

export function getStockSearchKeywords(
  bRollSuggestion?: string,
  theme?: string
): string {
  const combinedText = `${bRollSuggestion || ""} ${theme || ""}`.toLowerCase();

  // 1. Tenta encontrar uma palavra-chave mapeada
  for (const [key, searchTerms] of Object.entries(VISUAL_KEYWORDS_MAP)) {
    if (combinedText.includes(key)) {
      return searchTerms;
    }
  }

  // 2. Fallback: Se for uma sugestão de B-roll (ex: "Pessoa pensativa"), limpa o texto e pega até 2 palavras
  if (bRollSuggestion) {
    const cleanWords = bRollSuggestion
      .replace(/[^\w\s]/gi, "")
      .split(" ")
      .filter((w) => w.length > 3);

    if (cleanWords.length > 0) {
      return cleanWords.slice(0, 2).join(" ");
    }
  }

  // 3. Termo genérico visual
  return "business office";
}

export function buildStockMediaUrls(keywords: string) {
  const query = encodeURIComponent(keywords);
  return {
    pexels: `https://www.pexels.com/search/videos/${query}/`,
    pixabay: `https://pixabay.com/videos/search/${query}/`,
    mixkit: `https://mixkit.co/free-stock-video/${query}/`,
  };
}
