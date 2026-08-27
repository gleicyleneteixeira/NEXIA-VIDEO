"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Trash2,
  Download,
  Sparkles,
  RefreshCw,
  X,
  Film,
  Factory,
  Plus,
  FileVideo,
  Archive,
  Send,
  Loader,
  AlertCircle,
  Clock,
  HardDrive,
  AlertTriangle,
  Eye,
  EyeOff,
  Rocket,
  CheckCircle,
} from "lucide-react";
import {
  VideoBlock,
  Variation,
  RenderMode,
  VideoFormat,
  VIDEO_FORMATS,
  concatenateVideosFFmpeg,
  buildSingleVariationTrackList,
  formatDuration,
  formatDurationLong,
  getVideoDuration,
} from "@/lib/videoEngine";
import { saveVideoToDB } from "@/lib/storage";
import { uploadVideoToSupabase } from "@/services/supabaseStorage";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getObjectUrl, recoverFromDeadUrl } from "@/utils/mediaBlobManager";
import {
  GalleryStorageService,
  galleryRemainingLabel,
  GalleryMediaInput,
} from "@/services/mediaStorageService";
import { captureVideoThumbnail } from "@/utils/videoThumbnail";
import { buildZip, downloadBlob } from "@/utils/zip";
import { fisherYatesShuffle } from "@/utils/shuffle";
import { deduplicateById } from "@/utils/videoDedup";
import {
  sendFinalVideoToEditor,
  sendFinalVideosToEditor,
} from "@/services/bulkToEditorService";
import MediaIntegrityBadge from "@/components/media/MediaIntegrityBadge";
import { MediaVault } from "@/services/persistentMediaVault";

type TagType = "hook" | "bodyWithCta" | "development" | "painOrDesire" | "solution" | "cta";
type ResultsTab = "generated" | "media";
type VideoFilter = "all" | "not_posted" | "posted";

export type BulkStructureMode = "2-slots" | "3-slots" | "4-slots";

// Configuração dos slots para cada modalidade
export const BULK_MODALITIES_CONFIG: Record<
  BulkStructureMode,
  { id: TagType; title: string; subtitle: string }[]
> = {
  "2-slots": [
    { id: "hook", title: "🎯 HOOK (Gancho)", subtitle: "Trecho inicial de atração" },
    { id: "bodyWithCta", title: "💡 DESENVOLVIMENTO + CTA", subtitle: "Conteúdo principal + Chamada final integrados" },
  ],
  "3-slots": [
    { id: "hook", title: "🎯 HOOK (Gancho)", subtitle: "Trecho inicial (0-3s)" },
    { id: "development", title: "💡 DESENVOLVIMENTO", subtitle: "Dor e Solução integradas" },
    { id: "cta", title: "📢 CTA (Final)", subtitle: "Chamada para ação/Oferta" },
  ],
  "4-slots": [
    { id: "hook", title: "🎯 HOOK (Gancho)", subtitle: "Trecho inicial" },
    { id: "painOrDesire", title: "🌩️ DOR / DESEJO / DÚVIDA", subtitle: "Apresentação do problema" },
    { id: "solution", title: "💡 SOLUÇÃO", subtitle: "Apresentação da solução/método" },
    { id: "cta", title: "📢 CTA (Final)", subtitle: "Chamada para ação" },
  ],
};

const SLOT_STYLE: Record<TagType, { accentColor: string; description: string }> = {
  hook: { accentColor: "border-pink-500 bg-pink-500/5 text-pink-400", description: "Trecho inicial de atração (primeiros 3s)" },
  bodyWithCta: { accentColor: "border-purple-500 bg-purple-500/5 text-purple-400", description: "Conteúdo principal + Chamada final integrados" },
  development: { accentColor: "border-cyan-500 bg-cyan-500/5 text-cyan-400", description: "Dor e Solução integradas" },
  painOrDesire: { accentColor: "border-purple-500 bg-purple-500/5 text-purple-400", description: "Apresentação do problema, busca ou dúvida" },
  solution: { accentColor: "border-cyan-500 bg-cyan-500/5 text-cyan-400", description: "Apresentação do método, produto ou virada de chave" },
  cta: { accentColor: "border-emerald-500 bg-emerald-500/5 text-emerald-400", description: "Chamada para ação (Inscrição, link da bio, compra)" },
};

const SLOT_LABEL: Record<TagType, string> = {
  hook: "HOOK",
  bodyWithCta: "CORPO+CTA",
  development: "DESENVOLVIMENTO",
  painOrDesire: "DOR/DESEJO",
  solution: "SOLUÇÃO",
  cta: "CTA",
};

const SLOT_GALLERY_FIELD: Record<
  TagType,
  { index: "hookIndex" | "painIndex" | "solutionIndex" | "devIndex" | "ctaIndex"; blob: "hookBlob" | "painBlob" | "solutionBlob" | "devBlob" | "ctaBlob" }
> = {
  hook: { index: "hookIndex", blob: "hookBlob" },
  painOrDesire: { index: "painIndex", blob: "painBlob" },
  solution: { index: "solutionIndex", blob: "solutionBlob" },
  development: { index: "devIndex", blob: "devBlob" },
  bodyWithCta: { index: "devIndex", blob: "devBlob" },
  cta: { index: "ctaIndex", blob: "ctaBlob" },
};

const MAX_VIDEOS_PER_CATEGORY = 5;

// Classes estáticas para o grid (Tailwind não gera classes dinâmicas)
const GRID_COLS_BY_COUNT: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

