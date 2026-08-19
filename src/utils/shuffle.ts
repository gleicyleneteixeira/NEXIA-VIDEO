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