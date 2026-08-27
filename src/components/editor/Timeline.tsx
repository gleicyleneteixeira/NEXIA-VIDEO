"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2,
  Volume2, VolumeX, Eye, EyeOff, Lock, Unlock, Plus, Magnet,
  ZoomIn, ZoomOut, Snowflake, Rewind, FlipHorizontal, FlipVertical,
  RotateCw, Crop, AlignLeft, AlignRight,   Undo2, Redo2, Bookmark, ChevronDown, Zap, BringToFront, SendToBack, Clapperboard,
  Video, Music2, Type, Stamp, Mic, Layers, ArrowUp, ArrowDown
} from "lucide-react";
import { useProjectStore, usePlaybackStore, useUIStore, useMediaStore, calculateReorderedTrack, getMainTrackId, calculateSafeMenuPosition } from "@/lib/editor";
import type { TimelineItem, BeatMarker, MediaFile, Project } from "@/lib/editor";
import { DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, generateId } from "@/lib/editor";
import { withHistory, snapshotProject, commitHistory } from "@/lib/editor/history";
import TimelineClip from "./TimelineClip";
import CoverModal from "./CoverModal";
import VoiceoverModal from "./VoiceoverModal";

const TRACK_HEIGHT = 64;
const RULER_HEIGHT = 32;

