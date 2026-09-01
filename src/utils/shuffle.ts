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

/**
 * Distribuição inteligente por distância mínima (anti-repetição sequencial).
 * Seleciona o próximo vídeo da fila como o que MAIS difere do anterior,
 * maximizando a distância visual entre vídeos consecutivos na galeria.
 *
 * Pesos: Hook=3, Pain=3, Solution=3, CTA=2 (gancho tem mais impacto visual).
 */
export function smartDistributeByDistance<T>(
  items: readonly T[],
  getBlockIndices: (item: T) => number[]
): T[] {
  if (items.length <= 2) return [...items];

  const remaining = items.map((item, i) => ({ item, originalIndex: i }));
  const result: T[] = [];

  // Começa pelo primeiro item
  result.push(remaining.shift()!.item);

  while (remaining.length > 0) {
    const lastItem = remaining.length > 0 ? result[result.length - 1] : null;
    const lastIndices = lastItem ? getBlockIndices(lastItem) : [];

    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidateIndices = getBlockIndices(remaining[i].item);

      // Calcula pontuação de diferença (mais blocos diferentes = maior pontuação)
      let diffScore = 0;
      const weights = [3, 3, 3, 2]; // Hook, Pain, Solution, CTA
      for (let s = 0; s < Math.min(candidateIndices.length, weights.length); s++) {
        if (lastIndices.length === 0 || candidateIndices[s] !== lastIndices[s]) {
          diffScore += weights[s] || 1;
        }
      }

      // Tie-breaker aleatório para evitar padrões determinísticos
      const score = diffScore + Math.random() * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    result.push(remaining.splice(bestIdx, 1)[0].item);
  }

  return result;
}