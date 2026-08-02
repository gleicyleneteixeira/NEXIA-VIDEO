"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimelineItem } from "./types";
import { useProjectStore } from "./project-store";

const THUMBNAIL_WIDTH = 80;

interface Thumbnail {
  time: number;
  url: string;
}

export function useVideoThumbnails(item: TimelineItem) {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const fps = useProjectStore((s) => s.project.timeline.fps);

  const extractThumbnails = useCallback(async (src: string, durationInFrames: number, projectFps: number) => {
    if (item.kind !== "video" || !src) return;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.src = src;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => resolve();
    });

    const aspectRatio = video.videoHeight / video.videoWidth;
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_WIDTH * aspectRatio;

    const totalSeconds = durationInFrames / projectFps;
    const thumbCount = Math.max(1, Math.min(Math.ceil(totalSeconds * 2), 40));
    const intervalSec = totalSeconds / thumbCount;
    const thumbs: Thumbnail[] = [];

    for (let i = 0; i < thumbCount; i++) {
      const t = i * intervalSec;
      video.currentTime = t;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.onerror = () => resolve();
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbs.push({ time: t, url: canvas.toDataURL("image/jpeg", 0.5) });
    }

    video.src = "";
    setThumbnails(thumbs);
  }, [item.kind]);

  useEffect(() => {
    if (item.kind === "video" && item.src) {
      extractThumbnails(item.src, item.durationInFrames, fps);
    }
  }, [item.id, item.kind, item.src, item.durationInFrames, fps, extractThumbnails]);

  return thumbnails;
}
