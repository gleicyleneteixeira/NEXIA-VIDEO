/**
 * Busca de fotos para o fundo das artes, com duas fontes:
 *  - Pexels (https://www.pexels.com/api/) — usada quando a chave
 *    `NEXT_PUBLIC_PEXELS_API_KEY` está configurada no ambiente;
 *  - Openverse (https://api.openverse.org) — API aberta e sem chave,
 *    usada como fallback automático.
 * Ambas permitem CORS, então o fetch → dataURL funciona sem "taint"
 * no Canvas que renderiza as artes.
 */

export interface PhotoResult {
  id: string;
  title: string;
  creator: string;
  license: string;
  attribution: string;
  url: string;
  thumbUrl: string;
  width?: number;
  height?: number;
}

const OPENVERSE_IMAGES_URL = "https://api.openverse.org/v1/images/";
const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Falha ao converter a imagem"));
    reader.readAsDataURL(blob);
  });

const pexels = async (query: string, pageSize: number, apiKey: string): Promise<PhotoResult[]> => {
  const params = new URLSearchParams({
    query,
    per_page: String(Math.min(20, Math.max(1, pageSize))),
    orientation: "portrait",
  });
  const res = await fetch(`${PEXELS_SEARCH_URL}?${params.toString()}`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    throw new Error(`Erro na busca de fotos Pexels (${res.status})`);
  }
  const json = (await res.json()) as { photos?: unknown[] };
  const results = Array.isArray(json.photos) ? json.photos : [];
  return results.map((item) => {
    const p = item as {
      id?: number;
      alt?: string;
      photographer?: string;
      photographer_url?: string;
      url?: string;
      width?: number;
      height?: number;
      src?: { large?: string; medium?: string; original?: string };
    };
    return {
      id: p.id ? `pexels-${p.id}` : `pexels-${Math.random().toString(36).slice(2)}`,
      title: p.alt || "",
      creator: p.photographer || "",
      license: "Pexels",
      attribution: p.photographer_url || p.url || "",
      url: p.url || "",
      thumbUrl: p.src?.large || p.src?.medium || p.src?.original || "",
      width: p.width,
      height: p.height,
    };
  });
};

const openverse = async (query: string, pageSize: number): Promise<PhotoResult[]> => {
  const params = new URLSearchParams({
    q: query,
    license_type: "commercial",
    page_size: String(Math.min(20, Math.max(1, pageSize))),
  });
  const res = await fetch(`${OPENVERSE_IMAGES_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Erro na busca de fotos (${res.status})`);
  }
  const json = (await res.json()) as { results?: unknown[] };
  const results = Array.isArray(json.results) ? json.results : [];
  return results
    .map((item): PhotoResult | null => {
      const r = item as {
        id?: string;
        title?: string;
        creator?: string;
        license?: string;
        attribution?: string;
        url?: string;
        thumbnail?: string;
        width?: number;
        height?: number;
      };
      if (!r.id || !r.thumbnail) return null;
      return {
        id: r.id,
        title: r.title || "",
        creator: r.creator || "",
        license: r.license || "",
        attribution: r.attribution || "",
        url: r.url || "",
        thumbUrl: r.thumbnail,
        width: r.width,
        height: r.height,
      };
    })
    .filter((p): p is PhotoResult => p !== null);
};

/**
 * Busca fotos de alta resolução por termo. Usa Pexels quando a chave
 * `NEXT_PUBLIC_PEXELS_API_KEY` estiver configurada; caso contrário (ou em
 * erro da Pexels) cai automaticamente para a Openverse, que não exige chave.
 */
export async function searchPhotos(query: string, pageSize = 8): Promise<PhotoResult[]> {
  const q = query.trim();
  if (!q) return [];
  const pexelsKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      return await pexels(q, pageSize, pexelsKey);
    } catch {
      /* fallback para a Openverse abaixo */
    }
  }
  return openverse(q, pageSize);
}

/**
 * Baixa a imagem (thumbnail proxied) e devolve como dataURL. A Openverse
 * proxy com CORS, então o fetch funciona e o dataURL é seguro para o Canvas.
 */
export async function fetchImageAsDataUrl(thumbUrl: string): Promise<string> {
  const res = await fetch(thumbUrl, { mode: "cors" });
  if (!res.ok) throw new Error(`Erro ao baixar a foto (${res.status})`);
  const blob = await res.blob();
  return blobToDataUrl(blob);
}