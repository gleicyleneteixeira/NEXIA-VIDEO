"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  CalendarDays,
  Check,
  CloudUpload,
  Copy,
  FileText,
  Loader2,
  Mic,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { LocalWhisperService, WHISPER_MODELS } from "@/services/localWhisperService";
import type { WhisperModelId } from "@/services/localWhisperService";

const ACCEPTED = [".mp4", ".mov", ".webm", ".m4v", ".mp3", ".wav", ".m4a", ".ogg"];

interface ScriptTranscriptionTabProps {
  onUseAsBriefing: (text: string) => void;
  onSendToContentCreator: (text: string) => void;
}

type Status = "idle" | "working" | "done" | "error";

export default function ScriptTranscriptionTab({
  onUseAsBriefing,
  onSendToContentCreator,
}: ScriptTranscriptionTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [model, setModel] = useState<WhisperModelId>("Xenova/whisper-tiny");
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const isBusy = status === "working";
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleFile = async (file: File | undefined | null) => {
    if (!file || isBusy) return;

    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setStatus("error");
      setError(
        `Formato nao suportado (${ext || "desconhecido"}). Use ${ACCEPTED.join(", ")}.`
      );
      return;
    }

    setFileName(file.name);
    setStatus("working");
    setProgress(0);
    setError("");
    setText("");
    setStatusText("Preparando...");

    try {
      const result = await LocalWhisperService.transcribe(
        file,
        (pct, msg) => {
          setProgress(pct);
          setStatusText(msg);
        },
        model
      );
      setText(result);
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao transcrever o arquivo.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleCopy = async () => {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setStatusText("");
    setError("");
    setText("");
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="glass-card rounded-[var(--radius)] p-6 space-y-5 animate-slide-up">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-cyan)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--accent-green)]/15">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Extrair de Video / Audio</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Transcreva uma entrevista, depoimento ou video de referencia e use o texto como briefing.
            Tudo 100% local no seu navegador — zero custo e nada sai do seu dispositivo.
          </p>
        </div>
      </div>

      {/* Seletor de modelo */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--text-secondary)] font-medium">Modelo:</span>
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-0.5">
          {WHISPER_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={isBusy}
              onClick={() => setModel(m.id)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                model === m.id
                  ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              {m.label} <span className="opacity-60">({m.desc})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={isBusy}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isBusy) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`w-full p-8 rounded-[14px] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
          isDragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/10"
            : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--primary)]/50"
        }`}
      >
        {isBusy ? (
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
        ) : (
          <CloudUpload className="w-8 h-8 text-[var(--primary)] opacity-70" />
        )}
        <p className="text-sm font-semibold text-white">
          {fileName ? `Arquivo: ${fileName}` : "Arraste ou selecione o video de referencia"}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          .mp4, .mov, .webm, .m4v (video) • .mp3, .wav, .m4a, .ogg (audio)
        </p>
      </button>

      {status === "working" && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-[var(--surface)] border border-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-pink)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-secondary)]">{statusText}</p>
            <p className="text-xs font-bold text-[var(--primary)]">{progress}%</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="p-4 rounded-[12px] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {status === "done" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent-green)]" />
              Texto Transcrito
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/25">
              {wordCount} palavras
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O texto transcrito aparecera aqui..."
            className="input-field w-full min-h-[220px] px-4 py-3 rounded-[12px] text-sm resize-y"
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            Voce pode editar o texto antes de usa-lo.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40 transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[var(--accent-green)]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copiado!" : "Copiar Texto"}
            </button>

            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => onUseAsBriefing(text)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-4 h-4" />
              Usar como Briefing e Gerar Roteiro
            </button>

            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => onSendToContentCreator(text)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <CalendarDays className="w-4 h-4" />
              Enviar p/ Criador de Conteudo
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-sm text-[var(--text-secondary)] hover:text-[var(--danger)] transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className="p-3.5 rounded-[12px] bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200/80 flex items-start gap-2">
          <AudioLines className="w-4 h-4 shrink-0 mt-0.5 text-purple-300" />
          <div>
            <strong className="text-purple-300">Primeiro uso:</strong>{" "}
            <span className="leading-relaxed">
              o modelo Whisper e baixado uma unica vez (~39MB no modo Tiny) e fica em cache no
              navegador. A transcricao roda localmente, offline, sem servidor.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}