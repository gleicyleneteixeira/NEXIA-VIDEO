"use client";

/**
 * Cache em memória de máscaras do Recorte Automático (MediaPipe).
 * Cada clipe guarda um mapa de frameIndex (timeline, em quadros) -> ImageBitmap.
 * Após a primeira segmentação completa, o playback/seek NÃO volta a acionar o
 * modelo: as máscaras são lidas instantaneamente deste cache (padrão CapCut).
 */
export class CutoutMaskCache {
  private static cache = new Map<string, Map<number, ImageBitmap>>();
  /** Clipes cuja segmentação já percorreu o vídeo inteiro (flag de "pronto"). */
  private static completed = new Set<string>();

  public static async saveFrameMask(
    clipId: string,
    frameIndex: number,
    maskCanvas: HTMLCanvasElement
  ): Promise<void> {
    let clipMasks = this.cache.get(clipId);
    if (!clipMasks) {
      clipMasks = new Map();
      this.cache.set(clipId, clipMasks);
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(maskCanvas);
    } catch {
      return; // browser antigo sem createImageBitmap etc.
    }
    const existing = clipMasks.get(frameIndex);
    if (existing) {
      try { existing.close(); } catch { /* noop */ }
    }
    clipMasks.set(frameIndex, bitmap);
  }

  public static getFrameMask(clipId: string, frameIndex: number): ImageBitmap | null {
    const clipMasks = this.cache.get(clipId);
    if (!clipMasks) return null;
    return clipMasks.get(frameIndex) ?? null;
  }

  /** Retorna a máscara do frame mais próximo (o modelo amostra ~10 FPS). */
  public static getNearestFrameMask(clipId: string, frameIndex: number): ImageBitmap | null {
    const clipMasks = this.cache.get(clipId);
    if (!clipMasks || clipMasks.size === 0) return null;
    const exact = clipMasks.get(frameIndex);
    if (exact) return exact;
    let best: ImageBitmap | null = null;
    let bestDist = Infinity;
    for (const [k, v] of clipMasks) {
      const d = Math.abs(k - frameIndex);
      if (d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return best;
  }

  public static countFrames(clipId: string): number {
    return this.cache.get(clipId)?.size ?? 0;
  }

  public static isClipFullyCached(clipId: string, totalFrames: number): boolean {
    const clipMasks = this.cache.get(clipId);
    if (!clipMasks) return false;
    return clipMasks.size >= totalFrames;
  }

  /** Marca o clipe como totalmente processado (percorreu todo o vídeo). */
  public static markClipComplete(clipId: string): void {
    this.completed.add(clipId);
  }

  public static isClipComplete(clipId: string): boolean {
    return this.completed.has(clipId);
  }

  public static clearClipCache(clipId: string): void {
    const clipMasks = this.cache.get(clipId);
    if (clipMasks) {
      for (const bitmap of clipMasks.values()) {
        try { bitmap.close(); } catch { /* noop */ }
      }
      this.cache.delete(clipId);
    }
    this.completed.delete(clipId);
  }
}

/** Converte um ImageBitmap de máscara em dataURL PNG (para CSS mask-image). */
export function renderMaskDataURL(bitmap: ImageBitmap): string {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL("image/png");
}