"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useProjectStore, usePlaybackStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, ClipFilters, FilterPreset, ClipMask, ChromaKey, Keyframe, ClipTransform, AspectRatio } from "@/lib/editor";
import { FILTER_PRESETS } from "@/lib/editor";
import { applyKeyframes } from "@/lib/editor/keyframes";
import { buildActiveVisualLayerList } from "@/lib/editor/layers";
import { computeSourceFrame } from "@/lib/editor/speedTime";
import { useAutoCutout } from "@/lib/editor/useAutoCutout";
import { getValidMediaUrl, getOrCreateBlobUrl, resolveMediaFile } from "@/lib/editor/mediaUrl";
import type { FadeType } from "@/lib/editor/types";

// IDs que já tiveram a fonte regenerada — evita loop eterno de onError
// caso o próprio blob reconstruído também falhe (mídia realmente corrompida).
const regeneratedSrcItems = new Set<string>();

// Se uma fonte blob foi revogada / sumiu no meio da sessão, recria um novo
// object URL a partir do File original e reponta o item para ele.
function regenerateSrcForItem(item: TimelineItem, updateItem: (id: string, patch: Partial<TimelineItem>) => void): File | null {
  if (regeneratedSrcItems.has(item.id)) return null;
  const file = resolveMediaFile(item);
  if (!file) return null;
  regeneratedSrcItems.add(item.id);
  try {
    const fresh = getOrCreateBlobUrl(file);
    if (fresh !== item.src) updateItem(item.id, { src: fresh });
    console.warn("[Preview] Recriando blob URL para fonte que falhou:", item.id);
  } catch {
    /* noop */
  }
  return file;
}

function buildFilterString(filters: ClipFilters | undefined, preset: FilterPreset | undefined): string {  const b = filters?.brightness ?? 0;
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

// ── Chroma Key (real removal via SVG feColorMatrix) ────────
function buildChromaMatrix(key: ChromaKey): string {
  const r = parseInt(key.color.slice(1, 3), 16) / 255;
  const g = parseInt(key.color.slice(3, 5), 16) / 255;
  const b = parseInt(key.color.slice(5, 7), 16) / 255;

  // Dominant channel carries the key; the others are used as "difference" channels
  const weights = [-0.5, -0.5, -0.5];
  if (r >= g && r >= b) weights[0] = 1;
  else if (g >= r && g >= b) weights[1] = 1;
  else weights[2] = 1;

  const sensitivity = 1 + Math.max(0, key.intensity) * 5;
  const keyDot = r * weights[0] + g * weights[1] + b * weights[2];
  const aR = -weights[0] * sensitivity;
  const aG = -weights[1] * sensitivity;
  const aB = -weights[2] * sensitivity;
  const aOffset = 1 + keyDot * sensitivity;

  return [
    "1 0 0 0 0",
    "0 1 0 0 0",
    "0 0 1 0 0",
    `${aR.toFixed(4)} ${aG.toFixed(4)} ${aB.toFixed(4)} 0 ${aOffset.toFixed(4)}`,
  ].join("\n");
}

function ChromaFilterDefs({ chroma, itemId }: { chroma: ChromaKey; itemId: string }) {
  const values = buildChromaMatrix(chroma);
  const stdDeviation = (chroma.feather || 0) * 0.06;
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id={`chroma-${itemId}`} x="0" y="0" width="100%" height="100%">
          <feColorMatrix type="matrix" values={values} />
          {stdDeviation > 0 && <feGaussianBlur stdDeviation={stdDeviation} />}
        </filter>
      </defs>
    </svg>
  );
}

// ── Color adjust (exposure / temperature / highlights / shadows) ──
function ColorAdjustDefs({ filters, itemId }: { filters: ClipFilters; itemId: string }) {
  const exp = filters?.exposure ?? 0;
  const temp = filters?.temperature ?? 0;
  const highlights = filters?.highlights ?? 0;
  const shadows = filters?.shadows ?? 0;
  if (exp === 0 && temp === 0 && highlights === 0 && shadows === 0) return null;

  const expScale = Math.pow(2, exp * 0.5);
  const rMul = 1 + (temp / 100) * 0.2;
  const bMul = 1 - (temp / 100) * 0.2;
  const values = [
    `${(expScale * rMul).toFixed(4)} 0 0 0 0`,
    `0 ${expScale.toFixed(4)} 0 0 0`,
    `0 0 ${(expScale * bMul).toFixed(4)} 0 0`,
    "0 0 0 1 0",
  ].join("\n");

  const gammaExp = 1 + shadows;
  const amplitude = 1 - highlights * 0.25;

  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id={`coloradjust-${itemId}`}>
          <feColorMatrix type="matrix" values={values} />
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude={amplitude} exponent={gammaExp} offset="0" />
            <feFuncG type="gamma" amplitude={amplitude} exponent={gammaExp} offset="0" />
            <feFuncB type="gamma" amplitude={amplitude} exponent={gammaExp} offset="0" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

function buildMediaFilter(item: TimelineItem, cssFilter: string): string {
  const urls: string[] = [];
  if (item.filters && (item.filters.exposure !== 0 || item.filters.temperature !== 0 || item.filters.highlights !== 0 || item.filters.shadows !== 0)) {
    urls.push(`url(#coloradjust-${item.id})`);
  }
  if (item.chromaKey?.enabled) {
    urls.push(`url(#chroma-${item.id})`);
  }
  if (cssFilter !== "none") urls.push(cssFilter);
  return urls.length > 0 ? urls.join(" ") : "none";
}

function getMaskSVG(mask: ClipMask | undefined, itemId: string): React.ReactNode {
  if (!mask?.enabled) return null;
  const clipId = `mask-clip-${itemId}`;
  const featherBlur = mask.feather * 0.6;

  const shapeEl = (): React.ReactNode => {
    if (mask.shape === "circle") {
      const r = Math.min(mask.width, mask.height) / 2;
      return <circle cx={`${mask.x}%`} cy={`${mask.y}%`} r={`${r}%`} />;
    }
    if (mask.shape === "rectangle") {
      return (
        <rect
          x={`${mask.x - mask.width / 2}%`}
          y={`${mask.y - mask.height / 2}%`}
          width={`${mask.width}%`}
          height={`${mask.height}%`}
        />
      );
    }
    const hw = mask.width / 2;
    const hh = mask.height / 2;
    return (
      <polygon
        points={`${mask.x}% ${mask.y - hh}%, ${mask.x + hw}% ${mask.y}%, ${mask.x}% ${mask.y + hh}%, ${mask.x - hw}% ${mask.y}%`}
      />
    );
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 11 }}>
      <defs>
        <filter id={`feather-${clipId}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={featherBlur} />
        </filter>
        <clipPath id={clipId}>
          {mask.invert ? (
            <g clipRule="evenodd">
              <rect x="0" y="0" width="100%" height="100%" />
              {shapeEl()}
            </g>
          ) : (
            shapeEl()
          )}
        </clipPath>
      </defs>
      {featherBlur > 0 && !mask.invert && (
        <g opacity={0.4} filter={`url(#feather-${clipId})`}>
          {shapeEl()}
        </g>
      )}
    </svg>
  );
}

