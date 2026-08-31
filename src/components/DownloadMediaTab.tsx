"use client";

import { useState } from "react";
import {
  Download,
  Film,
  Music,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Globe,
} from "lucide-react";

type DownloadFormat = "video" | "audio";
type DownloadStatus = "idle" | "working" | "done" | "error";

export default function DownloadMediaTab() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<DownloadFormat>("video");
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const isBusy = status === "working";

  const handleDownload = async () => {
    if (!url.trim() || isBusy) return;

    setStatus("working");
    setError("");
    setFileName("");

    try {
      const response = await fetch("/api/download-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), format }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Falha ao baixar midia.");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let downloadName = format === "audio" ? "audio.mp3" : "video.mp4";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) downloadName = match[1];
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      setFileName(downloadName);
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao baixar midia.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleReset = () => {
    setUrl("");
    setStatus("idle");
    setError("");
    setFileName("");
  };

  return (
    <div className="glass-card rounded-[var(--radius)] p-6 space-y-5 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-pink)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--accent-orange)]/15">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Baixar Midia (Video/Audio)</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Cole a URL de um video do YouTube, Instagram ou Facebook para baixar
            como MP4 (video) ou MP3 (audio). 100% gratuito, sem chave de API.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[var(--accent-orange)]" />
          <span className="text-xs font-semibold text-white uppercase tracking-widest">
            URL do Video
          </span>
        </div>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole a URL do YouTube, Instagram ou Facebook..."
          disabled={isBusy}
          className="input-field w-full px-4 py-2.5 rounded-[12px] text-sm"
        />

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)] font-medium">Formato:</span>
          <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-0.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setFormat("video")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                format === "video"
                  ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Video (MP4)
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setFormat("audio")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                format === "audio"
                  ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              Audio (MP3)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isBusy || !url.trim()}
            onClick={() => void handleDownload()}
            className="px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Baixando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Baixar Midia
              </>
            )}
          </button>

          {status !== "idle" && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-[12px] text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {status === "working" && (
        <div className="p-4 rounded-[12px] bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-sm flex items-start gap-2">
          <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
          <div>
            <p className="font-semibold">Processando download...</p>
            <p className="text-[11px] opacity-75 mt-1">
              {format === "audio"
                ? "Extraindo e convertendo audio para MP3. Pode levar alguns minutos."
                : "Baixando video na melhor qualidade MP4 disponivel."}
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="p-4 rounded-[12px] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {status === "done" && (
        <div className="p-4 rounded-[12px] bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 text-[var(--accent-green)] text-sm flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Download concluido!</p>
            <p className="text-[11px] opacity-75 mt-1">
              Arquivo <strong>{fileName}</strong> baixado com sucesso.
            </p>
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className="p-3.5 rounded-[12px] bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200/80 flex items-start gap-2">
          <Globe className="w-4 h-4 shrink-0 mt-0.5 text-purple-300" />
          <div>
            <strong className="text-purple-300">Plataformas suportadas:</strong>{" "}
            <span className="leading-relaxed">
              YouTube, Instagram (reels/posts), Facebook (videos publicos).
              TikTok ainda nao e suportado para download direto.
              O download e processado 100% gratuito via yt-dlp, sem chaves de API.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
