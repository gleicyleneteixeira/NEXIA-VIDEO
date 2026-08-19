"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardPaste,
  CloudUpload,
  Copy,
  FileText,
  History,
  ListChecks,
  Loader2,
  Mic,
  RefreshCcw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { LocalWhisperService, WHISPER_MODELS } from "@/services/localWhisperService";
import type { WhisperModelId } from "@/services/localWhisperService";
import { TranscriptionHistoryService } from "@/services/transcriptionHistoryService";
import type { TranscriptionHistoryItem } from "@/services/transcriptionHistoryService";

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
  const [transcribedText, setTranscribedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [model, setModel] = useState<WhisperModelId>("Xenova/whisper-tiny");
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TranscriptionHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isHistorySelectionMode, setIsHistorySelectionMode] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);

  // Carrega o historico de transcricoes salvas (IndexedDB) no mount
  useEffect(() => {
    let active = true;
    void TranscriptionHistoryService.getAll()
      .then((items) => {
        if (active) setHistory(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isBusy = status === "working";
  const wordCount = transcribedText.trim()
    ? transcribedText.trim().split(/\s+/).length
    : 0;

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
    setTranscribedText("");
    setStatusText("Preparando...");

    try {
      const result = await LocalWhisperService.transcribeFile(
        file,
        model,
        (pct, msg) => {
          setProgress(pct);
          setStatusText(msg);
        }
      );
      setTranscribedText(result);
      setStatus("done");
      try {
        const saved = await TranscriptionHistoryService.saveItem(result, fileName ?? "");
        setHistory((prev) => {
          if (!saved || prev.some((i) => i.id === saved.id)) return prev;
          return [saved, ...prev];
        });
      } catch {
        // Auto-save do historico e best-effort; nao quebra a transcricao
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao transcrever o arquivo.";
      setError(msg);
      setStatus("error");
    }
  };

  const handleCopy = async (textToCopy: string, id: string) => {
    if (!textToCopy.trim()) return;
    await navigator.clipboard.writeText(textToCopy).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePasteToEditor = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setTranscribedText(clipboardText);
        setStatus("done");
        setError("");
      }
    } catch {
      console.warn("Permissao de leitura da area de transferencia nao concedida.");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setStatusText("");
    setError("");
    setTranscribedText("");
    setFileName(null);
    setSelectedHistoryIds([]);
    setIsHistorySelectionMode(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLoadFromHistory = (item: TranscriptionHistoryItem) => {
    setTranscribedText(item.fullText);
    setFileName(item.originalFileName);
    setStatus("done");
    setError("");
    setProgress(0);
  };

  const handleDeleteHistory = async (id: string) => {
    await TranscriptionHistoryService.deleteItem(id).catch(() => {});
    setHistory((prev) => prev.filter((item) => item.id !== id));
    setSelectedHistoryIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const handleClearHistory = async () => {
    await TranscriptionHistoryService.clearAll().catch(() => {});
    setHistory([]);
    setSelectedHistoryIds([]);
    setIsHistorySelectionMode(false);
  };

  const handleToggleHistorySelection = (id: string) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handleToggleAllHistory = () => {
    setSelectedHistoryIds((prev) =>
      prev.length === history.length ? [] : history.map((item) => item.id)
    );
  };

  const handleDeleteSelectedHistory = async () => {
    if (selectedHistoryIds.length === 0) return;
    const ids = [...selectedHistoryIds];
    for (const id of ids) {
      await TranscriptionHistoryService.deleteItem(id).catch(() => {});
    }
    setHistory((prev) => prev.filter((item) => !ids.includes(item.id)));
    setSelectedHistoryIds([]);
    setIsHistorySelectionMode(false);
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
            value={transcribedText}
            onChange={(e) => setTranscribedText(e.target.value)}
            placeholder="O texto transcrito aparecera aqui..."
            className="input-field w-full min-h-[220px] px-4 py-3 rounded-[12px] text-sm resize-y"
          />
          <p className="text-[11px] text-[var(--text-secondary)]">
            Voce pode editar o texto antes de usa-lo.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleCopy(transcribedText, "editor")}
              disabled={!transcribedText.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40 transition-all disabled:opacity-50"
            >
              {copiedId === "editor" ? (
                <Check className="w-4 h-4 text-[var(--accent-green)]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedId === "editor" ? "Copiado!" : "Copiar Texto"}
            </button>

            <button
              type="button"
              onClick={() => void handlePasteToEditor()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40 transition-all"
              title="Colar da area de transferencia"
            >
              <ClipboardPaste className="w-4 h-4" />
              Colar da Area de Transferencia
            </button>

            <button
              type="button"
              disabled={!transcribedText.trim()}
              onClick={() => onUseAsBriefing(transcribedText)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-4 h-4" />
              Usar como Briefing e Gerar Roteiro
            </button>

            <button
              type="button"
              disabled={!transcribedText.trim()}
              onClick={() => onSendToContentCreator(transcribedText)}
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

      {/* Gaveta: Historico de Transcricoes Recentes */}
      <div className="border border-[var(--border)] rounded-[14px] overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[var(--surface)]/50">
          <button
            type="button"
            onClick={() => setIsHistoryOpen((v) => !v)}
            className="flex items-center gap-2 text-left min-w-0"
          >
            <History className="w-4 h-4 text-[var(--primary)] shrink-0" />
            <span className="text-sm font-bold text-white truncate">
              Historico de Transcricoes Recentes
            </span>
            {history.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                {history.length}
              </span>
            )}
            {isHistoryOpen ? (
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            )}
          </button>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsHistorySelectionMode((v) => {
                  const next = !v;
                  if (next) setSelectedHistoryIds([]);
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors shrink-0 ${
                isHistorySelectionMode
                  ? "bg-[var(--danger)]/10 border border-[var(--danger)]/25 text-[var(--danger)] hover:bg-[var(--danger)]/20"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40"
              }`}
            >
              {isHistorySelectionMode ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ListChecks className="w-3.5 h-3.5" />
              )}
              {isHistorySelectionMode ? "Cancelar" : "Selecionar"}
            </button>
          )}
        </div>

        {isHistorySelectionMode && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)]/30 border-t border-[var(--border)] flex-wrap">
            <button
              type="button"
              onClick={handleToggleAllHistory}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              {selectedHistoryIds.length === history.length ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selectedHistoryIds.length === history.length
                ? "Desmarcar Todos"
                : "Selecionar Todos"}
            </button>
            <span className="text-xs text-[var(--text-secondary)]">
              {selectedHistoryIds.length} selecionad{selectedHistoryIds.length === 1 ? "o" : "os"}
            </span>
            <button
              type="button"
              disabled={selectedHistoryIds.length === 0}
              onClick={() => void handleDeleteSelectedHistory()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/25 hover:bg-[var(--danger)]/20 transition-colors disabled:opacity-40 disabled:pointer-events-none ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Selecionados ({selectedHistoryIds.length})
            </button>
          </div>
        )}

        {isHistoryOpen && (
          <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[var(--text-secondary)]">
                Nenhuma transcricao salva ainda. Ao transcrever um arquivo, o resultado e salvo
                automaticamente aqui.
              </p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                    isHistorySelectionMode && selectedHistoryIds.includes(item.id)
                      ? "bg-[var(--primary)]/10"
                      : ""
                  }`}
                >
                  {isHistorySelectionMode ? (
                    <button
                      type="button"
                      onClick={() => handleToggleHistorySelection(item.id)}
                      className="flex items-center justify-center w-5 h-5 rounded-md border shrink-0 cursor-pointer transition-colors"
                      title="Selecionar registro"
                    >
                      {selectedHistoryIds.includes(item.id) ? (
                        <Check className="w-4 h-4 text-[var(--primary)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-secondary)]" />
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleLoadFromHistory(item)}
                    className="flex-1 min-w-0 text-left"
                    title="Carregar transcricao para edicao"
                  >
                    <p className="text-sm font-semibold text-white truncate" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                      {new Date(item.createdAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {" • "}
                      {item.originalFileName}
                      {" • "}
                      {item.wordCount.toLocaleString("pt-BR")} palavras
                    </p>
                  </button>

                  {!isHistorySelectionMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleCopy(item.fullText, item.id)}
                        title="Copiar transcricao"
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-[var(--accent-green)]" />
                        ) : (
                          <Clipboard className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadFromHistory(item)}
                        title="Carregar para edicao"
                        className="p-1.5 rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteHistory(item.id)}
                        title="Excluir registro"
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {history.length > 0 && !isHistorySelectionMode && (
              <button
                type="button"
                onClick={() => void handleClearHistory()}
                className="w-full px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--danger)] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar todo o historico
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}