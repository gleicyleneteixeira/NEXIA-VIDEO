"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  ZoomIn,
  ZoomOut,
  Layers,
  Music,
  Type,
  Image,
  Wand2,
  Download,
  Save,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Copy,
  Check,
  Grid,
  List,
  RefreshCw,
  Sparkles,
  Film,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Layers as LayersIcon,
  Combine,
} from "lucide-react";

interface MediaBlock {
  id: string;
  name: string;
  duration: string;
  file: File | null;
  thumbnail: string | null;
}

interface GeneratedVideo {
  id: number;
  hook: string;
  middle: string;
  cta: string;
  totalDuration: string;
  status: "pending" | "generating" | "ready";
}

type EditorMode = "traditional" | "matrix";

export default function EditorPage() {
  const [editorMode, setEditorMode] = useState<EditorMode>("matrix");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  // Matrix Mode State
  const [hooks, setHooks] = useState<MediaBlock[]>([]);
  const [middlewares, setMiddlewares] = useState<MediaBlock[]>([]);
  const [ctas, setCtas] = useState<MediaBlock[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<number[]>([]);

  // Traditional Mode State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  // Create video URL when file changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [videoFile]);

  // Play/Pause control
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Volume control
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Time update handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  // Loaded metadata handler
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add media block
  const addMediaBlock = (
    type: "hook" | "middle" | "cta",
    file?: File
  ) => {
    const newBlock: MediaBlock = {
      id: generateId(),
      name: file ? file.name : `Bloco ${type === "hook" ? "Hook" : type === "middle" ? "Desenvolvimento" : "CTA"} ${(type === "hook" ? hooks : type === "middle" ? middlewares : ctas).length + 1}`,
      duration: `${Math.floor(Math.random() * 10 + 5)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
      file: file || null,
      thumbnail: null,
    };

    if (type === "hook") setHooks([...hooks, newBlock]);
    else if (type === "middle") setMiddlewares([...middlewares, newBlock]);
    else setCtas([...ctas, newBlock]);
  };

  // Remove media block
  const removeMediaBlock = (
    type: "hook" | "middle" | "cta",
    id: string
  ) => {
    if (type === "hook") setHooks(hooks.filter((b) => b.id !== id));
    else if (type === "middle") setMiddlewares(middlewares.filter((b) => b.id !== id));
    else setCtas(ctas.filter((b) => b.id !== id));
  };

  // Generate combinations
  const generateCombinations = () => {
    if (hooks.length === 0 || middlewares.length === 0 || ctas.length === 0) {
      alert("Adicione pelo menos 1 vídeo em cada categoria (Hook, Desenvolvimento, CTA)");
      return;
    }

    setIsGenerating(true);
    const combinations: GeneratedVideo[] = [];
    let id = 1;

    hooks.forEach((hook) => {
      middlewares.forEach((middle) => {
        ctas.forEach((cta) => {
          combinations.push({
            id: id++,
            hook: hook.name,
            middle: middle.name,
            cta: cta.name,
            totalDuration: "0:30",
            status: "pending",
          });
        });
      });
    });

    setGeneratedVideos(combinations);

    // Simulate generation
    setTimeout(() => {
      setGeneratedVideos((prev) =>
        prev.map((v, i) => ({
          ...v,
          status: i < prev.length / 2 ? "ready" : "generating",
        }))
      );
    }, 1000);

    setTimeout(() => {
      setGeneratedVideos((prev) =>
        prev.map((v) => ({ ...v, status: "ready" }))
      );
      setIsGenerating(false);
    }, 3000);
  };

  // Handle file drop for matrix mode
  const handleDrop = useCallback(
    (type: "hook" | "middle" | "cta", e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        addMediaBlock(type, file);
      }
    },
    [hooks, middlewares, ctas]
  );

  const toggleVideoSelection = (id: number) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const selectAllVideos = () => {
    if (selectedVideos.length === generatedVideos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(generatedVideos.map((v) => v.id));
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">
            Editor de <span className="gradient-text">Vídeo</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Mode {editorMode === "matrix" ? "Matriz de Variações" : "Edição Tradicional"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Salvar
          </button>
          <a
            href="/seo"
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            Próximo: SEO
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-2 mb-4 p-1 bg-[var(--surface)] rounded-xl w-fit">
        <button
          onClick={() => setEditorMode("matrix")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            editorMode === "matrix"
              ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] text-white"
              : "text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          <Grid className="w-4 h-4" />
          Matriz de Vídeos
        </button>
        <button
          onClick={() => setEditorMode("traditional")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            editorMode === "traditional"
              ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] text-white"
              : "text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          <Film className="w-4 h-4" />
          Edição Tradicional
        </button>
      </div>

      {/* Matrix Mode */}
      {editorMode === "matrix" && (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left - Media Blocks */}
          <div className="w-80 flex flex-col gap-4 overflow-y-auto">
            {/* Formula Display */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-lg font-bold">
                <span className="px-3 py-1 rounded-lg bg-[var(--accent-pink)]/20 text-[var(--accent-pink)]">
                  {hooks.length} Hooks
                </span>
                <span className="text-[var(--text-secondary)]">×</span>
                <span className="px-3 py-1 rounded-lg bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                  {middlewares.length} Meios
                </span>
                <span className="text-[var(--text-secondary)]">×</span>
                <span className="px-3 py-1 rounded-lg bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                  {ctas.length} CTAs
                </span>
                <span className="text-[var(--text-secondary)]">=</span>
                <span className="px-3 py-1 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)]">
                  {hooks.length * middlewares.length * ctas.length} Vídeos
                </span>
              </div>
            </div>

            {/* Hooks Section */}
            <MediaBlockSection
              title="Hooks (Ganchos)"
              subtitle="Inícios que prendem atenção"
              icon={<Sparkles className="w-5 h-5" />}
              color="var(--accent-pink)"
              blocks={hooks}
              onAdd={() => addMediaBlock("hook")}
              onRemove={(id) => removeMediaBlock("hook", id)}
              onDrop={(e) => handleDrop("hook", e)}
              maxBlocks={10}
            />

            {/* Development Section */}
            <MediaBlockSection
              title="Desenvolvimento (Meio)"
              subtitle="Conteúdo principal"
              icon={<Layers className="w-5 h-5" />}
              color="var(--accent-cyan)"
              blocks={middlewares}
              onAdd={() => addMediaBlock("middle")}
              onRemove={(id) => removeMediaBlock("middle", id)}
              onDrop={(e) => handleDrop("middle", e)}
              maxBlocks={10}
            />

            {/* CTA Section */}
            <MediaBlockSection
              title="CTAs (Final)"
              subtitle="Chamadas para ação"
              icon={<Wand2 className="w-5 h-5" />}
              color="var(--accent-green)"
              blocks={ctas}
              onAdd={() => addMediaBlock("cta")}
              onRemove={(id) => removeMediaBlock("cta", id)}
              onDrop={(e) => handleDrop("cta", e)}
              maxBlocks={10}
            />
          </div>

          {/* Right - Generated Videos */}
          <div className="flex-1 flex flex-col">
            {/* Generate Button */}
            <div className="glass-card rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Combine className="w-5 h-5 text-[var(--primary)]" />
                    Gerar Variações
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Combine todos os blocos para criar {hooks.length * middlewares.length * ctas.length} vídeos únicos
                  </p>
                </div>
                <button
                  onClick={generateCombinations}
                  disabled={
                    isGenerating ||
                    hooks.length === 0 ||
                    middlewares.length === 0 ||
                    ctas.length === 0
                  }
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Gerar {hooks.length * middlewares.length * ctas.length} Vídeos
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Videos Grid */}
            {generatedVideos.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">
                    {generatedVideos.length} Vídeos Gerados
                    {selectedVideos.length > 0 && (
                      <span className="text-[var(--primary)] ml-2">
                        ({selectedVideos.length} selecionados)
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllVideos}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)]"
                    >
                      {selectedVideos.length === generatedVideos.length
                        ? "Desmarcar Todos"
                        : "Selecionar Todos"}
                    </button>
                    {selectedVideos.length > 0 && (
                      <button className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        Exportar ({selectedVideos.length})
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {generatedVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => toggleVideoSelection(video.id)}
                      className={`glass-card rounded-xl overflow-hidden cursor-pointer transition-all ${
                        selectedVideos.includes(video.id)
                          ? "ring-2 ring-[var(--primary)] scale-[1.02]"
                          : "hover:scale-[1.01]"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent-pink)]/30 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white/50" />
                        </div>
                        {video.status === "ready" && (
                          <div className="absolute top-2 right-2">
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-green)] flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                        {video.status === "generating" && (
                          <div className="absolute top-2 right-2">
                            <RefreshCw className="w-5 h-5 text-[var(--accent-orange)] animate-spin" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="flex gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-[var(--accent-pink)]/80 text-white text-[10px] truncate">
                              {video.hook}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="font-medium text-sm mb-1">
                          Variação #{video.id}
                        </p>
                        <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
                          <p className="truncate"> Hook: {video.hook}</p>
                          <p className="truncate">Meio: {video.middle}</p>
                          <p className="truncate">CTA: {video.cta}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {generatedVideos.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-pink)]/20 flex items-center justify-center mx-auto mb-4">
                    <Combine className="w-10 h-10 text-[var(--primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Adicione blocos de mídia
                  </h3>
                  <p className="text-[var(--text-secondary)] max-w-md">
                    Comece adicionando vídeos de Hook, Desenvolvimento e CTA na
                    barra lateral. O sistema combinará todos automaticamente!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traditional Mode */}
      {editorMode === "traditional" && (
        <div className="flex-1 flex gap-4">
          {/* Left - Tools */}
          <div className="w-16 flex flex-col gap-2">
            {[
              { icon: Scissors, label: "Cortar" },
              { icon: RotateCcw, label: "Desfazer" },
              { icon: Layers, label: "Camadas" },
              { icon: Music, label: "Áudio" },
              { icon: Type, label: "Texto" },
              { icon: Image, label: "Imagem" },
            ].map((tool) => (
              <button
                key={tool.label}
                className="w-12 h-12 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] flex flex-col items-center justify-center transition-all group"
                title={tool.label}
              >
                <tool.icon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--primary)]" />
                <span className="text-[8px] text-[var(--text-secondary)] mt-0.5">
                  {tool.label}
                </span>
              </button>
            ))}
          </div>

          {/* Center - Video Preview */}
          <div className="flex-1 flex flex-col">
            <div
              className={`flex-1 rounded-xl overflow-hidden border-2 border-dashed transition-all ${
                isDragOver
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : videoFile
                  ? "border-[var(--border)] bg-black"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith("video/")) {
                  setVideoFile(file);
                }
              }}
            >
              {videoFile && videoUrl ? (
                <div className="w-full h-full relative bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    onClick={() => setIsPlaying(!isPlaying)}
                  />
                  {/* Video Info Overlay */}
                  <div className="absolute bottom-4 left-4">
                    <p className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                      {videoFile.name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Upload className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" />
                    <p className="text-lg font-semibold mb-2">
                      Arraste seu vídeo aqui
                    </p>
                    <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Selecionar Arquivo
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setVideoFile(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-4 glass-card rounded-xl p-4">
              <input
                type="range"
                min="0"
                max={videoDuration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 mb-3 accent-[var(--primary)] cursor-pointer"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, currentTime - 10);
                      }
                    }}
                    className="p-1 hover:bg-[var(--surface-hover)] rounded"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 bg-[var(--primary)] rounded-full hover:bg-[var(--primary-hover)]"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(videoDuration, currentTime + 10);
                      }
                    }}
                    className="p-1 hover:bg-[var(--surface-hover)] rounded"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(videoDuration)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1 hover:bg-[var(--surface-hover)] rounded"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-20 accent-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right - Effects */}
          <div className="w-64 space-y-4">
            <div className="glass-card rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[var(--accent-pink)]" />
                Efeitos
              </h3>
              <div className="space-y-2">
                {[
                  { name: "Estabilizar", desc: "Remover tremedeira" },
                  { name: "Ajustar Cor", desc: "Brilho e contraste" },
                  { name: "Filtro", desc: "Efeitos visuais" },
                  { name: "Velocidade", desc: "Slow motion" },
                ].map((effect) => (
                  <button
                    key={effect.name}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-all text-left"
                  >
                    <Wand2 className="w-5 h-5 text-[var(--primary)]" />
                    <div>
                      <p className="font-medium text-sm">{effect.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {effect.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-[var(--accent-green)]" />
                Exportar
              </h3>
              <select className="input-field text-sm mb-3">
                <option>1080p (Full HD)</option>
                <option>720p (HD)</option>
                <option>Vertical (9:16)</option>
              </select>
              <button className="btn-primary w-full flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Exportar Vídeo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Media Block Section Component
function MediaBlockSection({
  title,
  subtitle,
  icon,
  color,
  blocks,
  onAdd,
  onRemove,
  onDrop,
  maxBlocks,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  blocks: MediaBlock[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onDrop: (e: React.DragEvent) => void;
  maxBlocks: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {icon}
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {blocks.length}/{maxBlocks}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-[var(--border)]">
          <div className="space-y-2 mt-3">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface)] group"
              >
                <div className="w-10 h-6 rounded bg-gradient-to-r from-[var(--primary)]/30 to-[var(--accent-pink)]/30 flex items-center justify-center">
                  <Play className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{block.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {block.duration}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(block.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-red)]/20 transition-all"
                >
                  <X className="w-3 h-3 text-[var(--accent-red)]" />
                </button>
              </div>
            ))}
          </div>

          {blocks.length < maxBlocks && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                setIsDragOver(false);
                onDrop(e);
              }}
              className={`mt-3 border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                isDragOver
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] hover:border-[var(--primary)]"
              }`}
              onClick={onAdd}
            >
              <Plus className="w-6 h-6 text-[var(--text-secondary)] mx-auto mb-1" />
              <p className="text-xs text-[var(--text-secondary)]">
                Arraste ou clique para adicionar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
