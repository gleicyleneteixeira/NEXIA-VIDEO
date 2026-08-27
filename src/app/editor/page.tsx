"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PanelLeftClose, PanelLeftOpen, Undo2, Redo2, Save } from "lucide-react";
import { useUIStore, useProjectStore, useMediaStore, usePlaybackStore } from "@/lib/editor";
import type { TimelineItem } from "@/lib/editor";
import { DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_TEXT_PROPS, DEFAULT_CANVAS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, generateId, createDefaultItem, ASPECT_RATIOS } from "@/lib/editor";
import { consumePendingPostImport } from "@/lib/editor/pendingPost";
import { consumePendingFileImport } from "@/lib/editor/pendingFileImport";
import { useProjectsStore, createBlankProject } from "@/lib/editor/projects-store";
import { withHistory } from "@/lib/editor/history";
import ProjectsModal from "@/components/editor/ProjectsModal";
import Timeline from "@/components/editor/Timeline";
import Preview from "@/components/editor/Preview";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import MediaPanel from "@/components/editor/MediaPanel";
import ExportPanel from "@/components/editor/ExportPanel";
import EffectsPanel from "@/components/editor/EffectsPanel";
import TransitionsPanel from "@/components/editor/TransitionsPanel";
import AudioPanel from "@/components/editor/AudioPanel";
import AnimationPanel from "@/components/editor/AnimationPanel";
import TextPanel from "@/components/editor/TextPanel";
import CanvasPanel from "@/components/editor/CanvasPanel";
import TemplatesLibrary from "@/components/editor/TemplatesLibrary";
import TTSPanel from "@/components/editor/TTSPanel";
import BrandKitPanel from "@/components/editor/BrandKitPanel";
import Teleprompter from "@/components/editor/Teleprompter";
import CloudStorage from "@/components/editor/CloudStorage";
import WatermarkPanel from "@/components/editor/WatermarkPanel";
import MatchCut from "@/components/editor/MatchCut";
import StickersPanel from "@/components/editor/StickersPanel";
import SubtitlesPanel from "@/components/editor/SubtitlesPanel";
import FiltersPanel from "@/components/editor/FiltersPanel";
import AdjustPanel from "@/components/editor/AdjustPanel";

type SidebarTab =
  | "media"
  | "audio"
  | "text"
  | "stickers"
  | "effects"
  | "transitions"
  | "subtitles"
  | "filters"
  | "adjust"
  | "templates"
  | "animation"
  | "matchcut"
  | "teleprompter"
  | "tts"
  | "brand"
  | "watermark"
  | "cloud"
  | "canvas"
  | "export";

