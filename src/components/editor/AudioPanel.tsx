"use client";

import { useState, useRef, useCallback } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, FadeType, VoiceEffect, EQPreset } from "@/lib/editor";
import { VOICE_EFFECTS, EQ_PRESETS, DEFAULT_AUDIO, DEFAULT_TRANSFORM, DEFAULT_FILTERS, generateId } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import { Mic, MicOff, Volume2, Music, Download, Play, Square } from "lucide-react";
import { persistStandaloneMedia } from "@/lib/editor/media-persistence";

type CollapsibleKey = "volume" | "fade" | "voice" | "eq" | "denoise" | "recorder" | "extract" | "sfx";

const SOUND_CATEGORIES = [
  { label: "Transição", icon: "🔀" },
  { label: "Risadas", icon: "😂" },
  { label: "Impactos", icon: "💥" },
  { label: "Ambiente", icon: "🌿" },
  { label: "Música", icon: "🎵" },
];

function volumeToDb(v: number): string {
  if (v <= 0) return "-∞ dB";
  const db = 20 * Math.log10(v);
  return `${db.toFixed(1)} dB`;
}

export default function AudioPanel() {
  const { project, updateItem, addItem } = useProjectStore();
  const { selectedIds } = useUIStore();

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  const [collapsed, setCollapsed] = useState<Record<CollapsibleKey, boolean>>({
    volume: false,
    fade: false,
    voice: false,
    eq: false,
    denoise: false,
    recorder: false,
    extract: false,
    sfx: false,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = (key: CollapsibleKey) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const updateAudio = (patch: Partial<TimelineItem["audio"]>) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      audio: { ...selectedItem.audio, ...patch },
    });
  };

  const updateFade = (patch: Partial<TimelineItem["audio"]["fade"]>) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      audio: {
        ...selectedItem.audio,
        fade: { ...selectedItem.audio.fade, ...patch },
      },
    });
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: "audio/webm" });

        const audioTrack = Object.values(project.timeline.tracks).find(
          (t) => t.kind === "audio"
        );
        if (!audioTrack) return;

        const newItem: TimelineItem = {
          id: generateId(),
          trackId: audioTrack.id,
          startFrame: 0,
          durationInFrames: 30 * Math.ceil(recordingTime),
          name: file.name,
          kind: "audio",
          src: URL.createObjectURL(file),
          file,
          mediaId: persistStandaloneMedia(file, "audio"),
          transform: { ...DEFAULT_TRANSFORM },
          filters: { ...DEFAULT_FILTERS },
          hsl: {},
          filterPreset: "none",
          crop: { enabled: false, top: 0, right: 0, bottom: 0, left: 0 },
          mask: { enabled: false, shape: "circle", x: 50, y: 50, width: 80, height: 80, rotation: 0, feather: 0, invert: false },
          chromaKey: { enabled: false, color: "#00ff00", intensity: 0.5, shadow: 0, feather: 0, spill: 0 },
          blendMode: "normal",
          speed: { rate: 1, reverse: false, freezeFrame: null, curve: [] },
          animation: { enter: "none", exit: "none", durationInFrames: 15 },
          audio: { ...DEFAULT_AUDIO },
          effects: [],
          keyframes: {},
        };

        withHistory("Adicionar gravação", () => addItem(newItem));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      // microphone access denied
    }
  }, [addItem, project.timeline.tracks, recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const extractAudio = () => {
    if (!selectedItem || selectedItem.kind !== "video" || !selectedItem.src) return;

    const audioTrack = Object.values(project.timeline.tracks).find(
      (t) => t.kind === "audio"
    );
    if (!audioTrack) return;

    const newItem: TimelineItem = {
      id: generateId(),
      trackId: audioTrack.id,
      startFrame: selectedItem.startFrame,
      durationInFrames: selectedItem.durationInFrames,
      name: `${selectedItem.name} (Áudio)`,
      kind: "audio",
      src: selectedItem.src,
      mediaId: selectedItem.mediaId,
      transform: { ...DEFAULT_TRANSFORM },
      filters: { ...DEFAULT_FILTERS },
      hsl: {},
      filterPreset: "none",
      crop: { enabled: false, top: 0, right: 0, bottom: 0, left: 0 },
      mask: { enabled: false, shape: "circle", x: 50, y: 50, width: 80, height: 80, rotation: 0, feather: 0, invert: false },
      chromaKey: { enabled: false, color: "#00ff00", intensity: 0.5, shadow: 0, feather: 0, spill: 0 },
      blendMode: "normal",
      speed: { rate: 1, reverse: false, freezeFrame: null, curve: [] },
      animation: { enter: "none", exit: "none", durationInFrames: 15 },
      audio: { ...DEFAULT_AUDIO },
      effects: [],
      keyframes: {},
    };

    withHistory("Adicionar áudio", () => addItem(newItem));
  };

  if (!selectedItem) {
    return (
      <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e1e2e]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Áudio</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs px-4 text-center">
          Selecione um item de áudio ou vídeo
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Áudio</h3>
      </div>

      {/* Volume */}
      <SectionHeader label="Volume" collapsed={collapsed.volume} onToggle={() => toggle("volume")} icon={<Volume2 size={12} />} />
      {!collapsed.volume && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Nível</span>
            <span className="text-[10px] text-gray-600 font-mono">
              {volumeToDb(selectedItem.transform.opacity)}
            </span>
          </div>
          <input
            type="range"
            value={selectedItem.transform.opacity}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              updateItem(selectedItem.id, { transform: { ...selectedItem.transform, opacity: Math.max(0, Math.min(2, v)) } });
            }}
            min={0}
            max={2}
            step={0.01}
            className="w-full h-1 bg-[#1e1e2e] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
            <span>0</span>
            <span className="text-[#8b5cf6]">{volumeToDb(selectedItem.transform.opacity)}</span>
            <span>2x</span>
          </div>
        </div>
      )}

      {/* Fade In / Out */}
      <SectionHeader label="Fade In/Out" collapsed={collapsed.fade} onToggle={() => toggle("fade")} icon={<Music size={12} />} />
      {!collapsed.fade && (
        <div className="p-3 border-b border-[#1a1a28] space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Fade In</label>
            <div className="flex gap-2 items-center">
              <select
                value={selectedItem.audio.fade.in}
                onChange={(e) => updateFade({ in: e.target.value as FadeType })}
                className="flex-1 bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              >
                <option value="none">Nenhum</option>
                <option value="linear">Linear</option>
                <option value="exponential">Exponencial</option>
                <option value="logarithmic">Logarítmico</option>
              </select>
            </div>
            {selectedItem.audio.fade.in !== "none" && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-gray-500">Duração</span>
                  <span className="text-[10px] text-gray-600 font-mono">{selectedItem.audio.fade.inDuration}ms</span>
                </div>
                <input
                  type="range"
                  value={selectedItem.audio.fade.inDuration}
                  onChange={(e) => updateFade({ inDuration: parseInt(e.target.value) })}
                  min={0}
                  max={5000}
                  step={50}
                  className="w-full h-1 bg-[#1e1e2e] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Fade Out</label>
            <div className="flex gap-2 items-center">
              <select
                value={selectedItem.audio.fade.out}
                onChange={(e) => updateFade({ out: e.target.value as FadeType })}
                className="flex-1 bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              >
                <option value="none">Nenhum</option>
                <option value="linear">Linear</option>
                <option value="exponential">Exponencial</option>
                <option value="logarithmic">Logarítmico</option>
              </select>
            </div>
            {selectedItem.audio.fade.out !== "none" && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-gray-500">Duração</span>
                  <span className="text-[10px] text-gray-600 font-mono">{selectedItem.audio.fade.outDuration}ms</span>
                </div>
                <input
                  type="range"
                  value={selectedItem.audio.fade.outDuration}
                  onChange={(e) => updateFade({ outDuration: parseInt(e.target.value) })}
                  min={0}
                  max={5000}
                  step={50}
                  className="w-full h-1 bg-[#1e1e2e] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Efeitos de Voz */}
      <SectionHeader label="Efeitos de Voz" collapsed={collapsed.voice} onToggle={() => toggle("voice")} icon={<Mic size={12} />} />
      {!collapsed.voice && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="flex flex-wrap gap-1.5">
            {VOICE_EFFECTS.map((fx) => (
              <button
                key={fx.id}
                onClick={() => updateAudio({ voiceEffect: fx.id })}
                className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors ${
                  selectedItem.audio.voiceEffect === fx.id
                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                }`}
              >
                {fx.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Equalizador */}
      <SectionHeader label="Equalizador" collapsed={collapsed.eq} onToggle={() => toggle("eq")} icon={<Music size={12} />} />
      {!collapsed.eq && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="flex flex-wrap gap-1.5">
            {EQ_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => updateAudio({ eqPreset: preset.id })}
                className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors ${
                  selectedItem.audio.eqPreset === preset.id
                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Redutor de Ruído */}
      <SectionHeader label="Redutor de Ruído" collapsed={collapsed.denoise} onToggle={() => toggle("denoise")} icon={<MicOff size={12} />} />
      {!collapsed.denoise && (
        <div className="p-3 border-b border-[#1a1a28]">
          <button
            onClick={() => updateAudio({ denoise: !selectedItem.audio.denoise })}
            className={`w-full flex items-center justify-between px-3 py-2 rounded border text-xs transition-colors ${
              selectedItem.audio.denoise
                ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                : "bg-[#13131f] border-[#1e1e2e] text-gray-400"
            }`}
          >
            <span>{selectedItem.audio.denoise ? "Ativado" : "Desativado"}</span>
            <div
              className={`w-8 h-4 rounded-full transition-colors relative ${
                selectedItem.audio.denoise ? "bg-[#8b5cf6]" : "bg-[#1e1e2e]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  selectedItem.audio.denoise ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>
      )}

      {/* Gravador de Voz */}
      <SectionHeader label="Gravador de Voz" collapsed={collapsed.recorder} onToggle={() => toggle("recorder")} icon={<Mic size={12} />} />
      {!collapsed.recorder && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-red-500 animate-pulse"
                  : "bg-[#1e1e2e] hover:bg-[#2a2a3e]"
              }`}
            >
              {isRecording ? <Square size={18} className="text-white" /> : <Mic size={18} className="text-gray-400" />}
            </button>
            {isRecording && (
              <span className="text-xs text-red-400 font-mono">{formatTime(recordingTime)}</span>
            )}
            <span className="text-[10px] text-gray-600">
              {isRecording ? "Clique para parar" : "Clique para gravar"}
            </span>
          </div>
        </div>
      )}

      {/* Extrair Áudio */}
      <SectionHeader label="Extrair Áudio" collapsed={collapsed.extract} onToggle={() => toggle("extract")} icon={<Download size={12} />} />
      {!collapsed.extract && (
        <div className="p-3 border-b border-[#1a1a28]">
          <button
            onClick={extractAudio}
            disabled={selectedItem.kind !== "video"}
            className={`w-full px-3 py-2 rounded border text-xs transition-colors flex items-center justify-center gap-2 ${
              selectedItem.kind === "video"
                ? "bg-[#13131f] border-[#1e1e2e] text-gray-300 hover:border-[#8b5cf6]"
                : "bg-[#0d0d16] border-[#1e1e2e] text-gray-600 cursor-not-allowed"
            }`}
          >
            <Download size={12} />
            Extrair Áudio do Vídeo
          </button>
          {selectedItem.kind !== "video" && (
            <p className="text-[10px] text-gray-600 mt-1.5 text-center">
              Selecione um item de vídeo
            </p>
          )}
        </div>
      )}

      {/* Biblioteca de Efeitos Sonoros */}
      <SectionHeader label="Biblioteca de Efeitos Sonoros" collapsed={collapsed.sfx} onToggle={() => toggle("sfx")} icon={<Music size={12} />} />
      {!collapsed.sfx && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="grid grid-cols-2 gap-2">
            {SOUND_CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="bg-[#13131f] border border-[#1e1e2e] rounded p-3 flex flex-col items-center gap-1.5 text-center"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-[10px] text-gray-400">{cat.label}</span>
                <span className="text-[9px] text-gray-600 italic">Em breve</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  label,
  collapsed,
  onToggle,
  icon,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#13131f] transition-colors"
    >
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[10px] text-gray-600">{collapsed ? "▶" : "▼"}</span>
    </button>
  );
}
