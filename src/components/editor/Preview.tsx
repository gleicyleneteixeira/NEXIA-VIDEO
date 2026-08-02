"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useProjectStore, usePlaybackStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, ClipFilters, FilterPreset, ClipMask, ChromaKey, Keyframe, ClipTransform, AspectRatio } from "@/lib/editor";
import { FILTER_PRESETS } from "@/lib/editor";
import { applyKeyframes } from "@/lib/editor/keyframes";

function buildFilterString(filters: ClipFilters | undefined, preset: FilterPreset | undefined): string {
  const b = filters?.brightness ?? 0;
  const c = filters?.contrast ?? 1;
  const s = filters?.saturation ?? 1;
  const h = filters?.hue ?? 0;
  const bl = filters?.blur ?? 0;

  let brightness = b;
  let contrast = c;
  let saturation = s;
  let hue = h;
  let blur = bl;

  if (preset && preset !== "none") {
    const p = FILTER_PRESETS[preset];
    if (p.brightness !== undefined) brightness = (brightness || 0) + p.brightness;
    if (p.contrast !== undefined) contrast = (contrast || 1) * p.contrast;
    if (p.saturation !== undefined) saturation = (saturation || 1) * p.saturation;
    if (p.hue !== undefined) hue = (hue || 0) + p.hue;
    if (p.blur !== undefined) blur = (blur || 0) + p.blur;
  }

  const parts: string[] = [];
  if (brightness !== 0) parts.push(`brightness(${1 + brightness})`);
  if (contrast !== 1) parts.push(`contrast(${contrast})`);
  if (saturation !== 1) parts.push(`saturate(${saturation})`);
  if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`);
  if (blur > 0) parts.push(`blur(${blur}px)`);
  return parts.length > 0 ? parts.join(" ") : "none";
}

function buildTransform(item: TimelineItem): string {
  const t = item?.transform;
  if (!t) return "none";
  const parts: string[] = [];
  if (t.flipH) parts.push("scaleX(-1)");
  if (t.flipV) parts.push("scaleY(-1)");
  if (t.rotation !== 0) parts.push(`rotate(${t.rotation}deg)`);
  if (t.scaleX !== 1 || t.scaleY !== 1) parts.push(`scale(${t.scaleX},${t.scaleY})`);
  return parts.join(" ") || "none";
}

function formatTimecode(frames: number, fps: number): string {
  const totalSeconds = Math.floor(frames / fps);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  const f = Math.floor(frames % fps).toString().padStart(2, "0");
  return `${m}:${s}:${f}`;
}

function buildClipPath(crop: TimelineItem["crop"]): string | undefined {
  if (!crop?.enabled) return undefined;
  return `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;
}

function getMaskSVG(mask: ClipMask | undefined, itemId: string): React.ReactNode {
  if (!mask?.enabled) return null;
  const clipId = `mask-clip-${itemId}`;
  const cx = `${mask.x}%`;
  const cy = `${mask.y}%`;
  const feColor = mask.invert ? "#000000" : "#ffffff";
  const feColor2 = mask.invert ? "#ffffff" : "#000000";
  const featherBlur = mask.feather * 0.5;

  let shapeEl: React.ReactNode = null;
  if (mask.shape === "circle") {
    const r = Math.min(mask.width, mask.height) / 2;
    shapeEl = <circle cx={cx} cy={cy} r={`${r}%`} fill={feColor} />;
  } else if (mask.shape === "rectangle") {
    const x = `${mask.x - mask.width / 2}%`;
    const y = `${mask.y - mask.height / 2}%`;
    shapeEl = <rect x={x} y={y} width={`${mask.width}%`} height={`${mask.height}%`} fill={feColor} />;
  } else if (mask.shape === "diamond") {
    const hw = mask.width / 2;
    const hh = mask.height / 2;
    const points = `${mask.x}% ${mask.y - hh}%, ${mask.x + hw}% ${mask.y}%, ${mask.x}% ${mask.y + hh}%, ${mask.x - hw}% ${mask.y}%`;
    shapeEl = <polygon points={points} fill={feColor} />;
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 11 }}>
      <defs>
        <filter id={`feather-${clipId}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={featherBlur} />
        </filter>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="100%" height="100%" fill={feColor2} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} filter={`url(#feather-${clipId})`}>
        {shapeEl}
      </g>
    </svg>
  );
}

