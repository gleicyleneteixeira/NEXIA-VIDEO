"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Play,
  Trash2,
  Edit,
  Download,
  Share2,
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
} from "lucide-react";
import {
  VideoBlock,
  Variation,
  RenderMode,
  generateMatrix,
  concatenateVideosFFmpeg,
  formatDuration,
  formatDurationLong,
  getVideoDuration,
} from "@/lib/videoEngine";
import {
  saveVideoToDB,
  getVideoFromDB,
  listVideosFromDB,
  deleteVideoFromDB,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type TagType = "hook" | "development" | "cta";
type ResultsTab = "generated" | "media";

// Constants
const MAX_VIDEOS_PER_CATEGORY = 5;
const MAX_TOTAL_VIDEOS = 125; // 5 × 5 × 5

interface UploadedVideo {
  id: string;
  name: string;
  file: File;
  duration: number;
  durationFormatted: string;
}

interface RenderedVideo {
  id: number;
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

// UploadBox Component with limits
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
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLimitMessage, setShowLimitMessage] = useState(false);

  const isAtLimit = videos.length >= limit;
  const remaining = limit - videos.length;

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
      onDragOver={(e) => {
        e.preventDefault();
        if (!isAtLimit) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed transition-all ${
        isDragOver
          ? `${borderColor} ${bgColor} scale-[1.02]`
          : isAtLimit
          ? "border-gray-600 bg-[#1c1c28] opacity-75"
          : "border-gray-700 bg-[#1c1c28] hover:border-gray-600"
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b border-gray-800 ${isAtLimit ? "bg-gray-800/30" : bgColor}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-bold ${isAtLimit ? "text-gray-400" : textColor}`}>
            {title}
          </h3>
          <span
            className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              isAtLimit
                ? "bg-amber-500/20 text-amber-400"
                : `${bgColor} ${textColor}`
            }`}
          >
            {videos.length} / {limit}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      {/* Videos List */}
      <div className="p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
        {videos.length > 0 ? (
          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-3 p-2 rounded-xl bg-[#252535] hover:bg-[#2a2a3a] transition-colors group"
              >
                <button
                  onClick={() => onPlay(video.file)}
                  className="w-12 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent-pink)]/30 flex items-center justify-center shrink-0 hover:from-[var(--primary)]/50 hover:to-[var(--accent-pink)]/50 transition-all"
                >
                  <Play className="w-4 h-4 text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.name}</p>
                  <p className="text-xs text-gray-500">{video.durationFormatted}</p>
                </div>
                <button
                  onClick={() => onRemove(video.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                >
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
            <p className="text-sm text-gray-400 mb-2">Arraste vídeos aqui</p>
            <button
              onClick={() => !isAtLimit && fileInputRef.current?.click()}
              className={`text-xs ${isAtLimit ? "text-gray-500 cursor-not-allowed" : `${textColor} hover:underline`}`}
            >
              {isAtLimit ? "Limite atingido" : "ou clique para selecionar"}
            </button>
          </div>
        )}
      </div>

      {/* Add Button / Limit Message */}
      <div className="p-4 pt-0">
        {showLimitMessage ? (
          <div className="w-full py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Limite de {limit} vídeos atingido nesta categoria
          </div>
        ) : (
          <button
            onClick={() => !isAtLimit && fileInputRef.current?.click()}
            disabled={isAtLimit}
            className={`w-full py-2 rounded-xl border-2 border-dashed ${
              isAtLimit
                ? "border-gray-600 bg-gray-800/30 text-gray-500 cursor-not-allowed"
                : `${borderColor} ${bgColor} ${textColor} hover:opacity-80`
            } text-sm font-medium flex items-center justify-center gap-2 transition-all`}
          >
            <Plus className="w-4 h-4" />
            {isAtLimit ? "Limite Atingido" : "Adicionar Vídeo"}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

export default function MassProductionPage() {
  const [hookVideos, setHookVideos] = useState<UploadedVideo[]>([]);
  const [devVideos, setDevVideos] = useState<UploadedVideo[]>([]);
  const [ctaVideos, setCtaVideos] = useState<UploadedVideo[]>([]);
  const [renderedVideos, setRenderedVideos] = useState<RenderedVideo[]>([]);
  const [activeView, setActiveView] = useState<"upload" | "results">("upload");
  const [resultsTab, setResultsTab] = useState<ResultsTab>("generated");
  const [renderMode, setRenderMode] = useState<RenderMode>("fast");

  // Queue status
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    isProcessing: false,
    current: 0,
    total: 0,
    percentage: 0,
    eta: "0:00",
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleUpload = async (category: TagType, files: FileList) => {
    const currentCount =
      category === "hook"
        ? hookVideos.length
        : category === "development"
        ? devVideos.length
        : ctaVideos.length;

    const availableSlots = MAX_VIDEOS_PER_CATEGORY - currentCount;
    if (availableSlots <= 0) return;

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    const newVideos: UploadedVideo[] = [];

    for (const file of filesToProcess) {
      if (file.type.startsWith("video/")) {
        console.log(`[Upload] File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);
        // Get duration using a temporary URL
        const tempUrl = URL.createObjectURL(file);
        const duration = await getVideoDuration(tempUrl);
        URL.revokeObjectURL(tempUrl);
        newVideos.push({
          id: generateId(),
          name: file.name,
          file,
          duration,
          durationFormatted: formatDuration(duration),
        });
      }
    }

    if (category === "hook") setHookVideos((prev) => [...prev, ...newVideos]);
    else if (category === "development")
      setDevVideos((prev) => [...prev, ...newVideos]);
    else setCtaVideos((prev) => [...prev, ...newVideos]);
  };

  const handleRemove = (category: TagType, id: string) => {
    if (category === "hook") setHookVideos((prev) => prev.filter((v) => v.id !== id));
    else if (category === "development") setDevVideos((prev) => prev.filter((v) => v.id !== id));
    else setCtaVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handlePlay = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  // FIFO Queue Processing
  const processQueue = async (variations: Variation[]) => {
    setQueueStatus({
      isProcessing: true,
      current: 0,
      total: variations.length,
      percentage: 0,
      eta: "Calculando...",
    });

    // Initialize all videos as pending
    const initial: RenderedVideo[] = variations.map((variation, index) => ({
      id: index + 1,
      variation,
      blobUrl: null,
      blob: null,
      duration: variation.expectedDuration,
      durationFormatted: formatDuration(variation.expectedDuration),
      status: "pending" as const,
      progress: 0,
      selected: false,
    }));

    setRenderedVideos(initial);
    setActiveView("results");

    const startTime = Date.now();

    // Process ONE video at a time (FIFO)
    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];
      const videoId = i + 1;

      // Update current video status to concatenating
      setRenderedVideos((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, status: "concatenating", progress: 0 } : v
        )
      );

      // Calculate ETA
      const elapsed = (Date.now() - startTime) / 1000;
      const avgTimePerVideo = i > 0 ? elapsed / i : 0;
      const remaining = (variations.length - i) * avgTimePerVideo;
      const eta = formatDuration(remaining);

      setQueueStatus({
        isProcessing: true,
        current: i + 1,
        total: variations.length,
        percentage: Math.round(((i + 1) / variations.length) * 100),
        eta,
      });

      try {
        // Concatenate the 3 videos (pass File objects directly - no fetch)
        const result = await concatenateVideosFFmpeg(
          variation.hook.file,
          variation.body.file,
          variation.cta.file,
          `variation_${videoId}.mp4`,
          (progress) => {
            setRenderedVideos((prev) =>
              prev.map((v) => (v.id === videoId ? { ...v, progress } : v))
            );
          },
          renderMode
        );

        // Save to IndexedDB
        const dbId = `video_${videoId}_${Date.now()}`;
        await saveVideoToDB({
          id: dbId,
          variationId: videoId,
          hookName: variation.hook.id,
          bodyName: variation.body.id,
          ctaName: variation.cta.id,
          blob: result.blob,
          duration: result.duration,
          createdAt: new Date(),
        });

        // Update video as ready - PROGRESSIVE RELEASE
        setRenderedVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  blobUrl: result.url,
                  blob: result.blob,
                  duration: result.duration,
                  durationFormatted: formatDurationLong(result.duration),
                  status: "ready",
                  progress: 100,
                  savedToDB: true,
                }
              : v
          )
        );

        // Auto-download if enabled
        // downloadVideo(videoId, result.url);
      } catch (error) {
        console.error(`Error rendering video ${videoId}:`, error);
        setRenderedVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  status: "error",
                  error: error instanceof Error ? error.message : "Erro desconhecido",
                }
              : v
          )
        );
      }
    }

    setQueueStatus({
      isProcessing: false,
      current: variations.length,
      total: variations.length,
      percentage: 100,
      eta: "Concluído!",
    });

    // Salvar no Supabase em segundo plano (não bloqueia a UI)
    saveProjectToSupabase(variations).catch((err) =>
      console.warn("Aviso: Salvamento no Supabase falhou, mas os vídeos estão na tela.", err)
    );
  };

  const saveProjectToSupabase = async (variations: Variation[]) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const projectName = `Projeto ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`;

      // Inserir projeto
      const { data: project, error: projectError } = await supabase
        .from("mass_projects")
        .insert({
          user_id: user.id,
          project_name: projectName,
          total_variations: variations.length,
        })
        .select()
        .single();

      if (projectError || !project) {
        console.warn("Aviso: Tabela mass_projects não encontrada ou sem permissão.", projectError);
        return;
      }

      // Upload de cada variação para S3 (em segundo plano, sem bloquear)
      const currentVideos = renderedVideos;
      for (let i = 0; i < currentVideos.length; i++) {
        const video = currentVideos[i];
        if (!video.blob) continue;

        try {
          const filename = `variation_${i + 1}_${Date.now()}.mp4`;
          const formData = new FormData();
          formData.append("file", video.blob, filename);
          formData.append("category", "generated");
          formData.append("projectName", projectName);
          formData.append("hookName", video.variation.hook.id);
          formData.append("bodyName", video.variation.body.id);
          formData.append("ctaName", video.variation.cta.id);

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            console.log(`Variação #${i + 1} salva no S3: ${url}`);
          }
        } catch (uploadErr) {
          console.warn(`Aviso: Upload da variação #${i + 1} falhou.`, uploadErr);
        }
      }

      console.log("Projeto salvo no Supabase com URLs do S3!");
    } catch (err) {
      console.warn("Aviso: Salvamento no Supabase falhou, mas os vídeos estão na tela.", err);
    }
  };

  const generateCombinations = async () => {
    if (hookVideos.length === 0 || devVideos.length === 0 || ctaVideos.length === 0) {
      alert("Adicione pelo menos 1 vídeo em cada categoria!");
      return;
    }

    const totalCombinations = hookVideos.length * devVideos.length * ctaVideos.length;
    if (totalCombinations > MAX_TOTAL_VIDEOS) {
      alert(`O limite máximo é ${MAX_TOTAL_VIDEOS} variações por sessão!`);
      return;
    }

    // Convert to VideoBlock format (File objects for memory read)
    const hooks: VideoBlock[] = hookVideos.map((v) => ({
      id: v.id,
      url: "",
      duration: v.duration,
      file: v.file,
    }));

    const bodies: VideoBlock[] = devVideos.map((v) => ({
      id: v.id,
      url: "",
      duration: v.duration,
      file: v.file,
    }));

    const ctas: VideoBlock[] = ctaVideos.map((v) => ({
      id: v.id,
      url: "",
      duration: v.duration,
      file: v.file,
    }));

    // Generate matrix
    const matrix = generateMatrix(hooks, bodies, ctas);

    // Process queue
    await processQueue(matrix);
  };

  const toggleSelection = (id: number) => {
    setRenderedVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  const selectAll = () => {
    const allSelected = renderedVideos.every((v) => v.selected);
    setRenderedVideos((prev) =>
      prev.map((v) => ({ ...v, selected: !allSelected }))
    );
  };

  const downloadVideo = (video: RenderedVideo) => {
    if (video.blobUrl) {
      const link = document.createElement("a");
      link.href = video.blobUrl;
      link.download = `variation_${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadAll = () => {
    renderedVideos
      .filter((v) => v.status === "ready" && v.blobUrl)
      .forEach((video) => downloadVideo(video));
  };

  const publishAll = () => {
    alert(`Publicar/Agendar: ${renderedVideos.length} vídeos`);
  };

  const totalCombinations = hookVideos.length * devVideos.length * ctaVideos.length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Factory className="w-8 h-8 text-[var(--accent-orange)]" />
            <h1 className="text-3xl font-bold">
              Criação em <span className="gradient-text">Massa</span>
            </h1>
          </div>
          <p className="text-gray-400">
            Envie, classifique e gere variações automaticamente
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-[#1c1c28] rounded-xl">
          <button
            onClick={() => setActiveView("upload")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === "upload"
                ? "bg-[var(--primary)] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveView("results")}
            disabled={renderedVideos.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
              activeView === "results"
                ? "bg-[var(--primary)] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Resultados ({renderedVideos.length})
          </button>
        </div>
      </div>

      {/* ========== UPLOAD VIEW ========== */}
      {activeView === "upload" && (
        <>
          {/* Limit Info */}
          <div className="bg-[#1c1c28] border border-gray-800 rounded-xl p-4 mb-6 flex items-center gap-4">
            <HardDrive className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Limite por categoria:</span>{" "}
                {MAX_VIDEOS_PER_CATEGORY} vídeos
              </p>
              <p className="text-xs text-gray-500">
                Máximo por sessão: {MAX_TOTAL_VIDEOS} variações (5 × 5 × 5)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {hookVideos.length + devVideos.length + ctaVideos.length} / {MAX_VIDEOS_PER_CATEGORY * 3}
              </p>
              <p className="text-xs text-gray-500">arquivos carregados</p>
            </div>
          </div>

          {/* 3 Upload Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            <UploadBox
              title="🎯 HOOK (Gancho)"
              category="hook"
              accentColor="border-pink-500 bg-pink-500/5 text-pink-400"
              description="Trecho inicial de atração (primeiros 3s)"
              videos={hookVideos}
              onUpload={(files) => handleUpload("hook", files)}
              onRemove={(id) => handleRemove("hook", id)}
              onPlay={handlePlay}
              limit={MAX_VIDEOS_PER_CATEGORY}
            />
            <UploadBox
              title="📹 DESENVOLVIMENTO (Meio)"
              category="development"
              accentColor="border-cyan-500 bg-cyan-500/5 text-cyan-400"
              description="Trecho central com a mensagem principal"
              videos={devVideos}
              onUpload={(files) => handleUpload("development", files)}
              onRemove={(id) => handleRemove("development", id)}
              onPlay={handlePlay}
              limit={MAX_VIDEOS_PER_CATEGORY}
            />
            <UploadBox
              title="📢 CTA (Final)"
              category="cta"
              accentColor="border-emerald-500 bg-emerald-500/5 text-emerald-400"
              description="Chamada para ação (Inscrição, compra, etc)"
              videos={ctaVideos}
              onUpload={(files) => handleUpload("cta", files)}
              onRemove={(id) => handleRemove("cta", id)}
              onPlay={handlePlay}
              limit={MAX_VIDEOS_PER_CATEGORY}
            />
          </div>

          {/* Formula & Generate */}
          <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl p-6 mt-6">
            {/* Render Mode Toggle */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Modo de Renderização:</p>
              <div className="inline-flex rounded-xl bg-[#252535] p-1 border border-gray-700">
                <button
                  onClick={() => setRenderMode("fast")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    renderMode === "fast"
                      ? "bg-[var(--primary)] text-white shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  ⚡ Rápido (Instantâneo)
                </button>
                <button
                  onClick={() => setRenderMode("compatibility")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    renderMode === "compatibility"
                      ? "bg-[var(--primary)] text-white shadow-lg"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  🛠️ Compatibilidade
                </button>
              </div>
            </div>

            {/* Compatibility Mode Warning */}
            {renderMode === "compatibility" && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                <span className="text-amber-400 text-sm">
                  ⚠️ Modo Compatibilidade: o processo re-renderiza frame a frame e pode levar mais tempo.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold">
                <span className="px-4 py-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {hookVideos.length} Hooks
                </span>
                <span className="text-gray-500">×</span>
                <span className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {devVideos.length} Meios
                </span>
                <span className="text-gray-500">×</span>
                <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {ctaVideos.length} CTAs
                </span>
                <span className="text-gray-500">=</span>
                <span className="px-4 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  {totalCombinations} Vídeos
                </span>
              </div>

              <button
                onClick={generateCombinations}
                disabled={
                  queueStatus.isProcessing ||
                  hookVideos.length === 0 ||
                  devVideos.length === 0 ||
                  ctaVideos.length === 0
                }
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3"
              >
                {queueStatus.isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Renderizando fila...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar {totalCombinations} Variações
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== RESULTS VIEW ========== */}
      {activeView === "results" && renderedVideos.length > 0 && (
        <div>
          {/* Queue Progress */}
          {queueStatus.isProcessing && (
            <div className="bg-[#1c1c28] border border-[var(--primary)]/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin text-[var(--primary)]" />
                  Fila de Processamento
                </span>
                <span className="text-sm text-gray-400">
                  Variação {queueStatus.current} de {queueStatus.total}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] transition-all duration-500"
                  style={{ width: `${queueStatus.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{queueStatus.percentage}% concluído</span>
                <span>ETA: {queueStatus.eta}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#1c1c28] rounded-xl w-fit mb-6">
            <button
              onClick={() => setResultsTab("generated")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                resultsTab === "generated"
                  ? "bg-[var(--primary)] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Film className="w-4 h-4" />
              Vídeos Gerados ({renderedVideos.filter((v) => v.status === "ready").length}/{renderedVideos.length})
            </button>
            <button
              onClick={() => setResultsTab("media")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                resultsTab === "media"
                  ? "bg-[var(--primary)] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileVideo className="w-4 h-4" />
              Mídias Usadas
            </button>
          </div>

          {/* Tab 1: Generated Videos */}
          {resultsTab === "generated" && (
            <>
              {/* Global Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={selectAll}
                    className="bg-[#1c1c28] border border-gray-800 text-gray-300 text-sm py-2 px-4 rounded-xl hover:bg-[#2a2a3a] transition-colors"
                  >
                    {renderedVideos.every((v) => v.selected) ? "Desmarcar Todos" : "Selecionar Todos"}
                  </button>
                  {renderedVideos.some((v) => v.selected) && (
                    <span className="text-sm text-gray-400">
                      {renderedVideos.filter((v) => v.selected).length} selecionados
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadAll}
                    disabled={!renderedVideos.some((v) => v.status === "ready")}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4" />
                    Baixar Todos
                  </button>
                  <button
                    onClick={publishAll}
                    disabled={!renderedVideos.some((v) => v.status === "ready")}
                    className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-sm py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Publicar Todos
                  </button>
                </div>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderedVideos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-[#1c1c28] border border-gray-800 rounded-xl p-4 flex flex-col gap-3"
                  >
                    {/* Player */}
                    <div className="relative">
                      {video.status === "pending" || video.status === "concatenating" ? (
                        <div className="w-full aspect-video rounded-lg bg-[#252535] flex flex-col items-center justify-center gap-2">
                          <Loader className="w-8 h-8 text-[var(--primary)] animate-spin" />
                          <p className="text-xs text-gray-400">
                            {video.status === "concatenating" ? "Concatenando..." : "Na fila..."}
                          </p>
                          {video.status === "concatenating" && (
                            <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--primary)] transition-all duration-300"
                                style={{ width: `${video.progress}%` }}
                              />
                            </div>
                          )}
                          <p className="text-[10px] text-gray-500">{video.progress}%</p>
                        </div>
                      ) : video.status === "error" ? (
                        <div className="w-full aspect-video rounded-lg bg-red-900/20 flex flex-col items-center justify-center gap-2 border border-red-500/30">
                          <AlertCircle className="w-8 h-8 text-red-400" />
                          <p className="text-xs text-red-300">{video.error || "Erro"}</p>
                        </div>
                      ) : (
                        <video
                          src={video.blobUrl || ""}
                          controls
                          className="w-full aspect-video rounded-lg bg-black object-cover"
                        />
                      )}

                      {video.status === "ready" && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          {video.savedToDB && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/90 text-white text-[10px]">
                              💾 Salvo
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Pronto
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="text-white font-semibold">Variação #{video.id}</h4>
                      <p className="text-xs text-gray-400">
                        {video.variation.hook.id} + {video.variation.body.id} + {video.variation.cta.id}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">{video.durationFormatted}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800">
                      <button
                        onClick={() => alert(`Editor: Variação #${video.id}`)}
                        disabled={video.status !== "ready"}
                        className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-30"
                      >
                        ✂️ Editor
                      </button>
                      <button
                        onClick={() => downloadVideo(video)}
                        disabled={video.status !== "ready"}
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-30"
                      >
                        ⬇️ Baixar
                      </button>
                      <button
                        onClick={() => alert(`Publicar: Variação #${video.id}`)}
                        disabled={video.status !== "ready"}
                        className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs py-2 px-1 rounded flex items-center justify-center gap-1 transition-colors disabled:opacity-30"
                      >
                        🚀 Postar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Tab 2: Used Media */}
          {resultsTab === "media" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "🎯 Hooks", videos: hookVideos, color: "pink", category: "hook" as TagType },
                { title: "📹 Desenvolvimentos", videos: devVideos, color: "cyan", category: "development" as TagType },
                { title: "📢 CTAs", videos: ctaVideos, color: "emerald", category: "cta" as TagType },
              ].map((section) => (
                <div
                  key={section.category}
                  className={`bg-[#1c1c28] border border-${section.color}-500/20 rounded-xl overflow-hidden`}
                >
                  <div className={`p-4 border-b border-gray-800 bg-${section.color}-500/5`}>
                    <h3 className={`font-bold text-${section.color}-400`}>
                      {section.title} ({section.videos.length})
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                    {section.videos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#252535] group">
                        <VideoThumb file={video.file} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{video.name}</p>
                          <p className="text-xs text-gray-500">{video.durationFormatted}</p>
                        </div>
                        <button
                          onClick={() => handleRemove(section.category, video.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
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
