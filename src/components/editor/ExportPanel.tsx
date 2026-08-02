"use client";

import { useState, useMemo } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import type { ExportSettings } from "@/lib/editor";
import { DEFAULT_EXPORT_SETTINGS } from "@/lib/editor";
import { Download, Settings, Play, Loader2, CheckCircle2, AlertCircle, Monitor, Film, Zap, Clock } from "lucide-react";

interface PresetConfig {
  id: string;
  label: string;
  resolution: string;
  fps: 24 | 25 | 30 | 60;
  bitrate: number;
}

type FormatOption = {
  id: string;
  label: string;
  codec: string;
  ext: string;
};

const FORMATS: FormatOption[] = [
  { id: "mp4", label: "MP4", codec: "H.264", ext: "mp4" },
  { id: "webm", label: "WebM", codec: "VP9", ext: "webm" },
  { id: "mov", label: "MOV", codec: "ProRes", ext: "mov" },
];

const PRESETS: PresetConfig[] = [
  { id: "web", label: "Web", resolution: "1080", fps: 30, bitrate: 8 },
  { id: "social", label: "Social", resolution: "1080", fps: 30, bitrate: 12 },
  { id: "qualidade", label: "Qualidade", resolution: "1080", fps: 60, bitrate: 20 },
  { id: "personalizado", label: "Personalizado", resolution: "1080", fps: 30, bitrate: 10 },
];

const FPS_OPTIONS: { value: 24 | 25 | 30 | 60; label: string; hint: string }[] = [
  { value: 24, label: "24 fps", hint: "Cinema" },
  { value: 25, label: "25 fps", hint: "PAL" },
  { value: 30, label: "30 fps", hint: "Padrão" },
  { value: 60, label: "60 fps", hint: "Suave/Gaming" },
];

const RESOLUTION_OPTIONS = [
  { value: "720", label: "720p", width: 1280, height: 720 },
  { value: "1080", label: "1080p", width: 1920, height: 1080 },
  { value: "1440", label: "1440p (2K)", width: 2560, height: 1440 },
  { value: "2160", label: "2160p (4K)", width: 3840, height: 2160 },
  { value: "custom", label: "Personalizado", width: 1920, height: 1080 },
];

const QUICK_FORMATS = [
  { label: "Reels", width: 1080, height: 1920, icon: "📱" },
  { label: "YouTube", width: 1920, height: 1080, icon: "▶️" },
  { label: "TikTok", width: 1080, height: 1920, icon: "🎵" },
  { label: "Post", width: 1080, height: 1080, icon: "📸" },
];

function getQualityLevel(bitrateMbps: number, resolutionHeight: number): { label: string; color: string; percent: number } {
  const score = (bitrateMbps / 50) * 60 + (resolutionHeight / 2160) * 40;
  if (score >= 75) return { label: "Ultra", color: "from-blue-500 to-blue-400", percent: Math.min(score, 100) };
  if (score >= 50) return { label: "Alta", color: "from-green-500 to-green-400", percent: score };
  if (score >= 25) return { label: "Média", color: "from-yellow-500 to-yellow-400", percent: score };
  return { label: "Baixa", color: "from-red-500 to-red-400", percent: Math.max(score, 5) };
}

function getRecommendedBitrate(resolutionHeight: number): string {
  if (resolutionHeight >= 2160) return "25-50 Mbps";
  if (resolutionHeight >= 1440) return "15-30 Mbps";
  if (resolutionHeight >= 1080) return "8-20 Mbps";
  return "3-8 Mbps";
}

