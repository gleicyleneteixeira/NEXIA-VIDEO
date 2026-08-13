"use client";

import { useState } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import type { TimelineItem } from "@/lib/editor";
import {
  DEFAULT_AUDIO,
  DEFAULT_TRANSFORM,
  DEFAULT_FILTERS,
  generateId,
} from "@/lib/editor";
import { usePlaybackStore } from "@/lib/editor";
import { Play, Square, Plus, Loader2 } from "lucide-react";
import { persistStandaloneMedia } from "@/lib/editor/media-persistence";

const LANGUAGES = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "pt-PT", label: "Português (Portugal)" },
];

export default function TTSPanel() {
  const { project, addItem } = useProjectStore();
  const { currentTime } = usePlaybackStore();

  const [text, setText] = useState("");
  const [lang, setLang] = useState("pt-BR");
  const [generating, setGenerating] = useState(false);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fps = project.timeline.fps;

  const generateAudio = async (): Promise<string | null> => {
    setError(null);
    try {
      const res = await fetch("/api/editor/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erro ao gerar voz");
        return null;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      return url;
    } catch (e) {
      setError("Falha de rede ao gerar narração");
      return null;
    }
  };

  const preview = async () => {
    if (!text.trim()) return;
    const url = await generateAudio();
    if (url) setPlayUrl(url);
  };

  const addToTimeline = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    try {
      const url = await generateAudio();
      if (!url) return;

      const duration = await getAudioDuration(url);
      const file = await blobFromUrl(url, lang);

      const audioTrack = Object.values(project.timeline.tracks).find(
        (t) => t.kind === "audio"
      );
      if (!audioTrack) return;

      const lastEnd =
        project.timeline.items
          .filter((i) => i.trackId === audioTrack.id)
          .reduce((max, i) => Math.max(max, i.startFrame + i.durationInFrames), 0);
      const startFrame = Math.max(Math.round(currentTime * fps), lastEnd);

      const newItem: TimelineItem = {
        id: generateId(),
        trackId: audioTrack.id,
        startFrame,
        durationInFrames: Math.max(1, Math.round(duration * fps)),
        name: `Narração (${lang})`,
        kind: "audio",
        src: url,
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
      withHistory("Adicionar narração", () => addItem(newItem));
      setPlayUrl(null);
    } finally {
      setGenerating(false);
    }
  };

  const blobFromUrl = async (url: string, lang: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], `narracao-${lang.toLowerCase()}.mp3`, { type: "audio/mpeg" });
  };

  const getAudioDuration = (url: string) =>
    new Promise<number>((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => resolve(a.duration || 0);
      a.onerror = () => resolve(0);
      a.src = url;
    });

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Texto para Voz
        </h3>
        <p className="text-[10px] text-gray-600 mt-0.5">Gera narração a partir do texto · Clipchamp style</p>
      </div>

      <div className="p-3 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite o texto da narração..."
          rows={5}
          className="w-full bg-[#13131f] border border-[#1e1e2e] rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-[#8b5cf6] resize-none"
        />

        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Idioma / Voz</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full mt-1 bg-[#13131f] border border-[#1e1e2e] rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-[#8b5cf6]"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-[10px] text-red-400">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={preview}
            disabled={!text.trim() || generating}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1e1e2e] text-gray-300 text-xs hover:bg-[#2a2a3a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={12} /> Ouvir
          </button>
          <button
            onClick={addToTimeline}
            disabled={!text.trim() || generating}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#8b5cf6] text-white text-xs hover:bg-[#7c3aed] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Adicionar
          </button>
        </div>

        {playUrl && (
          <div className="bg-[#13131f] border border-[#1e1e2e] rounded-lg p-2">
            <audio src={playUrl} controls autoPlay className="w-full h-8" />
          </div>
        )}
      </div>
    </div>
  );
}