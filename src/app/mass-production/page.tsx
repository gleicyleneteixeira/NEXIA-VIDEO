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
  ArrowLeft,
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
import { fisherYatesShuffle, smartDistributeByDistance } from "@/utils/shuffle";
import { deduplicateById } from "@/utils/videoDedup";
import {
  sendFinalVideoToEditor,
  sendFinalVideosToEditor,
} from "@/services/bulkToEditorService";
import MediaIntegrityBadge from "@/components/media/MediaIntegrityBadge";
import { MediaVault } from "@/services/persistentMediaVault";
import { LocalWhisperService } from "@/services/localWhisperService";
import { extractHeadline, extractRedTags } from "@/utils/transcriptionExtractor";

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
  /** Transcricao do audio do video (gerada em background) */
  transcription?: string;
  /** Headline extraida da transcricao */
  headline?: string;
  /** Redtags/hashtags extraidas da transcricao */
  redTags?: string[];
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
  const [cloudSaveEnabled, setCloudSaveEnabled] = useState(false);
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(false);
  const [lotTitle, setLotTitle] = useState("");
  const [desiredVariations, setDesiredVariations] = useState(0);

  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    isProcessing: false, current: 0, total: 0, percentage: 0, eta: "0:00",
  });

  // Trava rigida de execucao unica (sincrona). O estado `queueStatus.isProcessing`
  // so atualiza apos o re-render, entao cliques rapidos em sequencia AINDA podem
  // disparar varias `processQueue` em paralelo (cards Video # duplicados). O ref
  // e setado de imediato, bloqueando disparos paralelos de forma deterministica.
  const isGeneratingRef = useRef(false);
  const cancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const getFileName = (videoId: number, ext: string = "mp4") => {
    const base = `Video_${String(videoId).padStart(2, "0")}`;
    const suffix = lotTitle.trim() ? `_${lotTitle.trim().replace(/\s+/g, "_")}` : "";
    return `${base}${suffix}.${ext}`;
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
    cancelledRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;
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
      if (signal.aborted || cancelledRef.current) {
        console.log("[MassProduction] Fila cancelada pelo usuario.");
        break;
      }

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
        const fileName = getFileName(videoId);
        const result = await concatenateVideosFFmpeg(inputs, fileName,
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

        // Upload para Supabase Storage (condicional — ligado pelo toggle)
        let cloudUrl: string | null = null;
        let supabaseId: string | null = null;
        if (cloudSaveEnabled && !signal.aborted) {
          try {
            cloudUrl = await uploadVideoToSupabase(
              result.blob,
              getFileName(videoId)
            );
          } catch (uploadErr) {
            console.warn("[MassProduction] Upload Supabase falhou:", uploadErr);
          }
          const storedUrl = cloudUrl || result.url;
          supabaseId = await saveRenderedVideo(
            { id: videoId, variation, blobUrl: storedUrl, blob: result.blob, duration: result.duration, durationFormatted: "", status: "ready", progress: 100, selected: false, is_posted: false },
            storedUrl
          );
          if (supabaseId) {
            void persistGalleryItem(
              { id: videoId, supabaseId, variation, blobUrl: result.url, blob: result.blob, duration: result.duration, durationFormatted: "", status: "ready", progress: 100, selected: false, is_posted: false, savedToDB: true },
              supabaseId
            );
          }
        }

        setRenderedVideos((prev) => prev.map((v) =>
          v.id === videoId ? { ...v, blobUrl: result.url, blob: result.blob, duration: result.duration,
            durationFormatted: formatDurationLong(result.duration), status: "ready", progress: 100, savedToDB: true,
            supabaseId: supabaseId || undefined, videoUrl: cloudUrl ?? undefined, isCloud: !!cloudUrl } : v
        ));

        // Transcricao em background: extrai audio, transcreve, gera headline e redtags
        if (!signal.aborted) {
          void (async () => {
            try {
              const audioFile = new File([result.blob], "audio.wav", { type: "audio/wav" });
              const transcription = await LocalWhisperService.transcribeFile(
                audioFile,
                "Xenova/whisper-tiny",
                () => {},
                signal
              );
              if (transcription && !signal.aborted) {
                const headline = extractHeadline(transcription);
                const redTags = extractRedTags(transcription);
                setRenderedVideos((prev) => prev.map((v) =>
                  v.id === videoId ? { ...v, transcription, headline, redTags } : v
                ));
              }
            } catch (err) {
              console.warn(`[MassProduction] Transcricao falhou para video ${videoId}:`, err);
            }
          })();
        }

        // Auto-download (condicional + checagem de cancelamento)
        if (autoDownloadEnabled && !signal.aborted) {
          try {
            const link = document.createElement("a");
            link.href = result.url;
            link.download = getFileName(videoId);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (downloadErr) {
            console.error("Erro ao tentar baixar o vídeo automaticamente:", downloadErr);
          }
        }
      } catch (error) {
        console.error(`Error rendering video ${videoId}:`, error);
        setRenderedVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, status: "error", error: error instanceof Error ? error.message : "Erro desconhecido" } : v));
      }
    }

    // Remove videos pendentes (nao processados) da lista ao cancelar
    if (signal.aborted || cancelledRef.current) {
      setRenderedVideos((prev) => prev.filter((v) => v.status !== "pending"));
    }

    setQueueStatus({ isProcessing: false, current: variations.length, total: variations.length, percentage: (signal.aborted || cancelledRef.current) ? queueStatus.percentage : 100, eta: (signal.aborted || cancelledRef.current) ? "Cancelado!" : "Concluido!" });
    abortControllerRef.current = null;
  };

  const handleCancelQueue = () => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
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

  // Ajusta desiredVariations quando totalCombinations muda
  const effectiveDesired = Math.min(desiredVariations || totalCombinations, totalCombinations);

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
    // Cada combo armazena os índices originais para o algoritmo de distância.
    let combos: { videos: UploadedVideo[]; indices: number[] }[] = [{ videos: [], indices: [] }];
    for (const list of slotLists) {
      if (list.length === 0) continue;
      const next: { videos: UploadedVideo[]; indices: number[] }[] = [];
      for (const combo of combos) {
        for (let vi = 0; vi < list.length; vi++) {
          next.push({
            videos: [...combo.videos, list[vi]],
            indices: [...combo.indices, vi],
          });
        }
      }
      combos = next;
    }

    const variations: Variation[] = combos.map((combo, idx) => {
      const blocks: VideoBlock[] = combo.videos.map((v) => ({
        id: v.id,
        url: "",
        duration: v.duration,
        file: v.file as File,
      }));
      const expectedDuration = blocks.reduce((acc, b) => acc + (b.duration || 0), 0);
      return { id: `var_${idx + 1}`, blocks, expectedDuration, _indices: combo.indices };
    });

    // Distribuição inteligente: maximiza distância entre vídeos consecutivos
    const shuffled = smartDistributeByDistance(
      variations,
      (v) => (v as unknown as { _indices: number[] })._indices || []
    );
    // Limpa _indices antes de enviar para a fila
    const cleaned = shuffled.map((v, i) => {
      const { _indices, ...rest } = v as unknown as Variation & { _indices: number[] };
      return { ...rest, id: `var_${i + 1}` };
    });
    // Limita a quantidade desejada pelo usuario
    const limited = cleaned.slice(0, effectiveDesired);
    await processQueue(limited);
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
      link.download = getFileName(video.id);
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
        const name = getFileName(video.id);
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
    <div className="w-full max-w-7xl mx-auto p-6 md:p-8 min-h-screen space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <span className="p-3 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <Factory className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Criacao em <span className="gradient-text">Massa</span></h1>
            <p className="text-sm text-zinc-400 mt-0.5">Envie clips, classifique e gere variacoes automaticamente</p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#111118] rounded-xl border border-zinc-800/80">
          <button onClick={() => setActiveView("upload")} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeView === "upload" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>
            Upload
          </button>
          <button onClick={() => setActiveView("results")} disabled={renderedVideos.length === 0}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${activeView === "results" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>
            Resultados ({renderedVideos.length})
          </button>
        </div>
      </div>

      {/* ========== UPLOAD VIEW ========== */}
      {activeView === "upload" && (
        <>
          {/* ========== CARD: Estrutura + Uploads ========== */}
          <div className="bg-[#111118] border border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6">
            {/* Estrutura do Video */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0">
                Estrutura do Video:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {(["2-slots", "3-slots", "4-slots"] as BulkStructureMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStructureMode(mode)}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                      structureMode === mode
                        ? "bg-pink-950/40 text-pink-300 border-2 border-pink-500 shadow-md shadow-pink-500/20"
                        : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {mode === "2-slots"
                      ? "2 Slots (Gancho + Corpo/CTA)"
                      : mode === "3-slots"
                      ? "3 Slots (Gancho + Desenv + CTA)"
                      : "4 Slots (Gancho + Dor + Solucao + CTA)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Boxes Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${GRID_COLS_BY_COUNT[activeSlotIds.length] || "lg:grid-cols-4"} gap-4`}>
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

            {/* Limite info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#161622] border border-zinc-800/60">
              <HardDrive className="w-5 h-5 text-zinc-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-zinc-300"><span className="font-semibold text-white">Limite por categoria:</span> {MAX_VIDEOS_PER_CATEGORY} videos</p>
                <p className="text-xs text-zinc-500">Cada variacao combina 1 trecho de cada slot ativo ({activeSlotIds.length} slots)</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-white">{totalLoaded} / {MAX_VIDEOS_PER_CATEGORY * activeSlotIds.length}</p>
                <p className="text-xs text-zinc-500">arquivos carregados</p>
              </div>
            </div>
          </div>

          {/* ========== GRID 2 COLUNAS: Configuracoes ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Esquerda: Renderizacao & Formato */}
            <div className="bg-[#111118] border border-zinc-800/80 rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">⚙️</span>
                Renderizacao & Formato
              </h3>

              {/* Modo de Renderizacao */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Modo</label>
                <div className="inline-flex rounded-xl bg-[#161622] p-1 border border-zinc-800 w-full">
                  <button onClick={() => setRenderMode("fast")} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${renderMode === "fast" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>⚡ Rapido</button>
                  <button onClick={() => setRenderMode("compatibility")} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${renderMode === "compatibility" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>🛠️ Compativel</button>
                </div>
              </div>

              {renderMode === "compatibility" && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                  <span className="text-amber-400 text-xs">⚠️ Modo Compatibilidade: re-renderiza frame a frame e pode levar mais tempo.</span>
                </div>
              )}

              {/* Formato do Video */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Formato</label>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_FORMATS.map((fmt) => (
                    <button key={fmt.value} onClick={() => setVideoFormat(fmt)} className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-semibold transition-all ${videoFormat.value === fmt.value ? "bg-pink-950/40 text-pink-300 border-2 border-pink-500 shadow-md shadow-pink-500/20" : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white"}`}>
                      <span className="text-lg">{fmt.value === "9:16" ? "📱" : fmt.value === "16:9" ? "🖥️" : "⬜"}</span>
                      <span>{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transicao */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Transicao</label>
                <div className="inline-flex rounded-xl bg-[#161622] p-1 border border-zinc-800 w-full">
                  <button onClick={() => setTransition("none")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${transition === "none" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>Nenhuma</button>
                  <button onClick={() => setTransition("fade")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${transition === "fade" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>Fade</button>
                  <button onClick={() => setTransition("wipe")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${transition === "wipe" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>Wipe</button>
                </div>
              </div>

              {transition !== "none" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Duracao da Transicao</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.2"
                      max="1.5"
                      step="0.1"
                      value={transitionDuration}
                      onChange={(e) => setTransitionDuration(Number(e.target.value))}
                      className="flex-1 accent-pink-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-mono text-white bg-[#161622] px-3 py-1 rounded-lg border border-zinc-800">{transitionDuration}s</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Direita: Opcoes & Acoes */}
            <div className="bg-[#111118] border border-zinc-800/80 rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">🎯</span>
                Opcoes & Acoes
              </h3>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Preferencias</label>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#161622] border border-zinc-800/60 cursor-pointer group hover:border-zinc-700 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors block">Salvar na Nuvem</span>
                      <span className="text-xs text-zinc-500">Upload automatico para o Supabase Storage</span>
                    </div>
                    <div className="relative">
                      <input type="checkbox" checked={cloudSaveEnabled} onChange={(e) => setCloudSaveEnabled(e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-pink-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                    </div>
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl bg-[#161622] border border-zinc-800/60 cursor-pointer group hover:border-zinc-700 transition-colors">
                    <div>
                      <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors block">Auto-Download</span>
                      <span className="text-xs text-zinc-500">Baixar .mp4 automaticamente ao concluir</span>
                    </div>
                    <div className="relative">
                      <input type="checkbox" checked={autoDownloadEnabled} onChange={(e) => setAutoDownloadEnabled(e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-pink-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Nome do Lote */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Nome do Lote (Opcional)</label>
                <input
                  type="text"
                  value={lotTitle}
                  onChange={(e) => setLotTitle(e.target.value)}
                  placeholder="Ex: campanha_junho, lote1, promocao_verao..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#161622] border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none transition-colors"
                  maxLength={50}
                />
                <p className="text-xs text-zinc-500">
                  {lotTitle.trim()
                    ? `Os arquivos serao salvos como: Video_01_${lotTitle.trim().replace(/\s+/g, "_")}.mp4`
                    : "Os arquivos serao salvos como: Video_01.mp4"}
                </p>
              </div>

              {/* Resumo de Combinacoes */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Combinacoes</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeColumns.map((col, i) => (
                    <span key={col.key} className="flex items-center gap-2">
                      {i > 0 && <span className="text-zinc-500">×</span>}
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${SLOT_CHIP_COLOR[col.key as TagType]}`}>{col.count} {col.label}</span>
                    </span>
                  ))}
                  {activeColumns.length > 0 && (
                    <>
                      <span className="text-zinc-500">=</span>
                      <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-pink-950/40 text-pink-300 border border-pink-500/20">{totalCombinations} Videos</span>
                    </>
                  )}
                  {!activeColumns.length && <span className="text-sm text-zinc-500">Adicione videos para ver o calculo</span>}
                </div>
              </div>

              {/* Campo: Quantas variacoes gerar */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Quantidade a gerar</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={totalCombinations || 999}
                    value={desiredVariations || ""}
                    placeholder={totalCombinations > 0 ? `${totalCombinations}` : "0"}
                    disabled={!minColumnsOk}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) setDesiredVariations(Math.min(val, totalCombinations));
                      else setDesiredVariations(0);
                    }}
                    className="w-28 px-3 py-2 rounded-xl bg-[#151520] border border-zinc-800/80 text-white text-sm font-semibold focus:outline-none focus:border-pink-500/50 transition-all disabled:opacity-40"
                  />
                  <span className="text-xs text-zinc-500">
                    {totalCombinations > 0 ? `de ${totalCombinations} disponiveis` : "adicione videos primeiro"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== CTA: Botao Gerar ========== */}
          <button
            onClick={generateCombinations}
            disabled={queueStatus.isProcessing || !minColumnsOk}
            className="w-full h-14 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-95 text-white font-bold text-base rounded-2xl shadow-lg shadow-pink-600/25 border border-pink-400/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {queueStatus.isProcessing ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> Renderizando fila...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Gerar {effectiveDesired} Variacoes</>
            )}
          </button>
        </>
      )}

      {/* ========== RESULTS VIEW ========== */}
      {activeView === "results" && renderedVideos.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setActiveView("upload")}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-300 bg-[#111118] hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Upload
          </button>

          {queueStatus.isProcessing && (
            <div className="bg-[#111118] border border-pink-500/30 rounded-2xl p-5 mb-6 shadow-lg shadow-pink-500/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold flex items-center gap-2 text-white"><Loader className="w-4 h-4 animate-spin text-pink-400" /> Fila de Processamento</span>
                <span className="text-sm text-zinc-400">Variacao {queueStatus.current} de {queueStatus.total}</span>
              </div>
              <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-pink-600 to-rose-600 transition-all duration-500" style={{ width: `${queueStatus.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{queueStatus.percentage}% concluido</span>
                <span>ETA: {queueStatus.eta}</span>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleCancelQueue}
                  className="px-4 py-2 text-xs font-semibold text-red-300 bg-red-950/80 hover:bg-red-900 border border-red-800 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Cancelar Concatenacao</span>
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#111118] rounded-xl border border-zinc-800/80 w-fit mb-6">
            <button onClick={() => setResultsTab("generated")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${resultsTab === "generated" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>
              <Film className="w-4 h-4" /> Videos Gerados ({renderedVideos.filter((v) => v.status === "ready").length}/{renderedVideos.length})
            </button>
            <button onClick={() => setResultsTab("media")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${resultsTab === "media" ? "bg-pink-600 text-white shadow-lg shadow-pink-600/25" : "text-zinc-400 hover:text-white"}`}>
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
                  <div className="flex items-center bg-[#111118] border border-zinc-800/80 rounded-xl p-0.5">
                    <button onClick={() => setVideoFilter("all")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${videoFilter === "all" ? "bg-pink-950/40 text-pink-300" : "text-zinc-400 hover:text-white"}`}>
                      <Eye className="w-3.5 h-3.5" /> Todos ({renderedVideos.length})
                    </button>
                    <button onClick={() => setVideoFilter("not_posted")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${videoFilter === "not_posted" ? "bg-emerald-500/15 text-emerald-400" : "text-zinc-400 hover:text-white"}`}>
                      <Rocket className="w-3.5 h-3.5" /> Nao Postados ({notPostedCount})
                    </button>
                    <button onClick={() => setVideoFilter("posted")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${videoFilter === "posted" ? "bg-blue-500/15 text-blue-400" : "text-zinc-400 hover:text-white"}`}>
                      <CheckCircle className="w-3.5 h-3.5" /> Postados ({postedCount})
                    </button>
                  </div>

                  {/* Modo de selecao dinamico */}
                  {!isSelectionMode ? (
                    <button onClick={toggleSelectionMode}
                      className="bg-pink-950/40 border border-pink-500/30 text-pink-300 text-sm py-2 px-4 rounded-xl hover:bg-pink-950/60 transition-colors font-medium">
                      ☑️ Selecionar
                    </button>
                  ) : (
                    <>
                      <button onClick={toggleSelectionMode}
                        className="bg-[#111118] border border-zinc-700 text-zinc-300 text-sm py-2 px-4 rounded-xl hover:bg-zinc-800 transition-colors">
                        ✕ Cancelar Selecao
                      </button>
                      <button onClick={selectAll} className="bg-[#111118] border border-zinc-800 text-zinc-300 text-sm py-2 px-4 rounded-xl hover:bg-zinc-800 transition-colors">
                        {renderedVideos.every((v) => v.selected) ? "Desmarcar Todos" : "Selecionar Todos"}
                      </button>
                      <span className="text-sm text-zinc-400 font-medium">({selectedCount} selecionado{selectedCount === 1 ? "" : "s"})</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {isSelectionMode && (
                    <>
                      <button onClick={handleSendSelectedToEditor} disabled={selectedCount === 0}
                        className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 font-medium">
                        <Send className="w-4 h-4" /> Enviar ({selectedCount})
                      </button>
                      <button onClick={downloadSelected} disabled={!renderedVideos.some((v) => v.selected && v.status === "ready")}
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 font-medium">
                        <Download className="w-4 h-4" /> Baixar ({selectedCount})
                      </button>
                      <button onClick={deleteSelected} disabled={selectedCount === 0}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 font-medium">
                        <Trash2 className="w-4 h-4" /> Excluir ({selectedCount})
                      </button>
                    </>
                  )}
                  <button onClick={downloadZip} disabled={!renderedVideos.some((v) => v.status === "ready")}
                    className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 font-medium">
                    <Archive className="w-4 h-4" /> ZIP
                  </button>
                  <button onClick={downloadAll} disabled={!renderedVideos.some((v) => v.status === "ready")}
                    className="bg-zinc-600/20 hover:bg-zinc-600/40 text-zinc-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 font-medium">
                    <Download className="w-4 h-4" /> Baixar Todos
                  </button>
                </div>
              </div>

              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div key={video.id} className={`bg-[#111118] border rounded-2xl p-4 flex flex-col gap-3 transition-all ${video.selected ? "border-pink-500/60 ring-1 ring-pink-500/30 shadow-lg shadow-pink-500/10" : video.is_posted ? "border-blue-500/30 opacity-70" : "border-zinc-800/80"}`}>
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

                      {/* Headline extraida do audio */}
                      {video.headline && (
                        <div className="mt-2 px-2 py-1.5 rounded-lg bg-pink-950/30 border border-pink-500/15">
                          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-0.5">Headline</p>
                          <p className="text-xs text-pink-200 leading-snug">{video.headline}</p>
                        </div>
                      )}

                      {/* Redtags extraidas do audio */}
                      {video.redTags && video.redTags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {video.redTags.slice(0, 8).map((tag, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-500/15">
                              {tag}
                            </span>
                          ))}
                          {video.redTags.length > 8 && (
                            <span className="text-[10px] text-gray-500">+{video.redTags.length - 8}</span>
                          )}
                        </div>
                      )}

                      {/* Loading transcricao */}
                      {video.status === "ready" && !video.transcription && !video.headline && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Loader className="w-3 h-3 animate-spin text-gray-500" />
                          <span className="text-[10px] text-gray-500">Extraindo audio...</span>
                        </div>
                      )}
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
