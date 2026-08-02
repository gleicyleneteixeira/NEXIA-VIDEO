"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Trash2,
  Download,
  Sparkles,
  Check,
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
  generateMatrix,
  concatenateVideosFFmpeg,
  formatDuration,
  formatDurationLong,
  getVideoDuration,
} from "@/lib/videoEngine";
import { saveVideoToDB } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type TagType = "hook" | "dor" | "development" | "cta";
type ResultsTab = "generated" | "media";
type VideoFilter = "all" | "not_posted" | "posted";

const MAX_VIDEOS_PER_CATEGORY = 5;

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
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <video src={src} className="w-16 h-10 rounded object-cover bg-black" />;
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
      className={`rounded-2xl border-2 border-dashed transition-all ${
        isDragOver ? `${borderColor} ${bgColor} scale-[1.02]`
          : isAtLimit ? "border-gray-600 bg-[#1c1c28] opacity-75"
          : "border-gray-700 bg-[#1c1c28] hover:border-gray-600"
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
              <div key={video.id} className="flex items-center gap-3 p-2 rounded-xl bg-[#252535] hover:bg-[#2a2a3a] transition-colors group">
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
          <div className="flex flex-col items-center justify-center h-[160px] text-center">
            <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
              <Upload className={`w-6 h-6 ${textColor}`} />
            </div>
            <p className="text-sm text-gray-400 mb-2">Arraste videos aqui</p>
            <button onClick={() => !isAtLimit && fileInputRef.current?.click()} className={`text-xs ${isAtLimit ? "text-gray-500 cursor-not-allowed" : `${textColor} hover:underline`}`}>
              {isAtLimit ? "Limite atingido" : "ou clique para selecionar"}
            </button>
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
          <button onClick={() => !isAtLimit && fileInputRef.current?.click()} disabled={isAtLimit}
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
  const [hookVideos, setHookVideos] = useState<UploadedVideo[]>([]);
  const [dorVideos, setDorVideos] = useState<UploadedVideo[]>([]);
  const [devVideos, setDevVideos] = useState<UploadedVideo[]>([]);
  const [ctaVideos, setCtaVideos] = useState<UploadedVideo[]>([]);
  const [renderedVideos, setRenderedVideos] = useState<RenderedVideo[]>([]);
  const [activeView, setActiveView] = useState<"upload" | "results">("upload");
  const [resultsTab, setResultsTab] = useState<ResultsTab>("generated");
  const [renderMode, setRenderMode] = useState<RenderMode>("fast");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>(VIDEO_FORMATS[0]);
  const [videoFilter, setVideoFilter] = useState<VideoFilter>("all");
  const [transition, setTransition] = useState<"none" | "fade" | "wipe">("none");
  const [transitionDuration, setTransitionDuration] = useState(0.5);

  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    isProcessing: false, current: 0, total: 0, percentage: 0, eta: "0:00",
  });

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

  const handleUpload = async (category: TagType, files: FileList) => {
    const getCategoryCount = (cat: TagType) => {
      if (cat === "hook") return hookVideos.length;
      if (cat === "dor") return dorVideos.length;
      if (cat === "development") return devVideos.length;
      return ctaVideos.length;
    };
    const currentCount = getCategoryCount(category);
    const availableSlots = MAX_VIDEOS_PER_CATEGORY - currentCount;
    if (availableSlots <= 0) return;

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    const newVideos: UploadedVideo[] = [];

    for (const file of filesToProcess) {
      if (file.type.startsWith("video/")) {
        const tempUrl = URL.createObjectURL(file);
        const duration = await getVideoDuration(tempUrl);
        URL.revokeObjectURL(tempUrl);

        const totalVideos = hookVideos.length + dorVideos.length + devVideos.length + ctaVideos.length;
        if (totalVideos === 0) {
          const detected = await detectVideoFormat(file);
          setVideoFormat(detected);
        }

        newVideos.push({ id: generateId(), name: file.name, file, duration, durationFormatted: formatDuration(duration) });
      }
    }

    if (category === "hook") setHookVideos((prev) => [...prev, ...newVideos]);
    else if (category === "dor") setDorVideos((prev) => [...prev, ...newVideos]);
    else if (category === "development") setDevVideos((prev) => [...prev, ...newVideos]);
    else setCtaVideos((prev) => [...prev, ...newVideos]);
  };

  const handleRemove = (category: TagType, id: string) => {
    if (category === "hook") setHookVideos((prev) => prev.filter((v) => v.id !== id));
    else if (category === "dor") setDorVideos((prev) => prev.filter((v) => v.id !== id));
    else if (category === "development") setDevVideos((prev) => prev.filter((v) => v.id !== id));
    else setCtaVideos((prev) => prev.filter((v) => v.id !== id));
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
          .limit(50);

        if (data && data.length > 0) {
          const loaded: RenderedVideo[] = data.map((row, i) => ({
            id: i + 1,
            supabaseId: row.id,
            variation: row.variation_data || { id: "", blocks: [], expectedDuration: 0 },
            blobUrl: row.video_url,
            blob: null,
            duration: row.duration || 0,
            durationFormatted: formatDuration(row.duration || 0),
            status: "ready" as const,
            progress: 100,
            selected: false,
            savedToDB: true,
            is_posted: row.is_posted || false,
          }));
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

    const initial: RenderedVideo[] = variations.map((variation, index) => ({
      id: index + 1, variation, blobUrl: null, blob: null,
      duration: variation.expectedDuration,
      durationFormatted: formatDuration(variation.expectedDuration),
      status: "pending" as const, progress: 0, selected: false, is_posted: false,
    }));

    setRenderedVideos(initial);
    setActiveView("results");

    const startTime = Date.now();

    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];
      const videoId = i + 1;

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
        const inputs = variation.blocks.map((b) => b.file);
        const result = await concatenateVideosFFmpeg(inputs, `variation_${videoId}.mp4`,
          (progress) => { setRenderedVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, progress } : v)); },
          renderMode, videoFormat, transition, transitionDuration
        );

        await saveVideoToDB({
          id: `video_${videoId}_${Date.now()}`, variationId: videoId,
          hookName: variation.blocks[0]?.id || "", bodyName: variation.blocks[1]?.id || "",
          ctaName: variation.blocks[variation.blocks.length - 1]?.id || "",
          blob: result.blob, duration: result.duration, createdAt: new Date(),
        });

        // Save to Supabase
        const supabaseId = await saveRenderedVideo(
          { id: videoId, variation, blobUrl: result.url, blob: result.blob, duration: result.duration, durationFormatted: "", status: "ready", progress: 100, selected: false, is_posted: false },
          result.url
        );

        setRenderedVideos((prev) => prev.map((v) =>
          v.id === videoId ? { ...v, blobUrl: result.url, blob: result.blob, duration: result.duration,
            durationFormatted: formatDurationLong(result.duration), status: "ready", progress: 100, savedToDB: true, supabaseId: supabaseId || undefined } : v
        ));

        // Auto-download video immediately upon completion
        try {
          const link = document.createElement("a");
          link.href = result.url;
          link.download = `video_variacao_${videoId}.mp4`;
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

  const activeColumns: { key: string; label: string; count: number }[] = [];
  if (hookVideos.length > 0) activeColumns.push({ key: "hook", label: "HOOK", count: hookVideos.length });
  if (dorVideos.length > 0) activeColumns.push({ key: "dor", label: "DOR", count: dorVideos.length });
  if (devVideos.length > 0) activeColumns.push({ key: "development", label: "DESENVOLVIMENTO", count: devVideos.length });
  if (ctaVideos.length > 0) activeColumns.push({ key: "cta", label: "CTA", count: ctaVideos.length });

  const totalCombinations = activeColumns.reduce((acc, col) => acc * col.count, 1);
  const minColumnsOk = activeColumns.length >= 2;
  const totalLoaded = activeColumns.reduce((acc, c) => acc + c.count, 0);

  const generateCombinations = async () => {
    if (!minColumnsOk) { alert("Adicione videos em pelo menos 2 categorias (Hook + 1 outro)!"); return; }
    if (totalCombinations > 625) { alert("O limite maximo e 625 variacoes por sessao!"); return; }

    const toBlocks = (arr: UploadedVideo[]): VideoBlock[] =>
      arr.map((v) => ({ id: v.id, url: "", duration: v.duration, file: v.file }));

    const categories: VideoBlock[][] = [];
    if (hookVideos.length > 0) categories.push(toBlocks(hookVideos));
    if (dorVideos.length > 0) categories.push(toBlocks(dorVideos));
    if (devVideos.length > 0) categories.push(toBlocks(devVideos));
    if (ctaVideos.length > 0) categories.push(toBlocks(ctaVideos));

    const matrix = generateMatrix(...categories);
    await processQueue(matrix);
  };

  const selectAll = () => {
    const allSelected = renderedVideos.every((v) => v.selected);
    setRenderedVideos((prev) => prev.map((v) => ({ ...v, selected: !allSelected })));
  };

  const downloadVideo = (video: RenderedVideo) => {
    if (video.blobUrl) {
      const link = document.createElement("a");
      link.href = video.blobUrl;
      link.download = `variation_${video.id}.mp4`;
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

  const downloadAll = () => {
    renderedVideos.filter((v) => v.status === "ready" && v.blobUrl).forEach((video) => downloadVideo(video));
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
          <div className="bg-[#1c1c28] border border-gray-800 rounded-xl p-4 mb-6 flex items-center gap-4">
            <HardDrive className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-300"><span className="font-medium text-white">Limite por categoria:</span> {MAX_VIDEOS_PER_CATEGORY} videos</p>
              <p className="text-xs text-gray-500">Coluna DOR e opcional — se vazia, sera ignorada na concatenacao</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{totalLoaded} / {MAX_VIDEOS_PER_CATEGORY * 4}</p>
              <p className="text-xs text-gray-500">arquivos carregados</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
            <UploadBox title="🎯 HOOK (Gancho)" category="hook" accentColor="border-pink-500 bg-pink-500/5 text-pink-400" description="Trecho inicial de atracao (primeiros 3s)" videos={hookVideos} onUpload={(f) => handleUpload("hook", f)} onRemove={(id) => handleRemove("hook", id)} onPlay={handlePlay} limit={MAX_VIDEOS_PER_CATEGORY} />
            <UploadBox title="⚡ DOR / PROBLEMA" category="dor" accentColor="border-red-500 bg-red-500/5 text-red-400" description="Identificar a dor do cliente (Opcional)" videos={dorVideos} onUpload={(f) => handleUpload("dor", f)} onRemove={(id) => handleRemove("dor", id)} onPlay={handlePlay} limit={MAX_VIDEOS_PER_CATEGORY} optional />
            <UploadBox title="✨ DESENVOLVIMENTO / SOLUCAO" category="development" accentColor="border-cyan-500 bg-cyan-500/5 text-cyan-400" description="Trecho central com a mensagem principal" videos={devVideos} onUpload={(f) => handleUpload("development", f)} onRemove={(id) => handleRemove("development", id)} onPlay={handlePlay} limit={MAX_VIDEOS_PER_CATEGORY} />
            <UploadBox title="📢 CTA (Final)" category="cta" accentColor="border-emerald-500 bg-emerald-500/5 text-emerald-400" description="Chamada para acao (Inscricao, compra, etc)" videos={ctaVideos} onUpload={(f) => handleUpload("cta", f)} onRemove={(id) => handleRemove("cta", id)} onPlay={handlePlay} limit={MAX_VIDEOS_PER_CATEGORY} />
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
                      col.key === "hook" ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                      col.key === "dor" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      col.key === "development" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
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
                <div className="flex items-center gap-3">
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

                  <button onClick={selectAll} className="bg-[#1c1c28] border border-gray-800 text-gray-300 text-sm py-2 px-4 rounded-xl hover:bg-[#2a2a3a] transition-colors">
                    {renderedVideos.every((v) => v.selected) ? "Desmarcar Todos" : "Selecionar Todos"}
                  </button>
                  {renderedVideos.some((v) => v.selected) && (
                    <span className="text-sm text-gray-400">{renderedVideos.filter((v) => v.selected).length} selecionados</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={downloadAll} disabled={!renderedVideos.some((v) => v.status === "ready")}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                    <Archive className="w-4 h-4" /> Baixar Todos
                  </button>
                </div>
              </div>

              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div key={video.id} className={`bg-[#1c1c28] border rounded-xl p-4 flex flex-col gap-3 transition-all ${video.is_posted ? "border-blue-500/30 opacity-70" : "border-gray-800"}`}>
                    {/* Player */}
                    <div className="relative">
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
                        <video src={video.blobUrl || ""} controls className={`w-full ${getAspectClass(videoFormat)} rounded-lg bg-black object-cover`} />
                      )}

                      {video.status === "ready" && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          {video.is_posted && (
                            <span className="px-2 py-1 rounded-full bg-blue-500/90 text-white text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Postado
                            </span>
                          )}
                          {video.savedToDB && !video.is_posted && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/90 text-white text-[10px]">💾 Salvo</span>
                          )}
                          {!video.is_posted && (
                            <span className="px-2 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Pronto
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="text-white font-semibold">Variacao #{video.id}</h4>
                      <p className="text-xs text-gray-400">{video.variation.blocks.map((b) => b.id).join(" + ")}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">{video.durationFormatted}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-800">
                      <button onClick={() => downloadVideo(video)} disabled={video.status !== "ready"}
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-30">
                        ⬇️ Baixar
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: "🎯 Hooks", videos: hookVideos, color: "pink", category: "hook" as TagType },
                { title: "⚡ Dores", videos: dorVideos, color: "red", category: "dor" as TagType },
                { title: "✨ Desenvolvimentos", videos: devVideos, color: "cyan", category: "development" as TagType },
                { title: "📢 CTAs", videos: ctaVideos, color: "emerald", category: "cta" as TagType },
              ].map((section) => (
                <div key={section.category} className={`bg-[#1c1c28] border border-${section.color}-500/20 rounded-xl overflow-hidden`}>
                  <div className={`p-4 border-b border-gray-800 bg-${section.color}-500/5`}>
                    <h3 className={`font-bold text-${section.color}-400`}>{section.title} ({section.videos.length})</h3>
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
                    {section.videos.length === 0 && <p className="text-xs text-gray-500 text-center py-4">{section.category === "dor" ? "Opcional — nao utilizado" : "Nenhum video"}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