export default function ExportPanel() {
  const { project, setExportSettings } = useProjectStore();
  const { isExporting, exportProgress, setExporting, setExportProgress } = useUIStore();

  const [format, setFormat] = useState<string>("mp4");
  const [preset, setPreset] = useState<string>("web");
  const [fps, setFps] = useState<24 | 25 | 30 | 60>(30);
  const [resolution, setResolution] = useState<string>("1080");
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [bitrate, setBitrate] = useState<number>(10);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const timeline = project.timeline;
  const watermark = project.watermark;

  const totalFrames = timeline.items.length > 0
    ? Math.max(...timeline.items.map((i) => i.startFrame + i.durationInFrames))
    : timeline.fps * 10;

  const durationSeconds = totalFrames / timeline.fps;
  const timelineItemCount = timeline.items.length;

  const resolutionData = useMemo(() => {
    if (resolution === "custom") return { width: customWidth, height: customHeight };
    const found = RESOLUTION_OPTIONS.find((r) => r.value === resolution);
    return found ? { width: found.width, height: found.height } : { width: 1920, height: 1080 };
  }, [resolution, customWidth, customHeight]);

  const estimatedSizeMB = useMemo(() => {
    return Math.round((bitrate * durationSeconds) / 8);
  }, [bitrate, durationSeconds]);

  const estimatedExportTime = useMemo(() => {
    const base = durationSeconds * 0.5;
    const resolutionMultiplier = resolutionData.height / 1080;
    const fpsMultiplier = fps / 30;
    return Math.round(base * resolutionMultiplier * fpsMultiplier);
  }, [durationSeconds, resolutionData.height, fps]);

  const quality = useMemo(() => {
    return getQualityLevel(bitrate, resolutionData.height);
  }, [bitrate, resolutionData.height]);

  const selectedFormat = FORMATS.find((f) => f.id === format) || FORMATS[0];

  const handlePresetChange = (presetId: string) => {
    setPreset(presetId);
    if (presetId !== "personalizado") {
      const p = PRESETS.find((pr) => pr.id === presetId);
      if (p) {
        setResolution(p.resolution);
        setFps(p.fps);
        setBitrate(p.bitrate);
      }
    }
  };

  const handleQuickFormat = (width: number, height: number) => {
    setResolution("custom");
    setCustomWidth(width);
    setCustomHeight(height);
  };

  const handleExport = async () => {
    if (isExporting) return;

    const videoItem = timeline.items.find((i) => i.kind === "video");
    if (!videoItem?.file) {
      setErrorMsg("Adicione um vídeo à timeline antes de exportar.");
      setStatus("error");
      return;
    }

    const exportSettings: ExportSettings = {
      format: format as any,
      fps,
      resolution: resolution as any,
      customWidth,
      customHeight,
      bitrate,
      quality: quality.label.toLowerCase() as any,
      preset: preset as any,
    };
    setExportSettings(exportSettings);

    setExporting(true);
    setStatus("processing");
    setExportProgress(0);

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        setExportProgress(Math.min(Math.round(progress * 100), 99));
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      const inputName = `input.${videoItem.file.name.split(".").pop()}`;
      const outputName = `output.${selectedFormat.ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoItem.file));

      const w = resolutionData.width;
      const h = resolutionData.height;

      const args = [
        "-i", inputName,
        "-t", String(durationSeconds),
        "-r", String(fps),
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
      ];

      if (format === "mp4") {
        const crf = Math.round(51 - (bitrate / 50) * 33);
        args.push("-c:v", "libx264", "-crf", String(Math.max(crf, 18)), "-preset", "medium");
      } else if (format === "webm") {
        args.push("-c:v", "libvpx-vp9", "-b:v", `${bitrate}M`);
      } else {
        args.push("-c:v", "prores_ks", "-profile:v", "3", "-b:v", `${bitrate}M`);
      }

      if (watermark?.enabled && watermark.imageUrl) {
        const watermarkData = await fetchFile(watermark.imageUrl);
        await ffmpeg.writeFile("watermark.png", watermarkData);
        args.push("-i", "watermark.png", "-filter_complex", "[0:v][1:v]overlay=W-w-10:10");
      }

      args.push("-pix_fmt", "yuv420p", "-movflags", "+faststart", outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const mimeType = format === "mp4" ? "video/mp4" : format === "webm" ? "video/webm" : "video/quicktime";
      const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.${selectedFormat.ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setExportProgress(100);
      setStatus("done");
    } catch (err: any) {
      console.error("Export failed:", err);
      setErrorMsg(err.message || "Erro durante a exportação");
      setStatus("error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-3 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto" style={{ backgroundColor: "#0d0d16" }}>
      <div className="flex items-center gap-2 text-gray-400">
        <Settings size={14} />
        <span className="text-xs font-semibold uppercase tracking-wider">Exportar</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1.5">Formato</label>
          <div className="grid grid-cols-3 gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-2 py-2 text-[10px] rounded-lg border transition-all flex flex-col items-center gap-0.5 ${
                  format === f.id
                    ? "bg-[#8b5cf6]/10 border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]/50"
                }`}
              >
                <span className="font-semibold">{f.label}</span>
                <span className="text-[8px] text-gray-500">{f.codec}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 block mb-1.5">Predefinição</label>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-2 py-2 text-[10px] rounded-lg border transition-all ${
                  preset === p.id
                    ? "bg-[#8b5cf6]/10 border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]/50"
                }`}
              >
                <div className="font-semibold">{p.label}</div>
                {p.id !== "personalizado" && (
                  <div className="text-[8px] text-gray-500 mt-0.5">{p.resolution} • {p.fps}fps • {p.bitrate}Mbps</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 block mb-1.5">FPS</label>
          <div className="grid grid-cols-4 gap-1.5">
            {FPS_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFps(f.value)}
                className={`px-2 py-2 text-[10px] rounded-lg border transition-all flex flex-col items-center gap-0.5 ${
                  fps === f.value
                    ? "bg-[#8b5cf6]/10 border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]/50"
                }`}
              >
                <span className="font-semibold">{f.value}</span>
                <span className="text-[8px] text-gray-500">{f.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 block mb-1.5">Resolução</label>
          <div className="grid grid-cols-3 gap-1.5">
            {RESOLUTION_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setResolution(r.value)}
                className={`px-2 py-2 text-[10px] rounded-lg border transition-all flex flex-col items-center gap-0.5 ${
                  resolution === r.value
                    ? "bg-[#8b5cf6]/10 border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]/50"
                }`}
              >
                <span className="font-semibold">{r.label}</span>
                {r.value !== "custom" && (
                  <span className="text-[8px] text-gray-500">{r.width}x{r.height}</span>
                )}
              </button>
            ))}
          </div>
          {resolution === "custom" && (
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <label className="text-[8px] text-gray-600 block mb-0.5">Largura</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-[10px] rounded border border-[#1e1e2e] bg-[#08080d] text-gray-300 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[8px] text-gray-600 block mb-0.5">Altura</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-[10px] rounded border border-[#1e1e2e] bg-[#08080d] text-gray-300 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] text-gray-500 block mb-1.5">
            Bitrate: {bitrate} Mbps
            <span className="text-gray-600 ml-2">(Recomendado: {getRecommendedBitrate(resolutionData.height)})</span>
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={bitrate}
            onChange={(e) => setBitrate(Number(e.target.value))}
            className="w-full h-1.5 bg-[#1e1e2e] rounded-full appearance-none cursor-pointer accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-[8px] text-gray-600 mt-0.5">
            <span>1 Mbps</span>
            <span>50 Mbps</span>
          </div>
        </div>

        <div className="bg-[#08080d] rounded-lg p-3 border border-[#1e1e2e]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500">Qualidade</span>
            <span className="text-[10px] font-semibold text-gray-300">{quality.label}</span>
          </div>
          <div className="w-full h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${quality.color} transition-all`}
              style={{ width: `${quality.percent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {QUICK_FORMATS.map((qf) => (
            <button
              key={qf.label}
              onClick={() => handleQuickFormat(qf.width, qf.height)}
              className={`px-2 py-1 text-[9px] rounded-full border transition-all ${
                resolution === "custom" && customWidth === qf.width && customHeight === qf.height
                  ? "bg-[#8b5cf6]/10 border-[#8b5cf6] text-white"
                  : "bg-[#13131f] border-[#1e1e2e] text-gray-500 hover:border-[#8b5cf6]/50"
              }`}
            >
              {qf.label} ({qf.width}x{qf.height})
            </button>
          ))}
        </div>

        <div className="bg-[#13131f] rounded-lg p-3 space-y-1.5 border border-[#1e1e2e]">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
            <Monitor size={12} />
            <span>Informações da Timeline</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500 flex items-center gap-1"><Clock size={10} /> Duração</span>
            <span className="text-gray-300">{durationSeconds.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500 flex items-center gap-1"><Film size={10} /> Total de Frames</span>
            <span className="text-gray-300">{totalFrames}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Resolução Atual</span>
            <span className="text-gray-300">{timeline.width}x{timeline.height}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Itens na Timeline</span>
            <span className="text-gray-300">{timelineItemCount}</span>
          </div>
        </div>

        <div className="bg-[#08080d] rounded-lg p-4 border border-[#1e1e2e]">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-3">
            <Zap size={12} />
            <span>Resumo da Exportação</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Formato</span>
              <span className="text-gray-300">{selectedFormat.label} ({selectedFormat.codec})</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Resolução</span>
              <span className="text-gray-300">{resolutionData.width}x{resolutionData.height}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">FPS</span>
              <span className="text-gray-300">{fps}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Bitrate</span>
              <span className="text-gray-300">{bitrate} Mbps</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Qualidade</span>
              <span className="text-gray-300">{quality.label}</span>
            </div>
            <div className="h-px bg-[#1e1e2e] my-1" />
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Tamanho Estimado</span>
              <span className="text-gray-300 font-semibold">~{estimatedSizeMB} MB</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Tempo Estimado</span>
              <span className="text-gray-300">~{estimatedExportTime}s</span>
            </div>
          </div>
        </div>

        {watermark?.enabled && (
          <div className="flex items-center gap-2 p-2 bg-[#8b5cf6]/10 rounded-lg border border-[#8b5cf6]/30">
            <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
            <span className="text-[10px] text-[#8b5cf6]">Watermark habilitado</span>
          </div>
        )}
      </div>

      {isExporting && (
        <div className="space-y-1">
          <div className="w-full h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8b5cf6] rounded-full transition-all"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 text-center">{exportProgress}%</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded-lg text-red-400 border border-red-900/30">
          <AlertCircle size={12} />
          <span className="text-[10px]">{errorMsg}</span>
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded-lg text-green-400 border border-green-900/30">
          <CheckCircle2 size={12} />
          <span className="text-[10px]">Exportação concluída!</span>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        {isExporting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download size={14} />
            Exportar Vídeo
          </>
        )}
      </button>
    </div>
  );
}
