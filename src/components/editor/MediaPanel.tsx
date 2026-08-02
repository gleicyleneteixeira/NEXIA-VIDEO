"use client";

import { useRef, useState } from "react";
import { Upload, Film, Music, Image, Trash2 } from "lucide-react";
import { useMediaStore, useProjectStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, MediaFile } from "@/lib/editor";
import { DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_TEXT_PROPS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, generateId } from "@/lib/editor";

export default function MediaPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { files, addFile, removeFile } = useMediaStore();
  const { addItem } = useProjectStore();
  const { clearSelection } = useUIStore();
  const [dragging, setDragging] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach((file) => addFile(file));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach((file) => addFile(file));
  };

  const addMediaToTimeline = (media: MediaFile) => {
    const { project } = useProjectStore.getState();
    const tl = project.timeline;

    const videoTrackId = tl.trackOrder.find(
      (id: string) => tl.tracks[id]?.kind === "video"
    );
    const audioTrackId = tl.trackOrder.find(
      (id: string) => tl.tracks[id]?.kind === "audio"
    );

    const trackId = media.type === "audio" ? audioTrackId : videoTrackId;
    if (!trackId) return;

    const lastItem = tl.items
      .filter((i: TimelineItem) => i.trackId === trackId)
      .sort((a: TimelineItem, b: TimelineItem) => (a.startFrame + a.durationInFrames) - (b.startFrame + b.durationInFrames))
      .pop();

    const startFrame = lastItem ? lastItem.startFrame + lastItem.durationInFrames : 0;
    const duration = media.duration ? Math.ceil(media.duration * tl.fps) : tl.fps * 5;

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

    addItem(item);
  };

  const addTextToTimeline = () => {
    const { project } = useProjectStore.getState();
    const tl = project.timeline;
    const textTrackId = tl.trackOrder.find(
      (id: string) => tl.tracks[id]?.kind === "text"
    );
    if (!textTrackId) return;

    const lastItem = tl.items
      .filter((i: TimelineItem) => i.trackId === textTrackId)
      .sort((a: TimelineItem, b: TimelineItem) => (a.startFrame + a.durationInFrames) - (b.startFrame + b.durationInFrames))
      .pop();

    const startFrame = lastItem ? lastItem.startFrame + lastItem.durationInFrames : 0;

    const item: TimelineItem = {
      id: generateId(),
      trackId: textTrackId,
      startFrame,
      durationInFrames: tl.fps * 3,
      name: "Texto",
      kind: "text",
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
      text: { ...DEFAULT_TEXT_PROPS },
    };

    addItem(item);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Film size={14} className="text-purple-400" />;
      case "audio": return <Music size={14} className="text-green-400" />;
      case "image": return <Image size={14} className="text-blue-400" />;
      default: return <Film size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="h-full bg-[#0d0d16] border-r border-[#1e1e2e] flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mídia</h3>
        <div className="flex gap-1">
          <button
            onClick={addTextToTimeline}
            className="px-2 py-0.5 bg-[#ec4899]/10 text-[#ec4899] text-[10px] rounded hover:bg-[#ec4899]/20"
          >
            + Texto
          </button>
        </div>
      </div>

      <div
        className="p-3"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-6 border-2 border-dashed border-[#1e1e2e] rounded-lg text-gray-500 hover:border-[#8b5cf6]/50 hover:text-[#8b5cf6] transition-colors flex flex-col items-center gap-2"
        >
          <Upload size={20} />
          <span className="text-[10px]">Arraste ou clique para importar</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {files.map((media: MediaFile) => (
          <div
            key={media.id}
            draggable
            onDragStart={(e) => {
              setDragging(media.id);
              e.dataTransfer.setData("application/media-id", media.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onDragEnd={() => setDragging(null)}
            onClick={() => addMediaToTimeline(media)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[#1a1a28] transition-colors ${
              dragging === media.id ? "opacity-50" : ""
            }`}
          >
            {getIcon(media.type)}
            <span className="flex-1 text-xs text-[#a0a0b0] truncate">{media.name}</span>
            {media.duration && (
              <span className="text-[9px] text-gray-600">
                {Math.floor(media.duration / 60)}:{String(Math.floor(media.duration % 60)).padStart(2, "0")}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile(media.id);
              }}
              className="p-0.5 hover:bg-red-900/30 rounded text-gray-600 hover:text-red-400"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