export default function EditorPage() {
  const { undo, redo, canUndo, canRedo, clearSelection } = useUIStore();
  const { project, addItem, updateProjectName, setProject } = useProjectStore();
  const { addFile } = useMediaStore();
  const { isPlaying, togglePlayback, currentTime } = usePlaybackStore();

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("media");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [timelineHeight, setTimelineHeight] = useState(220);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const timelineResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleTimelineResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    timelineResizeRef.current = { startY: e.clientY, startHeight: timelineHeight };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, [timelineHeight]);

  const handleTimelineResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = timelineResizeRef.current;
    if (!d) return;
    const minH = 220;
    const maxH = Math.floor(window.innerHeight * 0.6);
    const next = d.startHeight + (d.startY - e.clientY);
    setTimelineHeight(Math.max(minH, Math.min(next, maxH)));
  }, []);

  const handleTimelineResizeEnd = useCallback(() => {
    timelineResizeRef.current = null;
  }, []);

  const timeline = project.timeline;

  const importMediaFile = useCallback((file: File, forcedDuration?: number) => {
    const media = addFile(file, forcedDuration);

    const timeline = useProjectStore.getState().project.timeline;
    const videoTrackId = timeline.trackOrder.find(
      (trackId) => timeline.tracks[trackId]?.kind === "video"
    );
    const audioTrackId = timeline.trackOrder.find(
      (trackId) => timeline.tracks[trackId]?.kind === "audio"
    );

    const trackId = media.type === "audio" ? audioTrackId : videoTrackId;
    if (!trackId) return;

    const lastItem = timeline.items
      .filter((item) => item.trackId === trackId)
      .sort((a, b) => (a.startFrame + a.durationInFrames) - (b.startFrame + b.durationInFrames))
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
      crop: { enabled: false, top: 0, right: 0, bottom: 0, left: 0 },
      mask: { enabled: false, shape: "circle", x: 50, y: 50, width: 80, height: 80, rotation: 0, feather: 0, invert: false },
      chromaKey: { ...DEFAULT_CHROMA_KEY },
      blendMode: "normal",
      speed: { rate: 1, reverse: false, freezeFrame: null, curve: [] },
      animation: { enter: "none", exit: "none", durationInFrames: 15 },
      audio: { fade: { in: "none", inDuration: 0, out: "none", outDuration: 0 }, voiceEffect: "none", eqPreset: "none", denoise: false },
      effects: [],
      hsl: {},
      filterPreset: "none",
      keyframes: {},
    };

    addItem(item);
  }, [addFile, addItem]);

  const handleMediaImport = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.files) {
      (detail.files as File[]).forEach((file) => importMediaFile(file));
    }
  }, [importMediaFile]);

  useEffect(() => {
    window.addEventListener("editor-media-import", handleMediaImport);
    return () => window.removeEventListener("editor-media-import", handleMediaImport);
  }, [handleMediaImport]);

  // Captura um frame do primeiro clipe de vídeo para usar de capa do rascunho.
  const captureProjectThumbnail = useCallback(async (src: string): Promise<string | undefined> => {
    try {
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        video.onloadeddata = () => res();
        video.onerror = () => rej(new Error("erro ao carregar vídeo"));
      });
      video.currentTime = Math.min(0.1, (video.duration || 1) * 0.01);
      await new Promise<void>((res) => {
        video.onseeked = () => res();
        setTimeout(res, 1500);
      });
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch {
      return undefined;
    }
  }, []);

  // Import pendente de arquivos vindos de outras telas (ex.: Criação em Massa).
  // CRIA UM NOVO PROJETO — nunca sobrescreve o que já estava sendo editado.
  useEffect(() => {
    const items = consumePendingFileImport();
    if (!items || items.length === 0) return;

    const projectName = items[0]?.projectName || "Vídeo enviado";
    useProjectsStore.getState().createNew(projectName);
    useProjectStore.getState().setProject(createBlankProject());

    items.forEach((it) => importMediaFile(it.file, it.duration));

    // Capa: primeiro clipe de vídeo inserido.
    const firstVideo = useProjectStore.getState().project.timeline.items.find((i) => i.kind === "video");
    if (firstVideo?.src) {
      captureProjectThumbnail(firstVideo.src).then((thumb) => {
        if (thumb) {
          const cur = useProjectsStore.getState();
          cur.saveCurrent(useProjectStore.getState().project, {
            name: projectName,
            thumbnailUrl: thumb,
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importMediaFile]);

  // Import pendente vindo do "Criar Vídeo no Editor" (calendário/posts).
  useEffect(() => {
    const pending = consumePendingPostImport();
    if (!pending) return;

    try {
      const state = useProjectStore.getState();
      const timeline = state.project.timeline;
      const videoTrackId = timeline.trackOrder.find(
        (trackId) => timeline.tracks[trackId]?.kind === "video"
      );
      const textTrackId = timeline.trackOrder.find(
        (trackId) => timeline.tracks[trackId]?.kind === "text"
      );

      let imageId = "";
      if (videoTrackId && pending.imageDataUrl) {
        const imageItem = createDefaultItem({
          trackId: videoTrackId,
          startFrame: 0,
          durationInFrames: 90,
          name: `Post DIA ${pending.dayNumber} (${pending.pillarLabel})`,
          kind: "image",
          src: pending.imageDataUrl,
          mediaWidth: 1080,
          mediaHeight: 1080,
        });
        imageId = imageItem.id;
        withHistory("Inserir imagem do post", () => state.addItem(imageItem));
      }

      if (textTrackId) {
        if (pending.scriptTexts && pending.scriptTexts.length > 0) {
          pending.scriptTexts.forEach((content, i) => {
            const textItem = createDefaultItem({
              trackId: textTrackId,
              startFrame: i * 22,
              durationInFrames: 22,
              name: `Fala ${i + 1}`,
              kind: "text",
              text: {
                ...DEFAULT_TEXT_PROPS,
                content,
                fontSize: 48,
              },
            });
            withHistory("Inserir fala do roteiro", () => state.addItem(textItem));
          });
        } else if (pending.hook) {
          const textItem = createDefaultItem({
            trackId: textTrackId,
            startFrame: 0,
            durationInFrames: 90,
            name: `Gancho DIA ${pending.dayNumber}`,
            kind: "text",
            text: {
              ...DEFAULT_TEXT_PROPS,
              content: pending.hook,
              fontSize: 64,
            },
          });
          withHistory("Inserir gancho do post", () => state.addItem(textItem));
        }
      }

      void imageId;
    } catch {
      /* import pendente falhou — o editor abre vazio sem quebrar */
    }
  }, []);

  // Restore media persisted in IndexedDB and re-point project items to it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const files = await useMediaStore.getState().hydrate();
      if (cancelled || files.length === 0) return;
      const { project, updateItem } = useProjectStore.getState();
      const mediaById = new Map(files.map((f) => [f.id, f]));
      project.timeline.items.forEach((item) => {
        if (item.mediaId && mediaById.has(item.mediaId)) {
          const m = mediaById.get(item.mediaId)!;
          if (!item.src || item.src.startsWith("blob:")) {
            updateItem(item.id, { src: m.url, file: m.file });
          }
        }
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // When a media file finishes uploading to MinIO/S3, point its timeline items
  // to the permanent URL so the project survives reloads on any machine.
  useEffect(() => {
    const onUploaded = (e: Event) => {
      const { mediaId, url } = (e as CustomEvent).detail as { mediaId: string; url: string };
      if (!mediaId || !url) return;
      const { project, updateItem } = useProjectStore.getState();
      project.timeline.items.forEach((item) => {
        if (item.mediaId === mediaId) {
          updateItem(item.id, { src: url });
        }
      });
    };
    window.addEventListener("editor-media-uploaded", onUploaded);
    return () => window.removeEventListener("editor-media-uploaded", onUploaded);
  }, []);

  // Auto-save: cada alteração na timeline OU na agulha atualiza (com debounce)
  // o rascunho ativo em "Meus Projetos" (estilo CapCut), guardando também a
  // posição exata da agulha e a duração total.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      const p = useProjectStore.getState().project;
      const fps = p.timeline.fps || 30;
      const lastEnd = p.timeline.items.length
        ? Math.max(...p.timeline.items.map((i) => i.startFrame + i.durationInFrames))
        : 0;
      const currentTime = usePlaybackStore.getState().currentTime;
      useProjectsStore.getState().saveCurrent(p, {
        name: p.name,
        currentTime,
        totalDuration: lastEnd / fps,
      });
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(persist, 1000);
    };
    const unsubProject = useProjectStore.subscribe(schedule);
    const unsubPlayback = usePlaybackStore.subscribe(schedule);
    return () => {
      if (timer) clearTimeout(timer);
      unsubProject();
      unsubPlayback();
    };
  }, []);

  const handleCanvasAspectChange = useCallback((aspectRatio: string) => {
    const dims = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS];
    if (!dims) return;
    setProject({
      ...project,
      timeline: {
        ...project.timeline,
        canvas: {
          ...project.timeline.canvas,
          aspectRatio: aspectRatio as any,
        },
        width: dims.w,
        height: dims.h,
      },
    });
  }, [project.timeline, setProject]);

  const sidebarItems: { id: SidebarTab; label: string; icon: string }[] = [
    { id: "media", label: "Mídia", icon: "📁" },
    { id: "audio", label: "Áudio", icon: "🎵" },
    { id: "text", label: "Texto", icon: "📝" },
    { id: "stickers", label: "Stickers", icon: "😀" },
    { id: "effects", label: "Efeitos", icon: "✨" },
    { id: "transitions", label: "Transições", icon: "🔀" },
    { id: "subtitles", label: "Legendas", icon: "📜" },
    { id: "filters", label: "Filtros", icon: "🎨" },
    { id: "adjust", label: "Ajuste", icon: "🎚️" },
    { id: "templates", label: "Templates", icon: "T" },
    { id: "animation", label: "Animação", icon: "A" },
    { id: "matchcut", label: "Batidas", icon: "B" },
    { id: "teleprompter", label: "Teleprompter", icon: "P" },
    { id: "tts", label: "Voz (TTS)", icon: "🗣" },
    { id: "brand", label: "Marca", icon: "🎨" },
    { id: "watermark", label: "Marca d'Água", icon: "W" },
    { id: "cloud", label: "Nuvem", icon: "☁" },
    { id: "canvas", label: "Canvas", icon: "C" },
    { id: "export", label: "Exportar", icon: "↓" },
  ];

  return (
    <div className="h-screen bg-[#08080d] flex flex-col overflow-hidden">
      <header className="flex items-center h-10 bg-[#0d0d16] border-b border-[#1e1e2e] px-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-[#1e1e2e] rounded text-gray-400"
          >
            {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          </button>
          <div className="w-px h-5 bg-[#1e1e2e]" />
        </div>

        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={project.name}
            onChange={(e) => updateProjectName(e.target.value)}
            className="bg-transparent text-sm text-white font-medium border-none outline-none focus:bg-[#13131f] focus:px-2 focus:rounded transition-all"
          />
          <span className="text-[10px] text-gray-600">|</span>
          <span className="text-[10px] text-gray-500">{timeline.fps}fps</span>
          <span className="text-[10px] text-gray-600">|</span>
          <span className="text-[10px] text-gray-500">{timeline.width}x{timeline.height}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 disabled:opacity-30"
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>
          <div className="w-px h-5 bg-[#1e1e2e] mx-1" />
          <button
            onClick={() => setProjectsOpen(true)}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Meus projetos (rascunhos)"
          >
            📁
          </button>
          <button
            onClick={() => {
              const p = useProjectStore.getState().project;
              useProjectsStore.getState().saveCurrent(p, { name: p.name, currentTime: usePlaybackStore.getState().currentTime });
            }}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Salvar agora"
          >
            <Save size={14} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="flex flex-shrink-0">
            <div className="w-[72px] bg-[#0a0a12] border-r border-[#1e1e2e] flex flex-col items-center py-2 gap-0.5 overflow-y-auto">
              {sidebarItems.map((item) => {
                const active = sidebarTab === item.id && sidebarOpen;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSidebarTab(item.id);
                    }}
                    className={`w-full flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg transition-colors ${
                      active
                        ? "bg-[#8b5cf6]/15 text-[#8b5cf6] shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]"
                        : "text-gray-500 hover:bg-[#1e1e2e] hover:text-gray-300"
                    }`}
                    title={item.label}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span className={`text-[10px] leading-tight ${active ? "text-[#a78bfa]" : ""}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-[300px] bg-[#0d0d16] border-r border-[#1e1e2e] flex flex-col overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between px-2 h-7 bg-[#0a0a12] border-b border-[#1e1e2e]">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {sidebarItems.find((i) => i.id === sidebarTab)?.label}
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-[#1e1e2e] text-gray-500 hover:text-gray-300 flex items-center gap-1"
                  title="Recolher painel"
                >
                  <PanelLeftClose size={12} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
              {sidebarTab === "media" && <MediaPanel />}
              {sidebarTab === "audio" && <AudioPanel />}
              {sidebarTab === "text" && <TextPanel onNavigate={(tab) => setSidebarTab(tab as SidebarTab)} />}
              {sidebarTab === "stickers" && <StickersPanel />}
              {sidebarTab === "effects" && <EffectsPanel />}
              {sidebarTab === "transitions" && <TransitionsPanel />}
              {sidebarTab === "subtitles" && <SubtitlesPanel />}
              {sidebarTab === "filters" && <FiltersPanel />}
              {sidebarTab === "adjust" && <AdjustPanel />}
              {sidebarTab === "templates" && <TemplatesLibrary />}
              {sidebarTab === "animation" && <AnimationPanel />}
              {sidebarTab === "matchcut" && <MatchCut />}
              {sidebarTab === "teleprompter" && <Teleprompter />}
              {sidebarTab === "tts" && <TTSPanel />}
              {sidebarTab === "brand" && <BrandKitPanel />}
              {sidebarTab === "watermark" && <WatermarkPanel />}
              {sidebarTab === "cloud" && <CloudStorage />}
              {sidebarTab === "canvas" && <CanvasPanel />}
              {sidebarTab === "export" && (
                <div className="h-full overflow-y-auto">
                  <ExportPanel />
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <Preview />
          </div>

          {/* Alça horizontal: puxar para cima aumenta a timeline (min 220px → max 60vh). */}
          <div
            className="h-1.5 flex-shrink-0 bg-transparent hover:bg-[#2a2a3a] active:bg-[#3a3a4a] cursor-row-resize touch-none transition-colors"
            title="Redimensionar a timeline"
            onPointerDown={handleTimelineResizeStart}
            onPointerMove={handleTimelineResizeMove}
            onPointerUp={handleTimelineResizeEnd}
            onPointerCancel={handleTimelineResizeEnd}
            onPointerLeave={handleTimelineResizeEnd}
          />

          <div
            className="flex-shrink-0 border-t border-[#1e1e2e]"
            style={{ height: timelineHeight }}
          >
            <Timeline />
          </div>
        </div>

        {rightPanelOpen && (
          <div className="w-[260px] flex-shrink-0">
            <PropertiesPanel />
          </div>
        )}
      </div>

      <ProjectsModal open={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </div>
  );
}
