import type { Timeline, TimelineItem } from "./types";

/**
 * Ripple Delete / Ripple Snap — utilidades puras que removem trechos e
 * reposicionam os clipes seguintes da mesma faixa para fechar a lacuna,
 * no padrão de editores estilo CapCut.
 *
 * O modelo de timeline usa `startFrame`/`durationInFrames` (frames); os
 * campos de compatibilidade `startTime`/`duration` (ms) são recalculados
 * pelo caller via `syncCompatibilityFields`.
 */

/**
 * Remove um clipe e desloca para a esquerda todos os clipes da MESMA faixa
 * que começam em ou após o início do clipe removido.
 *
 *   gapStart    = clipToDelete.startFrame
 *   gapDuration = clipToDelete.durationInFrames
 *   clip.startFrame = clip.startFrame - gapDuration   (para clip.startFrame >= gapStart)
 */
export function rippleDeleteClip(items: TimelineItem[], clipIdToDelete: string): TimelineItem[] {
  const target = items.find((i) => i.id === clipIdToDelete);
  if (!target) return items;

  const gapStart = target.startFrame;
  const gapDuration = target.durationInFrames;

  return items
    .filter((i) => i.id !== clipIdToDelete)
    .map((i) => {
      if (i.trackId === target.trackId && i.startFrame >= gapStart) {
        return { ...i, startFrame: Math.max(0, i.startFrame - gapDuration) };
      }
      return i;
    });
}

/**
 * Ripple delete em lote: remove vários clipes e soma as durações removidas
 * por faixa, deslocando os clipes restantes que começam em ou após cada
 * trecho removido.
 */
export function rippleDeleteClips(items: TimelineItem[], ids: string[]): TimelineItem[] {
  if (ids.length === 0) return items;
  const removedSet = new Set(ids);
  const removed = items.filter((i) => removedSet.has(i.id));
  if (removed.length === 0) return items;

  const byTrack = new Map<string, TimelineItem[]>();
  for (const r of removed) {
    const group = byTrack.get(r.trackId) || [];
    group.push(r);
    byTrack.set(r.trackId, group);
  }

  return items
    .filter((i) => !removedSet.has(i.id))
    .map((i) => {
      const group = byTrack.get(i.trackId);
      if (!group) return i;
      let shift = 0;
      for (const r of group) {
        if (r.startFrame <= i.startFrame) shift += r.durationInFrames;
      }
      return shift > 0 ? { ...i, startFrame: Math.max(0, i.startFrame - shift) } : i;
    });
}

/**
 * "Cortar e deletar trecho" — remove a porção à ESQUERDA do clipe
 * (de `startFrame` até `atFrame`) e puxa os clipes seguintes da mesma faixa
 * para fechar a lacuna, mantendo o restante do clipe selecionado.
 */
export function rippleTrimStart(items: TimelineItem[], id: string, atFrame: number): TimelineItem[] {
  const target = items.find((i) => i.id === id);
  if (!target) return items;
  const clipEnd = target.startFrame + target.durationInFrames;
  if (atFrame <= target.startFrame || atFrame >= clipEnd) return items;

  const gapDuration = atFrame - target.startFrame;

  return items.map((i) => {
    if (i.id === id) {
      return {
        ...i,
        startFrame: atFrame,
        durationInFrames: target.durationInFrames - gapDuration,
        srcInFrame: (target.srcInFrame || 0) + gapDuration,
      };
    }
    if (i.trackId === target.trackId && i.startFrame >= clipEnd) {
      return { ...i, startFrame: Math.max(0, i.startFrame - gapDuration) };
    }
    return i;
  });
}

/**
 * "Cortar e deletar trecho" — remove a porção à DIREITA do clipe
 * (de `atFrame` até o fim) e puxa os clipes seguintes da mesma faixa
 * para fechar a lacuna, mantendo o início do clipe selecionado.
 */
export function rippleTrimEnd(items: TimelineItem[], id: string, atFrame: number): TimelineItem[] {
  const target = items.find((i) => i.id === id);
  if (!target) return items;
  const clipEnd = target.startFrame + target.durationInFrames;
  if (atFrame <= target.startFrame || atFrame >= clipEnd) return items;

  const gapDuration = clipEnd - atFrame;

  return items.map((i) => {
    if (i.id === id) {
      return { ...i, durationInFrames: atFrame - target.startFrame };
    }
    if (i.trackId === target.trackId && i.startFrame >= clipEnd) {
      return { ...i, startFrame: Math.max(0, i.startFrame - gapDuration) };
    }
    return i;
  });
}

/**
 * Identifica a trilha principal (Main Track): a primeira faixa de VÍDEO na
 * ordem de camadas, ou a primeira faixa disponível como fallback.
 */