const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3);
const EASE_OUT_BACK = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

function computeClipAnimation(
  animation: TimelineItem["animation"],
  localFrame: number,
  durationInFrames: number,
  canvasW: number,
  canvasH: number
) {
  const res = { opacity: 1, scaleX: 1, scaleY: 1, rotate: 0, tx: 0, ty: 0, blur: 0 };
  if (!animation) return res;
  const dur = Math.max(1, animation.durationInFrames || 15);

  const applyEnter = (id: string | undefined, e: number) => {
    if (!id || id === "none" || e <= 0) return;
    const eased = EASE_OUT_CUBIC(e);
    const r = 1 - eased;
    switch (id) {
      case "fade-in": res.opacity *= eased; break;
      case "zoom-in": res.scaleX *= 0.2 + 0.8 * eased; res.scaleY *= 0.2 + 0.8 * eased; break;
      case "slide-left": res.tx += -r * canvasW * 0.5; break;
      case "slide-right": res.tx += r * canvasW * 0.5; break;
      case "slide-up": res.ty += -r * canvasH * 0.5; break;
      case "slide-down": res.ty += r * canvasH * 0.5; break;
      case "rotate-in": res.rotate += r * -90; break;
      case "bounce-in": { const s = EASE_OUT_BACK(e); res.scaleX *= s; res.scaleY *= s; break; }
      case "pop-in": { const s = 0.4 + 0.6 * EASE_OUT_BACK(e); res.scaleX *= s; res.scaleY *= s; break; }
      case "blur-in": res.blur = Math.max(res.blur, r * 14); break;
      case "typewriter": res.opacity *= eased; break;
    }
  };

  const applyExit = (id: string | undefined, e: number) => {
    if (!id || id === "none" || e <= 0) return;
    const eased = EASE_OUT_CUBIC(e);
    const r = 1 - eased;
    switch (id) {
      case "fade-out": res.opacity *= eased; break;
      case "zoom-out": res.scaleX *= 0.2 + 0.8 * eased; res.scaleY *= 0.2 + 0.8 * eased; break;
      case "rotate-out": res.rotate += r * 90; break;
      case "bounce-out": { const s = 0.2 + 0.8 * EASE_OUT_BACK(e); res.scaleX *= s; res.scaleY *= s; break; }
      case "blur-out": res.blur = Math.max(res.blur, r * 14); break;
    }
  };

  const enterE = Math.min(1, Math.max(0, localFrame / dur));
  applyEnter(animation.enter, enterE);

  const durItem = Math.max(1, durationInFrames || 1);
  const exitE = Math.min(1, Math.max(0, (durItem - localFrame) / dur));
  applyExit(animation.exit, exitE);

  return res;
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
    case "rain":
      return <ParticleOverlay kind="rain" opacity={opacity} />;
    case "snow":
      return <ParticleOverlay kind="snow" opacity={opacity} />;
    case "fire":
      return <ParticleOverlay kind="fire" opacity={opacity} />;
    case "smoke":
      return <ParticleOverlay kind="smoke" opacity={opacity} />;
    case "confetti":
      return <ParticleOverlay kind="confetti" opacity={opacity} />;
    case "heat":
      return <ParticleOverlay kind="heat" opacity={opacity} />;
    default:
      return null;
  }
}

const PARTICLE_CONFIG: Record<string, { count: number; color: string[]; spread: [number, number]; vy: [number, number]; vx: [number, number]; gravity: number; life: [number, number]; spin: number; blend: string }> = {
  rain: { count: 160, color: ["#9fc3ff", "#cfe2ff"], spread: [1, 3], vy: [14, 22], vx: [-1, -1], gravity: 0.2, life: [1, 1.6], spin: 0, blend: "normal" },
  snow: { count: 90, color: ["#ffffff", "#e5eeff"], spread: [2, 5], vy: [0.8, 2], vx: [-1.2, 1.2], gravity: 0.03, life: [3, 6], spin: 1, blend: "normal" },
  fire: { count: 70, color: ["#ff7a00", "#ffd000", "#ff3d00", "#fff2b0"], spread: [3, 8], vy: [-9, -14], vx: [-1, 1], gravity: -0.1, life: [0.6, 1.2], spin: 2, blend: "screen" },
  smoke: { count: 45, color: ["#ffffff", "#cfd4dd"], spread: [6, 14], vy: [-2.5, -5], vx: [-0.8, 0.8], gravity: -0.04, life: [2.5, 5], spin: 2, blend: "screen" },
  confetti: { count: 160, color: ["#ec4899", "#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"], spread: [3, 7], vy: [3, 7], vx: [-4, 4], gravity: 0.12, life: [2, 3.5], spin: 5, blend: "normal" },
  heat: { count: 55, color: ["#ffe27a", "#ffb347"], spread: [4, 10], vy: [-4, -8], vx: [-1.5, 1.5], gravity: -0.06, life: [1.2, 2.2], spin: 3, blend: "screen" },
};

type Particle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; rot: number; vrot: number; life: number; maxLife: number; color: string };