export default function Timeline() {
  const {
    project, splitItem, removeItem, rippleDelete, compactTrackGaps, duplicateClip, updateItem, updateTrack,
    freezeFrame, reverseItem, mirrorItem, rotateItem, addBeatMarker,
    addTrack, removeTrack, reorderTracks, setKeyframe, removeKeyframe,
    bringTrackToFront, sendTrackToBack, extractAudioFromVideo,
    rippleTrimStart, rippleTrimEnd, bringClipToFront, sendClipToBack,
    moveClipLayerUp, moveClipLayerDown,
    setAutoCutout, setChromaKey, setManualMask
  } = useProjectStore();
  const { isPlaying, currentTime, togglePlayback, seekTo, setCurrentTime } = usePlaybackStore();
  const { selectedIds, select, clearSelection, zoom, zoomIn, zoomOut, undo, redo, canUndo, canRedo } = useUIStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackHeadersRef = useRef<HTMLDivElement>(null);
  const coverBtnRef = useRef<HTMLButtonElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollLeftRef = useRef(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [draggedTrackIndex, setDraggedTrackIndex] = useState<number | null>(null);
  const [dragTargetTrackId, setDragTargetTrackId] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{ id: string; frame: number; dur: number } | null>(null);
  const dragTargetTrackIdRef = useRef<string | null>(null);
  const dragGhostRef = useRef<{ id: string; frame: number; dur: number } | null>(null);
  const [showTransformMenu, setShowTransformMenu] = useState(false);
  const [showVlogCutModal, setShowVlogCutModal] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [voiceoverOpen, setVoiceoverOpen] = useState(false);
  const [vlogKeepSeconds, setVlogKeepSeconds] = useState(2.0);
  const [vlogDiscardSeconds, setVlogDiscardSeconds] = useState(0.5);
  const [vlogMode, setVlogMode] = useState<"split" | "delete">("delete");
  const [vlogTarget, setVlogTarget] = useState<"selected" | "track">("selected");

  const timeline = project.timeline;
  const pxPerFrame = zoom * 2;

  const mainVideoTrackIndex = useMemo(() => {
    const idx = timeline.trackOrder.findIndex((tid: string) => timeline.tracks[tid]?.kind === "video");
    return idx < 0 ? 0 : idx;
  }, [timeline.trackOrder, timeline.tracks]);

  const selectedItem = useMemo(() => {
    return timeline.items.find((i: TimelineItem) => selectedIds.has(i.id)) || null;
  }, [timeline.items, selectedIds]);

  const trimStartToPlayhead = useCallback(() => {
    if (!selectedItem) return;
    const { startFrame, durationInFrames } = selectedItem;
    if (currentTime > startFrame && currentTime < startFrame + durationInFrames) {
      // Ripple: remove a porção à esquerda do playhead e puxa os clipes
      // seguintes da mesma faixa para fechar a lacuna.
      rippleTrimStart(selectedItem.id, currentTime);
    }
  }, [selectedItem, currentTime, rippleTrimStart]);

  const trimEndToPlayhead = useCallback(() => {
    if (!selectedItem) return;
    const { startFrame, durationInFrames } = selectedItem;
    if (currentTime > startFrame && currentTime < startFrame + durationInFrames) {
      // Ripple: remove a porção à direita do playhead e puxa os clipes
      // seguintes da mesma faixa para fechar a lacuna.
      rippleTrimEnd(selectedItem.id, currentTime);
    }
  }, [selectedItem, currentTime, rippleTrimEnd]);

  // Zoom temporal da timeline via Ctrl + Wheel (estilo CapCut).
  // Bloqueia o zoom nativo do navegador (passive: false) e ajusta o `zoom`
  // da useUIStore, preservando o ponto focal sob o cursor.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      // 1. Impede o zoom da página inteira do navegador.
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const cursorOffset = e.clientX - rect.left;
      const oldPxPerFrame = useUIStore.getState().zoom * 2;
      // Quadro que está sob o cursor no momento do scroll.
      const focalFrame = (container.scrollLeft + cursorOffset) / oldPxPerFrame;

      const zoomSensitivity = 0.05;
      const factor = e.deltaY < 0 ? 1 + zoomSensitivity : 1 - zoomSensitivity;
      const newZoom = useUIStore.getState().zoom * factor;
      useUIStore.getState().setZoom(newZoom);

      // 2. Mantém o ponto focal fixo após o re-render (nova largura aplicada).
      requestAnimationFrame(() => {
        const newPxPerFrame = useUIStore.getState().zoom * 2;
        const target = focalFrame * newPxPerFrame - cursorOffset;
        container.scrollLeft = Math.max(0, target);
      });
    };

    // passive: false é OBRIGATÓRIO para o preventDefault() funcionar no 'wheel'.
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const isCutoutActive = !!(selectedItem?.autoCutout?.enabled || selectedItem?.chromaKey?.enabled || selectedItem?.manualMask?.enabled);

  const toggleBackgroundRemoval = useCallback(() => {
    const id = selectedItem?.id;
    if (!id) return;
    const item = timeline.items.find((i: TimelineItem) => i.id === id);
    if (!item) return;
    const anyOn = !!item.autoCutout?.enabled || !!item.chromaKey?.enabled || !!item.manualMask?.enabled;
    // Ligar = Remove fundo automático (IA). Qualquer modo ativo → desliga tudo.
    setManualMask(id, { enabled: false });
    setChromaKey(id, { enabled: false });
    setAutoCutout(id, { enabled: !anyOn });
  }, [selectedItem, timeline.items, setAutoCutout, setChromaKey, setManualMask]);

  const syncCompatibilityFields = useCallback((item: TimelineItem, fps: number): TimelineItem => {
    return {
      ...item,
      startTime: Math.round((item.startFrame * 1000) / fps),
      duration: Math.round((item.durationInFrames * 1000) / fps),
      mediaUrl: item.src,
      trimStart: Math.round(((item.srcInFrame || 0) * 1000) / fps),
      trimEnd: Math.round(((item.srcOutFrame || 0) * 1000) / fps),
    };
  }, []);

  const handleVlogCut = useCallback(() => {
    const oldProject = project;
    const fps = project.timeline.fps || 30;
    const keepFrames = Math.round(vlogKeepSeconds * fps);
    const discardFrames = Math.round(vlogDiscardSeconds * fps);

    if (keepFrames <= 0 || discardFrames <= 0) {
      alert("Os intervalos devem ser maiores que zero.");
      return;
    }

    let targetItems: TimelineItem[] = [];
    if (vlogTarget === "selected") {
      if (selectedIds.size === 0) {
        alert("Nenhum clipe selecionado.");
        return;
      }
      targetItems = project.timeline.items.filter((i) => selectedIds.has(i.id));
    } else {
      let targetTrackId = "";
      if (selectedItem) {
        targetTrackId = selectedItem.trackId;
      } else {
        const firstTrackId = project.timeline.trackOrder[0];
        if (!firstTrackId) {
          alert("Nenhuma trilha encontrada no projeto.");
          return;
        }
        targetTrackId = firstTrackId;
      }
      targetItems = project.timeline.items.filter(
        (i) => i.trackId === targetTrackId && (i.startFrame + i.durationInFrames) > currentTime
      );
    }

    if (targetItems.length === 0) {
      alert("Nenhum clipe encontrado para processar.");
      return;
    }

    const processItem = (item: TimelineItem, startFromFrame: number) => {
      const clipStart = item.startFrame;
      const cutStartOffset = Math.max(0, startFromFrame - clipStart);
      if (cutStartOffset >= item.durationInFrames) {
        return { newClips: [item], totalRemovedFrames: 0 };
      }

      const speedRate = item.speed?.rate || 1;
      const newClips: TimelineItem[] = [];
      let totalRemovedFrames = 0;

      if (cutStartOffset > 0) {
        const preCutDur = cutStartOffset;
        const preCutItem = {
          ...item,
          id: generateId(),
          durationInFrames: preCutDur,
          srcOutFrame: (item.srcInFrame || 0) + Math.round(preCutDur * speedRate),
        };
        newClips.push(syncCompatibilityFields(preCutItem, fps));
      }

      let t = cutStartOffset;
      while (t < item.durationInFrames) {
        const keepEnd = Math.min(t + keepFrames, item.durationInFrames);
        const segmentDur = keepEnd - t;
        if (segmentDur > 0) {
          const keepItem = {
            ...item,
            id: generateId(),
            startFrame: item.startFrame + t - totalRemovedFrames,
            durationInFrames: segmentDur,
            srcInFrame: (item.srcInFrame || 0) + Math.round(t * speedRate),
            srcOutFrame: (item.srcInFrame || 0) + Math.round(keepEnd * speedRate),
          };
          newClips.push(syncCompatibilityFields(keepItem, fps));
        }

        const discardEnd = Math.min(keepEnd + discardFrames, item.durationInFrames);
        const discardDur = discardEnd - keepEnd;
        if (discardDur > 0) {
          if (vlogMode === "split") {
            const discardItem = {
              ...item,
              id: generateId(),
              startFrame: item.startFrame + keepEnd - totalRemovedFrames,
              durationInFrames: discardDur,
              srcInFrame: (item.srcInFrame || 0) + Math.round(keepEnd * speedRate),
              srcOutFrame: (item.srcInFrame || 0) + Math.round(discardEnd * speedRate),
            };
            newClips.push(syncCompatibilityFields(discardItem, fps));
          } else {
            totalRemovedFrames += discardDur;
          }
        }
        t = discardEnd;
      }

      let runningStart = item.startFrame;
      const alignedClips = newClips.map((clip) => {
        const c = { ...clip, startFrame: runningStart };
        runningStart += clip.durationInFrames;
        return syncCompatibilityFields(c, fps);
      });

      return { newClips: alignedClips, totalRemovedFrames };
    };

    const sortedTargets = [...targetItems].sort((a, b) => a.startFrame - b.startFrame);
    let updatedItems = [...project.timeline.items];

    for (const item of sortedTargets) {
      const currentItemIndex = updatedItems.findIndex((i) => i.id === item.id);
      if (currentItemIndex === -1) continue;
      const currentItem = updatedItems[currentItemIndex];

      const startFromFrame = vlogTarget === "selected" ? currentItem.startFrame : Math.max(currentItem.startFrame, currentTime);

      const { newClips, totalRemovedFrames } = processItem(currentItem, startFromFrame);

      updatedItems.splice(currentItemIndex, 1, ...newClips);

      if (vlogMode === "delete" && totalRemovedFrames > 0) {
        const itemEndFrame = currentItem.startFrame + currentItem.durationInFrames;
        updatedItems = updatedItems.map((i) => {
          if (i.trackId === currentItem.trackId && i.startFrame >= itemEndFrame - 1) {
            return syncCompatibilityFields({
              ...i,
              startFrame: Math.max(0, i.startFrame - totalRemovedFrames)
            }, fps);
          }
          return i;
        });
      }
    }

    useUIStore.getState().pushCommand({
      name: "Corte Intervalado (Vlog)",
      execute: () => {
        useProjectStore.setState((s) => ({
          project: {
            ...s.project,
            updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: updatedItems,
            },
          },
        }));
        clearSelection();
      },
      undo: () => {
        useProjectStore.setState({ project: oldProject });
        clearSelection();
      },
    });

    setShowVlogCutModal(false);
  }, [project, vlogKeepSeconds, vlogDiscardSeconds, vlogMode, vlogTarget, selectedIds, selectedItem, currentTime, clearSelection, syncCompatibilityFields]);

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
      mediaId: media.id,
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

    withHistory("Adicionar mídia", () => {
      useProjectStore.getState().addItem(item);
    });
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

  const SNAP_PIXELS = 8;
