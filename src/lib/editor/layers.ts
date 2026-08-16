import type { Timeline, TimelineItem } from "./types";

/**
 * Index de uma faixa dentro da ordem de camadas (posição em `trackOrder`).
 * Faixas fora da ordem são tratadas como o fundo (índice máximo).
 */
export function getTrackLayerIndex(trackOrder: string[], trackId: string): number {
  const idx = trackOrder.indexOf(trackId);
  return idx < 0 ? trackOrder.length : idx;
}

/** layerIndex de um item = índice da sua faixa na pilha de camadas. */
export function getItemLayerIndex(timeline: Timeline, item: TimelineItem): number {
  return getTrackLayerIndex(timeline.trackOrder, item.trackId);
}

function clampedInsertIndex(max: number, newIndex: number): number {
  if (Number.isNaN(newIndex)) return 0;
  return Math.max(0, Math.min(max, Math.round(newIndex)));
}

/** Move um elemento dentro do array preservando a ordem relativa dos demais. */
function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || from >= arr.length) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(clampedInsertIndex(next.length, to), 0, moved);
  return next;
}

/**
 * Traz a faixa para a FRENTE da cena (maior layerIndex → desenhada por último).
 * Equivale a `layerIndex = (maxLayerIndex + 1)` e normaliza a ordem (0,1,2…).
 */
export function bringTrackToFront(trackOrder: string[], trackId: string): string[] {
  const from = trackOrder.indexOf(trackId);
  if (from < 0 || from === trackOrder.length - 1) return trackOrder;
  return moveInArray(trackOrder, from, trackOrder.length - 1);
}

/**
 * Manda a faixa para o FUNDO da cena (layerIndex = 0), deslocando os demais
 * (as demais camadas ganham +1 de índice, mantendo a ordem relativa entre elas).
 */
export function sendTrackToBack(trackOrder: string[], trackId: string): string[] {
  const from = trackOrder.indexOf(trackId);
  if (from <= 0) return trackOrder;
  return moveInArray(trackOrder, from, 0);
}

/**
 * Reposiciona a faixa em um índice absoluto e normaliza sequencialmente.
 * A ordem relativa das outras faixas é preservada.
 */
export function reorderTrackLayers(trackOrder: string[], trackId: string, newIndex: number): string[] {
  const from = trackOrder.indexOf(trackId);
  if (from < 0) return [...trackOrder];
  return moveInArray(trackOrder, from, newIndex);
}

/**
 * zIndex EFETIVO de um clipe: usa o campo explícito `zIndex` quando presente;
 * caso contrário, a camada natural da sua trilha (posição em `trackOrder`).
 * Projetos antigos (sem zIndex) continuam com a mesma ordem de render; clipes
 * reposicionados manualmente têm o zIndex gravado no próprio item.
 */
export function getClipEffectiveZIndex(trackOrder: string[], item: TimelineItem): number {
  return item.zIndex ?? getTrackLayerIndex(trackOrder, item.trackId);
}

/**
 * Traz o clipe para a FRENTE da cena: zIndex = maior zIndex efetivo + 1.
 * Retorna o MESMO array quando não há mudança.
 */
export function bringClipToFront(items: TimelineItem[], trackOrder: string[], clipId: string): TimelineItem[] {
  const target = items.find((c: TimelineItem) => c.id === clipId);
  if (!target) return items;
  const maxZ = Math.max(...items.map((c: TimelineItem) => getClipEffectiveZIndex(trackOrder, c)), 0);
  if (getClipEffectiveZIndex(trackOrder, target) >= maxZ) return items;
  return items.map((c: TimelineItem) => (c.id === clipId ? { ...c, zIndex: maxZ + 1 } : c));
}

/**
 * Manda o clipe para o FUNDO (zIndex = 0), empurrando para cima os clipes que
 * estavam na frente (ou no mesmo nível) dele, preservando a ordem relativa.
 */
