import type { TimelineItem } from "./types";
import { useMediaStore } from "./media-store";

// Devolve o File original de um clipe. Importante: após re-hidratação do
// projeto (localStorage), `item.file` pode virar um objeto JSON simples — só
// retorna instâncias reais de Blob/File, senão o createObjectURL explode.
export function resolveMediaFile(item: TimelineItem): File | null {
  if (item.file instanceof Blob) return item.file;
  if (item.mediaId) {
    const f = useMediaStore.getState().files.find((x) => x.id === item.mediaId)?.file;
    return f instanceof Blob ? f : null;
  }
  return null;
}

// Blobs usam GET — o navegador não suporta o método HEAD no protocolo
// blob: (resulta em net::ERR_METHOD_NOT_SUPPORTED). Retorna true apenas
// quando a URL blob ainda responde na memória do navegador.
export async function isBlobUrlAlive(blobUrl: string): Promise<boolean> {
  if (!blobUrl || typeof blobUrl !== "string" || !blobUrl.startsWith("blob:")) {
    return false;
  }
  try {
    const response = await fetch(blobUrl, { method: "GET" });
    return response.ok;
  } catch {
    return false; // URL do blob expirou ou não existe mais
  }
}

export interface MediaSource {
  blobUrl?: string;
  src?: string;
  file?: File | Blob | unknown;
}

// Cache de object URLs indexado pela referência do arquivo. Enquanto a
// instância do File viver, a MESMA blob URL é reutilizada (nada de criar
// URLs novas a cada re-render/Fast Refresh — o navegador não revoga e a
// referência fica estável durante a sessão).
const mediaBlobCache = new WeakMap<File | Blob, string>();

export function getOrCreateBlobUrl(file: File | Blob | null | undefined): string {
  if (!file) return "";
  const cached = mediaBlobCache.get(file);
  if (cached) return cached;
  const url = URL.createObjectURL(file);
  mediaBlobCache.set(file, url);
  return url;
}

// Devolve uma URL de mídia que responde, sem nunca estourar exceções:
// 1. URL não-blob (S3/data:) é permanente → passa direto, sem probe.
// 2. Blob viva → mantém a atual.
// 3. Blob morta + File real (instanceof Blob) → regenera via createObjectURL.
// 4. Caso contrário → fallback limpo (blobUrl || src || "").
export async function getValidMediaUrl(media: MediaSource): Promise<string> {
  if (!media) return "";

  if (media.blobUrl && !media.blobUrl.startsWith("blob:")) return media.blobUrl;
  if (media.src && /^https?:\/\//.test(media.src)) return media.src;

  if (media.blobUrl && (await isBlobUrlAlive(media.blobUrl))) {
    return media.blobUrl;
  }

  if (media.file instanceof Blob) {
    try {
      return getOrCreateBlobUrl(media.file);
    } catch (err) {
      console.error("Falha ao criar Blob URL a partir do File:", err);
    }
  }

  return media.blobUrl || media.src || "";
}