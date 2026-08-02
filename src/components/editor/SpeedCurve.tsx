"use client";
import { useRef, useState, useCallback, useMemo } from "react";
import type { SpeedCurvePoint } from "@/lib/editor";
import { Plus, Trash2, RotateCcw } from "lucide-react";

interface SpeedCurveProps {
  points: SpeedCurvePoint[];
  durationInFrames: number;
  onChange: (points: SpeedCurvePoint[]) => void;
}

const SVG_W = 300;
const SVG_H = 120;
const MIN_SPEED = 0;
const MAX_SPEED = 4;
const PADDING = { top: 10, right: 10, bottom: 10, left: 10 };
const DRAW_W = SVG_W - PADDING.left - PADDING.right;
const DRAW_H = SVG_H - PADDING.top - PADDING.bottom;
const POINT_R = 6;

function frameToX(frame: number, duration: number) {
  return PADDING.left + (frame / Math.max(duration, 1)) * DRAW_W;
}
function speedToY(speed: number) {
  return PADDING.top + (1 - speed / MAX_SPEED) * DRAW_H;
}
function xToFrame(x: number, duration: number) {
  return Math.round(((x - PADDING.left) / DRAW_W) * duration);
}
function yToSpeed(y: number) {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, (1 - (y - PADDING.top) / DRAW_H) * MAX_SPEED));
}

function clampFrame(f: number, max: number) {
  return Math.max(0, Math.min(max, f));
}
function clampSpeed(s: number) {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, s));
}

function defaultPoints(duration: number): SpeedCurvePoint[] {
  return [
    { frame: 0, speed: 1, easing: "linear" },
    { frame: duration, speed: 1, easing: "linear" },
  ];
}

const PRESETS: Record<string, (duration: number) => SpeedCurvePoint[]> = {
  "Constante": (d) => [
    { frame: 0, speed: 1, easing: "linear" },
    { frame: d, speed: 1, easing: "linear" },
  ],
  "Acelerar": (d) => [
    { frame: 0, speed: 0.5, easing: "linear" },
    { frame: d, speed: 2, easing: "linear" },
  ],
  "Desacelerar": (d) => [
    { frame: 0, speed: 2, easing: "linear" },
    { frame: d, speed: 0.5, easing: "linear" },
  ],
  "Drama": (d) => [
    { frame: 0, speed: 1, easing: "linear" },
    { frame: Math.round(d * 0.33), speed: 0.3, easing: "linear" },
    { frame: Math.round(d * 0.66), speed: 2, easing: "linear" },
    { frame: d, speed: 1, easing: "linear" },
  ],
};

