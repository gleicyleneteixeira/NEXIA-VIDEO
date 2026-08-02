"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2,
  Volume2, VolumeX, Eye, EyeOff, Lock, Unlock, Plus,
  ZoomIn, ZoomOut, Snowflake, Rewind, FlipHorizontal, FlipVertical,
  RotateCw, Crop, AlignLeft, AlignRight, Undo2, Redo2, Bookmark, ChevronDown
} from "lucide-react";
import { useProjectStore, usePlaybackStore, useUIStore, useMediaStore } from "@/lib/editor";
import type { TimelineItem, BeatMarker, MediaFile } from "@/lib/editor";
import { DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, generateId } from "@/lib/editor";
import { useVideoThumbnails } from "@/lib/editor/useVideoThumbnails";

const TRACK_HEIGHT = 64;
const RULER_HEIGHT = 32;

export default function Timeline() {
  const {
    project, splitItem, removeItem, duplicateItem, updateItem, updateTrack,
    freezeFrame, reverseItem, mirrorItem, rotateItem, addBeatMarker,
    addTrack, removeTrack, reorderTracks, setKeyframe, removeKeyframe
  } = useProjectStore();
  const { isPlaying, currentTime, togglePlayback, seekTo, setCurrentTime } = usePlaybackStore();
  const { selectedIds, select, clearSelection, zoom, zoomIn, zoomOut, undo, redo, canUndo, canRedo } = useUIStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, frame: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [draggedTrackIndex, setDraggedTrackIndex] = useState<number | null>(null);
  const [showTransformMenu, setShowTransformMenu] = useState(false);

  const timeline = project.timeline;
  const pxPerFrame = zoom * 2;

  const selectedItem = useMemo(() => {
    return timeline.items.find((i: TimelineItem) => selectedIds.has(i.id)) || null;
  }, [timeline.items, selectedIds]);

  const trimStartToPlayhead = useCallback(() => {
    if (!selectedItem) return;
    const { startFrame, durationInFrames, srcInFrame } = selectedItem;
    if (currentTime > startFrame && currentTime < startFrame + durationInFrames) {
      const diff = currentTime - startFrame;
      updateItem(selectedItem.id, {
        startFrame: currentTime,
        durationInFrames: durationInFrames - diff,
        srcInFrame: (srcInFrame || 0) + diff,
      });
    }
  }, [selectedItem, currentTime, updateItem]);

  const trimEndToPlayhead = useCallback(() => {
    if (!selectedItem) return;
    const { startFrame, durationInFrames } = selectedItem;
    if (currentTime > startFrame && currentTime < startFrame + durationInFrames) {
      const newDuration = currentTime - startFrame;
      updateItem(selectedItem.id, {
        durationInFrames: newDuration,
      });
    }
  }, [selectedItem, currentTime, updateItem]);

  const hasAnyKeyframeAtPlayhead = useMemo(() => {
    if (!selectedItem) return false;
    const localFrame = Math.round(currentTime - selectedItem.startFrame);
    const props: ("x" | "y" | "scaleX" | "scaleY" | "rotation" | "opacity")[] = ["x", "y", "scaleX", "scaleY", "rotation", "opacity"];
    return props.some((prop) => {
      const kfs = selectedItem.keyframes?.[prop] || [];
      return kfs.some((kf) => kf.frame === localFrame);
    });
  }, [selectedItem, currentTime]);

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

  const handleTrackDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    setDraggedTrackIndex(index);
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTrackDropOnTrack = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndexStr = e.dataTransfer.getData("text/plain");
    const fromIndex = fromIndexStr !== "" ? parseInt(fromIndexStr, 10) : draggedTrackIndex;
    if (fromIndex !== null && fromIndex !== undefined && fromIndex !== toIndex) {
      reorderTracks(fromIndex, toIndex);
    }
    setDraggedTrackIndex(null);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isPlaying) return;
    const playheadX = currentTime * pxPerFrame;
    const visibleLeft = el.scrollLeft;
    const visibleRight = visibleLeft + el.clientWidth;
    const margin = el.clientWidth * 0.15;
    if (playheadX > visibleRight - margin) {
      el.scrollLeft = playheadX - el.clientWidth * 0.2;
    } else if (playheadX < visibleLeft + margin) {
      el.scrollLeft = Math.max(0, playheadX - el.clientWidth * 0.2);
    }
  }, [currentTime, isPlaying, pxPerFrame]);

  const handleTrackDrop = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const mediaId = e.dataTransfer.getData("application/media-id");
    if (!mediaId) return;

    const { files } = useMediaStore.getState();
    const media = files.find((f: MediaFile) => f.id === mediaId);
    if (!media) return;

    const track = timeline.tracks[trackId];
    if (!track) return;
    if (media.type === "audio" && track.kind !== "audio") return;
    if (media.type !== "audio" && track.kind === "audio") return;

    const lastItem = timeline.items
      .filter((i: TimelineItem) => i.trackId === trackId)
      .sort((a: TimelineItem, b: TimelineItem) => (a.startFrame + a.durationInFrames) - (b.startFrame + b.durationInFrames))
      .pop();

    const startFrame = lastItem ? lastItem.startFrame + lastItem.durationInFrames : 0;
    const duration = media.duration ? Math.ceil(media.duration * timeline.fps) : timeline.fps * 5;

    const item: TimelineItem = {
      id: generateId(),
      trackId,
      startFrame,
      durationInFrames: duration,
      name: media.name,
      kind: media.type === "image" ? "image" : media.type,
      src: media.url,
      file: media.file,
      srcInFrame: 0,
      srcOutFrame: duration,
      transform: { ...DEFAULT_TRANSFORM },
      filters: { ...DEFAULT_FILTERS },
      crop: { ...DEFAULT_CROP },
      mask: { ...DEFAULT_MASK },
      chromaKey: { ...DEFAULT_CHROMA_KEY },
      blendMode: "normal",
      speed: { ...DEFAULT_SPEED },
      animation: { ...DEFAULT_ANIMATION },
      audio: { ...DEFAULT_AUDIO },
      effects: [],
      hsl: {},
      filterPreset: "none",
      keyframes: {},
    };

    useProjectStore.getState().addItem(item);
  }, [timeline]);

  const totalDuration = useMemo(() => {
    if (timeline.items.length === 0) return timeline.fps * 10;
    const maxEnd = Math.max(...timeline.items.map((i: TimelineItem) => i.startFrame + i.durationInFrames));
    return Math.max(maxEnd + timeline.fps * 2, timeline.fps * 10);
  }, [timeline.items, timeline.fps]);

  const totalWidth = totalDuration * pxPerFrame;

  const frameToPixel = useCallback((frame: number) => frame * pxPerFrame, [pxPerFrame]);
  const pixelToFrame = useCallback((px: number) => Math.round(px / pxPerFrame), [pxPerFrame]);

  const formatTime = (frame: number) => {
    const totalSeconds = frame / timeline.fps;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const frames = frame % timeline.fps;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const frame = pixelToFrame(x);
    window.dispatchEvent(new Event("timeline-user-seek"));
    seekTo(frame);
  }, [pixelToFrame, scrollLeft, seekTo]);

  const handlePlayheadDrag = useCallback((e: React.MouseEvent) => {
    if (!isDraggingPlayhead) return;
    const container = containerRef.current;
    if (!container) return;
    const rulerEl = container.querySelector("[data-ruler]");
    if (!rulerEl) return;
    const rect = rulerEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = pixelToFrame(Math.max(0, x));
    window.dispatchEvent(new Event("timeline-user-seek"));
    setCurrentTime(frame);
  }, [isDraggingPlayhead, pixelToFrame, setCurrentTime]);

  const handleItemMouseDown = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    if (e.detail === 2) return;
    if (e.button === 2) return;
    select(item.id, e.shiftKey || e.ctrlKey || e.metaKey);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      frame: item.startFrame,
    });
    setDragItemId(item.id);
  }, [select]);

  const handleItemContextMenu = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    e.preventDefault();
    e.stopPropagation();
    select(item.id, false);
    setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id });
  }, [select]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const contextMenuActions = useMemo(() => {
    if (!contextMenu) return [];
    return [
      { label: "Dividir", icon: Scissors, action: () => { splitItem(contextMenu.itemId, currentTime); clearSelection(); } },
      { label: "Duplicar", icon: Copy, action: () => { duplicateItem(contextMenu.itemId); } },
      { label: "Congelar Frame", icon: Snowflake, action: () => { freezeFrame(contextMenu.itemId, currentTime); } },
      { label: "Inverter", icon: Rewind, action: () => { reverseItem(contextMenu.itemId); } },
      { label: "Espelhar Horizontal", icon: FlipHorizontal, action: () => { mirrorItem(contextMenu.itemId, "h"); } },
      { label: "Espelhar Vertical", icon: FlipVertical, action: () => { mirrorItem(contextMenu.itemId, "v"); } },
      { label: "Girar 90°", icon: RotateCw, action: () => { rotateItem(contextMenu.itemId, 90); } },
      { label: "Excluir", icon: Trash2, action: () => { removeItem(contextMenu.itemId); clearSelection(); } },
    ];
  }, [contextMenu, currentTime, splitItem, clearSelection, duplicateItem, freezeFrame, reverseItem, mirrorItem, rotateItem, removeItem]);

  const handleItemDrag = useCallback((e: React.MouseEvent) => {
    if (!dragItemId) return;
    const container = containerRef.current;
    if (!container) return;
    const contentEl = container.querySelector("[data-timeline-content]");
    if (!contentEl) return;
    const rect = contentEl.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft - dragOffset.x;
    const frame = pixelToFrame(Math.max(0, x));
    updateItem(dragItemId, { startFrame: frame });
  }, [dragItemId, dragOffset, pixelToFrame, scrollLeft, updateItem]);

  const handleTrimLeft = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    const startX = e.clientX;
    const startFrame = item.startFrame;
    const startDuration = item.durationInFrames;
    const startSrcIn = item.srcInFrame || 0;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dFrames = pixelToFrame(dx);
      const newStart = Math.max(0, startFrame + dFrames);
      const newDuration = startDuration - (newStart - startFrame);
      if (newDuration >= 1) {
        updateItem(item.id, {
          startFrame: newStart,
          durationInFrames: newDuration,
          srcInFrame: startSrcIn + (newStart - startFrame),
        });
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pixelToFrame, updateItem]);

  const handleTrimRight = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    const startX = e.clientX;
    const startDuration = item.durationInFrames;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dFrames = pixelToFrame(dx);
      const newDuration = Math.max(1, startDuration + dFrames);
      updateItem(item.id, { durationInFrames: newDuration });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pixelToFrame, updateItem]);

  const handleTrackItemDrop = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData("application/timeline-item");
    if (itemId) {
      updateItem(itemId, { trackId });
      return;
    }
  }, [updateItem]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) clearSelection();
    closeContextMenu();
  }, [clearSelection, closeContextMenu]);

  useEffect(() => {
    if (!isDraggingPlayhead && !dragItemId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const me = e as unknown as React.MouseEvent;
      if (isDraggingPlayhead) handlePlayheadDrag(me);
      if (dragItemId) handleItemDrag(me);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setDragItemId(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPlayhead, dragItemId, handlePlayheadDrag, handleItemDrag]);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [closeContextMenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlayback();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        selectedIds.forEach((id: string) => removeItem(id));
        clearSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        selectedIds.forEach((id: string) => duplicateItem(id));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (canUndo()) undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        if (canRedo()) redo();
      }
      if (e.key === "q" || e.key === "Q") {
        trimStartToPlayhead();
      }
      if (e.key === "w" || e.key === "W") {
        trimEndToPlayhead();
      }
      if (e.key === "s" || e.key === "S" || ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B"))) {
        e.preventDefault();
        selectedIds.forEach((id: string) => {
          splitItem(id, currentTime);
        });
        clearSelection();
      }
      if (e.key === "ArrowLeft") {
        window.dispatchEvent(new Event("timeline-user-seek"));
        seekTo(Math.max(0, currentTime - 1));
      }
      if (e.key === "ArrowRight") {
        window.dispatchEvent(new Event("timeline-user-seek"));
        seekTo(currentTime + 1);
      }
      if (e.key === "m" || e.key === "M") {
        addBeatMarker(currentTime);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIds, currentTime, togglePlayback, removeItem, duplicateItem,
    clearSelection, seekTo, addBeatMarker, trimStartToPlayhead, trimEndToPlayhead,
    splitItem, undo, redo, canUndo, canRedo
  ]);

  const playheadX = frameToPixel(currentTime);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0a12] border-t border-[#1e1e2e] select-none"
      onMouseMove={isDraggingPlayhead ? handlePlayheadDrag : undefined}
      onMouseUp={() => { setIsDraggingPlayhead(false); setDragItemId(null); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0d0d16] border-b border-[#1e1e2e]">
        <button onClick={togglePlayback} className="p-1.5 hover:bg-[#1e1e2e] rounded text-white" title={isPlaying ? "Pausar" : "Reproduzir"}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button onClick={() => { window.dispatchEvent(new Event("timeline-user-seek")); seekTo(0); }} className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400" title="Início">
          <SkipBack size={14} />
        </button>
        <button onClick={() => { window.dispatchEvent(new Event("timeline-user-seek")); seekTo(totalDuration); }} className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400" title="Fim">
          <SkipForward size={14} />
        </button>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <span className="text-xs text-[#a0a0b0] font-mono min-w-[80px]">
          {formatTime(currentTime)}
        </span>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <button onClick={undo} disabled={!canUndo()} className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30" title="Desfazer (Ctrl+Z)">
          <Undo2 size={14} />
        </button>
        <button onClick={redo} disabled={!canRedo()} className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30" title="Refazer (Ctrl+Y / Ctrl+Shift+Z)">
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <button
          onClick={() => selectedIds.forEach((id: string) => { splitItem(id, currentTime); clearSelection(); })}
          disabled={selectedIds.size === 0}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Cortar no playhead (Dividir) (S / Ctrl+B)"
        >
          <Scissors size={14} />
        </button>
        <button
          onClick={trimStartToPlayhead}
          disabled={!selectedItem || currentTime <= selectedItem.startFrame || currentTime >= selectedItem.startFrame + selectedItem.durationInFrames}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Excluir à Esquerda (Q)"
        >
          <AlignLeft size={14} />
        </button>
        <button
          onClick={trimEndToPlayhead}
          disabled={!selectedItem || currentTime <= selectedItem.startFrame || currentTime >= selectedItem.startFrame + selectedItem.durationInFrames}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Excluir à Direita (W)"
        >
          <AlignRight size={14} />
        </button>
        <button
          onClick={() => { selectedIds.forEach((id: string) => removeItem(id)); clearSelection(); }}
          disabled={selectedIds.size === 0}
          className="p-1.5 hover:bg-red-900/30 rounded text-red-400 disabled:opacity-30"
          title="Excluir (Delete / Backspace)"
        >
          <Trash2 size={14} />
        </button>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <button
          onClick={() => addBeatMarker(currentTime)}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
          title="Adicionar Marcador (M)"
        >
          <Bookmark size={14} />
        </button>
        <button
          onClick={() => selectedItem && updateItem(selectedItem.id, { crop: { ...selectedItem.crop, enabled: !selectedItem.crop.enabled } })}
          disabled={!selectedItem}
          className={`p-1.5 rounded disabled:opacity-30 ${selectedItem?.crop?.enabled ? "bg-purple-500/20 text-purple-400 border border-purple-500/50" : "text-gray-400 hover:bg-[#1e1e2e]"}`}
          title="Recortar (Crop)"
        >
          <Crop size={14} />
        </button>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <div className="relative">
          <button
            onClick={() => setShowTransformMenu(!showTransformMenu)}
            disabled={selectedIds.size === 0}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30 flex items-center gap-0.5"
            title="Transformar"
          >
            <RotateCw size={14} />
            <ChevronDown size={10} />
          </button>
          {showTransformMenu && selectedIds.size > 0 && (
            <div className="absolute top-8 left-0 w-44 bg-[#181824] border border-white/10 rounded shadow-xl py-1 z-50 text-[11px] text-white">
              <button
                onClick={() => {
                  selectedIds.forEach((id: string) => freezeFrame(id, currentTime));
                  setShowTransformMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2"
              >
                <Snowflake size={12} />
                <span>Congelar (Freeze)</span>
              </button>
              <button
                onClick={() => {
                  selectedIds.forEach((id: string) => reverseItem(id));
                  setShowTransformMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2"
              >
                <Rewind size={12} />
                <span>Reverso</span>
              </button>
              <button
                onClick={() => {
                  selectedIds.forEach((id: string) => mirrorItem(id, "h"));
                  setShowTransformMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2"
              >
                <FlipHorizontal size={12} />
                <span>Espelhar (Mirror)</span>
              </button>
              <button
                onClick={() => {
                  selectedIds.forEach((id: string) => rotateItem(id, 90));
                  setShowTransformMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2"
              >
                <RotateCw size={12} />
                <span>Girar (Rotate 90°)</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <button
          onClick={() => addTrack("video")}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
          title="Adicionar camada de vídeo"
        >
          <Plus size={14} />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button onClick={() => zoomOut()} className="p-1 hover:bg-[#1e1e2e] rounded text-gray-400" title="Zoom -">
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => zoomIn()} className="p-1 hover:bg-[#1e1e2e] rounded text-gray-400" title="Zoom +">
            <ZoomIn size={14} />
          </button>
        </div>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <button
          onClick={handleMainKeyframeToggle}
          disabled={!selectedItem}
          className={`p-1.5 rounded transition-all flex items-center justify-center ${
            hasAnyKeyframeAtPlayhead
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30"
              : "text-gray-400 hover:bg-[#1e1e2e] disabled:opacity-30 border border-transparent"
          }`}
          title={hasAnyKeyframeAtPlayhead ? "Remover Keyframe" : "Adicionar Keyframe"}
        >
          <span className="text-sm leading-none font-bold">◆</span>
        </button>

      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[180px] flex-shrink-0 bg-[#0d0d16] border-r border-[#1e1e2e] flex flex-col">
          <div className="h-8 border-b border-[#1e1e2e] flex items-center px-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Faixas</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {timeline.trackOrder.map((trackId: string, idx: number) => {
              const track = timeline.tracks[trackId];
              if (!track) return null;
              return (
                <div
                  key={trackId}
                  className={`flex items-center gap-2 px-3 border-b border-[#1a1a28] cursor-grab active:cursor-grabbing hover:bg-[#1a1a28]/50 transition-colors ${
                    draggedTrackIndex === idx ? "opacity-40 bg-[#1e1e2e]" : ""
                  }`}
                  style={{ height: TRACK_HEIGHT }}
                  draggable
                  onDragStart={(e) => handleTrackDragStart(e, idx)}
                  onDragOver={handleTrackDragOver}
                  onDrop={(e) => handleTrackDropOnTrack(e, idx)}
                >
                  <span className="flex-1 text-xs text-[#a0a0b0] truncate font-medium flex items-center gap-1">
                    <span className="text-gray-600 text-[10px] select-none">☰</span>
                    {track.name}
                  </span>
                  <button
                    onClick={() => updateTrack(trackId, { hidden: !track.hidden })}
                    className="p-0.5 hover:bg-[#1e1e2e] rounded text-gray-500"
                  >
                    {track.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    onClick={() => updateTrack(trackId, { muted: !track.muted })}
                    className="p-0.5 hover:bg-[#1e1e2e] rounded text-gray-500"
                  >
                    {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  <button
                    onClick={() => updateTrack(trackId, { locked: !track.locked })}
                    className="p-0.5 hover:bg-[#1e1e2e] rounded text-gray-500"
                  >
                    {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  {timeline.trackOrder.length > 1 && (
                    <button
                      onClick={() => {
                        const itemsToRemove = timeline.items.filter((i: TimelineItem) => i.trackId === trackId);
                        itemsToRemove.forEach((i: TimelineItem) => removeItem(i.id));
                        removeTrack(trackId);
                      }}
                      className="p-0.5 hover:bg-red-900/30 rounded text-gray-600 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onScroll={(e) => setScrollLeft((e.target as HTMLDivElement).scrollLeft)}
        >
          <div data-timeline-content className="relative" style={{ width: totalWidth, minHeight: "100%" }}>
            <div
              data-ruler
              className="sticky top-0 z-20 h-8 bg-[#0d0d16] border-b border-[#1e1e2e] cursor-pointer"
              onClick={handleRulerClick}
              onMouseDown={() => setIsDraggingPlayhead(true)}
            >
              <Ruler totalWidth={totalWidth} pxPerFrame={pxPerFrame} fps={timeline.fps} />
              {timeline.beatMarkers.map((marker: BeatMarker) => {
                const x = marker.frame * pxPerFrame;
                return (
                  <div key={marker.id} className="absolute top-0 h-full" style={{ left: x }} title={marker.label ? `${formatTime(marker.frame)} - ${marker.label}` : formatTime(marker.frame)}>
                    <div className="w-px h-full bg-yellow-400/60" />
                    <div className="w-2 h-2 bg-yellow-400 rotate-45 absolute top-1/2 -translate-x-1 -translate-y-1/2" />
                  </div>
                );
              })}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#ec4899] z-30"
                style={{ left: playheadX }}
              >
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#ec4899] rotate-45 rounded-sm" />
              </div>
            </div>

            {timeline.trackOrder.map((trackId: string) => {
              const track = timeline.tracks[trackId];
              if (!track) return null;
              const items = timeline.items.filter((i: TimelineItem) => i.trackId === trackId);

              return (
                <div
                  key={trackId}
                  className="relative border-b border-[#1a1a28]"
                  style={{ height: TRACK_HEIGHT }}
                  onClick={handleTimelineClick}
                  onDrop={(e) => { handleTrackDrop(e, trackId); handleTrackItemDrop(e, trackId); }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                >
                  {timeline.beatMarkers.map((marker: BeatMarker) => {
                    const x = marker.frame * pxPerFrame;
                    return (
                      <div
                        key={marker.id}
                        className="absolute top-0 bottom-0 w-px bg-yellow-400/30 pointer-events-none"
                        style={{ left: x }}
                      />
                    );
                  })}
                  {items.map((item: TimelineItem) => (
                    <TimelineItemComponent
                      key={item.id}
                      item={item}
                      pxPerFrame={pxPerFrame}
                      selected={selectedIds.has(item.id)}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      onContextMenu={(e) => handleItemContextMenu(e, item)}
                      onTrimLeft={(e) => handleTrimLeft(e, item)}
                      onTrimRight={(e) => handleTrimRight(e, item)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/timeline-item", item.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    />
                  ))}
                </div>
              );
            })}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#ec4899] z-10 pointer-events-none"
              style={{ left: playheadX }}
            />
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 bg-[#1a1a28] border border-[#2a2a3a] rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenuActions.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-[#2a2a3a] ${label === "Excluir" ? "text-red-400 hover:bg-red-900/30" : "text-gray-300"}`}
              onClick={() => { action(); closeContextMenu(); }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Ruler({ totalWidth, pxPerFrame, fps }: { totalWidth: number; pxPerFrame: number; fps: number }) {
  const marks = useMemo(() => {
    const result: { x: number; label: string; major: boolean }[] = [];
    let step = 1;
    if (pxPerFrame < 0.2) step = fps * 5;
    else if (pxPerFrame < 0.5) step = fps;
    else if (pxPerFrame < 1) step = Math.floor(fps / 2);
    else step = Math.floor(fps / 4);

    for (let f = 0; f * pxPerFrame < totalWidth; f += step) {
      const isMajor = f % fps === 0;
      result.push({
        x: f * pxPerFrame,
        label: isMajor ? `${Math.floor(f / fps)}s` : "",
        major: isMajor,
      });
    }
    return result;
  }, [totalWidth, pxPerFrame, fps]);

  return (
    <svg width={totalWidth} height={RULER_HEIGHT} className="absolute inset-0">
      {marks.map((m, i) => (
        <g key={i}>
          <line
            x1={m.x}
            y1={m.major ? 0 : RULER_HEIGHT - 8}
            x2={m.x}
            y2={RULER_HEIGHT}
            stroke={m.major ? "#3a3a4a" : "#2a2a38"}
            strokeWidth={1}
          />
          {m.label && (
            <text
              x={m.x + 4}
              y={12}
              fill="#666"
              fontSize={10}
              fontFamily="monospace"
            >
              {m.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function TimelineItemComponent({
  item,
  pxPerFrame,
  selected,
  onMouseDown,
  onContextMenu,
  onTrimLeft,
  onTrimRight,
  onDragStart,
}: {
  item: TimelineItem;
  pxPerFrame: number;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onTrimLeft?: (e: React.MouseEvent) => void;
  onTrimRight?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const left = item.startFrame * pxPerFrame;
  const width = Math.max(item.durationInFrames * pxPerFrame, 4);
  const thumbnails = useVideoThumbnails(item);

  const kfs = item.keyframes || {};
  const allKfFrames = new Set<number>();
  for (const prop of Object.keys(kfs)) {
    const arr = kfs[prop as keyof typeof kfs];
    if (arr) arr.forEach((kf) => allKfFrames.add(kf.frame));
  }

  const bgColor =
    item.kind === "video"
      ? selected
        ? "bg-[#8b5cf6]/80"
        : "bg-[#6d28d9]/80"
      : item.kind === "audio"
        ? selected
          ? "bg-[#10b981]/80"
          : "bg-[#059669]/80"
        : item.kind === "text"
          ? selected
            ? "bg-[#ec4899]/80"
            : "bg-[#db2777]/80"
          : selected
            ? "bg-[#f59e0b]/80"
            : "bg-[#d97706]/80";

  const hasSpeedBadge = item.speed.rate !== 1;
  const hasReverseBadge = item.speed.reverse;
  const hasEffects = item.effects.length > 0;
  const hasAnimation = item.animation?.enter !== "none" || item.animation?.exit !== "none";

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-md cursor-grab active:cursor-grabbing border ${selected ? "border-white/40" : "border-white/10"} flex items-center overflow-visible transition-opacity hover:brightness-110`}
      style={{ left, width }}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
    >
      {onTrimLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 z-20 cursor-ew-resize hover:bg-white/40 rounded-l-md bg-white/10"
          onMouseDown={(e) => { e.stopPropagation(); onTrimLeft(e); }}
        />
      )}

      {thumbnails.length > 0 ? (
        <div className="absolute inset-0 flex overflow-hidden rounded-md">
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
      ) : item.thumb ? (
        <div className="absolute inset-0 opacity-30 overflow-hidden rounded-md">
          <img src={item.thumb} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`absolute inset-0 ${bgColor} rounded-md`} />
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

      <div className="relative z-10 px-2 flex items-center gap-1 min-w-0">
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
          className="absolute right-0 top-0 bottom-0 w-2 z-20 cursor-ew-resize hover:bg-white/40 rounded-r-md bg-white/10"
          onMouseDown={(e) => { e.stopPropagation(); onTrimRight(e); }}
        />
      )}
    </div>
  );
}