function EffectOverlay({ effect }: { effect: { type: string; intensity: number; color?: string } }) {
  const opacity = effect.intensity;

  switch (effect.type) {
    case "light-leak":
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 12,
            background: `linear-gradient(135deg, rgba(255,165,0,${opacity * 0.6}) 0%, rgba(255,255,255,${opacity * 0.3}) 50%, rgba(255,100,0,${opacity * 0.4}) 100%)`,
            mixBlendMode: "screen",
          }}
        />
      );
    case "vhs":
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 12,
            background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${opacity * 0.15}) 2px, rgba(0,0,0,${opacity * 0.15}) 4px)`,
          }}
        />
      );
    case "glitch":
      return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full"
              style={{
                top: `${15 + i * 18}%`,
                height: `${2 + Math.random() * 4}%`,
                background: `rgba(${i % 2 === 0 ? "255,0,100" : "0,255,200"},${opacity * 0.3})`,
                transform: `translateX(${(Math.random() - 0.5) * 20}px)`,
              }}
            />
          ))}
        </div>
      );
    case "film-grain":
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 12,
            opacity: opacity * 0.4,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
            mixBlendMode: "overlay",
          }}
        />
      );
    case "old-film":
      return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 12 }}>
          <div className="absolute inset-0" style={{ background: `rgba(180,140,60,${opacity * 0.25})`, mixBlendMode: "multiply" }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="absolute w-full" style={{ top: `${20 + i * 30}%`, height: "1px", background: `rgba(255,255,255,${opacity * 0.15})` }} />
          ))}
        </div>
      );
    case "scanlines":
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 12, background: `repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,${opacity * 0.2}) 1px, rgba(0,0,0,${opacity * 0.2}) 2px)` }}
        />
      );
    case "chromatic-aberration":
      return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 12 }}>
          <div className="absolute inset-0" style={{ boxShadow: `inset ${opacity * 3}px 0 0 rgba(255,0,0,${opacity * 0.3}), inset -${opacity * 3}px 0 0 rgba(0,0,255,${opacity * 0.3})` }} />
        </div>
      );
    case "bokeh":
      return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{ width: `${30 + i * 15}px`, height: `${30 + i * 15}px`, left: `${10 + i * 14}%`, top: `${20 + (i % 3) * 25}%`, background: `radial-gradient(circle, rgba(255,255,255,${opacity * 0.15}) 0%, transparent 70%)` }}
            />
          ))}
        </div>
      );
    case "lens-flare":
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 12, background: `radial-gradient(circle at 30% 40%, rgba(255,255,200,${opacity * 0.4}) 0%, transparent 40%)`, mixBlendMode: "screen" }}
        />
      );
    default:
      return null;
  }
}

function getMediaBounds(item: TimelineItem, canvasW: number, canvasH: number) {
  let width = canvasW;
  let height = canvasH;

  const isCentered = ["text", "sticker"].includes(item.kind);
  if (isCentered) {
    return {
      width: "auto",
      height: "auto",
      left: item.text ? `${item.text.x ?? 50}%` : "50%",
      top: item.text ? `${item.text.y ?? 50}%` : "50%",
    };
  }

  if (item.mediaWidth && item.mediaHeight) {
    const canvasRatio = canvasW / canvasH;
    const mediaRatio = item.mediaWidth / item.mediaHeight;

    if (mediaRatio > canvasRatio) {
      width = canvasW;
      height = canvasW / mediaRatio;
    } else {
      height = canvasH;
      width = canvasH * mediaRatio;
    }
  }

  return {
    width: `${width}px`,
    height: `${height}px`,
    left: "50%",
    top: "50%",
  };
}

function VisualLayer({ item, fps, isPrimary, videoRef: externalRef, onSelect }: {
  item: TimelineItem;
  fps: number;
  isPrimary: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onSelect?: () => void;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = externalRef || internalRef;
  const prevItemIdRef = useRef<string | null>(null);
  const { isPlaying, currentTime, volume, isMuted } = usePlaybackStore();
  const { updateItem, project } = useProjectStore();
  const track = project.timeline.tracks[item.trackId];
  const isTrackMuted = track?.muted;
  const timeline = project.timeline;

  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoWidth && video.videoHeight) {
      if (item.mediaWidth !== video.videoWidth || item.mediaHeight !== video.videoHeight) {
        updateItem(item.id, {
          mediaWidth: video.videoWidth,
          mediaHeight: video.videoHeight
        });
      }
    }
  };

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      if (item.mediaWidth !== img.naturalWidth || item.mediaHeight !== img.naturalHeight) {
        updateItem(item.id, {
          mediaWidth: img.naturalWidth,
          mediaHeight: img.naturalHeight
        });
      }
    }
  };

  // 1. Source loading (runs only when source or item changes)
  useEffect(() => {
    const video = ref.current;
    if (!video || !item.src || (item.kind !== "video" && item.kind !== "freeze")) return;

    if (prevItemIdRef.current !== item.id) {
      video.src = item.src;
      video.load();
      prevItemIdRef.current = item.id;
    }
    video.playbackRate = item.speed?.rate ?? 1;
  }, [item.id, item.src, item.kind, item.speed?.rate, ref]);

  // 2. Play/Pause state control (runs when isPlaying changes)
  useEffect(() => {
    const video = ref.current;
    if (!video || (item.kind !== "video" && item.kind !== "freeze")) return;

    if (isPlaying && item.kind !== "freeze") {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, item.kind, ref]);

  // 3. Time synchronization (runs on currentTime updates)
  useEffect(() => {
    const video = ref.current;
    if (!video || (item.kind !== "video" && item.kind !== "freeze")) return;

    const targetTime = (currentTime - item.startFrame + (item.srcInFrame || 0)) / fps;
    const drift = Math.abs(video.currentTime - targetTime);

    // Only force seek if paused (to scrub) or if it drifts significantly (sync correction)
    if (!isPlaying || drift > 0.2) {
      video.currentTime = Math.max(0, targetTime);
    }
  }, [currentTime, isPlaying, item.startFrame, item.srcInFrame, fps, item.kind, ref]);

  // 4. Volume / Muted control
  useEffect(() => {
    const video = ref.current;
    if (!video || (item.kind !== "video" && item.kind !== "freeze")) return;

    video.muted = isMuted || !!isTrackMuted;
    video.volume = volume / 100;
  }, [volume, isMuted, isTrackMuted, item.kind, ref]);

  // Keyframe Interpolation
  const { transform: interpolatedTransform, filters: interpolatedFilters } = applyKeyframes(
    item.keyframes,
    currentTime,
    item.startFrame,
    item.transform,
    item.filters
  );

  const filterStr = buildFilterString(interpolatedFilters, item.filterPreset);
  const opacity = interpolatedTransform.opacity ?? 1;
  const scaleX = interpolatedTransform.scaleX ?? 1;
  const scaleY = interpolatedTransform.scaleY ?? 1;
  const rotation = interpolatedTransform.rotation ?? 0;
  const x = interpolatedTransform.x ?? 0;
  const y = interpolatedTransform.y ?? 0;

  const bounds = getMediaBounds(item, timeline.canvas?.width || timeline.width || 1920, timeline.canvas?.height || timeline.height || 1080);
  const transformStr = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    transform: transformStr,
    opacity,
    zIndex: 10,
    transformOrigin: "center center",
    pointerEvents: "auto",
    cursor: "pointer",
  };

  return (
    <div style={wrapperStyle} onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
      {(item.kind === "video" || item.kind === "freeze") && (
        <video
          ref={ref as React.RefObject<HTMLVideoElement>}
          className="w-full h-full pointer-events-none"
          playsInline
          preload="auto"
          style={{ filter: filterStr }}
          onLoadedMetadata={handleVideoLoaded}
        />
      )}

      {item.kind === "image" && item.src && (
        <img
          src={item.src}
          alt=""
          className="w-full h-full pointer-events-none"
          style={{ filter: filterStr }}
          onLoad={handleImageLoaded}
        />
      )}

      {item.kind === "solid" && (
        <div
          className="w-full h-full pointer-events-none"
          style={{
            backgroundColor: item.src || "#8b5cf6",
            filter: filterStr,
          }}
        />
      )}

      {item.kind === "text" && item.text && (
        <div
          className="whitespace-nowrap select-none px-2 py-1 rounded pointer-events-none"
          style={{
            color: item.text.color || "#ffffff",
            fontFamily: item.text.fontFamily || "Arial",
            fontSize: `${item.text.fontSize || 48}px`,
            fontWeight: item.text.fontWeight || "normal",
            fontStyle: item.text.fontStyle || "normal",
            textAlign: item.text.textAlign || "center",
            backgroundColor: item.text.backgroundColor
              ? `${item.text.backgroundColor}${Math.round((item.text.backgroundOpacity ?? 0) * 255).toString(16).padStart(2, "0")}`
              : "transparent",
            textShadow: item.text.shadowEnabled
              ? `${item.text.shadowOffsetX || 0}px ${item.text.shadowOffsetY || 0}px ${item.text.shadowBlur || 4}px ${item.text.shadowColor || "rgba(0,0,0,0.5)"}`
              : "none",
            WebkitTextStroke: item.text.strokeEnabled
              ? `${item.text.strokeWidth || 2}px ${item.text.strokeColor || "#000000"}`
              : "none",
            filter: filterStr,
          }}
        >
          {item.text.content || "Texto"}
        </div>
      )}

      {item.kind === "sticker" && item.sticker && (
        <div
          className="pointer-events-none"
          style={{
            fontSize: `${item.sticker.size || 64}px`,
            filter: filterStr,
            userSelect: "none",
          }}
        >
          {item.sticker.emoji}
        </div>
      )}

      {(item.filters?.vignette ?? 0) > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${item.filters?.vignette ?? 0}) 100%)`,
          }}
        />
      )}
      {(item.filters?.grain ?? 0) > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: item.filters?.grain ?? 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: `${item.filters?.grainSize ?? 50}px ${item.filters?.grainSize ?? 50}px`,
            mixBlendMode: "overlay",
          }}
        />
      )}
      {item.mask?.enabled && getMaskSVG(item.mask, item.id)}
      {item.chromaKey?.enabled && (
        <div className="absolute inset-0 pointer-events-none flex items-start justify-end" style={{ zIndex: 15 }}>
          <div className="m-2 px-2 py-1 rounded bg-black/70 text-[10px] text-white/80 backdrop-blur-sm flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ backgroundColor: item.chromaKey.color }} />
            Chroma Key
          </div>
        </div>
      )}
      {item.effects?.filter((e) => e.enabled).map((effect) => (
        <EffectOverlay key={effect.id} effect={effect} />
      ))}
    </div>
  );
}

