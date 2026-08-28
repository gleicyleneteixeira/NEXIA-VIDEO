import { useEffect, useMemo, useState } from "react";
import type { TimelineItem } from "@/lib/editor";
import { useVideoThumbnails } from "@/lib/editor/useVideoThumbnails";
import { AudioDecodeService } from "@/services/audioDecodeService";

export type ClipVisualKind = "video" | "audio" | "text" | "sticker";

/** Agrupa o `kind` interno do item no tipo visual da timeline (CapCut-style). */
export function getClipVisualKind(item: TimelineItem): ClipVisualKind {
  switch (item.kind) {
    case "audio": return "audio";
    case "text": return "text";
    case "sticker": return "sticker";
    case "video":
    case "freeze":
    case "image":
    case "solid":
    default: return "video";
  }
}

const KIND_PALETTE: Record<ClipVisualKind, { base: string; solid: string; selected: string }> = {
  video: { base: "#1f2233", solid: "#161826", selected: "#8b5cf6" },
  audio: { base: "#0b3d2e", solid: "#0a2f24", selected: "#34d399" },
  text: { base: "#7c2d12", solid: "#5c2210", selected: "#fb923c" },
  sticker: { base: "#3b1d5e", solid: "#2c1447", selected: "#a78bfa" },
};

/** Waveform determinística e procedural (seed do id do clipe) — nada de peaks reais decodificados. */
function seededBars(seed: string, count: number, min = 0.18, max = 1): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  let prev = 0.5;
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const rnd = (h % 1000) / 1000;
    prev = 0.55 * prev + 0.45 * rnd;
    bars.push(Math.min(max, Math.max(min, prev)));
  }
  return bars;
}

function WaveformBars({
  seed,
  width,
  mode,
  color,
  peaks,
}: {
  seed: string;
  width: number;
  mode: "fill" | "overlay";
  color: string;
  peaks?: number[] | null;
}) {
  const count = Math.max(8, Math.floor(width / 3));
  const procedural = useMemo(() => seededBars(seed, count), [seed, count]);
  const bars = peaks && peaks.length >= 2 ? peaks : procedural;

  return (
    <div className="absolute inset-0 flex items-center justify-between gap-px overflow-hidden">
      {bars.map((b, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full"
          style={{
            height: `${Math.round(b * 100)}%`,
            backgroundColor: mode === "fill" ? color : "#22c55e",
            opacity: mode === "fill" ? 0.85 : 0.9,
          }}
        />
      ))}
    </div>
  );
}

/** Carrega peaks reais de áudio (Web Audio API) e cai para waveform procedural se falhar. */
function ClipWaveform({ src, seed, width, mode, color }: { src?: string; seed: string; width: number; mode: "fill" | "overlay"; color: string }) {
  const count = Math.max(8, Math.floor(width / 3));
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!src) return;
    AudioDecodeService.getAudioPeaks(src, count)
      .then((p) => { if (!cancelled) setPeaks(p.length ? p : null); })
      .catch(() => { if (!cancelled) setPeaks(null); });
    return () => { cancelled = true; };
  }, [src, count]);

  return <WaveformBars seed={seed} width={width} mode={mode} color={color} peaks={peaks} />;
}

function KindGlyph({ kind }: { kind: ClipVisualKind }) {
  const map: Record<ClipVisualKind, string> = {
    video: "▶",
    audio: "♫",
    text: "T",
    sticker: "✦",
  };
  return (
    <span className="w-4 h-4 rounded bg-black/40 text-white/80 flex items-center justify-center text-[9px] font-bold leading-none">
      {map[kind]}
    </span>
  );
}

