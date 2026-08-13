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
 * Lista de camadas ativas no tempo atual, ordenada do menor layerIndex (FUNDO)
 * para o maior (FRENTE). Deve ser iterada de forma que o último da lista seja
 * desenhado por último (topo da cena). Empates são desfeitos pela ordem de
 * início do item (estável dentro da mesma faixa).
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
      const diff = getItemLayerIndex(timeline, a) - getItemLayerIndex(timeline, b);
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