function AudioLayer({ item, currentTime, fps, volume, isMuted }: {
  item: TimelineItem;
  currentTime: number;
  fps: number;
  volume: number;
  isMuted: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const track = useProjectStore((s) => s.project.timeline.tracks[item.trackId]);
  const isTrackMuted = track?.muted;
  const { isPlaying } = usePlaybackStore();

  useEffect(() => {
    const audio = ref.current;
    if (!audio || !item.src) return;
    audio.src = item.src;
    audio.load();
  }, [item.id, item.src]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const targetTime = (currentTime - item.startFrame + (item.srcInFrame || 0)) / fps;
    const drift = Math.abs(audio.currentTime - targetTime);
    if (!isPlaying || drift > 0.2) {
      audio.currentTime = Math.max(0, targetTime);
    }
  }, [currentTime, isPlaying, item.startFrame, item.srcInFrame, fps]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.muted = isMuted || !!isTrackMuted;
    audio.volume = volume / 100;
  }, [volume, isMuted, isTrackMuted]);

  return <audio ref={ref} />;
}

const ASPECT_RATIO_LABELS: Record<AspectRatio, { name: string; icon: string }> = {
  "16:9": { name: "YouTube (Padrão)", icon: "💻" },
  "9:16": { name: "TikTok / Shorts / Reels", icon: "📱" },
  "1:1": { name: "Instagram (Post)", icon: "⏹" },
  "4:5": { name: "Instagram (Retrato)", icon: "📸" },
  "4:3": { name: "Standard", icon: "📺" },
  "21:9": { name: "Cinema", icon: "🎬" },
  "custom": { name: "Personalizado", icon: "⚙" },
};

