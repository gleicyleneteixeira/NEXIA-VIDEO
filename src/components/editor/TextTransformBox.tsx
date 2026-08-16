"use client";

import { useRef } from "react";
import type { TimelineItem } from "@/lib/editor";
import { DEFAULT_TEXT_PROPS } from "@/lib/editor";

interface TextTransformBoxProps {
  item: TimelineItem;
  stageWidth: number;
  stageHeight: number;
  scale: number;
  onMove?: (x: number, y: number) => void;
  onResize?: (fontSize: number) => void;
}

export default function TextTransformBox({
  item,
  stageWidth,
  stageHeight,
  scale,
  onMove,
  onResize,
}: TextTransformBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const text = item.text || DEFAULT_TEXT_PROPS;
  const content = text.content || "Texto";
  const fontSize = text.fontSize ?? 48;

  const left = ((text.x ?? 50) / 100) * stageWidth;
  const top = ((text.y ?? 50) / 100) * stageHeight;

  const handleBodyPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialX = text.x ?? 50;
    const initialY = text.y ?? 50;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / scale;
      const dy = (ev.clientY - startClientY) / scale;
      const nextX = Math.min(100, Math.max(0, initialX + (dx / stageWidth) * 100));
      const nextY = Math.min(100, Math.max(0, initialY + (dy / stageHeight) * 100));
      onMove?.(nextX, nextY);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleHandlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerClientX = rect.left + rect.width / 2;
    const centerClientY = rect.top + rect.height / 2;
    const startDist = Math.hypot(e.clientX - centerClientX, e.clientY - centerClientY);
    const startFontSize = fontSize;

    const onPointerMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - centerClientX, ev.clientY - centerClientY);
      const ratio = startDist === 0 ? 1 : dist / startDist;
      onResize?.(Math.min(400, Math.max(8, Math.round(startFontSize * ratio))));
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleStyle: React.CSSProperties = {
    fontFamily: text.fontFamily || "Arial",
    fontSize: `${fontSize}px`,
    fontWeight: text.fontWeight || "normal",
    fontStyle: text.fontStyle || "normal",
    lineHeight: text.lineHeight || 1.2,
    letterSpacing: text.letterSpacing || 0,
  };

  return (
    <div
      ref={boxRef}
      className="absolute select-none"
      style={{
        left,
        top,
        transform: "translate(-50%, -50%)",
        padding: "8px 12px",
        zIndex: 35,
        cursor: "move",
        touchAction: "none",
      }}
      onPointerDown={handleBodyPointerDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Borda / fundo seleção (dimensões = texto invisível abaixo) */}
      <div className="absolute inset-0 border-2 border-teal-400 bg-teal-400/10 rounded pointer-events-none" />

      {/* Texto invisível: preserva o tamanho real do texto para medir a caixa */}
      <span className="whitespace-nowrap opacity-0 pointer-events-none" style={handleStyle}>
        {content}
      </span>

      {/* Label */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/70 text-teal-300 text-[9px] font-semibold whitespace-nowrap pointer-events-none">
        Texto
      </div>

      {/* Alças nos 4 cantos para redimensionar (fontSize) */}
      <div
        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-teal-500 rounded-full cursor-nwse-resize shadow-lg"
        onPointerDown={handleHandlePointerDown}
      />
      <div
        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-teal-500 rounded-full cursor-nesw-resize shadow-lg"
        onPointerDown={handleHandlePointerDown}
      />
      <div
        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-teal-500 rounded-full cursor-nesw-resize shadow-lg"
        onPointerDown={handleHandlePointerDown}
      />
      <div
        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-teal-500 rounded-full cursor-nwse-resize shadow-lg"
        onPointerDown={handleHandlePointerDown}
      />
    </div>
  );
}