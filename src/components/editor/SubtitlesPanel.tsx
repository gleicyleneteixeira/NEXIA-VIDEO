"use client";

import { useState, useRef } from "react";
import { useProjectStore, useUIStore, usePlaybackStore, DEFAULT_CHROMA_KEY } from "@/lib/editor";
import type { TimelineItem } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import { Mic, MicOff, Plus, Trash2, SkipForward, LocateFixed } from "lucide-react";

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

const secToStr = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

const strToSec = (str: string): number | null => {
  const s = str.trim();
  if (!s) return null;
  const m = s.match(/^(\d+):(\d{1,2})(?:[.:](\d{1,3}))?$/);
  if (m) {
    const frac = m[3] ? Number("0." + m[3].padEnd(3, "0")) : 0;
    return Number(m[1]) * 60 + Number(m[2]) + frac;
  }
  const d = Number(s.replace(",", "."));
  return isFinite(d) ? d : null;
};

function TimeInput({ seconds, onCommit }: { seconds: number; onCommit: (s: number) => void }) {
  const [val, setVal] = useState(() => secToStr(seconds));
  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const parsed = strToSec(val);
        if (parsed !== null) onCommit(parsed);
        else setVal(secToStr(seconds));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-20 px-1.5 py-0.5 bg-[#1a1a28] border border-[#2a2a38] rounded text-[10px] text-white font-mono outline-none focus:border-[#8b5cf6]/50 text-center"
    />
  );
}