export default function Preview() {
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { project, setKeyframe, removeKeyframe, updateItem, setCanvas } = useProjectStore();
  const { isPlaying, currentTime, setCurrentTime, volume, isMuted } = usePlaybackStore();
  const { selectedIds, clearSelection, select } = useUIStore();

  const timeline = project.timeline;
  const fps = timeline.fps;

  const scale = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return 1;
    const canvasW = timeline.canvas?.width || timeline.width || 1920;
    const canvasH = timeline.canvas?.height || timeline.height || 1080;
    return Math.min(containerSize.width / canvasW, containerSize.height / (canvasH + 48)) * 0.95;
  }, [containerSize, timeline.canvas?.width, timeline.canvas?.height, timeline.width, timeline.height]);

  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const selectedItem = useMemo(() => {
    return timeline.items.find((i: TimelineItem) => selectedIds.has(i.id)) || null;
  }, [timeline.items, selectedIds]);

  const isSelectedVisualActive = selectedItem && 
    ["video", "image", "text", "sticker", "freeze", "solid"].includes(selectedItem.kind) &&
    currentTime >= selectedItem.startFrame &&
    currentTime < selectedItem.startFrame + selectedItem.durationInFrames;

  const changeCanvasAspectRatio = useCallback((ratio: AspectRatio) => {
    let width = 1920;
    let height = 1080;
    if (ratio === "9:16") {
      width = 1080;
      height = 1920;
    } else if (ratio === "1:1") {
      width = 1080;
      height = 1080;
    } else if (ratio === "4:5") {
      width = 1080;
      height = 1350;
    } else if (ratio === "4:3") {
      width = 1440;
      height = 1080;
    } else if (ratio === "21:9") {
      width = 2560;
      height = 1080;
    }

    setCanvas({ aspectRatio: ratio, width, height });
  }, [setCanvas]);

  const handleAutoFill = useCallback(() => {
    if (!selectedItem || !["video", "image"].includes(selectedItem.kind)) return;
    const canvasW = timeline.canvas?.width || timeline.width || 1920;
    const canvasH = timeline.canvas?.height || timeline.height || 1080;
    const mediaW = selectedItem.mediaWidth || canvasW;
    const mediaH = selectedItem.mediaHeight || canvasH;

    const canvasRatio = canvasW / canvasH;
    const mediaRatio = mediaW / mediaH;

    let fillScale = 1;
    if (mediaRatio > canvasRatio) {
      fillScale = canvasH / (canvasW / mediaRatio);
    } else {
      fillScale = canvasW / (canvasH * mediaRatio);
    }

    updateItem(selectedItem.id, {
      transform: {
        ...selectedItem.transform,
        scaleX: fillScale,
        scaleY: fillScale,
      }
    });
  }, [selectedItem, timeline.canvas?.width, timeline.canvas?.height, timeline.width, timeline.height, updateItem]);

  const totalDurationFrames = useMemo(() => {
    if (timeline.items.length === 0) return fps * 10;
    return Math.max(0, ...timeline.items.map((i) => i.startFrame + i.durationInFrames));
  }, [timeline.items, fps]);

  const [transformState, setTransformState] = useState<{
    action: string;
    startX: number;
    startY: number;
    startScaleX: number;
    startScaleY: number;
    startRotation: number;
    startMouseX: number;
    startMouseY: number;
    centerX: number;
    centerY: number;
    startAngle: number;
  } | null>(null);

  const [snapXActive, setSnapXActive] = useState(false);
  const [snapYActive, setSnapYActive] = useState(false);

  const trackIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    timeline.trackOrder.forEach((trackId, index) => {
      map[trackId] = index;
    });
    return map;
  }, [timeline.trackOrder]);

  const activeVisualItems = useMemo(() => {
    return timeline.items
      .filter((i: TimelineItem) => {
        const track = timeline.tracks[i.trackId];
        if (!track || track.hidden) return false;
        const isVisual = ["video", "image", "text", "sticker", "freeze", "solid"].includes(i.kind);
        const isActive = currentTime >= i.startFrame && currentTime < i.startFrame + i.durationInFrames;
        return isVisual && isActive;
      })
      .sort((a: TimelineItem, b: TimelineItem) => {
        const idxA = trackIndexMap[a.trackId] ?? 0;
        const idxB = trackIndexMap[b.trackId] ?? 0;
        return idxB - idxA;
      });
  }, [timeline.items, timeline.tracks, currentTime, trackIndexMap]);

  const activeAudioItems = useMemo(() => {
    return timeline.items.filter(
      (i: TimelineItem) =>
        i.kind === "audio" &&
        currentTime >= i.startFrame &&
        currentTime < i.startFrame + i.durationInFrames
    );
  }, [timeline.items, currentTime]);

  const interpolatedTransform = useMemo(() => {
    if (!selectedItem) return null;
    const { transform } = applyKeyframes(
      selectedItem.keyframes,
      currentTime,
      selectedItem.startFrame,
      selectedItem.transform,
      selectedItem.filters
    );
    return transform;
  }, [selectedItem, currentTime]);

  const hasAnyKeyframeAtPlayhead = useMemo(() => {
    if (!selectedItem) return false;
    const localFrame = Math.round(currentTime - selectedItem.startFrame);
    const props: ("x" | "y" | "scaleX" | "scaleY" | "rotation" | "opacity")[] = ["x", "y", "scaleX", "scaleY", "rotation", "opacity"];
    return props.some((prop) => {
      const kfs = selectedItem.keyframes?.[prop] || [];
      return kfs.some((kf) => kf.frame === localFrame);
    });
  }, [selectedItem, currentTime]);

  const updateTransformInteractive = useCallback((patch: Partial<ClipTransform>) => {
    if (!selectedItem) return;
    const localFrame = Math.round(currentTime - selectedItem.startFrame);
    const updatedTransform = { ...selectedItem.transform };

    Object.entries(patch).forEach(([prop, val]) => {
      const p = prop as keyof ClipTransform;
      if (typeof val !== "number") return;
      
      const kfProp = p as import("@/lib/editor").KeyframeProp;
      const kfs = (selectedItem.keyframes?.[kfProp] || []) as Keyframe[];
      const hasKfAtPlayhead = kfs.some((kf) => kf.frame === localFrame);
      if (hasKfAtPlayhead) {
        setKeyframe(selectedItem.id, kfProp, { frame: localFrame, value: val, easing: "easeInOut" });
      } else {
        (updatedTransform as any)[p] = val;
      }
    });

    updateItem(selectedItem.id, {
      transform: updatedTransform
    });
  }, [selectedItem, currentTime, setKeyframe, updateItem]);

  const handleMainKeyframeToggle = useCallback(() => {
    if (!selectedItem) return;
    const localFrame = Math.round(currentTime - selectedItem.startFrame);
    const props: ("x" | "y" | "scaleX" | "scaleY" | "rotation" | "opacity")[] = ["x", "y", "scaleX", "scaleY", "rotation", "opacity"];

    if (hasAnyKeyframeAtPlayhead) {
      props.forEach((prop) => {
        removeKeyframe(selectedItem.id, prop, localFrame);
      });
    } else {
      props.forEach((prop) => {
        let value = 0;
        switch (prop) {
          case "x": value = selectedItem.transform.x; break;
          case "y": value = selectedItem.transform.y; break;
          case "scaleX": value = selectedItem.transform.scaleX; break;
          case "scaleY": value = selectedItem.transform.scaleY; break;
          case "rotation": value = selectedItem.transform.rotation; break;
          case "opacity": value = selectedItem.transform.opacity; break;
        }
        setKeyframe(selectedItem.id, prop, { frame: localFrame, value, easing: "easeInOut" });
      });
    }
  }, [selectedItem, currentTime, hasAnyKeyframeAtPlayhead, removeKeyframe, setKeyframe]);

  const handleMouseDown = useCallback((e: React.MouseEvent, action: string) => {
    if (!selectedItem || !interpolatedTransform) return;
    e.preventDefault();
    e.stopPropagation();

    const canvasElement = containerRef.current?.querySelector(".bg-black");
    const canvasRect = canvasElement?.getBoundingClientRect();
    if (!canvasRect) return;

    const canvasW = timeline.canvas?.width || timeline.width || 1920;
    const scaleRatio = canvasW / canvasRect.width;

    const isCentered = ["text", "sticker"].includes(selectedItem.kind);
    const baseX = isCentered && selectedItem.text ? (selectedItem.text.x ?? 50) : 50;
    const baseY = isCentered && selectedItem.text ? (selectedItem.text.y ?? 50) : 50;

    const screenCenterX = canvasRect.left + (canvasRect.width * (baseX / 100)) + (interpolatedTransform.x / scaleRatio);
    const screenCenterY = canvasRect.top + (canvasRect.height * (baseY / 100)) + (interpolatedTransform.y / scaleRatio);

    const startAngle = Math.atan2(e.clientY - screenCenterY, e.clientX - screenCenterX);

    setTransformState({
      action,
      startX: interpolatedTransform.x,
      startY: interpolatedTransform.y,
      startScaleX: interpolatedTransform.scaleX,
      startScaleY: interpolatedTransform.scaleY,
      startRotation: interpolatedTransform.rotation,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      centerX: screenCenterX,
      centerY: screenCenterY,
      startAngle,
    });
  }, [selectedItem, interpolatedTransform, scale]);

  useEffect(() => {
    if (!transformState || !selectedItem) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasElement = containerRef.current?.querySelector(".bg-black");
      const canvasRect = canvasElement?.getBoundingClientRect();
      if (!canvasRect) return;

      const cW = timeline.canvas?.width || timeline.width || 1920;
      const scaleRatio = cW / canvasRect.width;
      const { action, startX, startY, startScaleX, startScaleY, startRotation, startMouseX, startMouseY, centerX, centerY, startAngle } = transformState;

      if (action === "move") {
        let dx = (e.clientX - startMouseX) * scaleRatio;
        let dy = (e.clientY - startMouseY) * scaleRatio;
        let targetX = startX + dx;
        let targetY = startY + dy;

        const snapThreshold = 10;
        const snapDistanceCanvas = snapThreshold * scaleRatio;

        if (Math.abs(targetX) < snapDistanceCanvas) {
          targetX = 0;
          setSnapXActive(true);
        } else {
          setSnapXActive(false);
        }

        if (Math.abs(targetY) < snapDistanceCanvas) {
          targetY = 0;
          setSnapYActive(true);
        } else {
          setSnapYActive(false);
        }

        updateTransformInteractive({ x: targetX, y: targetY });
      } else if (action === "rotate") {
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDeg = ((currentAngle - startAngle) * 180) / Math.PI;
        let targetRotation = Math.round(startRotation + angleDeg) % 360;
        if (targetRotation < 0) targetRotation += 360;

        if (Math.abs(targetRotation % 90) < 5) {
          targetRotation = Math.round(targetRotation / 90) * 90;
        } else if (Math.abs(targetRotation % 45) < 3) {
          targetRotation = Math.round(targetRotation / 45) * 45;
        }

        updateTransformInteractive({ rotation: targetRotation });
      } else if (action.startsWith("resize")) {
        const initialDist = Math.hypot(startMouseX - centerX, startMouseY - centerY);
        const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        const ratio = initialDist === 0 ? 1 : currentDist / initialDist;

        if (action === "resize-nw" || action === "resize-ne" || action === "resize-sw" || action === "resize-se") {
          updateTransformInteractive({
            scaleX: Math.max(0.1, startScaleX * ratio),
            scaleY: Math.max(0.1, startScaleY * ratio),
          });
        } else if (action === "resize-n" || action === "resize-s") {
          const ratioY = Math.abs(e.clientY - centerY) / Math.abs(startMouseY - centerY);
          updateTransformInteractive({
            scaleY: Math.max(0.1, startScaleY * ratioY),
          });
        } else if (action === "resize-e" || action === "resize-w") {
          const ratioX = Math.abs(e.clientX - centerX) / Math.abs(startMouseX - centerX);
          updateTransformInteractive({
            scaleX: Math.max(0.1, startScaleX * ratioX),
          });
        }
      }
    };

    const handleMouseUp = () => {
      setTransformState(null);
      setSnapXActive(false);
      setSnapYActive(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [transformState, selectedItem, timeline.canvas?.width, timeline.width, scale, updateTransformInteractive]);

  useEffect(() => {
    const video = primaryVideoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    let animFrame: number;
    let lastTick = 0;
    const tick = (now: number) => {
      const state = usePlaybackStore.getState();
      if (state.isPlaying) {
        const interval = 1000 / fps;
        if (now - lastTick >= interval) {
          lastTick = now;
          const { project: proj } = useProjectStore.getState();
          const tl = proj.timeline;
          const lastEnd = tl.items.length > 0
            ? Math.max(...tl.items.map((i: TimelineItem) => i.startFrame + i.durationInFrames))
            : tl.fps * 10;
          const current = usePlaybackStore.getState().currentTime;
          if (current >= lastEnd) {
            usePlaybackStore.getState().seekTo(0);
            usePlaybackStore.getState().pause();
            return;
          }
          setCurrentTime((prev: number) => prev + 1);
        }
      } else {
        lastTick = now;
      }
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [setCurrentTime, fps]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      window.dispatchEvent(new CustomEvent("editor-media-import", { detail: { files } }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#08080d] flex items-center justify-center overflow-hidden pb-12"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={clearSelection}
    >
      <div
        className="relative bg-black overflow-hidden shadow-2xl"
        style={{
          width: timeline.canvas?.width || timeline.width || 1920,
          height: timeline.canvas?.height || timeline.height || 1080,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {activeVisualItems.length > 0 ? (
          activeVisualItems.map((item: TimelineItem, idx: number) => (
            <VisualLayer
              key={item.id}
              item={item}
              fps={fps}
              isPrimary={idx === 0}
              videoRef={idx === 0 ? primaryVideoRef : undefined}
              onSelect={() => select(item.id)}
            />
          ))
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
            Arraste um vídeo para a timeline
          </div>
        )}

        {activeAudioItems.map((item: TimelineItem) => (
          <AudioLayer
            key={item.id}
            item={item}
            currentTime={currentTime}
            fps={fps}
            volume={volume}
            isMuted={isMuted}
          />
        ))}

        {snapXActive && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 border-l border-dashed border-red-500 z-30 pointer-events-none" style={{ left: "50%" }} />
        )}

        {snapYActive && (
          <div className="absolute left-0 right-0 h-0.5 bg-red-500 border-t border-dashed border-red-500 z-30 pointer-events-none" style={{ top: "50%" }} />
        )}

        {selectedItem && interpolatedTransform && isSelectedVisualActive && (() => {
          const bounds = getMediaBounds(selectedItem, timeline.canvas?.width || timeline.width || 1920, timeline.canvas?.height || timeline.height || 1080);
          const transformStr = `translate(calc(-50% + ${interpolatedTransform.x}px), calc(-50% + ${interpolatedTransform.y}px)) rotate(${interpolatedTransform.rotation}deg) scale(${interpolatedTransform.scaleX}, ${interpolatedTransform.scaleY})`;
          return (
            <div
              style={{
                position: "absolute",
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
                height: bounds.height,
                transform: transformStr,
                pointerEvents: "none",
                zIndex: 35,
                transformOrigin: "center center",
              }}
            >
              <div
                className="absolute border-2 border-[#8b5cf6] pointer-events-auto"
                style={{
                  inset: ["text", "sticker"].includes(selectedItem.kind) ? "-4px" : "0",
                  boxShadow: "0 0 8px rgba(139, 92, 246, 0.5)",
                  cursor: "move",
                }}
                onMouseDown={(e) => handleMouseDown(e, "move")}
              >
                <div className="absolute w-3 h-3 bg-white border-2 border-[#8b5cf6] rounded-full -top-1.5 -left-1.5 cursor-nwse-resize shadow" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-nw"); }} />
                <div className="absolute w-3 h-3 bg-white border-2 border-[#8b5cf6] rounded-full -top-1.5 -right-1.5 cursor-nesw-resize shadow" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-ne"); }} />
                <div className="absolute w-3 h-3 bg-white border-2 border-[#8b5cf6] rounded-full -bottom-1.5 -left-1.5 cursor-nesw-resize shadow" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-sw"); }} />
                <div className="absolute w-3 h-3 bg-white border-2 border-[#8b5cf6] rounded-full -bottom-1.5 -right-1.5 cursor-nwse-resize shadow" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-se"); }} />

                <div className="absolute h-2 left-2 right-2 -top-1 cursor-ns-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-n"); }} />
                <div className="absolute h-2 left-2 right-2 -bottom-1 cursor-ns-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-s"); }} />
                <div className="absolute w-2 top-2 bottom-2 -left-1 cursor-ew-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-w"); }} />
                <div className="absolute w-2 top-2 bottom-2 -right-1 cursor-ew-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "resize-e"); }} />

                <div className="absolute top-[-24px] left-1/2 -translate-x-1/2 w-0.5 h-6 bg-[#8b5cf6]" />
                <div
                  className="absolute top-[-32px] left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-[#8b5cf6] rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center shadow hover:bg-gray-100"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, "rotate"); }}
                  title="Girar"
                >
                  <span className="text-[10px] text-[#8b5cf6] font-bold">⟳</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* CapCut-style bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#0e0e16]/95 border-t border-white/10 flex items-center justify-between px-4 z-40 text-xs text-white/80 select-none">
        {/* Left Side: Timecode */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/60">
          <span className="text-white font-semibold">{formatTimecode(currentTime, fps)}</span>
          <span>/</span>
          <span>{formatTimecode(totalDurationFrames, fps)}</span>
        </div>

        {/* Middle: Playback controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); usePlaybackStore.getState().togglePlayback(); }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all text-white"
          >
            {isPlaying ? (
              <span className="text-[10px]">⏸</span>
            ) : (
              <span className="text-[10px] translate-x-0.5">▶</span>
            )}
          </button>
        </div>

        {/* Right Side: Aspect Ratio and Zoom/Fill Selectors */}
        <div className="flex items-center gap-2">
          {/* Format Selector Dropdown */}
          <div className="relative font-sans">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFormatMenu(!showFormatMenu); }}
              className="h-7 px-2.5 rounded bg-white/5 hover:bg-white/10 active:scale-95 flex items-center gap-1.5 border border-white/10 transition-all font-semibold"
            >
              <span>{ASPECT_RATIO_LABELS[timeline.canvas?.aspectRatio || "16:9"]?.icon || "📱"}</span>
              <span>{ASPECT_RATIO_LABELS[timeline.canvas?.aspectRatio || "16:9"]?.name || "YouTube (Padrão)"}</span>
              <span className="text-[8px] opacity-60">▼</span>
            </button>

            {showFormatMenu && (
              <div className="absolute bottom-9 right-0 w-60 bg-[#181824] border border-white/10 rounded shadow-xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {(["9:16", "16:9", "1:1", "4:5", "4:3", "21:9"] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => { changeCanvasAspectRatio(ratio); setShowFormatMenu(false); }}
                    className={`w-full px-3 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between text-[11px] ${
                      (timeline.canvas?.aspectRatio || "16:9") === ratio ? "text-[#8b5cf6] font-semibold" : "text-white/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ASPECT_RATIO_LABELS[ratio].icon}</span>
                      <span>{ASPECT_RATIO_LABELS[ratio].name}</span>
                    </div>
                    <span className="opacity-60 font-mono text-[9px]">{ratio}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preenchimento / Fit Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleAutoFill(); }}
            className="h-7 px-2.5 rounded bg-white/5 hover:bg-white/10 active:scale-95 flex items-center gap-1.5 border border-white/10 transition-all font-semibold"
            title="Preencher Tela (Preenchimento)"
          >
            <span>⛶</span>
            <span>Preenchimento</span>
          </button>
        </div>
      </div>

      {selectedItem && (
        <button
          onClick={(e) => { e.stopPropagation(); handleMainKeyframeToggle(); }}
          className={`absolute bottom-3 right-3 z-45 p-2 rounded-full shadow-lg transition-all flex items-center justify-center w-10 h-10 ${
            hasAnyKeyframeAtPlayhead
              ? "bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
              : "bg-black/60 text-white border border-white/20 hover:bg-black/80 font-bold"
          }`}
          title={hasAnyKeyframeAtPlayhead ? "Remover Keyframe (◆)" : "Adicionar Keyframe (◆)"}
        >
          <span className="text-lg">◆</span>
        </button>
      )}
    </div>
  );
}
