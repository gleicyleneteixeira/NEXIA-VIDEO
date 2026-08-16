"use client";

import { useEffect, useRef, useState } from "react";
import type { AutoCutoutConfig } from "./types";
import { CutoutMaskCache, renderMaskDataURL } from "./cutoutMaskCache";

type AutoCutoutResult = {
  maskSrc: string | null;
  busy: boolean;
  error: string | null;
};

type AutoCutoutProgress = {
  isProcessing: boolean;
  progress: number; // 0 a 100
};

type SegmentationInstance = {
  initialize: () => Promise<void>;
  setOptions: (opts: { modelSelection?: number; segmentationMode?: number }) => void;
  onResults: (cb: (result: { segmentationMask: HTMLCanvasElement }) => void) => void;
  send: (input: { image: HTMLVideoElement | HTMLImageElement }) => Promise<void>;
  close: () => void;
};

// A máscara é amostrada ~320px de largura; a pena é aplicada nesse espaço.
// Para que 1 unidade de "feather" corresponda ~ao tamanho no preview, escala
// a pena pelo fator de amostragem (out.width / 320).
const MASK_SAMPLE_WIDTH = 320;

/**
 * Recorte automático de pessoa (MediaPipe SelfieSegmentation) 100% client-side.
 * Processa ~10 quadros/s do elemento de mídia e devolve uma máscara (dataURL)
 * para uso como `mask-image`. Suporta:
 *  - modelSelection: 0 = Rápido (~60 FPS), 1 = Detalhado;
 *  - feather: suavização de borda (px, 0–20) aplicada na própria máscara;
 *  - inverted: inverte a máscara (mostra o fundo, esconde a pessoa).
 * Requer os assets em `public/mediapipe/`.
 */
