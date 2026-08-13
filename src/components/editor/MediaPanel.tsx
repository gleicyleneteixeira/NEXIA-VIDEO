"use client";

import { useRef, useState } from "react";
import { Upload, Film, Music, Image, Trash2, Volume2 } from "lucide-react";
import { useMediaStore, useProjectStore, useUIStore, usePlaybackStore } from "@/lib/editor";
import type { TimelineItem, MediaFile } from "@/lib/editor";
import { DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_TEXT_PROPS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, generateId } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import RecordModal from "./RecordModal";

const extractAudio = async (videoFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();

    fileReader.onload = () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        const mediaStreamDestination = audioContext.createMediaStreamDestination();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(mediaStreamDestination);
        const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          chunks.push(event.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/wav" });
          const audioFile = new File([blob], videoFile.name.replace(/\.[^/.]+$/, ".mp3"), { type: "audio/wav" });
          audioContext.close();
          resolve(audioFile);
        };

        source.start();
        mediaRecorder.start();
        setTimeout(() => {
          source.stop();
          mediaRecorder.stop();
        }, audioBuffer.duration * 1000);
      }, (e: any) => {
        audioContext.close();
        reject(e);
      });
    };

    fileReader.onerror = () => {
      audioContext.close();
      reject(fileReader.error);
    };

    fileReader.readAsArrayBuffer(videoFile);
  });
};

export default function MediaPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { files, addFile, removeFile } = useMediaStore();
  const { addItem } = useProjectStore();
  const { clearSelection } = useUIStore();
  const [dragging, setDragging] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

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

    withHistory("Adicionar mídia", () => addItem(item));
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

    withHistory("Adicionar mídia", () => addItem(item));
  };

  const extractAudioFromVideo = async (media: MediaFile) => {
    const { project } = useProjectStore.getState();
    const timeline = project.timeline;
    const audioTrackId = timeline.trackOrder.find(
      (id: string) => timeline.tracks[id]?.kind === "audio"
    );
    if (!audioTrackId || !media.file) return;

    try {
      const audioFile = await extractAudio(media.file);
      const audioUrl = URL.createObjectURL(audioFile);

      const audioMediaFile: MediaFile = {
        id: crypto.randomUUID(),
        name: `Áudio - ${media.name.replace(/\.[^/.]+$/, "")}`,
        type: "audio",
        file: audioFile,
        url: audioUrl,
        duration: media.duration,
        importedAt: Date.now(),
      };

      useMediaStore.getState().addFile(audioFile);

      const audioMedia = useMediaStore.getState().files[useMediaStore.getState().files.length - 1];

      const lastItem = timeline.items
        .filter((i: TimelineItem) => i.trackId === audioTrackId)
        .sort((a: TimelineItem, b: TimelineItem) => (a.startFrame + a.durationInFrames) - (b.startFrame + b.durationInFrames))
        .pop();
      const startFrame = lastItem ? lastItem.startFrame + lastItem.durationInFrames : 0;
      const duration = media.duration ? Math.ceil(media.duration * timeline.fps) : timeline.fps * 5;

      const item: TimelineItem = {
        id: generateId(),
        trackId: audioTrackId,
        startFrame,
        durationInFrames: duration,
        name: `Áudio - ${media.name.replace(/\.[^/.]+$/, "")}`,
        kind: "audio",
        src: audioMedia.url,
        file: audioMedia.file,
        mediaId: audioMedia.id,
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

      withHistory("Adicionar mídia", () => addItem(item));
    } catch (err) {
      console.error("Failed to extract audio:", err);
    }
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
          <span className="text-[10px]">Arraste e solte vídeos, fotos e arquivos de áudio aqui</span>
        </button>
      </div>

      <div className="px-3 py-2 border-b border-[#1a1a28]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Sem mídia? Crie com estas ferramentas</div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setShowRecordModal(true)}
            className="flex flex-col items-center justify-center py-3 bg-[#1a1a28] border border-[#2a2a38] rounded-lg hover:border-[#ec4899]/50 hover:bg-[#ec4899]/5 transition-colors"
          >
            <span className="text-lg mb-0.5">📹</span>
            <span className="text-[9px] text-gray-400">Gravar</span>
          </button>
          <button
            onClick={() => {
              const evt = new CustomEvent("editor-open-ai-media", {
                detail: { type: "image", purpose: "avatar" },
              });
              window.dispatchEvent(evt);
            }}
            className="flex flex-col items-center justify-center py-3 bg-[#1a1a28] border border-[#2a2a38] rounded-lg hover:border-[#ec4899]/50 hover:bg-[#ec4899]/5 transition-colors"
          >
            <span className="text-lg mb-0.5">👤</span>
            <span className="text-[9px] text-gray-400">Avatares</span>
          </button>
          <button
            onClick={() => {
              const evt = new CustomEvent("editor-open-ai-media", {
                detail: { type: "video", purpose: "generate" },
              });
              window.dispatchEvent(evt);
            }}
            className="flex flex-col items-center justify-center py-3 bg-[#1a1a28] border border-[#2a2a38] rounded-lg hover:border-[#ec4899]/50 hover:bg-[#ec4899]/5 transition-colors"
          >
            <span className="text-lg mb-0.5">✨</span>
            <span className="text-[9px] text-gray-400">Gerar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {files.map((media: MediaFile) => (
          <div
            key={media.id}
            draggable
            onDragStart={() => setDragging(media.id)}
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

            {media.type === "video" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  extractAudioFromVideo(media);
                }}
                className="p-0.5 hover:bg-[#1e1e2e] rounded text-gray-500 hover:text-[#8b5cf6] transition-colors"
                title="Extrair áudio"
              >
                <Volume2 size={10} />
              </button>
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

      <RecordModal
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
      />
    </div>
  );
}
