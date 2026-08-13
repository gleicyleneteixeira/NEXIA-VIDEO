"use client";

import { useRef, useState } from "react";
import { X, Upload, Camera, Trash2, Image as ImageIcon } from "lucide-react";
import { useProjectStore } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";

export default function CoverModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const project = useProjectStore((s) => s.project);
  const setCover = useProjectStore((s) => s.setCover);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const captureCurrentFrame = () => {
    const el = document.querySelector<HTMLVideoElement>('video[data-cover-source="primary"]');
    if (!el || !el.videoWidth) {
      setError("Nenhum vídeo com frame disponível no player. Adicione um vídeo ou use upload.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      withHistory("Definir capa (frame do player)", () => setCover(dataUrl));
      setError(null);
      onClose();
    } catch {
      setError("Não foi possível capturar o frame (talvez o vídeo esteja em outro domínio).");
    }
  };

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Envie apenas arquivos de imagem.");
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBusy(false);
      withHistory("Definir capa (upload)", () => setCover(dataUrl));
      setError(null);
      onClose();
    };
    reader.onerror = () => {
      setBusy(false);
      setError("Falha ao ler a imagem.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#14141f] border border-[#2a2a3a] rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Capa do projeto</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Preview atual */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#2a2a3a] flex items-center justify-center">
          {project.thumbnail ? (
            <img src={project.thumbnail} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <ImageIcon size={28} />
              <span className="text-xs">Nenhuma capa definida</span>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex flex-col gap-2">
          <button
            onClick={captureCurrentFrame}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c4ae8] text-white text-xs font-semibold active:scale-[0.98]"
          >
            <Camera size={15} />
            Usar frame atual do player
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-[#2a2a3a] active:scale-[0.98]"
          >
            <Upload size={15} />
            {busy ? "Carregando…" : "Enviar imagem"}
          </button>
          {project.thumbnail && (
            <button
              onClick={() => withHistory("Remover capa", () => setCover(null))}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-900/20 text-xs"
            >
              <Trash2 size={15} />
              Remover capa
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}