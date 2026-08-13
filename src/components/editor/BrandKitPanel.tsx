"use client";

import { useProjectStore } from "@/lib/editor";
import type { BrandColors, TimelineItem } from "@/lib/editor";
import { DEFAULT_BRAND_KIT, DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, generateId } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import { Type, Palette, RefreshCw, Plus } from "lucide-react";

const FONTS = ["Inter", "Arial", "Georgia", "Montserrat", "Poppins", "Roboto", "Lato"];

const COLOR_KEYS: { key: keyof BrandColors; label: string }[] = [
  { key: "primary", label: "Primária" },
  { key: "secondary", label: "Secundária" },
  { key: "accent", label: "Realce" },
  { key: "text", label: "Texto" },
];

export default function BrandKitPanel() {
  const { project, setBrandKit, addItem } = useProjectStore();
  const bk = project.brandKit || { ...DEFAULT_BRAND_KIT };

  const setColors = (key: keyof BrandColors, value: string) =>
    setBrandKit({ colors: { ...bk.colors, [key]: value } });

  const applyBrandToText = () => {
    const textTrack = Object.values(project.timeline.tracks).find((t) => t.kind === "text");
    if (!textTrack) return;

    const newItem: TimelineItem = {
      id: generateId(),
      trackId: textTrack.id,
      startFrame: 0,
      durationInFrames: 90,
      name: "Texto da marca",
      kind: "text",
      text: {
        content: bk.brandName || "Nome da Marca",
        fontFamily: bk.font,
        color: bk.colors.text,
        fontSize: 72,
        fontWeight: "bold",
        fontStyle: "normal",
        textAlign: "center",
        backgroundColor: bk.colors.primary,
        backgroundOpacity: 0.35,
        x: 50,
        y: 50,
        strokeWidth: 2,
        strokeColor: bk.colors.secondary,
        strokeEnabled: false,
        shadowColor: "rgba(0,0,0,0.5)",
        shadowBlur: 8,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowEnabled: false,
        stylePreset: "none",
        gradient: { enabled: false, color1: bk.colors.primary, color2: bk.colors.secondary, angle: 90 },
        lineHeight: 1.2,
        letterSpacing: 0,
      },
      transform: { ...DEFAULT_TRANSFORM },
      filters: { ...DEFAULT_FILTERS },
      hsl: {},
      filterPreset: "none",
      crop: { ...DEFAULT_CROP },
      mask: { ...DEFAULT_MASK },
      chromaKey: { ...DEFAULT_CHROMA_KEY },
      blendMode: "normal",
      speed: { ...DEFAULT_SPEED },
      animation: { ...DEFAULT_ANIMATION },
      audio: { ...DEFAULT_AUDIO },
      effects: [],
      keyframes: {},
    };
    withHistory("Adicionar texto da marca", () => addItem(newItem));
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Marca (Brand Kit)
        </h3>
        <p className="text-[10px] text-gray-600 mt-0.5">Identidade visual aplicada aos novos textos · Clipchamp style</p>
      </div>

      <div className="p-3 space-y-4">
        <div>
          <label className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider">
            <Type size={11} /> Nome da marca
          </label>
          <input
            value={bk.brandName}
            onChange={(e) => setBrandKit({ brandName: e.target.value })}
            placeholder="Ex: Nexia Studio"
            className="w-full mt-1 bg-[#13131f] border border-[#1e1e2e] rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-[#8b5cf6]"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Fonte padrão</label>
          <select
            value={bk.font}
            onChange={(e) => setBrandKit({ font: e.target.value })}
            className="w-full mt-1 bg-[#13131f] border border-[#1e1e2e] rounded-lg px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-[#8b5cf6]"
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
            <Palette size={11} /> Cores da marca
          </label>
          <div className="space-y-1.5">
            {COLOR_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={bk.colors[key]}
                  onChange={(e) => setColors(key, e.target.value)}
                  className="w-8 h-8 rounded bg-transparent cursor-pointer border border-[#1e1e2e]"
                />
                <div className="flex-1">
                  <div className="text-[10px] text-gray-400">{label}</div>
                  <div className="text-[10px] font-mono text-gray-600">{bk.colors[key]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setBrandKit({ colors: { ...DEFAULT_BRAND_KIT.colors }, font: DEFAULT_BRAND_KIT.font })}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-[#1e1e2e] text-gray-300 text-xs hover:bg-[#2a2a3a] transition-colors"
        >
          <RefreshCw size={12} /> Restaurar padrão
        </button>

        <button
          onClick={applyBrandToText}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-[#8b5cf6] text-white text-xs hover:bg-[#7c3aed] transition-colors"
        >
          <Plus size={12} /> Adicionar texto da marca
        </button>
      </div>
    </div>
  );
}