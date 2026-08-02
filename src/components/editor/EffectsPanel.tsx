"use client";

import { useState } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, ClipFilters, FilterPreset, BlendMode, ClipMask, ChromaKey, VideoEffect, HSLAdjustment } from "@/lib/editor";
import { DEFAULT_FILTERS, DEFAULT_MASK, DEFAULT_CHROMA_KEY, FILTER_PRESETS, HSL_COLORS, VIDEO_EFFECTS } from "@/lib/editor";
import { generateId } from "@/lib/editor";
import { Sparkles, Eye, EyeOff, Plus, Trash2, Palette } from "lucide-react";

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
  { value: "hard-light", label: "Hard Light" },
  { value: "soft-light", label: "Soft Light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
];

const MASK_SHAPES = ["circle", "rectangle", "diamond", "film"] as const;

export default function EffectsPanel() {
  const { project, updateItem, setFilterPreset, setBlendMode, setMask, setChromaKey, addEffect, removeEffect, toggleEffect } = useProjectStore();
  const { selectedIds } = useUIStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  const toggle = (section: string) => setCollapsed((p) => ({ ...p, [section]: !p[section] }));

  if (!selectedItem) {
    return (
      <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e1e2e]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} /> Efeitos
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs px-4 text-center">
          Selecione um item na timeline
        </div>
      </div>
    );
  }

  const updateFilters = (patch: Partial<ClipFilters>) => {
    updateItem(selectedItem.id, { filters: { ...DEFAULT_FILTERS, ...selectedItem.filters, ...patch } });
  };

  const updateHSL = (color: string, patch: Partial<HSLAdjustment>) => {
    const existing = (selectedItem.hsl ?? {})[color] || { hue: 0, saturation: 0, luminance: 0 };
    updateItem(selectedItem.id, { hsl: { ...(selectedItem.hsl ?? {}), [color]: { ...existing, ...patch } } });
  };

  const applyFilterPreset = (preset: FilterPreset) => {
    setFilterPreset(selectedItem.id, preset);
    const values = FILTER_PRESETS[preset];
    updateItem(selectedItem.id, { filters: { ...DEFAULT_FILTERS, ...selectedItem.filters, ...values } });
  };

  const handleAddEffect = (effectType: VideoEffect["type"]) => {
    const effect: VideoEffect = {
      id: generateId(),
      type: effectType,
      intensity: 0.5,
      speed: 1,
      color: "#ffffff",
      enabled: true,
    };
    addEffect(selectedItem.id, effect);
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={12} /> Efeitos
        </h3>
      </div>

      <div className="p-3 space-y-0.5">
        {/* Ajustes Manuais */}
        <SectionHeader title="Ajustes Manuais" collapsed={!!collapsed["manual"]} onToggle={() => toggle("manual")} />
        {!collapsed["manual"] && (
          <div className="p-3 border-b border-[#1a1a28] space-y-2">
            <Slider label="Brilho" value={(selectedItem.filters?.brightness ?? 0)} onChange={(v) => updateFilters({ brightness: v })} min={-1} max={1} step={0.05} />
            <Slider label="Contraste" value={(selectedItem.filters?.contrast ?? 1)} onChange={(v) => updateFilters({ contrast: v })} min={0} max={3} step={0.05} />
            <Slider label="Saturação" value={(selectedItem.filters?.saturation ?? 1)} onChange={(v) => updateFilters({ saturation: v })} min={0} max={3} step={0.05} />
            <Slider label="Matiz" value={(selectedItem.filters?.hue ?? 0)} onChange={(v) => updateFilters({ hue: v })} min={-180} max={180} step={1} />
            <Slider label="Exposição" value={(selectedItem.filters?.exposure ?? 0)} onChange={(v) => updateFilters({ exposure: v })} min={-2} max={2} step={0.05} />
            <Slider label="Realces" value={(selectedItem.filters?.highlights ?? 0)} onChange={(v) => updateFilters({ highlights: v })} min={-1} max={1} step={0.05} />
            <Slider label="Sombras" value={(selectedItem.filters?.shadows ?? 0)} onChange={(v) => updateFilters({ shadows: v })} min={-1} max={1} step={0.05} />
            <Slider label="Temperatura" value={(selectedItem.filters?.temperature ?? 0)} onChange={(v) => updateFilters({ temperature: v })} min={-50} max={50} step={1} />
            <Slider label="Blur" value={(selectedItem.filters?.blur ?? 0)} onChange={(v) => updateFilters({ blur: v })} min={0} max={20} step={0.5} />
          </div>
        )}

        {/* HSL */}
        <SectionHeader title="HSL" collapsed={!!collapsed["hsl"]} onToggle={() => toggle("hsl")} />
        {!collapsed["hsl"] && (
          <div className="p-3 border-b border-[#1a1a28] space-y-3">
            {HSL_COLORS.map((color) => {
              const adj = (selectedItem.hsl ?? {})[color] || { hue: 0, saturation: 0, luminance: 0 };
              return (
                <div key={color}>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 capitalize">{color}</div>
                  <div className="space-y-1.5">
                    <Slider label="Hue" value={adj.hue} onChange={(v) => updateHSL(color, { hue: v })} min={-180} max={180} step={1} />
                    <Slider label="Sat" value={adj.saturation} onChange={(v) => updateHSL(color, { saturation: v })} min={-1} max={1} step={0.05} />
                    <Slider label="Lum" value={adj.luminance} onChange={(v) => updateHSL(color, { luminance: v })} min={-1} max={1} step={0.05} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtros */}
        <SectionHeader title="Filtros" collapsed={!!collapsed["filters"]} onToggle={() => toggle("filters")} />
        {!collapsed["filters"] && (
          <div className="p-3 border-b border-[#1a1a28]">
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(FILTER_PRESETS).map((preset) => {
                const p = preset as FilterPreset;
                const isActive = selectedItem.filterPreset === p;
                return (
                  <button
                    key={p}
                    onClick={() => applyFilterPreset(p)}
                    className={`px-2 py-1.5 text-[10px] rounded border text-center ${
                      isActive
                        ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                        : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                    }`}
                  >
                    {p === "none" ? "Nenhum" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Vinheta e Granulação */}
        <SectionHeader title="Vinheta e Granulação" collapsed={!!collapsed["vignette"]} onToggle={() => toggle("vignette")} />
        {!collapsed["vignette"] && (
          <div className="p-3 border-b border-[#1a1a28] space-y-2">
            <Slider label="Vinheta" value={(selectedItem.filters?.vignette ?? 0)} onChange={(v) => updateFilters({ vignette: v })} min={0} max={1} step={0.05} />
            <Slider label="Suavidade Vinheta" value={(selectedItem.filters?.vignetteSoftness ?? 50)} onChange={(v) => updateFilters({ vignetteSoftness: v })} min={0} max={100} step={1} />
            <Slider label="Grão" value={(selectedItem.filters?.grain ?? 0)} onChange={(v) => updateFilters({ grain: v })} min={0} max={1} step={0.05} />
            <Slider label="Tamanho Grão" value={(selectedItem.filters?.grainSize ?? 50)} onChange={(v) => updateFilters({ grainSize: v })} min={0} max={100} step={1} />
          </div>
        )}

        {/* Modo de Mistura */}
        <SectionHeader title="Modo de Mistura" collapsed={!!collapsed["blend"]} onToggle={() => toggle("blend")} />
        {!collapsed["blend"] && (
          <div className="p-3 border-b border-[#1a1a28]">
            <div className="grid grid-cols-3 gap-1.5">
              {BLEND_MODES.map((mode) => {
                const isActive = selectedItem.blendMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    onClick={() => setBlendMode(selectedItem.id, mode.value)}
                    className={`px-2 py-1.5 text-[10px] rounded border text-center ${
                      isActive
                        ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                        : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Máscara */}
        <SectionHeader title="Máscara" collapsed={!!collapsed["mask"]} onToggle={() => toggle("mask")} />
        {!collapsed["mask"] && (
          <div className="p-3 border-b border-[#1a1a28] space-y-2">
            <ToggleRow label="Ativar Máscara" value={(selectedItem.mask?.enabled ?? false)} onChange={(v) => setMask(selectedItem.id, { enabled: v })} />
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Forma</label>
              <select
                value={(selectedItem.mask?.shape ?? "circle")}
                onChange={(e) => setMask(selectedItem.id, { shape: e.target.value as ClipMask["shape"] })}
                className="w-full bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              >
                {MASK_SHAPES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <Slider label="X" value={(selectedItem.mask?.x ?? 50)} onChange={(v) => setMask(selectedItem.id, { x: v })} min={0} max={100} step={1} />
            <Slider label="Y" value={(selectedItem.mask?.y ?? 50)} onChange={(v) => setMask(selectedItem.id, { y: v })} min={0} max={100} step={1} />
            <Slider label="Largura" value={(selectedItem.mask?.width ?? 80)} onChange={(v) => setMask(selectedItem.id, { width: v })} min={0} max={100} step={1} />
            <Slider label="Altura" value={(selectedItem.mask?.height ?? 80)} onChange={(v) => setMask(selectedItem.id, { height: v })} min={0} max={100} step={1} />
            <Slider label="Rotação" value={(selectedItem.mask?.rotation ?? 0)} onChange={(v) => setMask(selectedItem.id, { rotation: v })} min={0} max={360} step={1} />
            <Slider label="Pena" value={(selectedItem.mask?.feather ?? 0)} onChange={(v) => setMask(selectedItem.id, { feather: v })} min={0} max={100} step={1} />
            <ToggleRow label="Inverter" value={(selectedItem.mask?.invert ?? false)} onChange={(v) => setMask(selectedItem.id, { invert: v })} />
          </div>
        )}

        {/* Chroma Key */}
        <SectionHeader title="Chroma Key" collapsed={!!collapsed["chroma"]} onToggle={() => toggle("chroma")} />
        {!collapsed["chroma"] && (
          <div className="p-3 border-b border-[#1a1a28] space-y-2">
            <ToggleRow label="Ativar Chroma Key" value={(selectedItem.chromaKey?.enabled ?? false)} onChange={(v) => setChromaKey(selectedItem.id, { enabled: v })} />
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Cor</label>
              <input
                type="color"
                value={(selectedItem.chromaKey?.color ?? "#00ff00")}
                onChange={(e) => setChromaKey(selectedItem.id, { color: e.target.value })}
                className="w-full h-7 bg-[#13131f] border border-[#1e1e2e] rounded cursor-pointer"
              />
            </div>
            <Slider label="Intensidade" value={(selectedItem.chromaKey?.intensity ?? 0.5)} onChange={(v) => setChromaKey(selectedItem.id, { intensity: v })} min={0} max={1} step={0.05} />
            <Slider label="Sombra" value={(selectedItem.chromaKey?.shadow ?? 0)} onChange={(v) => setChromaKey(selectedItem.id, { shadow: v })} min={0} max={1} step={0.05} />
            <Slider label="Pena" value={(selectedItem.chromaKey?.feather ?? 0)} onChange={(v) => setChromaKey(selectedItem.id, { feather: v })} min={0} max={20} step={0.5} />
            <Slider label="Spill" value={(selectedItem.chromaKey?.spill ?? 0)} onChange={(v) => setChromaKey(selectedItem.id, { spill: v })} min={0} max={1} step={0.05} />
          </div>
        )}

        {/* Efeitos de Vídeo */}
        <SectionHeader title="Efeitos de Vídeo" collapsed={!!collapsed["effects"]} onToggle={() => toggle("effects")} />
        {!collapsed["effects"] && (
          <div className="p-3 border-b border-[#1a1a28] space-y-3">
            <div className="grid grid-cols-3 gap-1.5">
              {VIDEO_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  onClick={() => handleAddEffect(effect.id)}
                  className="bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1.5 text-[10px] text-gray-400 hover:border-[#8b5cf6] flex flex-col items-center gap-0.5"
                >
                  <span className="text-sm">{effect.icon}</span>
                  <span>{effect.label}</span>
                </button>
              ))}
            </div>

            {(selectedItem.effects?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Ativos</div>
                {(selectedItem.effects ?? []).map((effect) => (
                  <div key={effect.id} className="bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-300">{VIDEO_EFFECTS.find((e) => e.id === effect.type)?.label}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleEffect(selectedItem.id, effect.id)} className="p-0.5 text-gray-500 hover:text-white">
                        {effect.enabled ? <Eye size={10} /> : <EyeOff size={10} />}
                      </button>
                      <button onClick={() => removeEffect(selectedItem.id, effect.id)} className="p-0.5 text-gray-500 hover:text-red-400">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, collapsed, onToggle }: { title: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-1 py-2 hover:bg-[#13131f] rounded"
    >
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{title}</span>
      <span className="text-[10px] text-gray-600">{collapsed ? "+" : "−"}</span>
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] text-gray-500">{label}</label>
        <span className="text-[10px] text-gray-600 font-mono">{Math.round(value * 100) / 100}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1 bg-[#1e1e2e] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
      />
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-[10px] text-gray-500">{label}</label>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full transition-colors ${value ? "bg-[#8b5cf6]" : "bg-[#1e1e2e]"}`}
      >
        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
