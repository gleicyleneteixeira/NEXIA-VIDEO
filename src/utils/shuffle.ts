/**
 * Fisher–Yates shufle in-place (versão correta — aparece também como
 * "Fisher-Yates Shuffle"). Embaralha uma CÓPIA para não mutar a entrada.
 */

export function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Interleave round-robin por "família" (ex: hook ID do primeiro bloco).
 * Garante que vídeos adjacentes na lista tenham blocos iniciais diferentes,
 * maximizando a diversidade na galeria para postagens no mesmo dia.
 *
 * Ex: [H1D1C1, H2D1C1, H3D1C1, H1D2C1, H2D2C1, H3D2C1, ...]
 */
export function interleaveByFirstBlock<T>(
  items: readonly T[],
  getBlockKey: (item: T) => string
): T[] {
  if (items.length <= 1) return [...items];

  const families = new Map<string, T[]>();
  for (const item of items) {
    const key = getBlockKey(item);
    if (!families.has(key)) families.set(key, []);
    families.get(key)!.push(item);
  }

  // Se tudo na mesma família, fallback para Fisher-Yates
  if (families.size <= 1) return fisherYatesShuffle(items);

  const result: T[] = [];
  const queues = Array.from(families.values());
  let round = 0;
  while (queues.some((q) => q.length > round)) {
    for (const queue of queues) {
      if (queue.length > round) {
        result.push(queue[round]);
      }
    }
    round++;
  }

  return result;
}