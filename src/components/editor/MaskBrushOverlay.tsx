"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ManualMask } from "@/lib/editor";

interface MaskBrushOverlayProps {
  id: string;
  mask: ManualMask | undefined;
  width: number;
  height: number;
  onCommit: (url: string) => void;
}

/**
 * Overlay de "Recorte Personalizado": camada de desenho sobre o clipe no
 * preview. O pincel pinta branco (mostra) e a borracha apaga (esconde) numa
 * máscara offscreen; o resultado só é serializado (dataURL) ao soltar o
 * ponteiro, para não re-renderizar o preview a cada movimento. O clipe base
 * continua tocando por baixo (o wrapper usa a máscara como mask-image).
 */
export default function MaskBrushOverlay({ id, mask, width, height, onCommit }: MaskBrushOverlayProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastCommittedRef = useRef<string | null>(null);
  const [painting, setPainting] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const brushRadius = Math.max(2, mask?.radius ?? 32);
  const eraser = !!mask?.eraser;

  // ── Redesenha o canvas visível a partir da máscara offscreen ──
  const redraw = useCallback(() => {
    const display = displayRef.current;
    const off = offscreenRef.current;
    if (!display || !off) return;
    const dctx = display.getContext("2d");
    if (!dctx) return;
    dctx.clearRect(0, 0, display.width, display.height);
    dctx.drawImage(off, 0, 0, display.width, display.height);
  }, []);

  // ── Inicializa a máscara: em branco (clipe inteiro visível) ou a partir do
  //    dataURL persistido. Ignora o url quando veio de um commit deste overlay. ──
  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    const off = offscreenRef.current;
    if (!off) return;
    if (off.width !== width || off.height !== height) {
      off.width = width;
      off.height = height;
    }
    const octx = off.getContext("2d");
    if (!octx) return;
    const url = mask?.url;
    if (url && url !== lastCommittedRef.current) {
      const img = new Image();
      img.onload = () => {
        octx.clearRect(0, 0, width, height);
        octx.drawImage(img, 0, 0, width, height);
        redraw();
      };
      img.src = url;
    } else {
      octx.clearRect(0, 0, width, height);
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, width, height);
      lastCommittedRef.current = url ?? null;
      redraw();
    }
  }, [mask?.url, mask?.enabled, width, height, redraw]);

  // Pinta um traço suave (radial) entre dois pontos.
  const stroke = useCallback(
    (from: { x: number; y: number } | null, to: { x: number; y: number }) => {
      const off = offscreenRef.current;
      if (!off) return;
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
      const drawDot = (x: number, y: number) => {
        const g = octx.createRadialGradient(x, y, brushRadius * 0.15, x, y, brushRadius);
        g.addColorStop(0, eraser ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        octx.fillStyle = g;
        octx.beginPath();
        octx.arc(x, y, brushRadius, 0, Math.PI * 2);
        octx.fill();
      };
      drawDot(to.x, to.y);
      if (from) {
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.ceil(dist / (brushRadius * 0.35)));
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          drawDot(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
        }
      }
    },
    [brushRadius, eraser]
  );

  const localPoint = useCallback(
    (e: React.PointerEvent): { x: number; y: number } => {
      const rect = displayRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: Math.min(width, Math.max(0, e.clientX - rect.left)),
        y: Math.min(height, Math.max(0, e.clientY - rect.top)),
      };
    },
    [width, height]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = displayRef.current;
      if (!el) return;
      try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
      const p = localPoint(e);
      lastPointRef.current = p;
      setCursor(p);
      setPainting(true);
      stroke(null, p);
      redraw();
    },
    [localPoint, stroke, redraw]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = localPoint(e);
      setCursor(p);
      if (!painting) return;
      stroke(lastPointRef.current, p);
      lastPointRef.current = p;
      redraw();
    },
    [localPoint, painting, stroke, redraw]
  );

  const handlePointerEnd = useCallback(() => {
    if (!painting) return;
    setPainting(false);
    setCursor(null);
    lastPointRef.current = null;
    const off = offscreenRef.current;
    if (!off) return;
    const url = off.toDataURL("image/png");
    lastCommittedRef.current = url;
    onCommit(url);
  }, [painting, onCommit]);

  // Esc esconde o cursor do pincel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCursor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="absolute inset-0 touch-none" style={{ zIndex: 30, cursor: painting ? "none" : "crosshair" }}>
      {/* Máscara em exibição (opacidade reduzida p/ enxergar o vídeo embaixo) */}
      <canvas
        ref={displayRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.35 }}
        data-mask-overlay={id}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
      {cursor && painting && (
        <div
          className="pointer-events-none absolute rounded-full border-2"
          style={{
            left: cursor.x,
            top: cursor.y,
            width: brushRadius * 2,
            height: brushRadius * 2,
            marginLeft: -brushRadius,
            marginTop: -brushRadius,
            borderColor: eraser ? "#f43f5e" : "#22d3ee",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
          }}
        />
      )}
      {painting && (
        <div className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white/80">
          {eraser ? "Borracha" : "Pincel"} — solte para aplicar
        </div>
      )}
      {!painting && (
        <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white/70">
          Arraste para pintar · Esc esconde o cursor
        </div>
      )}
    </div>
  );
}