const SLOT_CHIP_COLOR: Record<TagType, string> = {
  hook: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  bodyWithCta: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  development: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  painOrDesire: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  solution: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  cta: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

interface UploadedVideo {
  id: string;
  name: string;
  file: File;
  duration: number;
  durationFormatted: string;
}

interface RenderedVideo {
  id: number;
  supabaseId?: string;
  galleryId?: string;
  createdAt?: string;
  thumbUrl?: string;
  variation: Variation;
  blobUrl: string | null;
  blob: Blob | null;
  duration: number;
  durationFormatted: string;
  status: "pending" | "standardizing" | "concatenating" | "ready" | "error";
  progress: number;
  selected: boolean;
  error?: string;
  savedToDB?: boolean;
  /** URL pública do Supabase Storage (nuvem) quando o upload teve sucesso */
  videoUrl?: string;
  /** true quando o vídeo está hospedado na nuvem (Supabase Storage) */
  isCloud?: boolean;
  is_posted: boolean;
}

interface QueueStatus {
  isProcessing: boolean;
  current: number;
  total: number;
  percentage: number;
  eta: string;
}

function VideoThumb({ file }: { file: File }) {
  const [src, setSrc] = useState(() => getObjectUrl(file));
  return (
    <video
      src={src}
      className="w-16 h-10 rounded object-cover bg-black"
      onError={() => setSrc(recoverFromDeadUrl(file, src))}
    />
  );
}

function GalleryVideoPlayer({ video, aspectClass }: { video: RenderedVideo; aspectClass: string }) {
  const [url, setUrl] = useState(() =>
    video.blob instanceof Blob ? getObjectUrl(video.blob) : video.blobUrl || ""
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-pausa: ao trocar de aba/minimizar E ao desmontar o card de preview.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current) videoRef.current.pause();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (videoRef.current) videoRef.current.pause();
    };
  }, []);

  if (!url && video.thumbUrl) {
    return (
      <img
        src={video.thumbUrl}
        alt={video.variation.id}
        className={`w-full ${aspectClass} rounded-lg bg-black object-cover`}
      />
    );
  }

  if (!url) {
    return (
      <div className={`w-full ${aspectClass} rounded-lg bg-black flex items-center justify-center`}>
        <span className="text-xs text-gray-500">Midia indisponivel</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={url}
      controls
      className={`w-full ${aspectClass} rounded-lg bg-black object-cover`}
      onError={() => {
        if (video.blob instanceof Blob) {
          setUrl(recoverFromDeadUrl(video.blob, url));
        }
      }}
    />
  );
}