export default function TimelineClip({
  item,
  pxPerFrame,
  selected,
  onPointerDown,
  onContextMenu,
  onTrimLeft,
  onTrimRight,
  onDragStart,
}: {
  item: TimelineItem;
  pxPerFrame: number;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onTrimLeft?: (e: React.PointerEvent) => void;
  onTrimRight?: (e: React.PointerEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const left = item.startFrame * pxPerFrame;
  const width = Math.max(item.durationInFrames * pxPerFrame, 4);
  const thumbnails = useVideoThumbnails(item);
  const kind = getClipVisualKind(item);
  const palette = KIND_PALETTE[kind];
  const accent = item.color || palette.base;

  const kfs = item.keyframes || {};
  const allKfFrames = new Set<number>();
  for (const prop of Object.keys(kfs)) {
    const arr = kfs[prop as keyof typeof kfs];
    if (arr) arr.forEach((kf) => allKfFrames.add(kf.frame));
  }

  const hasSpeedBadge = item.speed.rate !== 1;
  const hasReverseBadge = item.speed.reverse;
  const hasEffects = item.effects.length > 0;
  const hasAnimation = item.animation?.enter !== "none" || item.animation?.exit !== "none";

  const showFilmstrip = (kind === "video") && (item.kind === "video" || item.kind === "freeze");
  const audioExtracted = !!item.audio?.muted;
  const showWaveformOverlay = (item.kind === "video" || item.kind === "freeze") && !audioExtracted;

  return (
    <div
      className={`timeline-clip absolute top-1 bottom-1 rounded-md cursor-grab active:cursor-grabbing border flex items-center overflow-visible transition-opacity hover:brightness-110 select-none touch-none ${
        selected ? "border-2 border-cyan-400" : "border border-white/[0.07]"
      }`}
      style={{
        left,
        width,
        backgroundColor: palette.solid,
        boxShadow: selected
          ? "0 0 0 2px #22d3ee, 0 2px 10px rgba(34,211,238,0.35)"
          : "0 1px 3px rgba(0,0,0,0.35)",
      }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
    >
      {onTrimLeft && (
        <div
          data-trim-handle
          className="absolute left-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize hover:bg-cyan-300 rounded-l-md bg-cyan-400/70 touch-none select-none"
          onPointerDown={(e) => { e.stopPropagation(); onTrimLeft(e); }}
        />
      )}

      {/* Overlay de progresso do Recorte Automático (IA / CapCut-style) */}
      {item.autoCutout?.isProcessing && (
        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] flex flex-col justify-between p-1 pointer-events-none rounded-md">
          <div className="bg-[#0f3d3e]/90 border border-teal-500/40 rounded px-1.5 py-0.5 text-[10px] text-teal-200 font-medium tracking-wide flex items-center gap-1 w-fit shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span>Aplicando Recorte automático... {item.autoCutout.progress ?? 0}%</span>
          </div>
          <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden">
            <div
              className="bg-teal-400 h-full transition-all duration-150"
              style={{ width: `${item.autoCutout.progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Conteúdo por tipo de mídia ─────────────────────────────── */}
      {kind === "video" && showFilmstrip && thumbnails.length > 0 ? (
        <div className="absolute inset-0 flex overflow-hidden rounded-md pointer-events-none">
          {thumbnails.map((thumb, idx) => (
            <div
              key={idx}
              className="h-full flex-shrink-0 bg-black/30"
              style={{
                width: `${100 / thumbnails.length}%`,
                backgroundImage: `url(${thumb.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ))}
        </div>
      ) : kind === "video" && item.thumb ? (
        <img
          src={item.thumb}
          alt=""
          draggable={false}
          className="timeline-clip-img absolute inset-0 opacity-40 overflow-hidden rounded-md pointer-events-none select-none"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : kind === "audio" ? (
        <div className="absolute inset-0 rounded-md overflow-hidden" style={{ backgroundColor: accent }}>
          <ClipWaveform src={item.src} seed={item.id} width={width} mode="fill" color={accent} />
        </div>
      ) : kind === "text" ? (
        <div className="absolute inset-0 rounded-md overflow-hidden px-2 flex items-center" style={{ backgroundColor: accent }}>
          <span className="text-[10px] text-white/95 truncate font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {(item.text?.content || item.name).replace(/\n/g, " ")}
          </span>
        </div>
      ) : kind === "sticker" ? (
        <div className="absolute inset-0 rounded-md overflow-hidden px-2 flex items-center gap-1.5" style={{ backgroundColor: accent }}>
          <span className="text-sm leading-none">{item.sticker?.emoji || "✨"}</span>
          <span className="text-[10px] text-white/90 truncate font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {item.name}
          </span>
        </div>
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: accent }} />
      )}

      {/* Waveform sobreposto na base dos clipes de vídeo (CapCut-style) */}
      {kind === "video" && showWaveformOverlay && width > 24 && (
        <div className="absolute inset-x-0 bottom-0 h-[40%] overflow-hidden opacity-95 rounded-b-md pointer-events-none">
          <ClipWaveform src={item.src} seed={item.id} width={width} mode="overlay" color="#22c55e" />
        </div>
      )}

      {allKfFrames.size > 0 && (
        <div className="absolute inset-0 pointer-events-none z-15">
          {Array.from(allKfFrames).map((frame) => {
            const x = (frame / item.durationInFrames) * 100;
            return (
              <div
                key={frame}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${x}%` }}
              >
                <div className="w-2 h-2 bg-yellow-400 rotate-45 border border-yellow-600 shadow-sm" />
              </div>
            );
          })}
        </div>
      )}

      {/* Cabeçalho: glyph + nome + badges (puramente visual — não intercepta o clique) */}
      <div className="relative z-10 px-2 flex items-center gap-1 min-w-0 pointer-events-none">
        {width > 34 && <KindGlyph kind={kind} />}
        <span className="text-[10px] text-white/90 truncate font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {item.name}
        </span>
        {hasSpeedBadge && (
          <span className="text-[8px] bg-yellow-500/30 text-yellow-300 px-1 rounded font-bold leading-none">
            {item.speed.rate}x
          </span>
        )}
        {hasReverseBadge && (
          <span className="text-[8px] bg-blue-500/30 text-blue-300 px-1 rounded font-bold leading-none">
            ⟲
          </span>
        )}
        {hasEffects && (
          <span className="text-[8px] bg-purple-500/30 text-purple-300 px-1 rounded font-bold leading-none">
            ✦
          </span>
        )}
        {hasAnimation && (
          <span className="text-[8px] bg-cyan-500/30 text-cyan-300 px-1 rounded font-bold leading-none">
            ▶
          </span>
        )}
      </div>

      {onTrimRight && (
        <div
          data-trim-handle
          className="absolute right-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize hover:bg-cyan-300 rounded-r-md bg-cyan-400/70 touch-none select-none"
          onPointerDown={(e) => { e.stopPropagation(); onTrimRight(e); }}
        />
      )}
    </div>
  );
}