export function getMainTrackId(timeline: Timeline): string | null {
  const videoTrack = timeline.trackOrder.find((tid) => timeline.tracks[tid]?.kind === "video");
  return videoTrack ?? timeline.trackOrder[0] ?? null;
}

/**
 * Trilha Magnética — compacta a trilha principal sequencialmente (zero gaps):
 * ordena os clipes da faixa principal por início e encadeia `startFrame` um
 * após o outro. Retorna o MESMO array (referência) quando nada muda, para que
 * callers possam comparar por referência e evitar updates desnecessários.
 */
export function packMainTrackClips(items: TimelineItem[], mainTrackId: string | null): TimelineItem[] {
  if (!mainTrackId) return items;
  const mainClips = items
    .filter((i) => i.trackId === mainTrackId)
    .sort((a, b) => a.startFrame - b.startFrame);
  if (mainClips.length === 0) return items;

  let cursor = 0;
  let changed = false;
  const targetStart = new Map<string, number>();
  for (const c of mainClips) {
    if (c.startFrame !== cursor) changed = true;
    targetStart.set(c.id, cursor);
    cursor += c.durationInFrames;
  }
  if (!changed) return items;

  return items.map((i) => {
    const t = targetStart.get(i.id);
    return t === undefined || t === i.startFrame ? i : { ...i, startFrame: t };
  });
}

/**
 * Fração da largura do clipe vizinho que o clipe arrastado precisa invadir para
 * disparar a troca de ordem (Low Threshold Swap). 20–25% = troca imediata,
 * estilo CapCut, sem esperar o ponto médio (50%).
 */
export const SWAP_TRIGGER_FRACTION = 0.25;

/**
 * Fast Swap / Reorder (Low Threshold) — reordena a trilha do clipe arrastado
 * assim que a borda dianteira do clipe ativo invade ~25% da largura do vizinho,
 * na direção do movimento (movimento para a direita → invade o vizinho da
 * direita pela esquerda; para a esquerda → invade o vizinho da esquerda pela
 * direita). Não espera o ponto médio.
 *
 * O clipe ativo recebe um `startFrame` "virtual" (pode ser fracionário ou
 * negativo) que o posiciona corretamente no SORT por startFrame feito pelo
 * `packMainTrackClips` do store — o pack então reencadeia a trilha (cursor = 0,
 * startFrame sequencial) e a ordem final fica definida pelo threshold.
 * Retorna o MESMO array (referência) quando nada muda.
 */
export function calculateReorderedTrack(
  items: TimelineItem[],
  activeClipId: string,
  currentDragDeltaFrame: number
): TimelineItem[] {
  const active = items.find((i) => i.id === activeClipId);
  if (!active) return items;

  const activeVirtualStart = active.startFrame + currentDragDeltaFrame;
  const activeEnd = activeVirtualStart + active.durationInFrames;
  // Direção do arraste a partir do delta acumulado desde o pointerdown.
  const movingRight = currentDragDeltaFrame > 0;

  const sameTrack = items.filter((i) => i.trackId === active.trackId);
  if (sameTrack.length <= 1) return items;

  const others = sameTrack
    .filter((i) => i.id !== activeClipId)
    .sort((a, b) => a.startFrame - b.startFrame);

  // crossed(o) = o clipe vizinho `o` deve vir ANTES do clipe ativo na nova ordem.
  const crossed = (o: TimelineItem): boolean => {
    const oEnd = o.startFrame + o.durationInFrames;
    if (activeEnd <= o.startFrame) return false; // ativo totalmente à esquerda
    if (activeVirtualStart >= oEnd) return true; // ativo totalmente à direita
    const threshold = o.durationInFrames * SWAP_TRIGGER_FRACTION;
    if (movingRight) {
      // Borda dianteira = fim do ativo invadindo o vizinho pela esquerda.
      return activeEnd - o.startFrame > threshold;
    }
    // Borda dianteira = início do ativo invadindo o vizinho pela direita.
    return oEnd - activeVirtualStart <= threshold;
  };

  const beforeActive = others.filter(crossed);
  const afterActive = others.filter((o) => !crossed(o));

  // startFrame "virtual" (chave de ordenação) que coloca o ativo entre o último
  // vizinho que vem antes e o primeiro que vem depois (evita empate no sort).
  const prev = beforeActive[beforeActive.length - 1];
  const next = afterActive[0];
  let key: number;
  if (!prev) {
    key = Math.min(activeVirtualStart, (next ? next.startFrame : 0) - 1);
  } else if (!next) {
    key = Math.max(activeVirtualStart, prev.startFrame + 1);
  } else {
    key = (prev.startFrame + next.startFrame) / 2;
  }

  if (key === active.startFrame) return items;
  return items.map((i) => (i.id === activeClipId ? { ...i, startFrame: key } : i));
}
