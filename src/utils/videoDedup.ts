/**
 * Utilities de deduplicação obrigatória por ID.
 * Nunca concatene arrays cegamente — filtre por ID antes de persistir.
 */

export function sanitizeAndDeduplicateVideos<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function deduplicateById<T>(
  items: T[],
  getId: (item: T) => string | number | null | undefined
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = getId(item);
    if (id === null || id === undefined || id === "") {
      return false;
    }
    const key = String(id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}