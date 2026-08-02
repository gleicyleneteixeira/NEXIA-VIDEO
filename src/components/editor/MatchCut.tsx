"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useProjectStore, usePlaybackStore } from "@/lib/editor";
import type { BeatMarker } from "@/lib/editor";
import { Music, Plus, Trash2, Play, ChevronLeft, ChevronRight, Zap, Volume2 } from "lucide-react";

export default function MatchCut() {
  const { project, addBeatMarker, removeBeatMarker, clearBeatMarkers } = useProjectStore();
  const { currentTime, seekTo } = usePlaybackStore();

  const markers = project.timeline.beatMarkers;
  const fps = project.timeline.fps;

  const [bpm, setBpm] = useState(120);
  const [pulsing, setPulsing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFrame = Math.round(currentTime * fps);

  const frameToTimecode = useCallback(
    (frame: number) => {
      const totalSeconds = frame / fps;
      const m = Math.floor(totalSeconds / 60);
      const s = Math.floor(totalSeconds % 60);
      const f = frame % fps;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
    },
    [fps]
  );

  const handleMarkBeat = useCallback(() => {
    addBeatMarker(currentFrame);
    setPulsing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulsing(false), 400);
  }, [addBeatMarker, currentFrame]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        if (editingId) return;
        e.preventDefault();
        handleMarkBeat();
      }
    },
    [handleMarkBeat, editingId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSeekTo = useCallback(
    (frame: number) => {
      seekTo(frame / fps);
    },
    [seekTo, fps]
  );

  const handlePrevMarker = useCallback(() => {
    const sorted = [...markers].sort((a, b) => a.frame - b.frame);
    const idx = sorted.findIndex((m) => m.frame >= currentFrame);
    const prevIdx = idx <= 0 ? sorted.length - 1 : idx - 1;
    if (sorted[prevIdx]) handleSeekTo(sorted[prevIdx].frame);
  }, [markers, currentFrame, handleSeekTo]);

  const handleNextMarker = useCallback(() => {
    const sorted = [...markers].sort((a, b) => a.frame - b.frame);
    const idx = sorted.findIndex((m) => m.frame > currentFrame);
    const nextIdx = idx === -1 ? 0 : idx;
    if (sorted[nextIdx]) handleSeekTo(sorted[nextIdx].frame);
  }, [markers, currentFrame, handleSeekTo]);

  const handleGenerateFromBpm = useCallback(() => {
    const totalFrames = Math.max(
      ...markers.map((m) => m.frame),
      currentFrame,
      fps * 60
    );
    const framesPerBeat = Math.round((60 / bpm) * fps);
    if (framesPerBeat < 1) return;
    clearBeatMarkers();
    for (let f = 0; f <= totalFrames; f += framesPerBeat) {
      addBeatMarker(f);
    }
  }, [bpm, fps, markers, currentFrame, addBeatMarker, clearBeatMarkers]);

  const handleClearAll = useCallback(() => {
    if (confirmClear) {
      clearBeatMarkers();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  }, [confirmClear, clearBeatMarkers]);

  const handleExport = useCallback(() => {
    const sorted = [...markers].sort((a, b) => a.frame - b.frame);
    const text = sorted
      .map((m, i) => {
        const tc = frameToTimecode(m.frame);
        const label = m.label ? ` - ${m.label}` : "";
        return `${i + 1}. ${tc} (frame ${m.frame})${label}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
  }, [markers, frameToTimecode]);

  const handleStartEdit = useCallback((marker: BeatMarker) => {
    setEditingId(marker.id);
    setEditLabel(marker.label ?? "");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const marker = markers.find((m) => m.id === editingId);
    if (marker) {
      removeBeatMarker(editingId);
      addBeatMarker(marker.frame, editLabel || undefined);
    }
    setEditingId(null);
    setEditLabel("");
  }, [editingId, editLabel, markers, removeBeatMarker, addBeatMarker]);

  const sorted = [...markers].sort((a, b) => a.frame - b.frame);

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Music size={12} />
          Match Cut / Beat Marker
        </h3>
      </div>

      {/* Mark Beat Button */}
      <div className="p-3 border-b border-[#1a1a28]">
        <button
          onClick={handleMarkBeat}
          className={`w-full py-3 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all ${
            pulsing
              ? "bg-[#db2777] scale-105 shadow-[0_0_20px_rgba(236,72,153,0.5)]"
              : "bg-[#ec4899] hover:bg-[#db2777]"
          }`}
        >
          <Plus size={16} />
          Marcar Batida
        </button>
        <p className="text-[10px] text-gray-600 text-center mt-1.5">
          Pressione <kbd className="px-1 py-0.5 bg-[#1e1e2e] rounded text-gray-400 font-mono">M</kbd> para marcar
        </p>
      </div>

      {/* BPM Auto-Generate */}
      <div className="p-3 border-b border-[#1a1a28]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Zap size={10} />
          Auto BPM
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 bg-[#13131f] border border-[#1e1e2e] rounded px-3 py-2 text-white text-xs focus:border-[#8b5cf6] focus:outline-none"
            min={1}
            max={999}
          />
          <button
            onClick={handleGenerateFromBpm}
            className="px-3 py-2 bg-[#13131f] border border-[#1e1e2e] rounded text-xs text-gray-300 hover:border-[#8b5cf6] hover:text-white transition-colors whitespace-nowrap"
          >
            Gerar Marcadores
          </button>
        </div>
        <p className="text-[9px] text-gray-600 mt-1">
          {bpm} BPM = 1 batida a cada {((60 / bpm) * fps).toFixed(1)} frames
        </p>
      </div>

      {/* Jump Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a28]">
        <button
          onClick={handlePrevMarker}
          disabled={sorted.length === 0}
          className="p-1.5 rounded bg-[#13131f] border border-[#1e1e2e] text-gray-400 hover:text-white hover:border-[#8b5cf6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[10px] text-gray-500 font-mono">
          {frameToTimecode(currentFrame)}
        </span>
        <button
          onClick={handleNextMarker}
          disabled={sorted.length === 0}
          className="p-1.5 rounded bg-[#13131f] border border-[#1e1e2e] text-gray-400 hover:text-white hover:border-[#8b5cf6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Markers List */}
      <div className="px-3 py-2 border-b border-[#1a1a28]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            Marcadores ({sorted.length})
          </p>
          {sorted.length > 0 && (
            <div className="flex gap-1">
              <button
                onClick={handleExport}
                className="px-2 py-1 text-[10px] bg-[#13131f] border border-[#1e1e2e] rounded text-gray-400 hover:text-white hover:border-[#8b5cf6] transition-colors"
              >
                Exportar
              </button>
              <button
                onClick={handleClearAll}
                className={`px-2 py-1 text-[10px] border rounded transition-colors ${
                  confirmClear
                    ? "bg-red-500 border-red-500 text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:text-red-400 hover:border-red-500"
                }`}
              >
                <Trash2 size={10} className="inline mr-1" />
                {confirmClear ? "Confirmar" : "Limpar"}
              </button>
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-xs">
            Nenhum marcador. Clique em &quot;Marcar Batida&quot; ou pressione <kbd className="px-1 py-0.5 bg-[#1e1e2e] rounded font-mono">M</kbd>.
          </div>
        ) : (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {sorted.map((marker, i) => (
              <div
                key={marker.id}
                className="bg-[#13131f] border border-[#1e1e2e] rounded-lg p-2 flex items-center gap-2 hover:border-[#8b5cf6] transition-colors group"
              >
                <span className="w-5 h-5 flex items-center justify-center rounded bg-[#1e1e2e] text-[10px] text-gray-500 font-mono shrink-0">
                  {i + 1}
                </span>
                <button
                  onClick={() => handleSeekTo(marker.frame)}
                  className="text-[10px] text-gray-400 font-mono hover:text-[#8b5cf6] transition-colors shrink-0"
                >
                  {frameToTimecode(marker.frame)}
                </button>
                {editingId === marker.id ? (
                  <input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditLabel("");
                      }
                    }}
                    className="flex-1 bg-[#0d0d16] border border-[#8b5cf6] rounded px-2 py-0.5 text-[10px] text-white focus:outline-none min-w-0"
                    placeholder="Ex: Drop, Chorus..."
                  />
                ) : (
                  <button
                    onClick={() => handleStartEdit(marker)}
                    className="flex-1 text-left text-[10px] text-gray-500 truncate hover:text-gray-300 transition-colors min-w-0"
                  >
                    {marker.label || <span className="italic text-gray-600">Adicionar label...</span>}
                  </button>
                )}
                <button
                  onClick={() => removeBeatMarker(marker.id)}
                  className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 flex items-center gap-2 text-[9px] text-gray-600">
        <Volume2 size={10} />
        <span>Os marcadores aparecem como diamantes amarelos na timeline</span>
      </div>
    </div>
  );
}