export default function SubtitlesPanel() {
  const { project, addItem, updateItem, removeItem } = useProjectStore();
  const { selectedIds, select } = useUIStore();
  const { currentTime, seekTo } = usePlaybackStore();

  const [text, setText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listenError, setListenError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSubFrameRef = useRef(0);

  const fps = project.timeline.fps || 30;

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  const subtitles = project.timeline.items
    .filter((i: TimelineItem) => i.kind === "text")
    .sort((a, b) => a.startFrame - b.startFrame);

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
      chromaKey: { ...DEFAULT_CHROMA_KEY },
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

  const textTrackAppendStart = (): number => {
    const tl = project.timeline;
    const textTrackId = tl.trackOrder.find((tid: string) => tl.tracks[tid]?.kind === "text");
    if (!textTrackId) return 0;
    return tl.items.length > 0
      ? Math.max(...tl.items.filter((i: TimelineItem) => i.trackId === textTrackId).map((i: TimelineItem) => i.startFrame + i.durationInFrames))
      : 0;
  };

  const addSubtitles = () => {
    const timeline = project.timeline;
    const textTrackId = timeline.trackOrder.find(
      (tid: string) => timeline.tracks[tid]?.kind === "text"
    );
    if (!textTrackId || !text.trim()) return;

    const item = buildSubtitleItem(text, textTrackAppendStart(), fps * 3);
    if (!item) return;
    withHistory("Adicionar legenda", () => addItem(item));
    setText("");
    setShowInput(false);
  };

  const addSubtitleAtPlayhead = () => {
    const timeline = project.timeline;
    const textTrackId = timeline.trackOrder.find(
      (tid: string) => timeline.tracks[tid]?.kind === "text"
    );
    if (!textTrackId || !text.trim()) return;

    const item = buildSubtitleItem(text, Math.max(0, Math.round(currentTime * fps)), fps * 3);
    if (!item) return;
    withHistory("Adicionar legenda no playhead", () => addItem(item));
    setText("");
    setShowInput(false);
  };

  const markStartAtPlayhead = () => {
    if (!selectedItem || selectedItem.kind !== "text") return;
    const frame = Math.max(0, Math.round(currentTime * fps));
    const maxStart = selectedItem.startFrame + selectedItem.durationInFrames - 1;
    withHistory("Marcar início da legenda", () =>
      updateItem(selectedItem.id, { startFrame: Math.min(frame, maxStart) })
    );
  };

  const markEndAtPlayhead = () => {
    if (!selectedItem || selectedItem.kind !== "text") return;
    const frame = Math.max(0, Math.round(currentTime * fps));
    withHistory("Marcar fim da legenda", () =>
      updateItem(selectedItem.id, { durationInFrames: Math.max(1, frame - selectedItem.startFrame) })
    );
  };

  const commitStart = (sec: number) => {
    if (!selectedItem || selectedItem.kind !== "text") return;
    const frame = Math.max(0, Math.round(sec * fps));
    const maxStart = selectedItem.startFrame + selectedItem.durationInFrames - 1;
    withHistory("Editar início da legenda", () =>
      updateItem(selectedItem.id, { startFrame: Math.min(frame, maxStart) })
    );
  };

  const commitEnd = (sec: number) => {
    if (!selectedItem || selectedItem.kind !== "text") return;
    const frame = Math.max(0, Math.round(sec * fps));
    withHistory("Editar fim da legenda", () =>
      updateItem(selectedItem.id, { durationInFrames: Math.max(1, frame - selectedItem.startFrame) })
    );
  };

  const removeSubtitle = (id: string) => {
    withHistory("Excluir legenda", () => {
      removeItem(id);
    });
    const { clearSelection } = useUIStore.getState();
    if (selectedIds.has(id)) clearSelection();
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
      <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Legendas</h3>
        <span className="text-[10px] text-gray-600">{subtitles.length}</span>
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
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Nova Legenda</div>
          {showInput ? (
            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite o texto da legenda..."
                className="w-full h-16 px-2 py-1 bg-[#1a1a28] border border-[#2a2a38] rounded text-xs text-white resize-none outline-none focus:border-[#8b5cf6]/50"
                maxLength={200}
              />
              <div className="flex gap-1">
                <button
                  onClick={addSubtitleAtPlayhead}
                  disabled={!text.trim()}
                  className="flex-1 py-1 bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] rounded hover:bg-[#8b5cf6]/20 disabled:opacity-30"
                  title="Insere na posição atual do playhead"
                >
                  Na playhead
                </button>
                <button
                  onClick={addSubtitles}
                  disabled={!text.trim()}
                  className="flex-1 py-1 bg-[#1e1e2e] text-gray-300 text-[10px] rounded hover:bg-[#2a2a38] disabled:opacity-30"
                  title="Insere no fim da trilha de texto"
                >
                  Fim da trilha
                </button>
                <button
                  onClick={() => { setShowInput(false); setText(""); }}
                  className="flex-1 py-1 bg-[#1e1e2e] text-gray-500 text-[10px] rounded hover:bg-[#2a2a38]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-full py-3 border-2 border-dashed border-[#1e1e2e] rounded-lg text-gray-500 hover:border-[#8b5cf6]/50 hover:text-[#8b5cf6] transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={12} /> Nova Legenda
            </button>
          )}
        </div>

        {subtitles.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Legendas da trilha</div>
            <div className="space-y-1">
              {subtitles.map((sub, idx) => {
                const startSec = sub.startFrame / fps;
                const endSec = (sub.startFrame + sub.durationInFrames) / fps;
                const active =
                  currentTime >= sub.startFrame && currentTime < sub.startFrame + sub.durationInFrames;
                return (
                  <div
                    key={sub.id}
                    onClick={() => select(sub.id, false)}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                      selectedIds.has(sub.id)
                        ? "bg-[#8b5cf6]/15 border-[#8b5cf6]/40"
                        : active
                          ? "bg-[#2a2a38]/60 border-[#33334a]"
                          : "bg-[#13131f] border-[#1e1e2e] hover:border-[#33334a]"
                    }`}
                  >
                    <span className="text-[9px] text-gray-600 w-4">{idx + 1}</span>
                    <span className="text-[9px] text-gray-400 font-mono whitespace-nowrap">
                      {secToStr(startSec)} → {secToStr(endSec)}
                    </span>
                    <span className="flex-1 text-[10px] text-gray-300 truncate min-w-0">
                      {(sub.text?.content || sub.name).replace(/\n/g, " ")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        seekTo(sub.startFrame);
                        window.dispatchEvent(new Event("timeline-user-seek"));
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity"
                      title="Ir para o início da legenda"
                    >
                      <SkipForward size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSubtitle(sub.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
                      title="Excluir legenda"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedItem?.kind === "text" && (
          <div className="bg-[#13131f] border border-[#1e1e2e] rounded-lg p-2.5 space-y-2.5">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Editar Legenda</div>
            <textarea
              value={selectedItem.text?.content || ""}
              onChange={(e) => {
                if (selectedItem.text) {
                  const { updateItem: u } = useProjectStore.getState();
                  u(selectedItem.id, { text: { ...selectedItem.text, content: e.target.value } });
                }
              }}
              className="w-full h-16 px-2 py-1 bg-[#1a1a28] border border-[#2a2a38] rounded text-xs text-white resize-none outline-none focus:border-[#8b5cf6]/50"
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400">Início</span>
                <div className="flex items-center gap-1">
                  <TimeInput
                    key={`${selectedItem.id}-start`}
                    seconds={selectedItem.startFrame / fps}
                    onCommit={commitStart}
                  />
                  <button
                    onClick={markStartAtPlayhead}
                    className="px-1.5 py-1 rounded bg-[#1a1a28] border border-[#1e1e2e] text-gray-400 hover:text-white text-[10px] flex items-center gap-1"
                    title="Marcar início na posição atual do playhead"
                  >
                    <LocateFixed size={10} /> Playhead
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400">Fim</span>
                <div className="flex items-center gap-1">
                  <TimeInput
                    key={`${selectedItem.id}-end`}
                    seconds={(selectedItem.startFrame + selectedItem.durationInFrames) / fps}
                    onCommit={commitEnd}
                  />
                  <button
                    onClick={markEndAtPlayhead}
                    className="px-1.5 py-1 rounded bg-[#1a1a28] border border-[#1e1e2e] text-gray-400 hover:text-white text-[10px] flex items-center gap-1"
                    title="Marcar fim na posição atual do playhead"
                  >
                    <LocateFixed size={10} /> Playhead
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-gray-600">
                Duração: {secToStr(selectedItem.durationInFrames / fps)} · ~{selectedItem.durationInFrames} frames
              </p>
            </div>

            <p className="text-[9px] text-gray-600 leading-relaxed">
              Estilo (fonte, cor, contorno, sombra) no painel <span className="text-gray-400">Propriedades</span> à
              direita com a legenda selecionada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}