"use client";

import { useState, useCallback, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen, Undo2, Redo2, Save } from "lucide-react";
import { useUIStore, useProjectStore, useMediaStore, usePlaybackStore } from "@/lib/editor";
import type { TimelineItem } from "@/lib/editor";
import { DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_TEXT_PROPS, DEFAULT_CANVAS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, generateId, createDefaultItem, ASPECT_RATIOS } from "@/lib/editor";
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
import Teleprompter from "@/components/editor/Teleprompter";
import CloudStorage from "@/components/editor/CloudStorage";
import WatermarkPanel from "@/components/editor/WatermarkPanel";
import MatchCut from "@/components/editor/MatchCut";

type SidebarTab = "media" | "templates" | "text" | "effects" | "transitions" | "audio" | "animation" | "matchcut" | "teleprompter" | "watermark" | "cloud" | "canvas" | "export";

export default function EditorPage() {
  const { undo, redo, canUndo, canRedo, clearSelection } = useUIStore();
  const { project, addItem, updateProjectName, setProject } = useProjectStore();
  const { addFile } = useMediaStore();
  const { isPlaying, togglePlayback, currentTime } = usePlaybackStore();

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("media");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const timeline = project.timeline;

  const handleMediaImport = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.files) {
      Array.from(detail.files as File[]).forEach((file) => {
        const media = addFile(file);

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
          srcInFrame: 0,
          srcOutFrame: duration,
          transform: { ...DEFAULT_TRANSFORM },
          filters: { ...DEFAULT_FILTERS },
          crop: { enabled: false, top: 0, right: 0, bottom: 0, left: 0 },
          mask: { enabled: false, shape: "circle", x: 50, y: 50, width: 80, height: 80, rotation: 0, feather: 0, invert: false },
          chromaKey: { enabled: false, color: "#00ff00", intensity: 0.5, shadow: 0, feather: 0, spill: 0 },
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
      });
    }
  }, [addFile, addItem, timeline]);

  useEffect(() => {
    window.addEventListener("editor-media-import", handleMediaImport);
    return () => window.removeEventListener("editor-media-import", handleMediaImport);
  }, [handleMediaImport]);

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
    { id: "media", label: "Mídia", icon: "M" },
    { id: "templates", label: "Templates", icon: "T" },
    { id: "text", label: "Texto", icon: "X" },
    { id: "effects", label: "Efeitos", icon: "E" },
    { id: "transitions", label: "Transições", icon: "Z" },
    { id: "audio", label: "Áudio", icon: "Á" },
    { id: "animation", label: "Animação", icon: "A" },
    { id: "matchcut", label: "Batidas", icon: "B" },
    { id: "teleprompter", label: "Teleprompter", icon: "P" },
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
          <button className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400" title="Salvar">
            <Save size={14} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="flex flex-shrink-0">
            <div className="w-10 bg-[#0a0a12] border-r border-[#1e1e2e] flex flex-col items-center py-2 gap-1 overflow-y-auto">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSidebarTab(item.id);
                    if (!sidebarOpen) setSidebarOpen(true);
                  }}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-[9px] font-medium transition-colors ${
                    sidebarTab === item.id && sidebarOpen
                      ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                      : "text-gray-500 hover:bg-[#1e1e2e] hover:text-gray-300"
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>

            <div className="w-[280px] bg-[#0d0d16] border-r border-[#1e1e2e] overflow-hidden">
              {sidebarTab === "media" && <MediaPanel />}
              {sidebarTab === "templates" && <TemplatesLibrary />}
              {sidebarTab === "text" && <TextPanel />}
              {sidebarTab === "effects" && <EffectsPanel />}
              {sidebarTab === "transitions" && <TransitionsPanel />}
              {sidebarTab === "audio" && <AudioPanel />}
              {sidebarTab === "animation" && <AnimationPanel />}
              {sidebarTab === "matchcut" && <MatchCut />}
              {sidebarTab === "teleprompter" && <Teleprompter />}
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
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <Preview />
          </div>

          <div className="h-[220px] flex-shrink-0 border-t border-[#1e1e2e]">
            <Timeline />
          </div>
        </div>

        {rightPanelOpen && (
          <div className="w-[260px] flex-shrink-0">
            <PropertiesPanel />
          </div>
        )}
      </div>
    </div>
  );
}