export function sendClipToBack(items: TimelineItem[], trackOrder: string[], clipId: string): TimelineItem[] {
  const target = items.find((c: TimelineItem) => c.id === clipId);
  if (!target) return items;
  const from = getClipEffectiveZIndex(trackOrder, target);
  if (from <= 0) return items;
  return items.map((c: TimelineItem) => {
    if (c.id === clipId) return { ...c, zIndex: 0 };
    const z = getClipEffectiveZIndex(trackOrder, c);
    if (z <= from) return { ...c, zIndex: z + 1 };
    return c;
  });
}

/** Troca o zIndex do clipe com o vizinho imediatamente superior (Avançar camada). */
export function moveClipLayerUp(items: TimelineItem[], trackOrder: string[], clipId: string): TimelineItem[] {
  const target = items.find((c: TimelineItem) => c.id === clipId);
  if (!target) return items;
  const from = getClipEffectiveZIndex(trackOrder, target);
  const above = items
    .filter((c: TimelineItem) => getClipEffectiveZIndex(trackOrder, c) > from)
    .sort((a: TimelineItem, b: TimelineItem) => getClipEffectiveZIndex(trackOrder, a) - getClipEffectiveZIndex(trackOrder, b));
  if (above.length === 0) return items;
  const next = above[0];
  const nextZ = getClipEffectiveZIndex(trackOrder, next);
  return items.map((c: TimelineItem) => {
    if (c.id === clipId) return { ...c, zIndex: nextZ };
    if (c.id === next.id) return { ...c, zIndex: from };
    return c;
  });
}

/** Troca o zIndex do clipe com o vizinho imediatamente inferior (Recuar camada). */
export function moveClipLayerDown(items: TimelineItem[], trackOrder: string[], clipId: string): TimelineItem[] {
  const target = items.find((c: TimelineItem) => c.id === clipId);
  if (!target) return items;
  const from = getClipEffectiveZIndex(trackOrder, target);
  if (from <= 0) return items;
  const below = items
    .filter((c: TimelineItem) => getClipEffectiveZIndex(trackOrder, c) < from)
    .sort((a: TimelineItem, b: TimelineItem) => getClipEffectiveZIndex(trackOrder, b) - getClipEffectiveZIndex(trackOrder, a));
  if (below.length === 0) return items;
  const next = below[0];
  const nextZ = getClipEffectiveZIndex(trackOrder, next);
  return items.map((c: TimelineItem) => {
    if (c.id === clipId) return { ...c, zIndex: nextZ };
    if (c.id === next.id) return { ...c, zIndex: from };
    return c;
  });
}

/**
 * Lista de camadas ativas no tempo atual, ordenada do menor layerIndex (FUNDO)
 * para o maior (FRENTE). Deve ser iterada de forma que o último da lista seja
 * desenhado por último (topo da cena). Empates são desfeitos pela ordem de
 * início do item (estável dentro da mesma faixa).
 *
 * Critério: zIndex efetivo do clipe (explícito ou camada natural da trilha);
 * sem zIndex explícito o resultado é idêntico à ordem por trilha.
 *
 * Filtra por visibilidade da faixa e janela ativa: start <= currentTime < end.
 */
export function buildActiveLayerList(
  timeline: Timeline,
  currentTime: number
): TimelineItem[] {
  return timeline.items
    .filter((item: TimelineItem) => {
      const track = timeline.tracks[item.trackId];
      if (!track || track.hidden) return false;
      return currentTime >= item.startFrame && currentTime < item.startFrame + item.durationInFrames;
    })
    .sort((a: TimelineItem, b: TimelineItem) => {
      const diff = getClipEffectiveZIndex(timeline.trackOrder, a) - getClipEffectiveZIndex(timeline.trackOrder, b);
      return diff !== 0 ? diff : a.startFrame - b.startFrame;
    });
}

/** Retorna apenas as camadas visuais ativas (usado pelo compositor do player). */
export function buildActiveVisualLayerList(
  timeline: Timeline,
  currentTime: number,
  visualKinds: string[]
): TimelineItem[] {
  return buildActiveLayerList(timeline, currentTime).filter((item) => visualKinds.includes(item.kind));
}