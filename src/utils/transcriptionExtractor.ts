/**
 * Extracao deterministica de headline e redtags a partir de transcricao de audio.
 * 100% algoritmo, sem IA.
 */

const STOP_WORDS = new Set([
  "a", "o", "e", "de", "do", "da", "dos", "das", "no", "na", "nos", "nas",
  "um", "uma", "uns", "umas", "por", "para", "com", "sem", "sob", "ate",
  "eu", "tu", "ele", "ela", "nos", "voce", "eles", "elas", "me", "te",
  "lhe", "se", "si", "meu", "minha", "teu", "tua", "seu", "sua",
  "este", "esta", "isto", "esse", "essa", "isso", "aquele", "aquela",
  "aquilo", "que", "qual", "quais", "quem", "onde", "como", "quando",
  "quanto", "quanta", "quantos", "quantas", "porque", "porque", "pois",
  "mas", "porem", "contudo", "todavia", "entretanto", "alem", "tambem",
  "so", "apenas", "ja", "ainda", "sempre", "nunca", "talvez", "bem",
  "mais", "menos", "muito", "pouco", "bastante", "demais", "todo",
  "toda", "todos", "todas", "outro", "outra", "outros", "outras",
  "isso", "este", "estes", "estas", "estes", "esses", "essas",
  "aqueles", "aquelas", "algum", "alguma", "alguns", "algumas",
  "nenhum", "nenhuma", "cada", "mesmo", "proprio", "tao",
  "fazer", "faz", "feito", "fez", "fazendo", "vai", "vou", "vamos",
  "ter", "tem", "tinha", "tive", "tenho", "tiver", "tinha",
  "ser", "e", "era", "foi", "sido", "sendo", "seja", "fosse",
  "estar", "esta", "esteve", "estava", "esteja", "estivesse",
  "poder", "pode", "pode", "poderia", "pudesse", "conseguir",
  "ir", "vai", "vou", "irei", "iria", "ido", "indo",
  "dar", "de", "dou", "deu", "dando", "daria",
  "saber", "se", "sei", "soube", "sabendo",
  "como", "assim", "entao", "por", "isso", "porque",
  "ne", "ta", "ai", "eh", "e", "o", "a",
  "video", "videos", "conteudo", "assunto", "tema",
]);

/**
 * Normaliza texto: remove acentos, pontuacao多余, lowercase
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrai a headline (primeira frase significativa ou resumo de ate 80 chars)
 */
export function extractHeadline(transcription: string): string {
  if (!transcription || !transcription.trim()) return "";

  const clean = transcription.trim();

  // Tenta pegar a primeira frase ( termina com . ! ? )
  const sentenceMatch = clean.match(/^(.{10,120}?)[.!?]\s/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[1].trim();
    if (sentence.length >= 10) {
      return capitalizeFirst(sentence);
    }
  }

  // Se a primeira frase e curta, junta com a segunda
  const sentences = clean.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 5);
  if (sentences.length >= 2) {
    const combined = `${sentences[0]} ${sentences[1]}`;
    if (combined.length <= 120) return capitalizeFirst(combined);
    return capitalizeFirst(sentences[0]);
  }

  // Fallback: primeiras 80 chars
  if (clean.length > 80) {
    const cut = clean.substring(0, 80);
    const lastSpace = cut.lastIndexOf(" ");
    return capitalizeFirst(lastSpace > 40 ? cut.substring(0, lastSpace) : cut);
  }

  return capitalizeFirst(clean);
}

/**
 * Extrai redtags (hashtags) do texto da transcricao
 * Usa frequencia de palavras significativas + normalizacao
 */
export function extractRedTags(transcription: string, maxTags = 15): string[] {
  if (!transcription || !transcription.trim()) return [];

  const normalized = normalize(transcription);
  const words = normalized.split(" ").filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // Conta frequencia
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Ordena por frequencia (decrescente)
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTags * 2);

  // Pega as top palavras e cria hashtags
  const tags: string[] = [];
  for (const [word] of sorted) {
    if (tags.length >= maxTags) break;
    // Remove duplicatas parciais (ex: "marketing" e "digital" vs "marketingdigital")
    const isDuplicate = tags.some((t) => {
      const tClean = t.replace("#", "");
      return tClean.includes(word) || word.includes(tClean);
    });
    if (!isDuplicate) {
      tags.push(`#${word}`);
    }
  }

  // Se tem menos de 5 tags, completa com bigramas
  if (tags.length < 5 && words.length >= 2) {
    const bigramFreq = new Map<string, number>();
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}${words[i + 1]}`;
      if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
        bigramFreq.set(bigram, (bigramFreq.get(bigram) || 0) + 1);
      }
    }
    const sortedBigrams = [...bigramFreq.entries()].sort((a, b) => b[1] - a[1]);
    for (const [bigram] of sortedBigrams) {
      if (tags.length >= maxTags) break;
      if (!tags.some((t) => t.includes(bigram))) {
        tags.push(`#${bigram}`);
      }
    }
  }

  return tags;
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