export function useAutoCutout(
  mediaRef: React.RefObject<HTMLVideoElement | HTMLImageElement | null> | null,
  config: AutoCutoutConfig | null,
  clipId?: string,
  frameCount?: number,
  fps?: number,
  onProgress?: (s: AutoCutoutProgress) => void
): AutoCutoutResult {
  const [maskSrc, setMaskSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  // currentTime da mídia no último tick — detecta a agulha voltando ao início.
  const prevTimeRef = useRef<number | null>(null);

  const enabled = !!config?.enabled;
  const modelSelection = config?.modelSelection ?? 0;
  const totalFrames = Math.max(1, Math.floor(frameCount ?? 1));

  // Callback vivo em ref: identidade muda a cada render, mas não pode
  // reiniciar o efeito (que depende de enabled/modelSelection/mediaRef).
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // feather/inverted são lidos a cada resultado SEM recriar o segmenter
  // (a pena/inversão são pós-processamento da máscara, baratas).
  const featherRef = useRef(0);
  const invertedRef = useRef(false);
  useEffect(() => {
    featherRef.current = config?.feather ?? 0;
    invertedRef.current = !!config?.inverted;
  }, [config?.feather, config?.inverted]);

  useEffect(() => {
    if (!enabled) {
      // Reset limitado a microtask p/ não chamar setState síncrono no efeito.
      Promise.resolve().then(() => {
        setMaskSrc(null);
        setError(null);
        setBusy(false);
        onProgressRef.current?.({ isProcessing: false, progress: 0 });
      });
      lastUrlRef.current = null;
      prevTimeRef.current = null;
      return;
    }

    let cancelled = false;
    let seg: SegmentationInstance | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rafId: number | null = null;
    const resultsRef: SegmentationInstance[] = [];
    // Frames realmente segmentados (distintos) desde a ativação.
    const seenFrames = new Set<number>();
    // One-shot estilo CapCut: ao concluir (100% ou a agulha voltar ao início do
    // clipe), congela a última máscara e PARA o loop — não re-segmenta mais
    // enquanto a função não for desabilitada novamente.
    let finished = false;
    prevTimeRef.current = null;

    // Leitor por-frame do cache: substituto do MediaPipe depois de concluído.
    // Roda a 60 FPS, mas só (re)codifica a máscara quando o quadro muda.
    let lastReadKey = -1;
    const startReadLoop = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const loop = () => {
        if (cancelled) return;
        if (clipId) {
          const el = mediaRef?.current ?? null;
          const mediaTime = el && "currentTime" in el ? ((el as HTMLVideoElement).currentTime ?? 0) : 0;
          const key = Math.max(0, Math.floor(mediaTime * (fps ?? 30)));
          if (key !== lastReadKey) {
            lastReadKey = key;
            const bitmap = CutoutMaskCache.getNearestFrameMask(clipId, key);
            if (bitmap) {
              const url = renderMaskDataURL(bitmap);
              lastUrlRef.current = url;
              setMaskSrc(url);
            }
          }
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      if (clipId) CutoutMaskCache.markClipComplete(clipId);
      onProgressRef.current?.({ isProcessing: false, progress: 100 });
      setBusy(false);
      // Transição suave: playback/seek passa a ler o cache (60 FPS, sem IA).
      startReadLoop();
    };

    // ── Já processado antes? NADA de MediaPipe: lê direto do cache. ──
    if (
      clipId &&
      (CutoutMaskCache.isClipComplete(clipId) || CutoutMaskCache.isClipFullyCached(clipId, totalFrames))
    ) {
      onProgressRef.current?.({ isProcessing: false, progress: 100 });
      startReadLoop();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        onProgressRef.current?.({ isProcessing: true, progress: 0 });
        const mod = await import("@mediapipe/selfie_segmentation");
        seg = new mod.SelfieSegmentation({
          locateFile: (file: string) => `/mediapipe/${file}`,
        }) as unknown as SegmentationInstance;
        resultsRef.push(seg);

        await seg.initialize();
        seg.setOptions({ modelSelection });

        seg.onResults((result) => {
          if (cancelled || finished) return;
          const src = result.segmentationMask as HTMLCanvasElement;
          const scale = Math.min(1, MASK_SAMPLE_WIDTH / (src.width || 1));
          const w = Math.max(1, Math.round(src.width * scale));
          const h = Math.max(1, Math.round(src.height * scale));

          // 1) Desenha a máscara (com blur = feather) num canvas temporário.
          const tmp = document.createElement("canvas");
          tmp.width = w;
          tmp.height = h;
          const tctx = tmp.getContext("2d");
          if (!tctx) return;
          const featherPx = (featherRef.current > 0 ? featherRef.current : 0) * (w / MASK_SAMPLE_WIDTH);
          if (featherPx > 0) tctx.filter = `blur(${featherPx.toFixed(2)}px)`;
          tctx.drawImage(src, 0, 0, w, h);

          // 2) Copia para a saída, invertendo se solicitado (pessoa/bg trocam).
          const out = document.createElement("canvas");
          out.width = w;
          out.height = h;
          const octx = out.getContext("2d");
          if (!octx) return;
          if (invertedRef.current) octx.filter = "invert()";
          octx.drawImage(tmp, 0, 0);

          // 3) Guarda no cache (clipId + frameIndex da timeline) p/ reuso.
          if (clipId) {
            const elNow = mediaRef?.current;
            const mediaTime = elNow && "currentTime" in elNow ? ((elNow as HTMLVideoElement).currentTime ?? 0) : 0;
            const frameIndex = Math.max(0, Math.round(mediaTime * (fps ?? 30)));
            seenFrames.add(frameIndex);
            void CutoutMaskCache.saveFrameMask(clipId, frameIndex, out);
          }

          // Progresso: frames distintos segmentados vs. frames totais do clipe.
          const n = seenFrames.size;
          if (n >= totalFrames) {
            finish();
          } else {
            onProgressRef.current?.({
              isProcessing: true,
              progress: Number(((n / totalFrames) * 100).toFixed(1)),
            });
          }

          const url = out.toDataURL("image/png");
          lastUrlRef.current = url;
          setMaskSrc(url);
          setBusy(false);
        });

        const tick = async () => {
          if (cancelled || finished) return;
          const el = mediaRef?.current ?? null;
          const ok = el
            ? "videoWidth" in el ? (el as HTMLVideoElement).videoWidth > 0
              : (el as HTMLImageElement).naturalWidth > 0
            : false;
          if (el && seg && ok) {
            // Detecta a agulha voltando ao início (fim/loop do clipe): congela.
            if ("currentTime" in el && el.currentTime !== undefined) {
              const t = el.currentTime;
              if (prevTimeRef.current !== null && t < prevTimeRef.current - 0.05) {
                finish();
                return;
              }
              prevTimeRef.current = t;
            }
            setBusy(true);
            seg.send({ image: el }).catch(() => {});
          }
          timer = setTimeout(tick, 90);
        };
        tick();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      const it = resultsRef[0];
      if (it) {
        try { it.close(); } catch { /* noop */ }
      }
      resultsRef.length = 0;
    };
  }, [enabled, modelSelection, mediaRef, totalFrames, clipId, fps]);

  return { maskSrc, busy, error };
}