const historyBeforeRef = useRef<ReturnType<typeof snapshotProject> | null>(null);
const isGestureRef = useRef(false);
const trimGestureRef = useRef(false);

  const handleSnapFrame = useCallback((frame: number, itemId: string) => {
    const tl = useProjectStore.getState().project.timeline;
    const pxPerFrameLive = useUIStore.getState().zoom * 2;
    const item = tl.items.find((i: TimelineItem) => i.id === itemId);
    if (!item) return frame;
    const snapFrames = Math.max(1, Math.round(SNAP_PIXELS / pxPerFrameLive));
    const candidates: number[] = [0, usePlaybackStore.getState().currentTime];
    // bordas de outros clipes da mesma faixa
    tl.items.forEach((other: TimelineItem) => {
      if (other.id === itemId || other.trackId !== item.trackId) return;
      candidates.push(other.startFrame, other.startFrame + other.durationInFrames);
    });
    let best = frame;
    let bestDist = snapFrames;
    for (const c of candidates) {
      const d = Math.abs(c - frame);
      if (d <= bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }, []);

  const handleItemPointerDown = useCallback((e: React.PointerEvent, item: TimelineItem) => {
    // Apenas botão esquerdo inicia o arraste; alças de corte (data-trim-handle)
    // têm handler próprio. Guards ANTES do preventDefault para não suprimir o
    // menu de contexto (botão direito) nem o gesto das alças.
    if (e.button !== 0) return;
    if (e.detail === 2) return;
    if ((e.target as HTMLElement).closest?.("[data-trim-handle]")) return;
    e.preventDefault();
    e.stopPropagation();

    select(item.id, e.shiftKey || e.ctrlKey || e.metaKey);

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { target.setPointerCapture(pointerId); } catch { /* browsers antigos */ }

    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = startX - target.getBoundingClientRect().left;
    const originStartFrame = item.startFrame;
    const isMainTrackItem =
      item.trackId === getMainTrackId(useProjectStore.getState().project.timeline);
    historyBeforeRef.current = snapshotProject();
    let isDraggingActive = false;
    let lastAppliedStart = item.startFrame;

    // ── Eixo Y: identifica a faixa sob o cursor (para highlight + drop). ──
    const pickTargetTrackId = (clientY: number): string | null => {
      const contentEl = containerRef.current?.querySelector("[data-timeline-content]");
      if (!contentEl) return null;
      const rect = contentEl.getBoundingClientRect();
      const rowY = clientY - rect.top - RULER_HEIGHT;
      const ttl = useProjectStore.getState().project.timeline;
      const idx = Math.max(0, Math.min(ttl.trackOrder.length - 1, Math.floor(rowY / TRACK_HEIGHT)));
      const trackId = ttl.trackOrder[idx];
      if (!trackId || ttl.tracks[trackId]?.locked) return null;
      return trackId;
    };

    const onMove = (ev: PointerEvent) => {
      // Threshold suave de 3px: evita arraste acidental em clique simples.
      if (!isDraggingActive && Math.abs(ev.clientX - startX) > 3) isDraggingActive = true;
      if (!isDraggingActive) return;

      // Lê o estado ao vivo (sem closures obsoletas) durante o arraste.
      const zoomState = useUIStore.getState().zoom;
      const pxPerFrameLive = zoomState * 2;

      const liveItems = useProjectStore.getState().project.timeline.items;
      const liveActive = liveItems.find((i) => i.id === item.id);
      if (!liveActive) return;

      // Detecta a faixa-alvo (hover vertical). Solo muda de trilha depois de
      // 10px de deslocamento vertical para evitar troca acidental ao arrastar
      // horizontalmente perto da borda de uma faixa.
      const dy = ev.clientY - startY;
      let verticalTarget: string | null = Math.abs(dy) >= 10 ? pickTargetTrackId(ev.clientY) : null;
      if (verticalTarget === item.trackId) verticalTarget = null;
      if (dragTargetTrackIdRef.current !== verticalTarget) {
        dragTargetTrackIdRef.current = verticalTarget;
        setDragTargetTrackId(verticalTarget);
      }

      // Ghost 2D na faixa receptora (flash de destino), refletindo o frame atual.
      const ghost = verticalTarget
        ? { id: item.id, frame: lastAppliedStart, dur: liveActive.durationInFrames }
        : null;
      const ghostChanged =
        dragGhostRef.current === null
          ? ghost !== null
          : ghost === null ||
            dragGhostRef.current.frame !== ghost.frame ||
            dragGhostRef.current.dur !== ghost.dur ||
            dragGhostRef.current.id !== ghost.id;
      dragGhostRef.current = ghost;
      if (ghostChanged) setDragGhost(ghost);

      if (verticalTarget) {
        // Soltando em OUTRA faixa: o clipe segue o mouse na posição X livre
        // (com snap) e o trackId é aplicado apenas no drop.
        const contentEl = containerRef.current?.querySelector("[data-timeline-content]");
        const rect = contentEl?.getBoundingClientRect();
        const left = rect ? rect.left : 0;
        const x = ev.clientX - left + scrollLeftRef.current - offsetX;
        const raw = Math.max(0, Math.round(x / pxPerFrameLive));
        const frame = handleSnapFrame(raw, item.id);
        if (frame !== lastAppliedStart) {
          lastAppliedStart = frame;
          updateItem(item.id, { startFrame: frame });
        }
        return;
      }

      if (isMainTrackItem && liveItems.filter((i) => i.trackId === item.trackId).length > 1) {
        // Trilha magnética: reordenação por ponto médio (midpoint swap). O pack
        // do store reencadeia a trilha; aqui aplicamos apenas a chave virtual do
        // clipe ativo. O delta é ancorado no startFrame original do pointerdown
        // (o pack pode ter movido o clipe durante o arraste).
        const totalDeltaFrames = (ev.clientX - startX) / pxPerFrameLive;
        const effectiveDelta = totalDeltaFrames - (liveActive.startFrame - originStartFrame);
        const reordered = calculateReorderedTrack(liveItems, item.id, effectiveDelta);
        const newStart = reordered.find((i) => i.id === item.id)?.startFrame;
        if (newStart === undefined || newStart === lastAppliedStart) return;
        lastAppliedStart = newStart;
        updateItem(item.id, { startFrame: newStart });
        return;
      }

      // Faixas livres: o clipe segue o mouse (com snap), como antes.
      const contentEl = containerRef.current?.querySelector("[data-timeline-content]");
      const rect = contentEl?.getBoundingClientRect();
      const left = rect ? rect.left : 0;
      const x = ev.clientX - left + scrollLeftRef.current - offsetX;
      const raw = Math.max(0, Math.round(x / pxPerFrameLive));
      const frame = handleSnapFrame(raw, item.id);
      if (frame !== lastAppliedStart) {
        lastAppliedStart = frame;
        updateItem(item.id, { startFrame: frame });
      }
    };

    const cleanup = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", cleanup);
      target.removeEventListener("pointercancel", cleanup);
      target.removeEventListener("lostpointercapture", cleanup);
      try { if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId); } catch { /* noop */ }

      // ── COMMIT no drop: aplica a mudança de faixa (troca de camada). ──
      // O startFrame já foi posicionado ao vivo (X); aqui só transferimos o
      // clipe para a trilha-alvo. Se for a trilha principal, o pack magnético
      // do store reencadeia o clipe junto aos demais sem lacuna.
      const targetTrackId = dragTargetTrackIdRef.current;
      dragTargetTrackIdRef.current = null;
      dragGhostRef.current = null;
      setDragTargetTrackId(null);
      setDragGhost(null);
      if (targetTrackId && targetTrackId !== item.trackId) {
        updateItem(item.id, { trackId: targetTrackId });
      }

      if (historyBeforeRef.current) {
        commitHistory("Mover clipe", historyBeforeRef.current);
        historyBeforeRef.current = null;
      }
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", cleanup);
    target.addEventListener("pointercancel", cleanup);
    target.addEventListener("lostpointercapture", cleanup);
  }, [select, updateItem, handleSnapFrame, getMainTrackId]);

  const handleItemContextMenu = useCallback((e: React.MouseEvent, item: TimelineItem) => {
    e.preventDefault();
    e.stopPropagation();
    select(item.id, false);
    // Posição segura no viewport: inverte para cima/esquerda se o menu
    // estouraria a borda inferior ou lateral (não deixa cortar na tela).
    const { x, y } = calculateSafeMenuPosition(e.clientX, e.clientY);
    setContextMenu({ x, y, itemId: item.id });
  }, [select]);

  // Clamp preciso: após renderizar o menu, mede o tamanho real e re-posiciona
  // dentro do viewport caso a estimativa inicial não tenha sido suficiente.
  useLayoutEffect(() => {
    const el = contextMenuRef.current;
    if (!el || !contextMenu) return;
    const rect = el.getBoundingClientRect();
    const { x, y } = calculateSafeMenuPosition(contextMenu.x, contextMenu.y, rect.width, rect.height);
    if (x !== contextMenu.x || y !== contextMenu.y) {
      setContextMenu((prev) => (prev ? { ...prev, x, y } : prev));
    }
  }, [contextMenu]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Duplica os clipes selecionados (sequential na mesma trilha ou overlay numa
  // nova camada acima) e seleciona as cópias criadas.
  const handleDuplicateSelection = useCallback((mode: "sequential" | "overlay") => {
    if (selectedIds.size === 0) return;
    const newIds: string[] = [];
    withHistory(selectedIds.size > 1 ? "Duplicar clipes" : "Duplicar clipe", () => {
      selectedIds.forEach((id: string) => {
        const it = duplicateClip(id, mode);
        if (it) newIds.push(it.id);
      });
    });
    clearSelection();
    newIds.forEach((id: string, idx: number) => select(id, idx > 0));
  }, [selectedIds, duplicateClip, clearSelection, select]);

  const contextMenuActions = useMemo(() => {
    if (!contextMenu) return [];
    const menuItem = timeline.items.find((i: TimelineItem) => i.id === contextMenu.itemId);
    return [
      { label: "Dividir", icon: Scissors, action: () => { withHistory("Dividir", () => splitItem(contextMenu.itemId, currentTime)); clearSelection(); } },
      { label: "Duplicar", icon: Copy, action: () => { const holder: { item: TimelineItem | null } = { item: null }; withHistory("Duplicar", () => { holder.item = duplicateClip(contextMenu.itemId, "sequential"); }); clearSelection(); if (holder.item) select(holder.item.id); } },
      { label: "Duplicar em Camada (3D)", icon: Layers, action: () => { const holder: { item: TimelineItem | null } = { item: null }; withHistory("Duplicar em camada", () => { holder.item = duplicateClip(contextMenu.itemId, "overlay"); }); clearSelection(); if (holder.item) select(holder.item.id); } },
      { label: "Trazer p/ frente", icon: BringToFront, action: () => { withHistory("Trazer clipe p/ frente", () => bringClipToFront(contextMenu.itemId)); } },
      { label: "Enviar p/ trás", icon: SendToBack, action: () => { withHistory("Enviar clipe p/ trás", () => sendClipToBack(contextMenu.itemId)); } },
      { label: "Avançar camada", icon: ArrowUp, action: () => { withHistory("Avançar camada", () => moveClipLayerUp(contextMenu.itemId)); } },
      { label: "Recuar camada", icon: ArrowDown, action: () => { withHistory("Recuar camada", () => moveClipLayerDown(contextMenu.itemId)); } },
      { label: "Congelar Frame", icon: Snowflake, action: () => { withHistory("Congelar frame", () => freezeFrame(contextMenu.itemId, currentTime)); } },
      ...(menuItem?.kind === "video"
        ? [{ label: "Extrair Áudio", icon: Music2, action: () => { withHistory("Extrair áudio", () => extractAudioFromVideo(contextMenu.itemId)); } }]
        : []),
      { label: "Inverter", icon: Rewind, action: () => { withHistory("Inverter", () => reverseItem(contextMenu.itemId)); } },
      { label: "Espelhar Horizontal", icon: FlipHorizontal, action: () => { withHistory("Espelhar", () => mirrorItem(contextMenu.itemId, "h")); } },
      { label: "Espelhar Vertical", icon: FlipVertical, action: () => { withHistory("Espelhar", () => mirrorItem(contextMenu.itemId, "v")); } },
      { label: "Girar 90°", icon: RotateCw, action: () => { withHistory("Girar", () => rotateItem(contextMenu.itemId, 90)); } },
      { label: "Excluir", icon: Trash2, action: () => { withHistory("Excluir item", () => rippleDelete([contextMenu.itemId])); clearSelection(); } },
    ];
  }, [contextMenu, currentTime, splitItem, clearSelection, duplicateClip, select, freezeFrame, extractAudioFromVideo, reverseItem, mirrorItem, rotateItem, rippleDelete, timeline.items, bringClipToFront, sendClipToBack, moveClipLayerUp, moveClipLayerDown]);

  // Trim das bordas via Pointer Events + setPointerCapture: o gesto fica preso
  // à alça, então mouseup é detectado mesmo se o cursor sair da janela, e o
  // preventDefault bloqueia seleção de texto / drag nativo do clip pai.
  const beginTrimGesture = useCallback((e: React.PointerEvent, item: TimelineItem, edge: "start" | "end") => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { target.setPointerCapture(pointerId); } catch { /* capture pode falhar em browsers antigos */ }
    trimGestureRef.current = true;

    const startX = e.clientX;
    const startFrame = item.startFrame;
    const startDuration = item.durationInFrames;
    const startSrcIn = item.srcInFrame || 0;
    const before = snapshotProject();

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dFrames = pixelToFrame(dx);
      if (edge === "end") {
        const newDuration = Math.max(1, startDuration + dFrames);
        updateItem(item.id, {
          durationInFrames: newDuration,
          srcOutFrame: startSrcIn + newDuration,
        });
      } else {
        const newStart = Math.max(0, startFrame + dFrames);
        const newDuration = startDuration - (newStart - startFrame);
        if (newDuration >= 1) {
          updateItem(item.id, {
            startFrame: newStart,
            durationInFrames: newDuration,
            srcInFrame: startSrcIn + (newStart - startFrame),
          });
        }
      }
    };

    const cleanup = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", cleanup);
      target.removeEventListener("pointercancel", cleanup);
      target.removeEventListener("lostpointercapture", cleanup);
      try { if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId); } catch { /* noop */ }
      trimGestureRef.current = false;
      commitHistory(edge === "end" ? "Ajustar fim do clipe" : "Ajustar início do clipe", before);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", cleanup);
    target.addEventListener("pointercancel", cleanup);
    target.addEventListener("lostpointercapture", cleanup);
  }, [pixelToFrame, updateItem]);

  const handleTrimLeft = useCallback((e: React.PointerEvent, item: TimelineItem) => {
    beginTrimGesture(e, item, "start");
  }, [beginTrimGesture]);

  const handleTrimRight = useCallback((e: React.PointerEvent, item: TimelineItem) => {
    beginTrimGesture(e, item, "end");
  }, [beginTrimGesture]);

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
    if (!isDraggingPlayhead) return;

    const handlePointerMove = (e: PointerEvent) => {
      handlePlayheadDrag(e as unknown as React.MouseEvent);
    };

    const handlePointerUp = () => {
      setIsDraggingPlayhead(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDraggingPlayhead, handlePlayheadDrag]);

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
        e.preventDefault();
        const ids = [...selectedIds];
        withHistory(ids.length > 1 ? "Excluir itens" : "Excluir item", () => {
          rippleDelete(ids);
        });
        clearSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleDuplicateSelection("sequential");
      }
      if ((e.ctrlKey || e.metaKey) && (e.altKey || e.shiftKey) && e.key === "d") {
        e.preventDefault();
        handleDuplicateSelection("overlay");
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
        withHistory("Ajustar início", () => trimStartToPlayhead());
      }
      if (e.key === "w" || e.key === "W") {
        withHistory("Ajustar fim", () => trimEndToPlayhead());
      }
      if (e.key === "s" || e.key === "S" || ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B"))) {
        e.preventDefault();
        withHistory("Dividir", () => {
          selectedIds.forEach((id: string) => {
            splitItem(id, currentTime);
          });
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
    selectedIds, currentTime, togglePlayback, removeItem, rippleDelete, handleDuplicateSelection,
    clearSelection, seekTo, addBeatMarker, trimStartToPlayhead, trimEndToPlayhead,
    splitItem, undo, redo, canUndo, canRedo
  ]);

  const playheadX = frameToPixel(currentTime);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0a12] border-t border-[#1e1e2e] select-none"
      onMouseMove={isDraggingPlayhead ? handlePlayheadDrag : undefined}
      onMouseUp={() => setIsDraggingPlayhead(false)}
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

        <button
          onClick={() => setVoiceoverOpen(true)}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-[#f472b6] hover:text-pink-300"
          title="Gravar narração (voz)"
        >
          <Mic size={14} />
        </button>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <button onClick={undo} disabled={!canUndo()} className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30" title="Desfazer (Ctrl+Z)">
          <Undo2 size={14} />
        </button>
        <button onClick={redo} disabled={!canRedo()} className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30" title="Refazer (Ctrl+Y / Ctrl+Shift+Z)">
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-[#1e1e2e] mx-1" />

        <button
          onClick={() => withHistory("Fechar espaços em branco", () => compactTrackGaps())}
          disabled={project.timeline.items.length === 0}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Fechar espaços em branco (une os clipes, sem vãos)"
        >
          <Magnet size={14} />
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
          onClick={() => handleDuplicateSelection("sequential")}
          disabled={selectedIds.size === 0}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Duplicar clipes selecionados (Ctrl+D)"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => handleDuplicateSelection("overlay")}
          disabled={selectedIds.size === 0}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Duplicar em nova camada acima (sobreposição/3D) (Ctrl+Shift+D)"
        >
          <Layers size={14} />
        </button>
        <button
          onClick={() => withHistory("Excluir trecho à esquerda", () => trimStartToPlayhead())}
          disabled={!selectedItem || currentTime <= selectedItem.startFrame || currentTime >= selectedItem.startFrame + selectedItem.durationInFrames}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Excluir trecho à Esquerda do playhead (Q)"
        >
          <AlignLeft size={14} />
        </button>
        <button
          onClick={() => withHistory("Excluir trecho à direita", () => trimEndToPlayhead())}
          disabled={!selectedItem || currentTime <= selectedItem.startFrame || currentTime >= selectedItem.startFrame + selectedItem.durationInFrames}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
          title="Excluir trecho à Direita do playhead (W)"
        >
          <AlignRight size={14} />
        </button>
        <button
          onClick={() => { withHistory(selectedIds.size > 1 ? "Excluir itens" : "Excluir item", () => rippleDelete([...selectedIds])); clearSelection(); }}
          disabled={selectedIds.size === 0}
          className="p-1.5 hover:bg-red-900/30 rounded text-red-400 disabled:opacity-30"
          title="Excluir (Delete / Backspace)"
        >
          <Trash2 size={14} />
        </button>

        {/* Remover plano de fundo (atalho na barra, estilo CapCut) */}
        <div className="relative group flex items-center">
          <button
            onClick={() => toggleBackgroundRemoval()}
            disabled={!selectedItem}
            className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${
              isCutoutActive
                ? "bg-[#8b5cf6]/20 text-purple-400 border border-[#8b5cf6]/50"
                : "text-gray-400 hover:text-white hover:bg-[#1e1e2e] disabled:opacity-30 disabled:hover:bg-transparent"
            }`}
            aria-label="Remover plano de fundo"
            title="Remover plano de fundo"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-[#1e1e24] text-white text-xs rounded-md py-1.5 px-2.5 shadow-xl border border-zinc-700 w-52 pointer-events-none z-50">
            <span className="font-semibold text-zinc-100">Remover plano de fundo</span>
            <span className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
              Detecte automaticamente pessoas e remova o plano de fundo.
            </span>
          </div>
        </div>

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
        <button
          onClick={() => setShowVlogCutModal(true)}
          className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 flex items-center gap-1"
          title="Corte Intervalado / Vlog Cut (Corte Automático)"
        >
          <Zap size={14} className="text-yellow-500" />
          <span className="text-[10px] font-semibold text-gray-300">Vlog Cut</span>
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
          <div ref={trackHeadersRef} className="flex-1 overflow-y-auto overscroll-contain" onScroll={(e) => {
            const v = (e.target as HTMLDivElement).scrollTop;
            if (scrollRef.current) scrollRef.current.scrollTop = v;
          }}>
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
                  <span className="flex-1 flex items-center gap-1 min-w-0" title={track.name}>
                    {track.kind === "video" ? (
                      <Video size={13} className="text-[#9aa4b2] shrink-0" />
                    ) : track.kind === "audio" ? (
                      <Music2 size={13} className="text-[#4ade80] shrink-0" />
                    ) : track.kind === "text" ? (
                      <Type size={13} className="text-[#fb923c] shrink-0" />
                    ) : (
                      <Stamp size={13} className="text-[#a78bfa] shrink-0" />
                    )}
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
                  {timeline.trackOrder.length > 1 && (
                    <button
                      onClick={() => withHistory("Trazer p/ frente", () => bringTrackToFront(trackId))}
                      title="Trazer para a frente"
                      className="p-0.5 hover:bg-white/10 rounded text-gray-600 hover:text-[#8b5cf6]"
                    >
                      <BringToFront size={10} />
                    </button>
                  )}
                  {timeline.trackOrder.length > 1 && (
                    <button
                      onClick={() => withHistory("Mandar p/ trás", () => sendTrackToBack(trackId))}
                      title="Mandar para trás"
                      className="p-0.5 hover:bg-white/10 rounded text-gray-600 hover:text-[#8b5cf6]"
                    >
                      <SendToBack size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Slot fixo de "Capa" (à esquerda do 00:00, alinhado à faixa principal de vídeo) ── */}
        <div className="w-16 shrink-0 bg-[#0d0d16] border-r border-[#1e1e2e]">
          <button
            ref={coverBtnRef}
            onClick={() => setCoverOpen(true)}
            className="w-full flex flex-col items-center justify-center gap-1 border-b border-[#1e1e2e] hover:bg-[#1a1a28]/60 transition-colors"
            style={{ height: TRACK_HEIGHT, marginTop: RULER_HEIGHT + mainVideoTrackIndex * TRACK_HEIGHT }}
            title="Definir capa do projeto"
          >
            <span className="w-9 h-6 rounded overflow-hidden bg-black flex items-center justify-center">
              {project.thumbnail ? (
                <img src={project.thumbnail} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <Clapperboard size={14} className="text-[#8b5cf6]" />
              )}
            </span>
            <span className="text-[9px] uppercase tracking-wide text-gray-400 font-semibold">Capa</span>
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
          onScroll={(e) => {
            const el = e.target as HTMLDivElement;
            // Scroll horizontal (tempo).
            setScrollLeft(el.scrollLeft);
            scrollLeftRef.current = el.scrollLeft;
            // Scroll vertical (camadas): sincroniza headers + mantém a "Capa" alinhada à sua faixa.
            if (trackHeadersRef.current) trackHeadersRef.current.scrollTop = el.scrollTop;
            if (coverBtnRef.current) {
              coverBtnRef.current.style.marginTop = `${RULER_HEIGHT + mainVideoTrackIndex * TRACK_HEIGHT - el.scrollTop}px`;
            }
          }}
        >
          <div data-timeline-content className="relative" style={{ width: totalWidth, minHeight: "100%" }}>
            <div
              data-ruler
              className="sticky top-0 z-[25] h-8 bg-[#0d0d16] border-b border-[#1e1e2e] cursor-pointer touch-none"
              onClick={handleRulerClick}
              onPointerDown={(e) => {
                try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
                setIsDraggingPlayhead(true);
              }}
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
                    <TimelineClip
                      key={item.id}
                      item={item}
                      pxPerFrame={pxPerFrame}
                      selected={selectedIds.has(item.id)}
                      onPointerDown={(e) => handleItemPointerDown(e, item)}
                      onContextMenu={(e) => handleItemContextMenu(e, item)}
                      onTrimLeft={(e) => handleTrimLeft(e, item)}
                      onTrimRight={(e) => handleTrimRight(e, item)}
                      onDragStart={(e) => {
                        if (trimGestureRef.current) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData("application/timeline-item", item.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    />
                  ))}
                </div>
              );
            })}

            {/* ── Feedback de arraste vertical: destaque + ghost na faixa receptora ── */}
            {dragTargetTrackId !== null && (() => {
              const idx = timeline.trackOrder.indexOf(dragTargetTrackId);
              if (idx < 0) return null;
              return (
                <>
                  <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ top: RULER_HEIGHT + idx * TRACK_HEIGHT, height: TRACK_HEIGHT, zIndex: 5 }}
                  >
                    <div className="h-full mx-1 rounded-lg border-2 border-dashed border-[#8b5cf6]/60 bg-[#8b5cf6]/10 transition-colors">
                      <div className="absolute top-1/2 -translate-y-1/2 left-3 text-[10px] font-bold text-[#8b5cf6] tracking-wide uppercase bg-[#0d0d16]/80 px-1.5 py-0.5 rounded">
                        Soltar aqui
                      </div>
                    </div>
                  </div>
                  {dragGhost !== null && (
                    <div
                      className="absolute pointer-events-none rounded-md border-2 border-[#8b5cf6] bg-[#8b5cf6]/20 flex items-center px-2 overflow-hidden z-20"
                      style={{
                        left: dragGhost.frame * pxPerFrame,
                        top: RULER_HEIGHT + idx * TRACK_HEIGHT + 4,
                        width: Math.max(dragGhost.dur * pxPerFrame, 4),
                        height: TRACK_HEIGHT - 8,
                      }}
                    >
                      <span className="text-[10px] text-[#c4b5fd] font-semibold truncate">
                        {timeline.items.find((i) => i.id === dragGhost.id)?.name || ""}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#ec4899] z-10 pointer-events-none"
              style={{ left: playheadX }}
            />
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
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

      {showVlogCutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setShowVlogCutModal(false)}>
          <div className="w-[450px] bg-[#13131f]/95 border border-white/10 rounded-xl shadow-2xl p-5 flex flex-col gap-4 font-sans text-white text-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Zap size={16} className="text-yellow-400" />
                Corte Intervalado (Vlog Cut)
              </span>
              <button
                onClick={() => setShowVlogCutModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Alvo */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Aplicar Em</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setVlogTarget("selected")}
                    className={`py-1.5 px-3 rounded border text-center transition-all ${
                      vlogTarget === "selected"
                        ? "bg-purple-600/20 border-purple-500 text-purple-200"
                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Clipe Selecionado
                  </button>
                  <button
                    onClick={() => setVlogTarget("track")}
                    className={`py-1.5 px-3 rounded border text-center transition-all ${
                      vlogTarget === "track"
                        ? "bg-purple-600/20 border-purple-500 text-purple-200"
                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Trilha a partir do Playhead
                  </button>
                </div>
              </div>

              {/* Keep Duration */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">
                    Intervalo de Manutenção (Clipe)
                  </label>
                  <span className="text-yellow-400 font-mono font-semibold">{vlogKeepSeconds.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="30"
                  step="0.1"
                  value={vlogKeepSeconds}
                  onChange={(e) => setVlogKeepSeconds(parseFloat(e.target.value))}
                  className="w-full accent-[#8b5cf6] h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="number"
                    value={vlogKeepSeconds}
                    step="0.1"
                    min="0.1"
                    onChange={(e) => setVlogKeepSeconds(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white"
                  />
                  <span className="text-[11px] text-white/50">segundos (tempo mantido)</span>
                </div>
              </div>

              {/* Discard Duration */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">
                    Intervalo de Descarte (Cortar)
                  </label>
                  <span className="text-red-400 font-mono font-semibold">{vlogDiscardSeconds.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="10"
                  step="0.05"
                  value={vlogDiscardSeconds}
                  onChange={(e) => setVlogDiscardSeconds(parseFloat(e.target.value))}
                  className="w-full accent-[#8b5cf6] h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="number"
                    value={vlogDiscardSeconds}
                    step="0.05"
                    min="0.01"
                    onChange={(e) => setVlogDiscardSeconds(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                    className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white"
                  />
                  <span className="text-[11px] text-white/50">segundos (tempo removido)</span>
                </div>
              </div>

              {/* Modo de Aplicação */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Modo de Aplicação</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setVlogMode("split")}
                    className={`py-1.5 px-3 rounded border text-center transition-all ${
                      vlogMode === "split"
                        ? "bg-purple-600/20 border-purple-500 text-purple-200"
                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Apenas Fatiar (Split All)
                  </button>
                  <button
                    onClick={() => setVlogMode("delete")}
                    className={`py-1.5 px-3 rounded border text-center transition-all ${
                      vlogMode === "delete"
                        ? "bg-purple-600/20 border-purple-500 text-purple-200"
                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    Fatiar e Deletar (Jump Cut)
                  </button>
                </div>
                <p className="text-[10px] text-white/40 mt-1">
                  {vlogMode === "split"
                    ? "Mantém as fatias fatiadas na timeline no local original."
                    : "Remove fatias de descarte e desloca os clipes seguintes para preencher a lacuna."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3 mt-1">
              <button
                onClick={() => setShowVlogCutModal(false)}
                className="px-4 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-all font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleVlogCut}
                className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-md shadow-purple-600/20"
              >
                Aplicar Corte
              </button>
            </div>
          </div>
        </div>
      )}

      <CoverModal open={coverOpen} onClose={() => setCoverOpen(false)} />

      <VoiceoverModal key={voiceoverOpen ? "voiceover-open" : "voiceover-closed"} open={voiceoverOpen} onClose={() => setVoiceoverOpen(false)} />
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


