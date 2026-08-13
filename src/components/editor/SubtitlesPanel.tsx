"use client";

import { useState, useRef } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import { usePlaybackStore } from "@/lib/editor";
import type { TimelineItem } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import { Mic, MicOff } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export default function SubtitlesPanel() {
  const { project, addItem } = useProjectStore();
  const { selectedIds } = useUIStore();
  const { currentTime } = usePlaybackStore();

  const [text, setText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listenError, setListenError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSubFrameRef = useRef(0);

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  const buildSubtitleItem = (content: string, startFrame: number, durationFrames: number): TimelineItem | null => {
    const timeline = project.timeline;
    const textTrackId = timeline.trackOrder.find(
      (tid: string) => timeline.tracks[tid]?.kind === "text"
    );
    if (!textTrackId) return null;

    return {
      id: crypto.randomUUID(),
      trackId: textTrackId,
      startFrame,
      durationInFrames: Math.max(2, durationFrames),
      name: "Legendas",
      kind: "text",
      transform: { opacity: 1, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false, x: 50, y: 20 },
      filters: { brightness: 0, contrast: 1, saturation: 1, hue: 0, blur: 0, temperature: 0, exposure: 0, highlights: 0, shadows: 0, vignette: 0, vignetteSoftness: 50, grain: 0, grainSize: 50 },
      crop: { enabled: false, top: 0, right: 0, bottom: 0, left: 0 },
      mask: { enabled: false, shape: "circle", x: 50, y: 50, width: 80, height: 80, rotation: 0, feather: 0, invert: false },
      chromaKey: { enabled: false, color: "#00ff00", intensity: 0.5, shadow: 0, feather: 0, spill: 0 },
      blendMode: "normal",
      speed: { rate: 1, reverse: false, freezeFrame: null, curve: [] },
      animation: { enter: "none", exit: "none", durationInFrames: 15 },
      audio: { fade: { in: "none", inDuration: 0, out: "none", outDuration: 0 }, voiceEffect: "none", eqPreset: "none", denoise: false },
      effects: [],
      hsl: {},
      filterPreset: "none",
      keyframes: {},
      text: {
        content,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 24,
        fontWeight: "bold",
        fontStyle: "normal",
        color: "#ffffff",
        backgroundColor: "transparent",
        backgroundOpacity: 0,
        textAlign: "center",
        x: 50, y: 80,
        strokeWidth: 2,
        strokeColor: "#000000",
        strokeEnabled: true,
        shadowColor: "rgba(0,0,0,0.5)",
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowEnabled: true,
        stylePreset: "outline",
        gradient: { enabled: false, color1: "#ffffff", color2: "#000000", angle: 0 },
        lineHeight: 1.2,
        letterSpacing: 0,
      },
    };
  };

  const addSubtitles = () => {
    const fps = project.timeline.fps;
    const timeline = project.timeline;
    const textTrackId = timeline.trackOrder.find(
      (tid: string) => timeline.tracks[tid]?.kind === "text"
    );
    if (!textTrackId || !text.trim()) return;

    const startFrame = timeline.items.length > 0
      ? Math.max(...timeline.items.filter((i: TimelineItem) => i.trackId === textTrackId).map((i: TimelineItem) => i.startFrame + i.durationInFrames))
      : 0;

    const item = buildSubtitleItem(text, startFrame, fps * 3);
    if (!item) return;
    withHistory("Adicionar legenda", () => addItem(item));
    setText("");
    setShowInput(false);
  };

  const startListening = () => {
    if (isListening) {
      recognitionRef.current?.abort();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setListenError("Reconhecimento de fala não suportado neste navegador (use Chrome/Edge).");
      return;
    }
    setListenError(null);
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      const fps = project.timeline.fps;
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript.trim() + " ";
        }
      }
      finalText = finalText.trim();
      if (!finalText) return;
      const frame = Math.round(currentTime * fps);
      const start = Math.max(0, Math.min(frame, lastSubFrameRef.current));
      let duration = fps * 3;
      if (start > 0 && lastSubFrameRef.current > 0) {
        duration = Math.max(1, start - lastSubFrameRef.current) + fps * 1.5;
      }
      const item = buildSubtitleItem(finalText, start, duration);
      if (item && start > lastSubFrameRef.current) {
        withHistory("Adicionar legenda", () => addItem(item));
        lastSubFrameRef.current = start;
      }
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    try {
      rec.start();
    } catch {
      setIsListening(false);
    }
    recognitionRef.current = rec;
    setIsListening(true);
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Legendas</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Auto: fale para legendar</div>
          <button
            onClick={startListening}
            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors ${
              isListening
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20"
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            {isListening ? "Gravando… clique para parar" : "Capturar fala (gerar legendas)"}
          </button>
          <p className="text-[9px] text-gray-600 mt-1">
            Fale o roteiro enquanto o vídeo toca. Cada fala vira uma legenda na posição do playhead. Use Chrome/Edge.
          </p>
          {listenError && <p className="text-[10px] text-red-400 mt-1">{listenError}</p>}
        </div>

        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Adicionar Legenda</div>
          {showInput ? (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite o texto da legenda..."
                className="w-full h-16 px-2 py-1 bg-[#1a1a28] border border-[#2a2a38] rounded text-xs text-white resize-none outline-none focus:border-[#8b5cf6]/50"
                maxLength={100}
              />
              <div className="flex gap-1">
                <button
                  onClick={addSubtitles}
                  disabled={!text.trim()}
                  className="flex-1 py-1 bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] rounded hover:bg-[#8b5cf6]/20 disabled:opacity-30"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => { setShowInput(false); setText(""); }}
                  className="flex-1 py-1 bg-[#1e1e2e] text-gray-400 text-[10px] rounded hover:bg-[#2a2a38]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-full py-4 border-2 border-dashed border-[#1e1e2e] rounded-lg text-gray-500 hover:border-[#8b5cf6]/50 hover:text-[#8b5cf6] transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-xs">➕ Nova Legenda</span>
            </button>
          )}
        </div>

        {selectedItem?.kind === "text" && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Editar Texto</div>
            <textarea
              value={selectedItem.text?.content || ""}
              onChange={(e) => {
                if (selectedItem.text) {
                  const { updateItem } = useProjectStore.getState();
                  updateItem(selectedItem.id, {
                    text: { ...selectedItem.text, content: e.target.value },
                  });
                }
              }}
              className="w-full h-20 px-2 py-1 bg-[#1a1a28] border border-[#2a2a38] rounded text-xs text-white resize-none outline-none focus:border-[#8b5cf6]/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
