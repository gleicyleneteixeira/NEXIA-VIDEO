"use client";

import { useEffect, useRef, useState } from "react";

type AutoCutoutResult = {
  maskSrc: string | null;
  busy: boolean;
  error: string | null;
};

type SegmentationInstance = {
  initialize: () => Promise<void>;
  setOptions: (opts: { modelSelection?: number; segmentationMode?: number }) => void;
  onResults: (cb: (result: { segmentationMask: HTMLCanvasElement }) => void) => void;
  send: (input: { image: HTMLVideoElement | HTMLImageElement }) => Promise<void>;
  close: () => void;
};

/**
 * Remoção de fundo por IA (MediaPipe SelfieSegmentation) rodando no client.
 * Processa ~10 quadros/s do elemento de mídia e devolve a máscara de pessoa
 * (silhueta branca sobre preto) como dataURL para ser usada como `mask-image`
 * na camada. Requer os assets em `public/mediapipe/`.
 */
export function useAutoCutout(
  mediaRef: React.RefObject<HTMLVideoElement | HTMLImageElement | null> | null,
  enabled: boolean
): AutoCutoutResult {
  const [maskSrc, setMaskSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMaskSrc(null);
      lastUrlRef.current = null;
      setError(null);
      return;
    }

    let cancelled = false;
    let seg: SegmentationInstance | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const resultsRef: SegmentationInstance[] = [];

    (async () => {
      try {
        const mod = await import("@mediapipe/selfie_segmentation");
        seg = new mod.SelfieSegmentation({
          locateFile: (file: string) => `/mediapipe/${file}`,
        }) as unknown as SegmentationInstance;
        resultsRef.push(seg);

        await seg.initialize();
        seg.setOptions({ modelSelection: 0 });

        seg.onResults((result) => {
          if (cancelled) return;
          const src = result.segmentationMask as HTMLCanvasElement;
          const sw = 320;
          const scale = Math.min(1, sw / (src.width || 1));
          const out = document.createElement("canvas");
          out.width = Math.max(1, Math.round(src.width * scale));
          out.height = Math.max(1, Math.round(src.height * scale));
          out.getContext("2d")?.drawImage(src, 0, 0, out.width, out.height);
          const url = out.toDataURL("image/png");
          lastUrlRef.current = url;
          setMaskSrc(url);
          setBusy(false);
        });

        const tick = async () => {
          if (cancelled) return;
          const el = mediaRef?.current ?? null;
          const ok = el
            ? "videoWidth" in el ? (el as HTMLVideoElement).videoWidth > 0
              : (el as HTMLImageElement).naturalWidth > 0
            : false;
          if (el && seg && ok) {
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
      const it = resultsRef[0];
      if (it) {
        try { it.close(); } catch { /* noop */ }
      }
      resultsRef.length = 0;
    };
  }, [enabled, mediaRef]);

  return { maskSrc, busy, error };
}