"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TimelineItem } from "./types";
import { useProjectStore } from "./project-store";

const THUMBNAIL_WIDTH = 80;
const MAX_THUMBS = 40;
const WAIT_TIMEOUT_MS = 4000;

interface Thumbnail {
  time: number;
  url: string;
}

/**
 * Cache em módulo: não re-decodifica vídeos que já foram processados durante
 * a sessão (a chave usa src + duração + fps). Evita recriar "guerra de seek"
 * com o player principal a cada re-render da timeline.
 */
const thumbnailCache = new Map<string, Thumbnail[]>();

function waitEvent(video: HTMLVideoElement, eventName: string, timeout: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener(eventName, handler);
      video.removeEventListener("error", errorHandler);
      resolve();
    };
    const handler = () => finish();
    const errorHandler = () => finish();
    const timer = setTimeout(finish, timeout);
    video.addEventListener(eventName, handler, { once: true });
    video.addEventListener("error", errorHandler, { once: true });
  });
}

export function useVideoThumbnails(item: TimelineItem) {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const fps = useProjectStore((s) => s.project.timeline.fps) || 30;
  const runTokenRef = useRef(0);

  const extractThumbnails = useCallback(async (src: string, durationInFrames: number, projectFps: number) => {
    if (item.kind !== "video" || !src || !durationInFrames || durationInFrames <= 1) return;

    const cacheKey = `${src}|${durationInFrames}|${projectFps}`;
    const cached = thumbnailCache.get(cacheKey);
    if (cached) {
      setThumbnails(cached);
      return;
    }

    const token = ++runTokenRef.current;

    let video: HTMLVideoElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      // Elemento de vídeo secundário (oculto) — NUNCA o do player principal.
      video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = src;

      canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d");
      if (!ctx) return;

      await waitEvent(video, "loadedmetadata", WAIT_TIMEOUT_MS);
      if (token !== runTokenRef.current) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      // Guarda contra proporções inválidas (0/NaN) que quebra o drawImage.
      if (!w || !h || !isFinite(w) || !isFinite(h)) return;

      canvas.width = THUMBNAIL_WIDTH;
      canvas.height = Math.max(1, Math.round((THUMBNAIL_WIDTH * h) / w));

      // Garante que o decodificador realmente tenha dado disponível.
      if (video.readyState < 2) {
        await waitEvent(video, "loadeddata", WAIT_TIMEOUT_MS);
        if (token !== runTokenRef.current) return;
      }

      const durSec = Math.max(0.1, durationInFrames / projectFps);
      const thumbCount = Math.max(1, Math.min(Math.ceil(durSec * 2), MAX_THUMBS));
      const intervalSec = durSec / thumbCount;
      const thumbs: Thumbnail[] = [];

      for (let i = 0; i < thumbCount; i++) {
        if (token !== runTokenRef.current) return;
        const t = Math.min(i * intervalSec, Math.max(0, (video.duration || durSec) - 0.01));
        try {
          video.currentTime = t;
          await waitEvent(video, "seeked", WAIT_TIMEOUT_MS);
          if (video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbs.push({ time: t, url: canvas.toDataURL("image/jpeg", 0.5) });
          }
        } catch {
          // frame isolado falhou → segue para o próximo (não quebra o resto)
        }
      }

      if (thumbs.length > 0) {
        thumbnailCache.set(cacheKey, thumbs);
        if (token === runTokenRef.current) setThumbnails(thumbs);
      }
    } catch {
      /* decodificar thumbs é descartável — falhas nunca devem afetar o player */
    } finally {
      if (video) {
        try { video.removeAttribute("src"); video.load(); } catch { /* noop */ }
      }
    }
  }, [item.kind]);

  useEffect(() => {
    if (item.kind === "video" && item.src) {
      extractThumbnails(item.src, item.durationInFrames, fps);
    }
  }, [item.id, item.kind, item.src, item.durationInFrames, fps, extractThumbnails]);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
    };
  }, []);

  return thumbnails;
}