/**
 * MediaBlobManager
 * Gerencia o ciclo de vida de URLs criadas com URL.createObjectURL().
 *
 * Problema resolvido: ao persistir apenas a string da blob URL (ex.: no
 * Supabase/localStorage), depois de um reload ou Fast Refresh/HMR o navegador
 * invalida a URL (net::ERR_FILE_NOT_FOUND blob:...). Solução: manter a
 * referência real do File/Blob em memória e reutilizar/renovar a URL a partir
 * dela, nunca revogando de forma precoce nos cleanups de useEffect de cards.
 */

const objectUrlCache = new WeakMap<File | Blob, string>();

/**
 * Devolve uma blob URL estável para o mesmo File/Blob durante toda a sessão.
 * NÃO revogue no cleanup de useEffect: enquanto a referência viver, a URL é
 * reutilizada (estável até F5). Apenas o navegador pode revogá-la ao recarregar.
 */
export function getObjectUrl(file: File | Blob | null | undefined): string {
  if (!file) return "";
  const cached = objectUrlCache.get(file);
  if (cached) return cached;
  const url = URL.createObjectURL(file);
  objectUrlCache.set(file, url);
  return url;
}

/**
 * Gera FORÇADAMENTE uma nova URL para uma referência (usado quando a URL atual
 * morreu — reload/HMR). Atualiza o cache.
 */
export function renewObjectUrl(file: File | Blob): string {
  const url = URL.createObjectURL(file);
  objectUrlCache.set(file, url);
  return url;
}

/**
 * Blobs usam GET e suportam fetch; um fetch retorna 200 apenas se a URL ainda
 * está viva no navegador.
 */
export async function isBlobUrlAlive(url?: string | null): Promise<boolean> {
  if (!url || typeof url !== "string" || !url.startsWith("blob:")) {
    return false;
  }
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Recupera uma URL que NÃO responde mais (assim que o <video> disparar
 * onError), regenerando a partir da referência real de mídia quando existir.
 */
export function recoverFromDeadUrl(
  file: File | Blob | null | undefined,
  currentUrl?: string | null
): string {
  if (file instanceof Blob) {
    return renewObjectUrl(file);
  }
  return currentUrl || "";
}

/**
 * Revogação controlada — use SOMENTE quando a referência de mídia for
 * definitivamente descartada (ex.: remoção real do card). Nunca em cleanup
 * de useEffect de uma lista re-renderizada.
 */
export function revokeUrl(url?: string | null): void {
  if (!url || !url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* noop */
  }
}