function curvePath(points: SpeedCurvePoint[], duration: number) {
  if (points.length === 0) return "";
  const sorted = [...points].sort((a, b) => a.frame - b.frame);
  const cmds = sorted.map((p, i) => {
    const x = frameToX(p.frame, duration);
    const y = speedToY(p.speed);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return cmds.join(" ");
}

function hitTestPoint(
  mx: number,
  my: number,
  points: SpeedCurvePoint[],
  duration: number
): number {
  for (let i = 0; i < points.length; i++) {
    const px = frameToX(points[i].frame, duration);
    const py = speedToY(points[i].speed);
    const dx = mx - px;
    const dy = my - py;
    if (Math.sqrt(dx * dx + dy * dy) <= POINT_R + 4) return i;
  }
  return -1;
}

function findClosestSegment(
  mx: number,
  my: number,
  points: SpeedCurvePoint[],
  duration: number
): { idx: number; frame: number } | null {
  const sorted = [...points].sort((a, b) => a.frame - b.frame);
  let bestDist = Infinity;
  let bestIdx = -1;
  let bestFrame = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const x1 = frameToX(sorted[i].frame, duration);
    const y1 = speedToY(sorted[i].speed);
    const x2 = frameToX(sorted[i + 1].frame, duration);
    const y2 = speedToY(sorted[i + 1].speed);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((mx - x1) * dx + (my - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.sqrt((mx - projX) ** 2 + (my - projY) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
      bestFrame = Math.round(sorted[i].frame + t * (sorted[i + 1].frame - sorted[i].frame));
    }
  }
  if (bestDist > 30) return null;
  return { idx: bestIdx, frame: bestFrame };
}

export default function SpeedCurve({
  points,
  durationInFrames,
  onChange,
}: SpeedCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ idx: number; offsetFrame: number; offsetSpeed: number } | null>(null);

  const sortedPoints = useMemo(() => [...points].sort((a, b) => a.frame - b.frame), [points]);

  const getSVGCoords = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_W / rect.width;
      const scaleY = SVG_H / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const coords = getSVGCoords(e);
      if (!coords) return;

      const hitIdx = hitTestPoint(coords.x, coords.y, points, durationInFrames);
      if (hitIdx >= 0) {
        const pt = sortedPoints.find((_, i) => {
          const globalIdx = points.findIndex(
            (p) => p.frame === sortedPoints[hitIdx].frame && p.speed === sortedPoints[hitIdx].speed
          );
          return globalIdx === hitIdx;
        });
        const globalIdx = points.findIndex(
          (p) =>
            p.frame === sortedPoints[hitIdx].frame &&
            p.speed === sortedPoints[hitIdx].speed
        );
        const svgX = frameToX(sortedPoints[hitIdx].frame, durationInFrames);
        const svgY = speedToY(sortedPoints[hitIdx].speed);
        setDragging({
          idx: globalIdx,
          offsetFrame: xToFrame(coords.x, durationInFrames) - sortedPoints[hitIdx].frame,
          offsetSpeed: yToSpeed(coords.y) - sortedPoints[hitIdx].speed,
        });
        setSelectedIdx(globalIdx);
        e.preventDefault();
        return;
      }

      if (e.detail === 2) {
        const segment = findClosestSegment(coords.x, coords.y, points, durationInFrames);
        if (segment) {
          const newFrame = clampFrame(segment.frame, durationInFrames);
          const newSpeed = 1;
          const newPoints = [...points, { frame: newFrame, speed: newSpeed, easing: "linear" as const }];
          onChange(newPoints);
          setSelectedIdx(newPoints.length - 1);
        }
      }
    },
    [points, sortedPoints, durationInFrames, onChange, getSVGCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const coords = getSVGCoords(e);
      if (!coords) return;

      const rawFrame = xToFrame(coords.x, durationInFrames) - dragging.offsetFrame;
      const rawSpeed = yToSpeed(coords.y) - dragging.offsetSpeed;
      const newFrame = clampFrame(rawFrame, durationInFrames);
      const newSpeed = clampSpeed(rawSpeed);

      const updated = [...points];
      updated[dragging.idx] = {
        ...updated[dragging.idx],
        frame: newFrame,
        speed: Math.round(newSpeed * 100) / 100,
      };
      onChange(updated);
    },
    [dragging, points, durationInFrames, onChange, getSVGCoords]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleClickSvg = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      const coords = getSVGCoords(e);
      if (!coords) return;

      const hitIdx = hitTestPoint(coords.x, coords.y, points, durationInFrames);
      if (hitIdx >= 0) {
        setSelectedIdx(hitIdx);
      } else {
        setSelectedIdx(null);
      }
    },
    [dragging, points, durationInFrames, getSVGCoords]
  );

  const addPoint = useCallback(() => {
    const midFrame = Math.round(durationInFrames / 2);
    const newPoints = [...points, { frame: midFrame, speed: 1, easing: "linear" as const }];
    onChange(newPoints);
    setSelectedIdx(newPoints.length - 1);
  }, [points, durationInFrames, onChange]);

  const deleteSelected = useCallback(() => {
    if (selectedIdx === null) return;
    if (points.length <= 2) return;
    const updated = points.filter((_, i) => i !== selectedIdx);
    onChange(updated);
    setSelectedIdx(null);
  }, [points, selectedIdx, onChange]);

  const resetPoints = useCallback(() => {
    onChange(defaultPoints(durationInFrames));
    setSelectedIdx(null);
  }, [durationInFrames, onChange]);

  const applyPreset = useCallback(
    (name: string) => {
      const fn = PRESETS[name];
      if (fn) {
        onChange(fn(durationInFrames));
        setSelectedIdx(null);
      }
    },
    [durationInFrames, onChange]
  );

  const pathD = curvePath(points, durationInFrames);

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i <= 4; i++) {
      const y = speedToY(i);
      lines.push({ x1: PADDING.left, y1: y, x2: SVG_W - PADDING.right, y2: y });
    }
    const frameStep = Math.max(1, Math.ceil(durationInFrames / 6));
    for (let f = 0; f <= durationInFrames; f += frameStep) {
      const x = frameToX(f, durationInFrames);
      lines.push({ x1: x, y1: PADDING.top, x2: x, y2: SVG_H - PADDING.bottom });
    }
    return lines;
  }, [durationInFrames]);

  return (
    <div className="flex flex-col gap-2" style={{ background: "#0d0d16", border: "1px solid #1e1e2e", borderRadius: 8, padding: 12 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium" style={{ color: "#8b5cf6" }}>
          Curva de Velocidade
        </span>
        <div className="flex gap-1 ml-auto">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: "#1e1e2e", color: "#a0a0b0", border: "1px solid #2a2a3e" }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{ background: "#13131f", borderRadius: 6, cursor: dragging ? "grabbing" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClickSvg}
      >
        {gridLines.map((g, i) => (
          <line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="#1e1e2e" strokeWidth={0.5} />
        ))}

        <text x={PADDING.left - 2} y={speedToY(4) + 3} fill="#555" fontSize={7} textAnchor="end">4x</text>
        <text x={PADDING.left - 2} y={speedToY(2) + 3} fill="#555" fontSize={7} textAnchor="end">2x</text>
        <text x={PADDING.left - 2} y={speedToY(1) + 3} fill="#555" fontSize={7} textAnchor="end">1x</text>
        <text x={PADDING.left - 2} y={speedToY(0) + 3} fill="#555" fontSize={7} textAnchor="end">0x</text>

        <text x={PADDING.left} y={SVG_H - 2} fill="#555" fontSize={6}>0</text>
        <text x={SVG_W - PADDING.right} y={SVG_H - 2} fill="#555" fontSize={6} textAnchor="end">
          {durationInFrames}f
        </text>

        {pathD && (
          <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinejoin="round" />
        )}

        {sortedPoints.map((pt, i) => {
          const cx = frameToX(pt.frame, durationInFrames);
          const cy = speedToY(pt.speed);
          const isSelected = selectedIdx !== null &&
            points[selectedIdx].frame === pt.frame &&
            points[selectedIdx].speed === pt.speed;
          return (
            <g key={`${pt.frame}-${pt.speed}-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={POINT_R}
                fill={isSelected ? "#ec4899" : "#8b5cf6"}
                stroke="white"
                strokeWidth={2}
                style={{ cursor: "grab" }}
              />
              {isSelected && (
                <text
                  x={cx}
                  y={cy - POINT_R - 4}
                  fill="#ec4899"
                  fontSize={7}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {pt.frame}f / {pt.speed.toFixed(1)}x
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-col gap-1" style={{ maxHeight: 120, overflowY: "auto" }}>
        {sortedPoints.map((pt, i) => {
          const globalIdx = points.findIndex(
            (p) => p.frame === pt.frame && p.speed === pt.speed
          );
          const isSelected = selectedIdx === globalIdx;
          return (
            <div
              key={`${pt.frame}-${pt.speed}-${i}`}
              className="flex items-center gap-2 text-xs px-2 py-1 rounded cursor-pointer"
              style={{
                background: isSelected ? "#1e1e2e" : "transparent",
                color: isSelected ? "#ec4899" : "#a0a0b0",
              }}
              onClick={() => setSelectedIdx(globalIdx)}
            >
              <span style={{ width: 48 }}>#{i + 1}</span>
              <span style={{ width: 56 }}>{pt.frame}f</span>
              <span style={{ width: 40 }}>{pt.speed.toFixed(1)}x</span>
              <span
                className="ml-1 text-xs px-1 rounded"
                style={{ background: "#2a2a3e", color: "#666", fontSize: 9 }}
              >
                {pt.easing}
              </span>
              {points.length > 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIdx(globalIdx);
                    setTimeout(() => {
                      const updated = points.filter((_, j) => j !== globalIdx);
                      onChange(updated);
                      setSelectedIdx(null);
                    }, 0);
                  }}
                  className="ml-auto p-0.5 rounded hover:opacity-80"
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={addPoint}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{ background: "#1e1e2e", color: "#8b5cf6", border: "1px solid #2a2a3e" }}
        >
          <Plus size={12} /> Adicionar
        </button>
        <button
          onClick={deleteSelected}
          disabled={selectedIdx === null || points.length <= 2}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded disabled:opacity-30"
          style={{ background: "#1e1e2e", color: "#ef4444", border: "1px solid #2a2a3e" }}
        >
          <Trash2 size={12} /> Remover
        </button>
        <button
          onClick={resetPoints}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded ml-auto"
          style={{ background: "#1e1e2e", color: "#a0a0b0", border: "1px solid #2a2a3e" }}
        >
          <RotateCcw size={12} /> Resetar
        </button>
      </div>
    </div>
  );
}