function UploadBox({
  title,
  category,
  accentColor,
  description,
  videos,
  onUpload,
  onRemove,
  onPlay,
  limit,
  optional,
}: {
  title: string;
  category: TagType;
  accentColor: string;
  description: string;
  videos: UploadedVideo[];
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  onPlay: (file: File) => void;
  limit: number;
  optional?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLimitMessage, setShowLimitMessage] = useState(false);

  const isAtLimit = videos.length >= limit;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isAtLimit) {
      setShowLimitMessage(true);
      setTimeout(() => setShowLimitMessage(false), 3000);
      return;
    }
    onUpload(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (isAtLimit) {
        setShowLimitMessage(true);
        setTimeout(() => setShowLimitMessage(false), 3000);
        return;
      }
      onUpload(e.target.files);
    }
  };

  const colors = accentColor.split(" ");
  const borderColor = colors[0];
  const bgColor = colors[1];
  const textColor = colors[2];

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!isAtLimit) setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !isAtLimit && fileInputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed transition-all ${
        isDragOver ? `${borderColor} ${bgColor} scale-[1.02]`
          : isAtLimit ? "border-gray-600 bg-[#1c1c28] opacity-75 cursor-not-allowed"
          : "border-gray-700 bg-[#1c1c28] hover:border-gray-600 cursor-pointer"
      }`}
    >
      <div className={`p-4 border-b border-gray-800 ${isAtLimit ? "bg-gray-800/30" : bgColor}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-bold ${isAtLimit ? "text-gray-400" : textColor}`}>{title}</h3>
          <div className="flex items-center gap-2">
            {optional && videos.length === 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Opcional</span>
            )}
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${isAtLimit ? "bg-amber-500/20 text-amber-400" : `${bgColor} ${textColor}`}`}>
              {videos.length} / {limit}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      <div className="p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
        {videos.length > 0 ? (
          <div className="space-y-2">
            {videos.map((video) => (
              <div key={video.id} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 p-2 rounded-xl bg-[#252535] hover:bg-[#2a2a3a] transition-colors group">
                <button onClick={() => onPlay(video.file)} className="w-12 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent-pink)]/30 flex items-center justify-center shrink-0 hover:from-[var(--primary)]/50 hover:to-[var(--accent-pink)]/50 transition-all">
                  <Play className="w-4 h-4 text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.name}</p>
                  <p className="text-xs text-gray-500">{video.durationFormatted}</p>
                </div>
                <button onClick={() => onRemove(video.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all">
                  <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-[160px] text-center ${isAtLimit ? "opacity-70" : ""} pointer-events-none select-none`}>
            <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
              <Upload className={`w-6 h-6 ${textColor}`} />
            </div>
            <p className="text-sm text-gray-400 mb-2">Arraste videos aqui</p>
            <p className={`text-xs ${isAtLimit ? "text-gray-500" : `${textColor} hover:underline`}`}>
              {isAtLimit ? "Limite atingido" : "ou clique para selecionar"}
            </p>
          </div>
        )}
      </div>

      <div className="p-4 pt-0">
        {showLimitMessage ? (
          <div className="w-full py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Limite de {limit} videos atingido
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); if (!isAtLimit) fileInputRef.current?.click(); }} disabled={isAtLimit}
            className={`w-full py-2 rounded-xl border-2 border-dashed ${isAtLimit ? "border-gray-600 bg-gray-800/30 text-gray-500 cursor-not-allowed" : `${borderColor} ${bgColor} ${textColor} hover:opacity-80`} text-sm font-medium flex items-center justify-center gap-2 transition-all`}>
            <Plus className="w-4 h-4" />
            {isAtLimit ? "Limite Atingido" : "Adicionar Video"}
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />
    </div>
  );
}

export default function MassProductionPage() {
  const router = useRouter();
  const [structureMode, setStructureMode] = useState<BulkStructureMode>("4-slots");
  const [hookVideos, setHookVideos] = useState<UploadedVideo[]>([]);
  const [bodyVideos, setBodyVideos] = useState<UploadedVideo[]>([]);
  const [developmentVideos, setDevelopmentVideos] = useState<UploadedVideo[]>([]);
  const [painVideos, setPainVideos] = useState<UploadedVideo[]>([]);
  const [solutionVideos, setSolutionVideos] = useState<UploadedVideo[]>([]);
  const [ctaVideos, setCtaVideos] = useState<UploadedVideo[]>([]);
  const [renderedVideos, setRenderedVideos] = useState<RenderedVideo[]>([]);
  const [activeView, setActiveView] = useState<"upload" | "results">("upload");
  const [resultsTab, setResultsTab] = useState<ResultsTab>("generated");
  const [renderMode, setRenderMode] = useState<RenderMode>("fast");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>(VIDEO_FORMATS[0]);
  const [videoFilter, setVideoFilter] = useState<VideoFilter>("all");
  const [confirmDelete, setConfirmDelete] = useState<number[] | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [transition, setTransition] = useState<"none" | "fade" | "wipe">("none");
  const [transitionDuration, setTransitionDuration] = useState(0.5);

  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    isProcessing: false, current: 0, total: 0, percentage: 0, eta: "0:00",
  });

  // Trava rigida de execucao unica (sincrona). O estado `queueStatus.isProcessing`
  // so atualiza apos o re-render, entao cliques rapidos em sequencia AINDA podem
  // disparar varias `processQueue` em paralelo (cards Vídeo # duplicados). O ref
  // e setado de imediato, bloqueando disparos paralelos de forma deterministica.
  const isGeneratingRef = useRef(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const getAspectClass = (fmt: VideoFormat) => {
    switch (fmt.value) {
      case "9:16": return "aspect-[9/16]";
      case "16:9": return "aspect-video";
      case "1:1": return "aspect-square";
      case "4:5": return "aspect-[4/5]";
      default: return "aspect-[9/16]";
    }
  };

  const detectVideoFormat = (file: File): Promise<VideoFormat> => {
    return new Promise((resolve) => {
      const tempUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        const { videoWidth, videoHeight } = video;
        const ratio = videoWidth / videoHeight;
        let closest = VIDEO_FORMATS[0];
        let minDiff = Infinity;
        for (const fmt of VIDEO_FORMATS) {
          const diff = Math.abs(ratio - fmt.width / fmt.height);
          if (diff < minDiff) { minDiff = diff; closest = fmt; }
        }
        resolve(closest);
      };
      video.onerror = () => { URL.revokeObjectURL(tempUrl); resolve(VIDEO_FORMATS[0]); };
      video.src = tempUrl;
    });
  };

  const getSlotVideos = (cat: TagType): UploadedVideo[] => {
    switch (cat) {
      case "hook": return hookVideos;
      case "bodyWithCta": return bodyVideos;
      case "development": return developmentVideos;
      case "painOrDesire": return painVideos;
      case "solution": return solutionVideos;
      case "cta": return ctaVideos;
    }
  };

  const addSlotVideos = (cat: TagType, vids: UploadedVideo[]) => {
    switch (cat) {
      case "hook": setHookVideos((p) => [...p, ...vids]); break;
      case "bodyWithCta": setBodyVideos((p) => [...p, ...vids]); break;
      case "development": setDevelopmentVideos((p) => [...p, ...vids]); break;
      case "painOrDesire": setPainVideos((p) => [...p, ...vids]); break;
      case "solution": setSolutionVideos((p) => [...p, ...vids]); break;
      case "cta": setCtaVideos((p) => [...p, ...vids]); break;
    }
  };

  const removeSlotVideo = (cat: TagType, id: string) => {
    switch (cat) {
      case "hook": setHookVideos((p) => p.filter((v) => v.id !== id)); break;
      case "bodyWithCta": setBodyVideos((p) => p.filter((v) => v.id !== id)); break;
      case "development": setDevelopmentVideos((p) => p.filter((v) => v.id !== id)); break;
      case "painOrDesire": setPainVideos((p) => p.filter((v) => v.id !== id)); break;
      case "solution": setSolutionVideos((p) => p.filter((v) => v.id !== id)); break;
      case "cta": setCtaVideos((p) => p.filter((v) => v.id !== id)); break;
    }
  };

  const handleUpload = async (category: TagType, files: FileList) => {
    const currentCount = getSlotVideos(category).length;
    const availableSlots = MAX_VIDEOS_PER_CATEGORY - currentCount;
    if (availableSlots <= 0) return;

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    const newVideos: UploadedVideo[] = [];

    for (const file of filesToProcess) {
      if (file.type.startsWith("video/")) {
        const tempUrl = URL.createObjectURL(file);
        const duration = await getVideoDuration(tempUrl);
        URL.revokeObjectURL(tempUrl);

        const totalVideos =
          hookVideos.length + bodyVideos.length + developmentVideos.length +
          painVideos.length + solutionVideos.length + ctaVideos.length;
        if (totalVideos === 0) {
          const detected = await detectVideoFormat(file);
          setVideoFormat(detected);
        }

        newVideos.push({ id: generateId(), name: file.name, file, duration, durationFormatted: formatDuration(duration) });
      }
    }

    if (newVideos.length > 0) addSlotVideos(category, newVideos);
  };

  const handleRemove = (category: TagType, id: string) => {
    removeSlotVideo(category, id);
  };

  const handlePlay = (file: File) => {
    window.open(URL.createObjectURL(file), "_blank");
  };

  // Load rendered videos from Supabase on mount
  useEffect(() => {
    const loadRendered = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("rendered_videos")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (data && data.length > 0) {
          // Higieniza duplicados/orfãos antes de mesclar com o banco.
          let galleryItems: { supabaseId: string; item: import("@/services/mediaStorageService").GalleryMediaItem }[] = [];
          try {
            const gallery = await GalleryStorageService.cleanCorruptedGalleryState();
            galleryItems = gallery
              .filter((g) => g.supabaseId)
              .map((g) => ({ supabaseId: g.supabaseId as string, item: g }));
          } catch (err) {
            console.warn("Erro ao carregar galeria local:", err);
          }

          const loaded: RenderedVideo[] = data
            .map((row, i) => {
              const gallery = galleryItems.find((g) => g.supabaseId === row.id);
              const hasRemoteUrl = typeof row.video_url === "string" && /^https?:/.test(row.video_url);
              const restoredBlob = gallery?.item.videoBlob ?? null;
              return {
                id: i + 1,
                supabaseId: row.id,
                galleryId: gallery?.item.id,
                createdAt: gallery?.item.createdAt || row.created_at || undefined,
                thumbUrl: gallery?.item.thumbnailBase64,
                variation: row.variation_data || { id: "", blocks: [], expectedDuration: 0 },
                blobUrl: restoredBlob ? getObjectUrl(restoredBlob) : hasRemoteUrl ? row.video_url : null,
                blob: restoredBlob,
                videoUrl: hasRemoteUrl ? row.video_url : undefined,
                isCloud: hasRemoteUrl,
                duration: row.duration || 0,
                durationFormatted: formatDuration(row.duration || 0),
                status: "ready" as const,
                progress: 100,
                selected: false,
                savedToDB: true,
                is_posted: row.is_posted || false,
              };
            })
            // Remove "clones fantasmas": linhas sem binário local, sem URL
            // permanente e sem miniatura (blob URL morta do Supabase) — não são
            // reproduzíveis e apenas poluem a galeria.
            .filter((v) => (v.blob instanceof Blob) || v.blobUrl || v.thumbUrl);
          setRenderedVideos(loaded);
        }
      } catch (err) {
        console.warn("Erro ao carregar videos renderizados:", err);
      }
    };
    loadRendered();
  }, []);

  const saveRenderedVideo = async (video: RenderedVideo, videoUrl: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("rendered_videos")
        .insert({
          user_id: user.id,
          video_url: videoUrl,
          title: `Variacao #${video.id}`,
          variation_data: video.variation,
          duration: video.duration,
          is_posted: false,
        })
        .select()
        .single();

      if (error) {
        console.warn("Erro ao salvar video no Supabase:", error);
        return null;
      }
      return data?.id;
    } catch (err) {
      console.warn("Erro ao salvar video:", err);
      return null;
    }
  };

  const uploadGeneratedVideo = async (blob: Blob, filename: string): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", blob, filename);
      const res = await fetch("/api/editor/upload", { method: "POST", body: fd });
      const data = await res.json();
      return data?.success && typeof data.url === "string" ? data.url : null;
    } catch (err) {
      console.warn("Falha ao enviar video para armazenamento permanente:", err);
      return null;
    }
  };

  const persistGalleryItem = async (video: RenderedVideo, supabaseId: string) => {
    try {
      const parts = video.variation.id.replace("var_", "").split("_").map(Number);
      const blockFiles = video.variation.blocks.map((b) => b.file);
      const slotIds = BULK_MODALITIES_CONFIG[structureMode].map((s) => s.id);
      const item: GalleryMediaInput = {
        name: `Video_${String(video.id).padStart(2, "0")}.mp4`,
        videoBlob: video.blob ?? undefined,
        duration: video.duration,
        supabaseId,
      };
      slotIds.forEach((sid, i) => {
        const field = SLOT_GALLERY_FIELD[sid];
        const rec = item as unknown as Record<string, unknown>;
        rec[field.index] = parts[i] ? parts[i] - 1 : 0;
        rec[field.blob] = blockFiles[i];
      });
      await GalleryStorageService.saveGeneratedVideo(item);
      let thumb: string | undefined;
      try {
        thumb = await captureVideoThumbnail(video.blob || blockFiles[0]);
      } catch {
        thumb = undefined;
      }
      const list = await GalleryStorageService.getGalleryVideos();
      const saved = list.find((g) => g.supabaseId === supabaseId);
      if (saved && thumb) {
        await GalleryStorageService.updateVideo(saved.id, { thumbnailBase64: thumb });
      }
    } catch (err) {
      console.warn("Falha ao persistir video na galeria local:", err);
    }
  };

  const togglePosted = async (supabaseId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("rendered_videos")
        .update({ is_posted: !currentStatus, status: !currentStatus ? "posted" : "pending" })
        .eq("id", supabaseId);

      if (!error) {
        setRenderedVideos((prev) =>
          prev.map((v) => v.supabaseId === supabaseId ? { ...v, is_posted: !currentStatus } : v)
        );
      }
    } catch (err) {
      console.warn("Erro ao atualizar status:", err);
    }
  };

  const processQueue = async (variations: Variation[]) => {
    setQueueStatus({ isProcessing: true, current: 0, total: variations.length, percentage: 0, eta: "Calculando..." });

    // IDs únicos entre lotes: a lista NUNCA é substituída por uma nova geração,
    // os vídeos anteriores continuam na tela (lote novo entra no topo).
    const maxExistingId = renderedVideos.reduce((max, v) => Math.max(max, v.id), 0);
    const startId = maxExistingId + 1;

    const initial: RenderedVideo[] = variations.map((variation, index) => {
      const id = startId + index;
      return {
        id, variation, blobUrl: null, blob: null,
        duration: variation.expectedDuration,
        durationFormatted: formatDuration(variation.expectedDuration),
        status: "pending" as const, progress: 0, selected: false, is_posted: false,
      };
    });

    setRenderedVideos((prev) => deduplicateById([...initial, ...prev], (v) => v.id));
    setActiveView("results");

    const startTime = Date.now();

    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];
      const videoId = startId + i;

      setRenderedVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, status: "concatenating", progress: 0 } : v));

      const elapsed = (Date.now() - startTime) / 1000;
      const avgTimePerVideo = i > 0 ? elapsed / i : 0;
      const remaining = (variations.length - i) * avgTimePerVideo;

      setQueueStatus({
        isProcessing: true, current: i + 1, total: variations.length,
        percentage: Math.round(((i + 1) / variations.length) * 100),
        eta: formatDuration(remaining),
      });

      try {
        // Monta a lista de entrada desta variacao: EXATAMENTE um arquivo por
        // slot ativo da modalidade (sem loops/duplicatas). A ordem segue os
        // slots da estrutura escolhida (activeSlotIds).
        const slotFiles: Parameters<typeof buildSingleVariationTrackList>[1] = {};
        activeSlotIds.forEach((sid, i) => {
          const block = variation.blocks[i];
          if (block?.file) {
            (slotFiles as Record<string, File>)[sid] = block.file as File;
          }
        });
        const inputs = buildSingleVariationTrackList(structureMode, slotFiles);
        const result = await concatenateVideosFFmpeg(inputs, `variation_${videoId}.mp4`,
          (progress) => { setRenderedVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, progress } : v)); },
          renderMode, videoFormat, transition, transitionDuration,
          variation.blocks.map((b) => Number(b.duration) || 0)
        );

        // Cofre binário: grava os cortes fonte (hook/dev/cta) sob chaves estáveis
        // para restaurar o envio ao editor mesmo após reload.
        for (const block of variation.blocks) {
          if (block.file instanceof Blob) {
            void MediaVault.storeMediaIfMissing(`block-${block.id}`, block.file);
          }
        }

        await saveVideoToDB({
          id: `video_${videoId}_${Date.now()}`, variationId: videoId,
          hookName: variation.blocks[0]?.id || "",
          painName: variation.blocks[1]?.id || "",
          solutionName: variation.blocks[2]?.id || "",
          bodyName: variation.blocks[1]?.id || "",
          ctaName: variation.blocks[variation.blocks.length - 1]?.id || "",
          blob: result.blob, duration: result.duration, createdAt: new Date(),
        });

        // URL permanente (MinIO/S3) — fallback secundario caso o Supabase Storage falhe.
        const permanentUrl = await uploadGeneratedVideo(
          result.blob,
          `Video_${String(videoId).padStart(2, "0")}.mp4`
        );

        // Upload para o Supabase Storage (nuvem primaria). Em caso de falha,
        // mantemos o fallback S3/local e avisamos para re-tentativa manual.
        let cloudUrl: string | null = null;
        try {
          cloudUrl = await uploadVideoToSupabase(
            result.blob,
            `Video_${String(videoId).padStart(2, "0")}.mp4`
          );
        } catch (uploadErr) {
          const errMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          console.error("[MassProduction] Falha no upload Supabase Storage (usando fallback S3/local):", uploadErr);
          // Alerta visível para depuração: o vídeo ficou apenas em S3/local.
          alert(
            `⚠️ Falha no upload para o Supabase Storage (nuvem).\n` +
            `O vídeo "${`Video_${String(videoId).padStart(2, "0")}.mp4`}" foi salvo apenas localmente/S3.\n\n` +
            `Erro: ${errMsg}`
          );
        }

        const storedUrl = cloudUrl || permanentUrl || result.url;

        // Save to Supabase (guarda a URL permanente, não a blob temporária)
        const supabaseId = await saveRenderedVideo(
          { id: videoId, variation, blobUrl: storedUrl, blob: result.blob, duration: result.duration, durationFormatted: "", status: "ready", progress: 100, selected: false, is_posted: false },
          storedUrl
        );

        // Persistência real no IndexedDB (blobs + miniatura) — a Galeria recria
        // as blob URLs a partir daqui após reload/HMR, sem ERR_FILE_NOT_FOUND.
        if (supabaseId) {
          void persistGalleryItem(
            { id: videoId, supabaseId, variation, blobUrl: result.url, blob: result.blob, duration: result.duration, durationFormatted: "", status: "ready", progress: 100, selected: false, is_posted: false, savedToDB: true },
            supabaseId
          );
        }

        setRenderedVideos((prev) => prev.map((v) =>
          v.id === videoId ? { ...v, blobUrl: result.url, blob: result.blob, duration: result.duration,
            durationFormatted: formatDurationLong(result.duration), status: "ready", progress: 100, savedToDB: true,
            supabaseId: supabaseId || undefined, videoUrl: cloudUrl ?? undefined, isCloud: !!cloudUrl } : v
        ));

        // Auto-download video immediately upon completion
        try {
          const link = document.createElement("a");
          link.href = result.url;
          link.download = `Video_${String(videoId).padStart(2, "0")}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (downloadErr) {
          console.error("Erro ao tentar baixar o vídeo automaticamente:", downloadErr);
        }
      } catch (error) {
        console.error(`Error rendering video ${videoId}:`, error);
        setRenderedVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, status: "error", error: error instanceof Error ? error.message : "Erro desconhecido" } : v));
      }
    }

    setQueueStatus({ isProcessing: false, current: variations.length, total: variations.length, percentage: 100, eta: "Concluido!" });
  };

  const activeSlotIds = BULK_MODALITIES_CONFIG[structureMode].map((s) => s.id);
  const activeColumns: { key: string; label: string; count: number }[] = [];
  for (const id of activeSlotIds) {
    const count = getSlotVideos(id).length;
    if (count > 0) activeColumns.push({ key: id, label: SLOT_LABEL[id], count });
  }

  const totalCombinations = activeColumns.reduce((acc, col) => acc * col.count, 1);
  const minColumnsOk = activeColumns.length >= 2;
  const totalLoaded = activeColumns.reduce((acc, c) => acc + c.count, 0);

  const generateCombinations = async () => {
    // Trava anti-disparo-triplo: impede execucoes paralelas (cliques repetidos)
    // que gerariam cards Vídeo # duplicados na galeria.
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    try {
    if (!minColumnsOk) { alert("Adicione videos em pelo menos 2 categorias (Hook + 1 outro)!"); return; }
    if (totalCombinations > 625) { alert("O limite maximo e 625 variacoes por sessao!"); return; }

    // Filtro RÍGIDO por modalidade: usa EXCLUSIVAMENTE os slots da estrutura
    // selecionada (structureMode), na ordem de BULK_MODALITIES_CONFIG.
    // Slots de OUTRAS modalidades (ex.: Slot 3/4 numa 2-slots) são IGNORADOS
    // completamente — nunca vazam para a matriz de combinação, e cada variação
    // recebe ESTRITAMENTE um arquivo por slot ativo (sem duplicar/clonar o
    // mesmo clipe dentro do mesmo arquivo de saída).
    const slotIds = BULK_MODALITIES_CONFIG[structureMode].map((s) => s.id);
    const slotLists = slotIds.map((id) => getSlotVideos(id).filter((v) => v.file));

    // Produto cartesiano ESTRITO apenas dos slots da modalidade ativa.
    let combos: UploadedVideo[][] = [[]];
    for (const list of slotLists) {
      if (list.length === 0) continue;
      const next: UploadedVideo[][] = [];
      for (const combo of combos) {
        for (const v of list) next.push([...combo, v]);
      }
      combos = next;
    }

    const variations: Variation[] = combos.map((combo, idx) => {
      const blocks: VideoBlock[] = combo.map((v) => ({
        id: v.id,
        url: "",
        duration: v.duration,
        file: v.file as File,
      }));
      const expectedDuration = blocks.reduce((acc, b) => acc + (b.duration || 0), 0);
      return { id: `var_${idx + 1}`, blocks, expectedDuration };
    });

    const shuffled = fisherYatesShuffle(variations);
    await processQueue(shuffled);
    } finally {
      isGeneratingRef.current = false;
    }
  };

  const selectAll = () => {
    const allSelected = renderedVideos.every((v) => v.selected);
    setRenderedVideos((prev) => prev.map((v) => ({ ...v, selected: !allSelected })));
  };

  const toggleSelect = (id: number) => {
    setRenderedVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        // Ao sair do modo de selecao, limpa todas as selecoes.
        setRenderedVideos((cur) => cur.map((v) => ({ ...v, selected: false })));
      }
      return next;
    });
  };

  const selectedCount = renderedVideos.filter((v) => v.selected).length;

  const handleSendToEditor = async (video: RenderedVideo) => {
    const count = await sendFinalVideoToEditor({
      blob: video.blob,
      videoUrl: video.videoUrl,
      blobUrl: video.blobUrl,
      duration: video.duration,
      name: `Video-${video.id}.mp4`,
    });
    if (count === 0) {
      alert("Nao foi possivel obter o video final. Regere a variacao para envia-la ao editor.");
      return;
    }
    router.push("/editor");
  };

  const handleSendSelectedToEditor = async () => {
    const selected = renderedVideos.filter((v) => v.selected);
    if (selected.length === 0) return;
    const count = await sendFinalVideosToEditor(
      selected.map((v) => ({
        blob: v.blob,
        videoUrl: v.videoUrl,
        blobUrl: v.blobUrl,
        duration: v.duration,
        name: `Video-${v.id}.mp4`,
      }))
    );
    if (count === 0) {
      alert("Nenhum video final disponivel nos videos selecionados.");
      return;
    }
    router.push("/editor");
  };

  const removeFromGallery = async (video: RenderedVideo) => {
    try {
      if (video.galleryId) {
        await GalleryStorageService.deleteVideo(video.galleryId);
      }
      if (video.supabaseId) {
        const supabase = createClient();
        await supabase.from("rendered_videos").delete().eq("id", video.supabaseId);
      }
      setRenderedVideos((prev) => prev.filter((v) => v.id !== video.id));
    } catch (err) {
      console.warn("Erro ao excluir video:", err);
    }
  };

  const downloadVideo = (video: RenderedVideo) => {
    // Prioriza a URL pública do Supabase Storage (nuvem); cai para o blob/local.
    const sourceUrl = video.videoUrl || (video.blob instanceof Blob ? getObjectUrl(video.blob) : video.blobUrl);
    if (sourceUrl) {
      const link = document.createElement("a");
      link.href = sourceUrl;
      link.download = `Video_${String(video.id).padStart(2, "0")}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Mark as downloaded in Supabase
      if (video.supabaseId) {
        const supabase = createClient();
        supabase.from("rendered_videos").update({ status: "downloaded" }).eq("id", video.supabaseId);
      }
    }
  };

  const downloadInQueue = async (videos: RenderedVideo[]) => {
    for (const video of videos) {
      downloadVideo(video);
      // Intervalo de segurança para o navegador não bloquear downloads múltiplos
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  };

  const downloadAll = () => {
    const targets = renderedVideos.filter((v) => v.status === "ready");
    void downloadInQueue(targets);
  };

  const downloadSelected = () => {
    const targets = renderedVideos.filter((v) => v.selected && v.status === "ready");
    if (targets.length === 0) return;
    void downloadInQueue(targets);
  };

  const deleteSelected = () => {
    const ids = renderedVideos.filter((v) => v.selected).map((v) => v.id);
    if (ids.length === 0) return;
    setConfirmDelete(ids);
  };

  const executeDeleteSelected = async () => {
    if (!confirmDelete) return;
    for (const id of confirmDelete) {
      const video = renderedVideos.find((v) => v.id === id);
      if (video) await removeFromGallery(video);
    }
    setConfirmDelete(null);
  };

  const downloadZip = async () => {
    const hasSelected = renderedVideos.some((v) => v.selected && v.status === "ready");
    const targets = hasSelected
      ? renderedVideos.filter((v) => v.selected && v.status === "ready")
      : renderedVideos.filter((v) => v.status === "ready");
    if (targets.length === 0) return;
    try {
      const files: { name: string; blob: Blob }[] = [];
      for (const video of targets) {
        const name = `Video_${String(video.id).padStart(2, "0")}.mp4`;
        let blob: Blob | null = null;
        // Busca direto da URL pública do Supabase Storage quando hospedado na nuvem.
        if (video.videoUrl) {
          try {
            blob = await (await fetch(video.videoUrl)).blob();
          } catch {
            blob = null;
          }
        }
        if (!blob && video.blob instanceof Blob) blob = video.blob;
        if (blob) files.push({ name, blob });
      }
      if (files.length === 0) {
        alert("Nenhum vídeo disponível para compactar (nuvem ou local).");
        return;
      }
      const zip = await buildZip(files);
      await downloadBlob(zip, `nexia-videos-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      console.error("Erro ao gerar ZIP:", err);
      alert("Falha ao compactar os videos.");
    }
  };

  const filteredVideos = renderedVideos.filter((v) => {
    if (videoFilter === "posted") return v.is_posted;
    if (videoFilter === "not_posted") return !v.is_posted;
    return true;
  });

  const postedCount = renderedVideos.filter((v) => v.is_posted).length;
  const notPostedCount = renderedVideos.filter((v) => !v.is_posted && v.status === "ready").length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Factory className="w-8 h-8 text-[var(--accent-orange)]" />
            <h1 className="text-3xl font-bold">Criacao em <span className="gradient-text">Massa</span></h1>
          </div>
          <p className="text-gray-400">Envie, classifique e gere variacoes automaticamente</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-[#1c1c28] rounded-xl">
          <button onClick={() => setActiveView("upload")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "upload" ? "bg-[var(--primary)] text-white" : "text-gray-400 hover:text-white"}`}>
            Upload
          </button>
          <button onClick={() => setActiveView("results")} disabled={renderedVideos.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${activeView === "results" ? "bg-[var(--primary)] text-white" : "text-gray-400 hover:text-white"}`}>
            Resultados ({renderedVideos.length})
          </button>
        </div>
      </div>

      {/* ========== UPLOAD VIEW ========== */}
      {activeView === "upload" && (
        <>
          {/* Seletor de Estrutura de Vídeo */}
          <div className="flex flex-col gap-2 mb-6 p-3 bg-zinc-900 border border-zinc-800 rounded-xl sm:flex-row sm:items-center">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
              Estrutura do Vídeo:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {(["2-slots", "3-slots", "4-slots"] as BulkStructureMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStructureMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    structureMode === mode
                      ? "bg-purple-600 text-white font-bold shadow-sm"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {mode === "2-slots"
                    ? "2 Slots (Gancho + Corpo/CTA)"
                    : mode === "3-slots"
                    ? "3 Slots (Gancho + Desenv + CTA)"
                    : "4 Slots (Gancho + Dor + Solução + CTA)"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1c1c28] border border-gray-800 rounded-xl p-4 mb-6 flex items-center gap-4">
            <HardDrive className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-300"><span className="font-medium text-white">Limite por categoria:</span> {MAX_VIDEOS_PER_CATEGORY} videos</p>
              <p className="text-xs text-gray-500">Cada variacao combina 1 trecho de cada slot ativo na estrutura selecionada ({activeSlotIds.length} slots)</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{totalLoaded} / {MAX_VIDEOS_PER_CATEGORY * activeSlotIds.length}</p>
              <p className="text-xs text-gray-500">arquivos carregados</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${GRID_COLS_BY_COUNT[activeSlotIds.length] || "lg:grid-cols-4"} gap-4 my-6`}>
            {BULK_MODALITIES_CONFIG[structureMode].map((slot) => (
              <UploadBox
                key={slot.id}
                title={slot.title}
                category={slot.id}
                accentColor={SLOT_STYLE[slot.id].accentColor}
                description={SLOT_STYLE[slot.id].description}
                videos={getSlotVideos(slot.id)}
                onUpload={(f) => handleUpload(slot.id, f)}
                onRemove={(id) => handleRemove(slot.id, id)}
                onPlay={handlePlay}
                limit={MAX_VIDEOS_PER_CATEGORY}
              />
            ))}
          </div>

          <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6 mt-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Modo de Renderizacao:</p>
                <div className="inline-flex rounded-xl bg-[#252535] p-1 border border-gray-700">
                  <button onClick={() => setRenderMode("fast")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${renderMode === "fast" ? "bg-[var(--primary)] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>⚡ Rapido</button>
                  <button onClick={() => setRenderMode("compatibility")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${renderMode === "compatibility" ? "bg-[var(--primary)] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>🛠️ Compativel</button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Formato do Video:</p>
                <div className="inline-flex rounded-xl bg-[#252535] p-1 border border-gray-700">
                  {VIDEO_FORMATS.map((fmt) => (
                    <button key={fmt.value} onClick={() => setVideoFormat(fmt)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${videoFormat.value === fmt.value ? "bg-[var(--primary)] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>
                      {fmt.value === "9:16" ? "📱" : fmt.value === "16:9" ? "🖥️" : fmt.value === "1:1" ? "⬜" : "📷"} {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Transição de Vídeo:</p>
                <div className="inline-flex rounded-xl bg-[#252535] p-1 border border-gray-700">
                  <button onClick={() => setTransition("none")} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${transition === "none" ? "bg-[var(--primary)] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>Nenhuma</button>
                  <button onClick={() => setTransition("fade")} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${transition === "fade" ? "bg-[var(--primary)] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>🎬 Fade</button>
                  <button onClick={() => setTransition("wipe")} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${transition === "wipe" ? "bg-[var(--primary)] text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>↕️ Wipe</button>
                </div>
              </div>
              {transition !== "none" && (
                <div className="flex flex-col justify-center">
                  <p className="text-sm text-gray-400 mb-1">Duração:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.2"
                      max="1.5"
                      step="0.1"
                      value={transitionDuration}
                      onChange={(e) => setTransitionDuration(Number(e.target.value))}
                      className="accent-[var(--primary)] w-24 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-mono text-white">{transitionDuration}s</span>
                  </div>
                </div>
              )}
            </div>

            {renderMode === "compatibility" && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                <span className="text-amber-400 text-sm">⚠️ Modo Compatibilidade: o processo re-renderiza frame a frame e pode levar mais tempo.</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold flex-wrap">
                {activeColumns.map((col, i) => (
                  <span key={col.key} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-500">×</span>}
                    <span className={`px-4 py-2 rounded-xl border ${
                      SLOT_CHIP_COLOR[col.key as TagType]
                    }`}>{col.count} {col.label}</span>
                  </span>
                ))}
                {activeColumns.length > 0 && (
                  <>
                    <span className="text-gray-500">=</span>
                    <span className="px-4 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">{totalCombinations} Videos</span>
                  </>
                )}
                {!activeColumns.length && <span className="text-sm text-gray-500 font-normal">Adicione videos para ver o calculo</span>}
              </div>
              <button onClick={generateCombinations} disabled={queueStatus.isProcessing || !minColumnsOk}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3">
                {queueStatus.isProcessing ? (<><RefreshCw className="w-5 h-5 animate-spin" /> Renderizando fila...</>) : (<><Sparkles className="w-5 h-5" /> Gerar {totalCombinations} Variacoes</>)}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== RESULTS VIEW ========== */}
      {activeView === "results" && renderedVideos.length > 0 && (
        <div>
          {queueStatus.isProcessing && (
            <div className="bg-[#1c1c28] border border-[var(--primary)]/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium flex items-center gap-2"><Loader className="w-4 h-4 animate-spin text-[var(--primary)]" /> Fila de Processamento</span>
                <span className="text-sm text-gray-400">Variacao {queueStatus.current} de {queueStatus.total}</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] transition-all duration-500" style={{ width: `${queueStatus.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{queueStatus.percentage}% concluido</span>
                <span>ETA: {queueStatus.eta}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#1c1c28] rounded-xl w-fit mb-6">
            <button onClick={() => setResultsTab("generated")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${resultsTab === "generated" ? "bg-[var(--primary)] text-white" : "text-gray-400 hover:text-white"}`}>
              <Film className="w-4 h-4" /> Videos Gerados ({renderedVideos.filter((v) => v.status === "ready").length}/{renderedVideos.length})
            </button>
            <button onClick={() => setResultsTab("media")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${resultsTab === "media" ? "bg-[var(--primary)] text-white" : "text-gray-400 hover:text-white"}`}>
              <FileVideo className="w-4 h-4" /> Midias Usadas
            </button>
          </div>

          {/* Tab 1: Generated Videos */}
          {resultsTab === "generated" && (
            <>
              {/* Filter + Actions */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Filter */}
                  <div className="flex items-center bg-[#1c1c28] border border-gray-800 rounded-xl p-0.5">
                    <button onClick={() => setVideoFilter("all")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${videoFilter === "all" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-gray-400 hover:text-white"}`}>
                      <Eye className="w-3.5 h-3.5" /> Todos ({renderedVideos.length})
                    </button>
                    <button onClick={() => setVideoFilter("not_posted")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${videoFilter === "not_posted" ? "bg-emerald-500/15 text-emerald-400" : "text-gray-400 hover:text-white"}`}>
                      <Rocket className="w-3.5 h-3.5" /> Nao Postados ({notPostedCount})
                    </button>
                    <button onClick={() => setVideoFilter("posted")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${videoFilter === "posted" ? "bg-blue-500/15 text-blue-400" : "text-gray-400 hover:text-white"}`}>
                      <CheckCircle className="w-3.5 h-3.5" /> Postados ({postedCount})
                    </button>
                  </div>

                  {/* Modo de selecao dinâmico */}
                  {!isSelectionMode ? (
                    <button onClick={toggleSelectionMode}
                      className="bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-sm py-2 px-4 rounded-xl hover:bg-[var(--primary)]/25 transition-colors">
                      ☑️ Selecionar
                    </button>
                  ) : (
                    <>
                      <button onClick={toggleSelectionMode}
                        className="bg-[#1c1c28] border border-gray-700 text-gray-300 text-sm py-2 px-4 rounded-xl hover:bg-[#2a2a3a] transition-colors">
                        ✕ Cancelar Selecao
                      </button>
                      <button onClick={selectAll} className="bg-[#1c1c28] border border-gray-800 text-gray-300 text-sm py-2 px-4 rounded-xl hover:bg-[#2a2a3a] transition-colors">
                        {renderedVideos.every((v) => v.selected) ? "Desmarcar Todos" : "Selecionar Todos"}
                      </button>
                      <span className="text-sm text-gray-400 font-medium">({selectedCount} selecionado{selectedCount === 1 ? "" : "s"})</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {isSelectionMode && (
                    <>
                      <button onClick={handleSendSelectedToEditor} disabled={selectedCount === 0}
                        className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                        <Send className="w-4 h-4" /> Enviar ({selectedCount})
                      </button>
                      <button onClick={downloadSelected} disabled={!renderedVideos.some((v) => v.selected && v.status === "ready")}
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                        <Download className="w-4 h-4" /> Baixar ({selectedCount})
                      </button>
                      <button onClick={deleteSelected} disabled={selectedCount === 0}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                        <Trash2 className="w-4 h-4" /> Excluir ({selectedCount})
                      </button>
                    </>
                  )}
                  <button onClick={downloadZip} disabled={!renderedVideos.some((v) => v.status === "ready")}
                    className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                    <Archive className="w-4 h-4" /> ZIP
                  </button>
                  <button onClick={downloadAll} disabled={!renderedVideos.some((v) => v.status === "ready")}
                    className="bg-slate-600/20 hover:bg-slate-600/40 text-slate-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                    <Download className="w-4 h-4" /> Baixar Todos
                  </button>
                </div>
              </div>

              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div key={video.id} className={`bg-[#1c1c28] border rounded-xl p-4 flex flex-col gap-3 transition-all ${video.selected ? "border-[var(--primary)]/60 ring-1 ring-[var(--primary)]/30" : video.is_posted ? "border-blue-500/30 opacity-70" : "border-gray-800"}`}>
                    {/* Player */}
                    <div className="relative">
                      {/* Selecao individual — checkbox puro, sem texto (modo selecao) */}
                      {isSelectionMode && (
                        <label className="absolute top-2 left-2 z-10 flex items-center justify-center p-1 rounded-md bg-black/60 backdrop-blur-sm border border-gray-700/60 cursor-pointer hover:border-[var(--primary)] transition-colors">
                          <input
                            type="checkbox"
                            checked={video.selected}
                            onChange={() => toggleSelect(video.id)}
                            className="w-4 h-4 rounded border-gray-600 accent-[var(--primary)] bg-zinc-900 cursor-pointer"
                          />
                        </label>
                      )}
                      {video.status === "pending" || video.status === "concatenating" ? (
                        <div className={`w-full ${getAspectClass(videoFormat)} rounded-lg bg-[#252535] flex flex-col items-center justify-center gap-2`}>
                          <Loader className="w-8 h-8 text-[var(--primary)] animate-spin" />
                          <p className="text-xs text-gray-400">{video.status === "concatenating" ? "Concatenando..." : "Na fila..."}</p>
                          {video.status === "concatenating" && (
                            <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--primary)] transition-all duration-300" style={{ width: `${video.progress}%` }} />
                            </div>
                          )}
                          <p className="text-[10px] text-gray-500">{video.progress}%</p>
                        </div>
                      ) : video.status === "error" ? (
                        <div className={`w-full ${getAspectClass(videoFormat)} rounded-lg bg-red-900/20 flex flex-col items-center justify-center gap-2 border border-red-500/30`}>
                          <AlertCircle className="w-8 h-8 text-red-400" />
                          <p className="text-xs text-red-300">{video.error || "Erro"}</p>
                        </div>
                      ) : (
                        <GalleryVideoPlayer video={video} aspectClass={getAspectClass(videoFormat)} />
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-white font-semibold">Vídeo #{String(video.id).padStart(2, "0")}</h4>
                        <button
                          onClick={() => void removeFromGallery(video)}
                          className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Excluir da galeria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">{video.variation.blocks.map((b) => b.id).join(" + ")}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <MediaIntegrityBadge
                          hasLocalBlob={video.blob instanceof Blob}
                          remoteUrl={video.videoUrl || video.blobUrl}
                        />
                        {video.isCloud && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            ☁ Nuvem
                          </span>
                        )}
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">{video.durationFormatted}</span>
                        {video.createdAt && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ⏳ {galleryRemainingLabel(video.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800">
                      <button onClick={() => downloadVideo(video)} disabled={video.status !== "ready"}
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-30">
                        ⬇️ Baixar
                      </button>
                      <button onClick={() => handleSendToEditor(video)} disabled={video.status !== "ready"}
                        className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-30"
                        title="Enviar o video final completo para o editor (cria um rascunho)">
                        🎬 Editor
                      </button>
                      <button
                        onClick={() => video.supabaseId && togglePosted(video.supabaseId, video.is_posted)}
                        disabled={video.status !== "ready" || !video.supabaseId}
                        className={`text-xs py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-30 ${
                          video.is_posted
                            ? "bg-blue-600/30 text-blue-300 hover:bg-blue-600/50"
                            : "bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300"
                        }`}>
                        {video.is_posted ? (<><CheckCircle className="w-3 h-3" /> Postado</>) : (<><Rocket className="w-3 h-3" /> Postar</>)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredVideos.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">Nenhum video encontrado para este filtro.</p>
                </div>
              )}
            </>
          )}

          {/* Tab 2: Used Media */}
          {resultsTab === "media" && (
            <div className={`grid grid-cols-1 md:grid-cols-2 ${GRID_COLS_BY_COUNT[activeSlotIds.length] || "lg:grid-cols-4"} gap-4`}>
              {BULK_MODALITIES_CONFIG[structureMode]
                .map((slot) => ({
                  title: slot.title,
                  videos: getSlotVideos(slot.id),
                  accent: SLOT_STYLE[slot.id].accentColor,
                  category: slot.id as TagType,
                }))
                .map((section) => (
                <div key={section.category} className="bg-[#1c1c28] border border-gray-800 rounded-xl overflow-hidden">
                  <div className={`p-4 border-b border-gray-800 ${section.accent}`}>
                    <h3 className="font-bold">{section.title} ({section.videos.length})</h3>
                  </div>
                  <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                    {section.videos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#252535] group">
                        <VideoThumb file={video.file} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{video.name}</p>
                          <p className="text-xs text-gray-500">{video.durationFormatted}</p>
                        </div>
                        <button onClick={() => handleRemove(section.category, video.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                    {section.videos.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Nenhum video</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmacao de exclusao em massa */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#1c1c28] border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir videos?</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {confirmDelete.length === 1
                    ? "Este video sera removido da galeria e do banco de dados."
                    : `${confirmDelete.length} videos serao removidos da galeria e do banco de dados.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-[10px] text-sm font-medium bg-[#252535] border border-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void executeDeleteSelected()}
                className="px-4 py-2 rounded-[10px] text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir ({confirmDelete.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