function ParticleOverlay({ kind, opacity }: { kind: string; opacity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cf = PARTICLE_CONFIG[kind] || PARTICLE_CONFIG.rain;
    let particles: Particle[] = [];
    let raf = 0;
    let last = performance.now();

    const spawn = (): Particle => {
      const [smin, smax] = cf.spread;
      const [vymin, vymax] = cf.vy;
      const [vxmin, vxmax] = cf.vx;
      const [lmin, lmax] = cf.life;
      const px = Math.random() * canvas.width;
      const py = kind === "rain" || kind === "snow" || kind === "confetti" ? -20 : canvas.height * (0.6 + Math.random() * 0.5);
      return {
        x: px,
        y: py,
        vx: vxmin + Math.random() * (vxmax - vxmin),
        vy: vymin + Math.random() * (vymax - vymin),
        size: smin + Math.random() * (smax - smin),
        alpha: 0.5 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * cf.spin * 0.3,
        life: 0,
        maxLife: lmin + Math.random() * (lmax - lmin),
        color: cf.color[Math.floor(Math.random() * cf.color.length)],
      };
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = (now: number) => {
      try {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = cf.blend as GlobalCompositeOperation;

        while (particles.length < cf.count) particles.push(spawn());
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          if (p.life > p.maxLife || p.y > canvas.height + 30) {
            particles[i] = spawn();
            continue;
          }
          p.vy += cf.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vrot * dt;

          const fadeOut = p.life > p.maxLife * 0.7 ? (p.maxLife - p.life) / (p.maxLife * 0.3) : 1;
          const a = Math.min(1, p.alpha * fadeOut * opacity);
          ctx.globalAlpha = Math.max(0, a);
          ctx.fillStyle = p.color;
          if (kind === "rain") {
            ctx.fillRect(p.x, p.y, 1, p.size * 6);
          } else if (kind === "confetti" || kind === "snow" || kind === "fire" || kind === "smoke" || kind === "heat") {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.max(0, a * 0.8);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      } catch {
        // Efeito descartável: nunca derruba o player.
      } finally {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [kind, opacity]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 12 }} />;
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
  const prevSourceRef = useRef<{ id: string; src?: string } | null>(null);
  const { isPlaying, currentTime, volume, isMuted } = usePlaybackStore();
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const { updateItem, project } = useProjectStore();
  const track = project.timeline.tracks[item.trackId];
  const isTrackMuted = track?.muted;
  const timeline = project.timeline;

  const handleSourceError = (e: React.SyntheticEvent<HTMLMediaElement | HTMLImageElement>) => {
    const file = resolveMediaFile(item);
    if (file && !regeneratedSrcItems.has(item.id)) {
      regenerateSrcForItem(item, updateItem);
    } else {
      console.error("[Preview] Falha ao carregar mídia:", item.name || item.id, item.src, e.currentTarget?.tagName);
    }
  };

  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoWidth && video.videoHeight) {
      if (item.mediaWidth !== video.videoWidth || item.mediaHeight !== video.videoHeight) {
        const canvasW = timeline.canvas?.width || timeline.width || 1920;
        const canvasH = timeline.canvas?.height || timeline.height || 1080;
        const canvasRatio = canvasW / canvasH;
        const mediaRatio = video.videoWidth / video.videoHeight;

        let fillScale = 1;
        if (mediaRatio > canvasRatio) {
          fillScale = canvasH / (canvasW / mediaRatio);
        } else {
          fillScale = canvasW / (canvasH * mediaRatio);
        }

        updateItem(item.id, {
          mediaWidth: video.videoWidth,
          mediaHeight: video.videoHeight,
          transform: {
            ...item.transform,
            scaleX: fillScale,
            scaleY: fillScale,
          }
        });
      }
    }
  };

  // Disparado quando a mídia termina de decodificar (onCanPlay). Reengaja o
  // play e reposiciona a agulha na janela esperada, evitando congelamento
  // quando o onError regenerou o blob ou o src foi aplicado depois do play().
  const handleMediaReady = () => {
    const video = ref.current;
    if (!video) return;
    video.playbackRate = item.speed?.rate ?? 1;
    const localFrame = currentTime - item.startFrame;
    const durFrames = item.durationInFrames ?? 0;
    if (!isPlaying || !isFinite(localFrame)) return;
    if (localFrame < 0 || localFrame >= durFrames) {
      try {
        video.pause();
      } catch {}
      return;
    }
    const expectedFrame = computeSourceFrame(
      localFrame,
      durFrames,
      item.srcInFrame ?? 0,
      item.srcOutFrame ?? 0,
      item.speed ?? { rate: 1, reverse: false, freezeFrame: null, curve: [] }
    );
    try {
      if (video.paused) {
        const p = video.play();
        if (p) p.catch(() => {});
      }
      const expectedSec = expectedFrame / (fps || 30);
      if (isFinite(video.currentTime) && Math.abs(video.currentTime - expectedSec) > 0.2) {
        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.min(Math.max(0, expectedSec), video.duration - 0.01);
        }
      }
    } catch {}
  };

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      if (item.mediaWidth !== img.naturalWidth || item.mediaHeight !== img.naturalHeight) {
        const canvasW = timeline.canvas?.width || timeline.width || 1920;
        const canvasH = timeline.canvas?.height || timeline.height || 1080;
        const canvasRatio = canvasW / canvasH;
        const mediaRatio = img.naturalWidth / img.naturalHeight;

        let fillScale = 1;
        if (mediaRatio > canvasRatio) {
          fillScale = canvasH / (canvasW / mediaRatio);
        } else {
          fillScale = canvasW / (canvasH * mediaRatio);
        }

        updateItem(item.id, {
          mediaWidth: img.naturalWidth,
          mediaHeight: img.naturalHeight,
          transform: {
            ...item.transform,
            scaleX: fillScale,
            scaleY: fillScale,
          }
        });
      }
    }
  };

  // 1. Source loading: valida a blob URL antes de montar no <video>. Se a URL
  //    caiu (Fast Refresh / revogação), a valida regenera uma nova a partir do
  //    File original e reponta o item, sem perder trim/corte do clipe.
  useEffect(() => {
    const video = ref.current;
    if (!video || !item.src || (item.kind !== "video" && item.kind !== "freeze")) return;

    const file = resolveMediaFile(item);
    let cancelled = false;
    (async () => {
      const valid = await getValidMediaUrl({ blobUrl: item.src, file });
      if (cancelled || !valid) return;
      if (valid !== item.src) {
        updateItem(item.id, { src: valid });
        return;
      }
      if (!prevSourceRef.current || prevSourceRef.current.id !== item.id || prevSourceRef.current.src !== item.src) {
        video.src = valid;
        video.load();
        prevSourceRef.current = { id: item.id, src: valid };
      }
    })();
    video.playbackRate = item.speed?.rate ?? 1;
    return () => { cancelled = true; };
  }, [item.id, item.src, item.kind, item.speed?.rate, ref, updateItem]);

  // 2. Play/Pause state control: só chama play() com a mídia pronta
  //    (readyState >= 2). Se a fonte não tem dados ainda (grab blob morto /
  //    regeneração em andamento), força load() e aguarda o canplay para
  //    liberar a reprodução — evita play() falhando com readyState 0.
  useEffect(() => {
    const video = ref.current;
    if (!video || (item.kind !== "video" && item.kind !== "freeze")) return;

    const holdLastFrame = () => {
      // Não volta ao frame 0: se a fonte já atingiu o fim (clipe mais longo
      // que o mídia), segura o último frame em vez de piscar no começo.
      if (video.ended && isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.max(0, video.duration - 0.005);
      }
    };

    if (isPlaying) {
      if (video.readyState >= 2) {
        try {
          const p = video.play();
          if (p) p.catch(holdLastFrame);
        } catch {
          /* elemento não interativo ainda — ignora */
        }
      } else {
        const onReady = () => {
          video.removeEventListener("canplay", onReady);
          if (!isPlayingRef.current) return;
          try {
            const p = video.play();
            if (p) p.catch(holdLastFrame);
          } catch {}
        };
        video.addEventListener("canplay", onReady);
        video.load();
        return () => video.removeEventListener("canplay", onReady);
      }
    } else {
      try {
        video.pause();
      } catch {}
    }
  }, [isPlaying, item.kind, ref]);

  // 3. Time synchronization (runs on currentTime updates). We only seek when
  //    needed (paused, or drift detected) so that normal playback uses the
  //    native play for smooth motion and the playhead stays in sync.
  useEffect(() => {
    const video = ref.current;
    if (!video || (item.kind !== "video" && item.kind !== "freeze")) return;

    // Espera a mídia ter dados antes de sincronizar a reprodução. Enquanto
    // pausado, basta metadata (HAVE_METADATA) para o scrub mostrar o frame.
    if (video.readyState < (isPlaying ? 2 : 1)) return;

    try {
      const localFrame = currentTime - item.startFrame;
      const srcFrame = computeSourceFrame(
        localFrame,
        item.durationInFrames,
        item.srcInFrame || 0,
        item.srcOutFrame || 0,
        item.speed
      );
      const targetTime = Math.max(0, srcFrame / fps);
      const current = video.currentTime || 0;
      const drift = Math.abs(current - targetTime);
      const isBackward = targetTime < current - 0.1;
      if (!isPlaying || drift > 0.18 || isBackward) {
        video.currentTime = targetTime;
      }
    } catch {
      /* corrente desatualizada durante oncan: ignora e continua */
    }
  }, [currentTime, isPlaying, item.startFrame, item.srcInFrame, item.srcOutFrame, item.durationInFrames, item.speed, fps, item.kind, ref]);

  // 4. Volume / Muted control
  useEffect(() => {
    const video = ref.current;
    if (!video || (item.kind !== "video" && item.kind !== "freeze")) return;

    try {
      video.muted = isMuted || !!isTrackMuted || !!item.audio?.muted;
      video.volume = volume / 100;
    } catch {
      /* noop */
    }
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
  const mediaFilter = buildMediaFilter(item, filterStr);
  const opacity = interpolatedTransform.opacity ?? 1;
  const scaleX = interpolatedTransform.scaleX ?? 1;
  const scaleY = interpolatedTransform.scaleY ?? 1;
  const rotation = interpolatedTransform.rotation ?? 0;
  const x = interpolatedTransform.x ?? 0;
  const y = interpolatedTransform.y ?? 0;

  // ── Remoção de fundo automática (IA / MediaPipe) ──
  const cutoutEnabled = !!item.autoCutout?.enabled && (item.kind === "video" || item.kind === "freeze");
  const { maskSrc: cutoutMask } = useAutoCutout(
    cutoutEnabled ? (ref as React.RefObject<HTMLVideoElement>) : null,
    cutoutEnabled
  );

  const bounds = getMediaBounds(item, timeline.canvas?.width || timeline.width || 1920, timeline.canvas?.height || timeline.height || 1080);
  const localFrame = currentTime - item.startFrame;
  const canvasW = timeline.canvas?.width || timeline.width || 1920;
  const canvasH = timeline.canvas?.height || timeline.height || 1080;
  const animComp = computeClipAnimation(item.animation, localFrame, item.durationInFrames || 0, canvasW, canvasH);
  const finalOpacity = (opacity || 1) * animComp.opacity;
  const finalScaleX = (scaleX || 1) * animComp.scaleX;
  const finalScaleY = (scaleY || 1) * animComp.scaleY;
  const finalRot = (rotation || 0) + animComp.rotate;
  const finalX = (x || 0) + animComp.tx;
  const finalY = (y || 0) + animComp.ty;
  const transformStr = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px)) rotate(${finalRot}deg) scale(${finalScaleX}, ${finalScaleY})`;

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    transform: transformStr,
    opacity: finalOpacity,
    zIndex: 10,
    transformOrigin: "center center",
    pointerEvents: "auto",
    cursor: "pointer",
    filter: animComp.blur > 0 ? `blur(${animComp.blur}px)` : undefined,
    clipPath: item.mask?.enabled ? `url(#mask-clip-${item.id})` : undefined,
    WebkitClipPath: item.mask?.enabled ? `url(#mask-clip-${item.id})` : undefined,
    maskImage: cutoutEnabled && cutoutMask ? `url(${cutoutMask})` : undefined,
    WebkitMaskImage: cutoutEnabled && cutoutMask ? `url(${cutoutMask})` : undefined,
    maskSize: cutoutEnabled && cutoutMask ? "contain" : undefined,
    WebkitMaskSize: cutoutEnabled && cutoutMask ? "contain" : undefined,
    maskRepeat: cutoutEnabled && cutoutMask ? "no-repeat" : undefined,
    WebkitMaskRepeat: cutoutEnabled && cutoutMask ? "no-repeat" : undefined,
    maskPosition: cutoutEnabled && cutoutMask ? "center" : undefined,
    WebkitMaskPosition: cutoutEnabled && cutoutMask ? "center" : undefined,
    mixBlendMode: (item.blendMode as React.CSSProperties["mixBlendMode"]) || undefined,
  };

  return (
    <div style={wrapperStyle} onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
      {item.chromaKey?.enabled && <ChromaFilterDefs chroma={item.chromaKey} itemId={item.id} />}
      <ColorAdjustDefs itemId={item.id} filters={interpolatedFilters} />
      {(item.kind === "video" || item.kind === "freeze") && (
        <video
          ref={ref as React.RefObject<HTMLVideoElement>}
          data-cover-source={isPrimary ? "primary" : undefined}
          data-item-id={item.id}
          data-media={item.id}
          className="w-full h-full pointer-events-none"
          playsInline
          preload="auto"
          style={{ filter: mediaFilter }}
          onLoadedMetadata={handleVideoLoaded}
          onCanPlay={handleMediaReady}
          onError={handleSourceError}
        />
      )}

      {item.kind === "image" && item.src && (
        <img
          src={item.src}
          alt=""
          data-item-id={item.id}
          className="w-full h-full pointer-events-none"
          style={{ filter: mediaFilter }}
          onLoad={handleImageLoaded}
          onError={handleSourceError}
        />
      )}

      {item.kind === "solid" && (
        <div
          className="w-full h-full pointer-events-none"
          style={{
            backgroundColor: item.src || "#8b5cf6",
            filter: mediaFilter,
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
            filter: mediaFilter,
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
            filter: mediaFilter,
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
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const resumeHandlerRef = useRef<(() => void) | null>(null);
  const track = useProjectStore((s) => s.project.timeline.tracks[item.trackId]);
  const updateItem = useProjectStore((s) => s.updateItem);
  const isTrackMuted = track?.muted;
  const { isPlaying } = usePlaybackStore();

  const handleAudioError = () => {
    if (!regeneratedSrcItems.has(item.id)) {
      regenerateSrcForItem(item, updateItem);
    } else {
      console.error("[Preview] Falha ao carregar áudio:", item.name || item.id, item.src);
    }
  };

  // Quando o áudio decodifica, destrava o AudioContext e reposiciona na
  // janela esperada (evita áudio mudo/fora de sincronia após regeneração).
  const handleAudioReady = () => {
    const audio = ref.current;
    if (!audio) return;
    ctxRef.current?.resume().catch(() => {});
    const localFrame = currentTime - item.startFrame;
    if (!isPlaying || !isFinite(localFrame) || localFrame < 0) return;
    const expectedSec = localFrame / (fps || 30);
    try {
      if (audio.paused) {
        const p = audio.play();
        if (p) p.catch(() => {});
      }
      if (isFinite(audio.currentTime) && Math.abs(audio.currentTime - expectedSec) > 0.3) {
        audio.currentTime = Math.max(0, expectedSec);
      }
    } catch {}
  };

  // Build/media graph once per element (GainNode enables volume + fades).
  // Valida a blob URL antes de montar: se caiu, regenera a partir do File.
  useEffect(() => {
    const audio = ref.current;
    if (!audio || !item.src) return;
    const file = resolveMediaFile(item);
    let cancelled = false;
    (async () => {
      const valid = await getValidMediaUrl({ blobUrl: item.src, file });
      if (cancelled || !valid) return;
      const el = ref.current;
      if (!el) return;
      if (valid !== item.src) {
        updateItem(item.id, { src: valid });
        return;
      }
      try {
        el.src = valid;
        el.volume = 1;
        el.load();
      } catch {
        /* noop */
      }
    })();
    return () => { cancelled = true; };
  }, [item.id, item.src, updateItem]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (ctxRef.current) {
      try {
        ctxRef.current.resume();
      } catch {}
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gainRef.current = gain;
      source.connect(gain);
      gain.connect(ctx.destination);
    } catch {}
  }, [item.id]);

  // Reaproveita qualquer interação do usuário (clique/tecla) para "destravar"
  // o AudioContext — evita o navegador manter o áudio bloqueado esperando um
  // user gesture inicial.
  useEffect(() => {
    const resume = () => {
      if (ctxRef.current && ctxRef.current.state === "suspended") {
        ctxRef.current.resume().catch(() => {});
      }
    };
    resumeHandlerRef.current = resume;
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const resumeCtx = ctxRef.current?.resume();
      if (resumeCtx) resumeCtx.catch(() => {});
      // Alguns navegadores só liberam o áudio após um clique no player;
      // força a segunda tentativa no próximo tick.
      const t = setTimeout(() => {
        const c = ctxRef.current;
        if (c && c.state === "suspended") c.resume().catch(() => {});
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    try {
      if (isPlaying) {
        const p = audio.play();
        if (p) p.catch(() => {});
      } else {
        audio.pause();
      }
    } catch {
      /* noop */
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    // Espera a mídia ter dado antes de sincronizar (readyState >= 2).
    if (audio.readyState < 2 && isPlaying) return;
    const localFrame = currentTime - item.startFrame;
    const srcFrame = computeSourceFrame(
      localFrame,
      item.durationInFrames,
      item.srcInFrame || 0,
      item.srcOutFrame || 0,
      item.speed
    );
    const targetTime = Math.max(0, srcFrame / fps);
    const drift = Math.abs(audio.currentTime - targetTime);
    if (!isPlaying || drift > 0.15) {
      try {
        audio.currentTime = targetTime;
      } catch {}
    }
  }, [currentTime, isPlaying, item.startFrame, item.srcInFrame, item.srcOutFrame, item.durationInFrames, item.speed, fps]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    try {
      audio.muted = isMuted || !!isTrackMuted;
      if (!gainRef.current) {
        audio.volume = volume / 100;
        return;
      }
      const durFrames = Math.max(1, item.durationInFrames || 1);
      const localFrame = currentTime - item.startFrame;
      const fade = item.audio?.fade;
      let gain = isMuted || isTrackMuted ? 0 : volume / 100;
      if (fade) {
        // fade-in
        if (fade.in && fade.in !== "none" && fade.inDuration > 0) {
          const fadeFrames = fade.inDuration * fps;
          if (localFrame < fadeFrames) {
            const p = fadeFrames > 0 ? Math.max(0, Math.min(1, localFrame / fadeFrames)) : 1;
            gain *= fadeShape(fade.in, p);
          }
        }
        // fade-out (using localFrame relative to item end)
        if (fade.out && fade.out !== "none" && fade.outDuration > 0) {
          const fadeFrames = fade.outDuration * fps;
          const rem = durFrames - localFrame;
          if (rem < fadeFrames && rem > 0) {
            const p = fadeFrames > 0 ? Math.max(0, Math.min(1, rem / fadeFrames)) : 0;
            gain *= fadeShape(fade.out, p);
          }
        }
      }
      gainRef.current.gain.setTargetAtTime(Math.max(0, gain), ctxRef.current!.currentTime, 0.02);
    } catch {
      /* noop */
    }
  }, [currentTime, item.startFrame, item.durationInFrames, item.audio, fps, volume, isMuted, isTrackMuted]);

  return <audio ref={ref} data-media={item.id} onError={handleAudioError} onCanPlay={handleAudioReady} />;
}

function fadeShape(type: FadeType, t: number): number {
  const p = Math.max(0, Math.min(1, t));
  switch (type) {
    case "exponential":
      return p * p;
    case "logarithmic":
      return p * (2 - p);
    case "linear":
    default:
      return p;
  }
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
  const stageRef = useRef<HTMLDivElement>(null);
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

  const { project, setKeyframe, updateItem, setCanvas, setChromaKey } = useProjectStore();
  const { isPlaying, currentTime, setCurrentTime, seekTo, volume, isMuted, setVolume, toggleMute } = usePlaybackStore();
  const { selectedIds, clearSelection, select } = useUIStore();

  const [playerZoom, setPlayerZoom] = useState<number | null>(null);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [chromaPickId, setChromaPickId] = useState<string | null>(null);

  const timeline = project.timeline;
  const fps = timeline.fps;

  const fitScale = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return 1;
    const canvasW = timeline.canvas?.width || timeline.width || 1920;
    const canvasH = timeline.canvas?.height || timeline.height || 1080;
    return Math.min(containerSize.width / canvasW, containerSize.height / (canvasH + 48)) * 0.95;
  }, [containerSize, timeline.canvas?.width, timeline.canvas?.height, timeline.width, timeline.height]);

  // The canvas frame/viewport is ALWAYS locked to its aspect ratio at the fit
  // size. Zoom/scale never affects this container — it stays as a rigid mask
  // (clip) around the media layers.
  const scale = fitScale;

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

  const activeVisualItems = useMemo(() => {
    return buildActiveVisualLayerList(
      timeline,
      currentTime,
      ["video", "image", "text", "sticker", "freeze", "solid"]
    );
  }, [timeline, currentTime]);

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
        if (kfs.length > 0) {
          setKeyframe(selectedItem.id, kfProp, { frame: localFrame, value: val, easing: "easeInOut" });
        }
      }
    });

    updateItem(selectedItem.id, {
      transform: updatedTransform
    });
  }, [selectedItem, currentTime, setKeyframe, updateItem]);

  // ── Content zoom: scales ONLY the selected media layer (object transform).
  //    The canvas 9:16 mask stays fixed; the media just grows/clips inside it.
  const zoomBaseRef = useRef<{ id: string; scaleX: number; scaleY: number } | null>(null);

  const beginZoomBaseline = useCallback(() => {
    if (!selectedItem) return;
    zoomBaseRef.current = {
      id: selectedItem.id,
      scaleX: selectedItem.transform.scaleX ?? 1,
      scaleY: selectedItem.transform.scaleY ?? 1,
    };
    setPlayerZoom(1);
    setShowZoomMenu(true);
  }, [selectedItem, setPlayerZoom]);

  const applyZoomTo = useCallback((value: number) => {
    if (!selectedItem) return;
    const base = zoomBaseRef.current && zoomBaseRef.current.id === selectedItem.id
      ? zoomBaseRef.current
      : { scaleX: selectedItem.transform.scaleX ?? 1, scaleY: selectedItem.transform.scaleY ?? 1 };
    updateTransformInteractive({
      scaleX: Math.max(0.05, base.scaleX * value),
      scaleY: Math.max(0.05, base.scaleY * value),
    });
    setPlayerZoom(value);
  }, [selectedItem, updateTransformInteractive, setPlayerZoom]);

  const resetObjectZoom = useCallback(() => {
    if (!selectedItem) return;
    const canvasW = timeline.canvas?.width || timeline.width || 1920;
    const canvasH = timeline.canvas?.height || timeline.height || 1080;
    const mediaW = selectedItem.mediaWidth;
    const mediaH = selectedItem.mediaHeight;
    let fill = 1;
    if (mediaW && mediaH) {
      const canvasRatio = canvasW / canvasH;
      const mediaRatio = mediaW / mediaH;
      fill = mediaRatio > canvasRatio ? canvasH / (canvasW / mediaRatio) : canvasW / (canvasH * mediaRatio);
    }
    updateTransformInteractive({ scaleX: fill, scaleY: fill });
    zoomBaseRef.current = null;
    setPlayerZoom(1);
}, [selectedItem, timeline.canvas?.width, timeline.canvas?.height, timeline.width, timeline.height, updateTransformInteractive, setPlayerZoom]);

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
    let isRunning = false;
    let previousTs = 0;
    let previousTime = 0;

    // Reset the playback baseline (called on play and on manual seek).
    const resetAnchor = (nowTs: number) => {
      const st = usePlaybackStore.getState();
      previousTs = nowTs;
      previousTime = st.currentTime;
    };

    // Tempo esperado (em segundos de mídia) para o clipe no frame atual.
    const expectedMediaSeconds = (item: TimelineItem, frame: number, fpsT: number): number => {
      const srcFrame = computeSourceFrame(
        frame - item.startFrame,
        item.durationInFrames,
        item.srcInFrame || 0,
        item.srcOutFrame || 0,
        item.speed
      );
      return Math.max(0, srcFrame / fpsT);
    };

    // Inverso (mídia → quadro local): usado para a mídia comandar a agulha.
    // Retorna null quando não dá pra inverter com segurança (curva de velocidade).
    const mediaToLocalFrame = (srcFrame: number, item: TimelineItem): number | null => {
      const srcIn = item.srcInFrame || 0;
      const srcOut = item.srcOutFrame || 0;
      let rel = srcFrame - srcIn;
      if (item.speed?.reverse) {
        const span = Math.max(1, (srcOut > srcIn ? srcOut - srcIn : 1));
        rel = span - rel;
      }
      const curvePending = Array.isArray(item.speed?.curve) && item.speed.curve.length > 0;
      const rate = item.speed?.rate || 1;
      if (rate <= 0 || curvePending) return null;
      return rel / rate;
    };

    // O loop NUNCA morre: qualquer erro é capturado e a próxima execução
    // continua o playback normalmente.
    const tick = (now: number) => {
      try {
        const state = usePlaybackStore.getState();
        const { project: proj } = useProjectStore.getState();
        const tl = proj.timeline;
        const items = tl.items;
        const fpsT = tl.fps || 30;

        // ── REGRA 1: AUTO-STOP ─────────────────────────────────────────
        const maxDuration = items.length
          ? Math.max(...items.map((i: TimelineItem) => (i.startFrame || 0) + (i.durationInFrames || 0)))
          : 0;

        if (items.length === 0) {
          // Timeline vazia: pausa imediata, agulha em 0 e loop "dorme".
          if (state.isPlaying) usePlaybackStore.getState().pause();
          if (state.currentTime !== 0) usePlaybackStore.getState().seekTo(0);
          isRunning = false;
          return;
        }

        if (state.currentTime >= maxDuration) {
          // Fim da peça: pausa e trava no íntimo final (último frame).
          if (state.isPlaying) usePlaybackStore.getState().pause();
          if (Math.abs(state.currentTime - maxDuration) > 1) {
            usePlaybackStore.getState().seekTo(Math.max(0, maxDuration));
          }
          isRunning = false;
          return;
        }

        const cur = Math.min(state.currentTime, Math.max(0, maxDuration - 1));

        // Mídias renderizadas no estágio (vídeos e áudios ativos aqui).
        const activeMedia: { el: HTMLMediaElement; item: TimelineItem }[] = [];
        const mediaEls = document.querySelectorAll<HTMLMediaElement>("[data-media]");
        for (const el of mediaEls) {
          const id = el.getAttribute("data-media") || "";
          const item = items.find((i: TimelineItem) => i.id === id);
          if (!item) continue;
          if (cur >= item.startFrame && cur < item.startFrame + item.durationInFrames) {
            activeMedia.push({ el, item });
          }
        }

        if (state.isPlaying) {
          if (!isRunning) {
            resetAnchor(now);
            isRunning = true;
          }

          // ── REGRA 2: SINCRONIZAÇÃO POR CAMADA ATIVA ─────────────────
          for (const { el, item } of activeMedia) {
            try {
              const expected = expectedMediaSeconds(item, cur, fpsT);
              // play
              if (el.paused) {
                const p = el.play();
                if (p) p.catch(() => {});
              }
              // drift > 0.1s corrige o tempo da mídia para o relógio
              if (Math.abs(el.currentTime - expected) > 0.1) {
                el.currentTime = expected;
              }
              // garante volume/mute coerentes (nunca preso em mudo)
              const track = tl.tracks[item.trackId];
              const effectiveMute = state.isMuted || !!track?.muted || !!item.audio?.muted;
              try {
                el.muted = effectiveMute;
                el.volume = Math.max(0.0001, state.volume / 100);
              } catch {}
            } catch {}
          }

          // ── REGRA 2b: A MÍDIA COMAND A AGULHA ────────────────────────
          // Se uma mídia ativa está decodificando (readyState>=2), o relógio
          // visual segue o `currentTime` dela — a agulha NUNCA passa à frente
          // de um frame que ainda não saiu (imagem congela deixa se mover).
          const videoMaster = activeMedia.find(
            (m) => m.el instanceof HTMLVideoElement && m.el.readyState >= 2 && !m.el.error
          );
          const audioMaster = activeMedia.find(
            (m) => !(m.el instanceof HTMLVideoElement) && m.el.readyState >= 2 && !m.el.error
          );
          const master = videoMaster || audioMaster;

          if (master) {
            const masterLocal = mediaToLocalFrame(master.el.currentTime * fpsT, master.item);
            if (masterLocal !== null && masterLocal !== undefined && isFinite(masterLocal) && masterLocal >= 0) {
              const target = master.item.startFrame + Math.round(masterLocal);
              const clamped = Math.max(
                master.item.startFrame,
                Math.min(target, master.item.startFrame + Math.max(1, master.item.durationInFrames))
              );
              if (clamped !== state.currentTime) {
                usePlaybackStore.getState().setCurrentTime(clamped);
              }
              previousTs = now;
              previousTime = clamped;
            }
          } else {
            // Fallback: sem mídia decodificável ativa (freeze/overlay) → relógio
            // avanço por parede, com re-âncora se a agulha mudou por fora.
            const elapsed = now - previousTs;
            const expected = previousTime + (elapsed <= 0 ? 0 : Math.floor((elapsed * fpsT) / 1000));
            if (Math.abs(state.currentTime - expected) > (fpsT > 24 ? 2 : 1)) {
              previousTs = now;
              previousTime = state.currentTime;
            } else {
              const target = Math.min(expected, Math.max(0, maxDuration - 1));
              if (target !== state.currentTime) {
                usePlaybackStore.getState().setCurrentTime(target);
              }
            }
          }
        } else if (isRunning) {
          isRunning = false;
          // Pausa garantida em todas as mídias ativas.
          for (const { el } of activeMedia) {
            try { if (!el.paused) el.pause(); } catch {}
          }
        }
      } catch (e) {
        // Nunca derruba o player: re-sincroniza a âncora e segue.
        if (typeof console !== "undefined") {
          console.warn("[preview tick] erro não fatal:", e);
        }
        isRunning = false;
        previousTs = now;
        previousTime = usePlaybackStore.getState().currentTime;
      } finally {
        animFrame = requestAnimationFrame(tick);
      }
    };

    const handleSeek = () => resetAnchor(performance.now());
    window.addEventListener("timeline-user-seek", handleSeek);
    animFrame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("timeline-user-seek", handleSeek);
    };
  }, [fps]);

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

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    }
  }, []);

  // ── Eyedropper do Chroma Key: o painel dispara `chroma-pick-begin`,
  //    o próximo clique no canvas amostra a cor do pixel e grava no chromaKey.
  useEffect(() => {
    const onBegin = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string } | undefined;
      setChromaPickId(detail?.id ?? null);
    };
    window.addEventListener("chroma-pick-begin", onBegin);
    return () => window.removeEventListener("chroma-pick-begin", onBegin);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!chromaPickId) {
      clearSelection();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current?.querySelector(`[data-item-id="${chromaPickId}"]`) as
      HTMLVideoElement | HTMLImageElement | undefined;
    const rect = el?.getBoundingClientRect();
    if (!el || !rect || rect.width <= 0 || rect.height <= 0) {
      setChromaPickId(null);
      return;
    }
    const w = "videoWidth" in el ? ((el as HTMLVideoElement).videoWidth || 1) : ((el as HTMLImageElement).naturalWidth || 1);
    const h = "videoHeight" in el ? ((el as HTMLVideoElement).videoHeight || 1) : ((el as HTMLImageElement).naturalHeight || 1);
    const px = Math.max(0, Math.min(w - 1, Math.floor(((e.clientX - rect.left) / rect.width) * w)));
    const py = Math.max(0, Math.min(h - 1, Math.floor(((e.clientY - rect.top) / rect.height) * h)));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(el, 0, 0, w, h);
      const d = ctx.getImageData(px, py, 1, 1).data;
      const hex = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      setChromaKey(chromaPickId, { color: hex });
    } catch {
      /* canvas contaminado (cross-origin): ignora */
    } finally {
      setChromaPickId(null);
    }
  }, [chromaPickId, setChromaKey, clearSelection]);

  // ── Mouse wheel => zoom da camada de MÍDIA selecionada (imagem/vídeo/freeze).
  //    Só age quando há uma camada de mídia selecionada. O preventDefault() é
  //    aplicado via listener NATIVO com `{ passive: false }` (a variante sintética
  //    do React é passiva e não consegue bloquear o scroll da página).
  //    O canvas/9:16 permanece RIGIDO — apenas o transform da camada é escalado.
  const wheelZoomSelectedItem = selectedItem && ["image", "video", "freeze"].includes(selectedItem.kind) ? selectedItem : null;

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !wheelZoomSelectedItem) return;

    const handleCanvasWheel = (event: WheelEvent) => {
      event.preventDefault();

      // José baseline: garante que o "100%" do zoom é o scale atual da camada
      // quando o usuário inicia o gesto (e não o último baseline de outra camada).
      if (!zoomBaseRef.current || zoomBaseRef.current.id !== wheelZoomSelectedItem.id) {
        zoomBaseRef.current = {
          id: wheelZoomSelectedItem.id,
          scaleX: wheelZoomSelectedItem.transform.scaleX ?? 1,
          scaleY: wheelZoomSelectedItem.transform.scaleY ?? 1,
        };
      }

      const sensitivity = 0.001;
      const delta = -event.deltaY * sensitivity;
      const currentZoom = playerZoom ?? 1.0;
      const nextZoom = Math.min(Math.max(0.1, currentZoom + delta), 5.0);

      applyZoomTo(nextZoom);
    };

    el.addEventListener("wheel", handleCanvasWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleCanvasWheel);
  }, [wheelZoomSelectedItem, playerZoom, applyZoomTo]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#08080d] flex items-center justify-center pb-12 overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleCanvasClick}
    >
      <div
        ref={stageRef}
        className="relative bg-black overflow-hidden shadow-2xl"
        style={{
          width: timeline.canvas?.width || timeline.width || 1920,
          height: timeline.canvas?.height || timeline.height || 1080,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {chromaPickId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-[#8b5cf6]/95 text-white text-[11px] font-semibold shadow-lg pointer-events-none whitespace-nowrap">
            🎯 Clique em uma cor do vídeo — será usada no Chroma Key
          </div>
        )}
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); seekTo(Math.max(0, currentTime - 1)); }}
            className="w-7 h-7 rounded bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center transition-all text-white/80"
            title="Frame anterior"
          >
            <span className="text-[10px]">⏮</span>
          </button>
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
          <button
            onClick={(e) => { e.stopPropagation(); seekTo(Math.min(totalDurationFrames - 1, currentTime + 1)); }}
            className="w-7 h-7 rounded bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center transition-all text-white/80"
            title="Próximo frame"
          >
            <span className="text-[10px]">⏭</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); seekTo(0); usePlaybackStore.getState().pause(); }}
            className="w-7 h-7 rounded bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center transition-all text-white/80"
            title="Parar (volta ao início)"
          >
            <span className="text-[10px]">⏹</span>
          </button>
        </div>

        {/* Right Side: Volume, Aspect Ratio and Zoom/Fill Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="w-7 h-7 rounded bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center border border-white/10 transition-all text-white/80"
              title={isMuted ? "Ativar som" : "Silenciar"}
            >
              <span className="text-[10px]">{isMuted ? "🔇" : "🔊"}</span>
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              className="w-20 accent-[#8b5cf6] h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              title="Volume"
            />
          </div>

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

          {/* Zoom: scales ONLY the selected media layer inside the fixed canvas */}
          <div className="relative font-sans">
            <button
              onClick={(e) => { e.stopPropagation(); beginZoomBaseline(); setShowZoomMenu(!showZoomMenu); }}
              disabled={!selectedItem}
              className="h-7 px-2.5 rounded bg-white/5 hover:bg-white/10 active:scale-95 flex items-center gap-1.5 border border-white/10 transition-all font-semibold disabled:opacity-40"
              title="Zoom do conteúdo (clipe selecionado)"
            >
              <span>🔍</span>
              <span>{playerZoom === null ? "Zoom" : `${Math.round(playerZoom * 100)}%`}</span>
            </button>
            {showZoomMenu && (
              <div className="absolute bottom-9 right-0 w-64 bg-[#181824] border border-white/10 rounded shadow-xl p-3 z-50 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>Zoom do Conteúdo</span>
                  <button
                    onClick={() => { resetObjectZoom(); setShowZoomMenu(false); }}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold"
                  >
                    Ajustar
                  </button>
                </div>
                {selectedItem ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); beginZoomBaseline(); applyZoomTo(Math.max(0.5, (playerZoom ?? 1) - 0.1)); }}
                      className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm font-bold active:scale-90"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.05"
                      value={playerZoom ?? 1.0}
                      onPointerDown={(e) => { e.stopPropagation(); beginZoomBaseline(); }}
                      onChange={(e) => applyZoomTo(parseFloat(e.target.value))}
                      className="flex-1 accent-[#8b5cf6] h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); beginZoomBaseline(); applyZoomTo(Math.min(3.0, (playerZoom ?? 1) + 0.1)); }}
                      className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm font-bold active:scale-90"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/50">Selecione um clipe na timeline para aplicar zoom.</p>
                )}
              </div>
            )}
          </div>

          {/* Full Screen Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
            className="h-7 w-7 rounded bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center border border-white/10 transition-all text-sm"
            title="Tela Cheia"
          >
            <span>⤢</span>
          </button>
        </div>
      </div>
    </div>
  );
}
