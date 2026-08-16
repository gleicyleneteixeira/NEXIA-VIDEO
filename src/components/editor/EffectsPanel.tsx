"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, ClipFilters, FilterPreset, BlendMode, ClipMask, ChromaKey, VideoEffect, HSLAdjustment } from "@/lib/editor";
import { DEFAULT_FILTERS, DEFAULT_MASK, DEFAULT_CHROMA_KEY, FILTER_PRESETS, HSL_COLORS, VIDEO_EFFECTS } from "@/lib/editor";
import { generateId } from "@/lib/editor";
import { Sparkles, Eye, EyeOff, Plus, Trash2, Palette, Droplet, Scissors, Brush, Eraser } from "lucide-react";

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
  const { project, updateItem, setFilterPreset, setBlendMode, setMask, setChromaKey, setAutoCutout, setManualMask, addEffect, removeEffect, toggleEffect } = useProjectStore();
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

  // Flag dos modos de remoção de fundo (mutuamente exclusivos).
  const chromaOn = selectedItem.chromaKey?.enabled ?? false;
  const autoOn = selectedItem.autoCutout?.enabled ?? false;
  const manualOn = selectedItem.manualMask?.enabled ?? false;
  const eraserOn = selectedItem.manualMask?.eraser ?? false;
  const hasManualMask = !!selectedItem.manualMask?.url;

  const activateCutoutMode = (mode: "auto" | "manual" | "chroma") => {
    const id = selectedItem.id;
    if (mode === "auto") setAutoCutout(id, { enabled: true });
    else if (mode === "manual") setManualMask(id, { enabled: true });
    else setChromaKey(id, { enabled: true });
    if (mode !== "auto") setAutoCutout(id, { enabled: false });
    if (mode !== "manual") setManualMask(id, { enabled: false });
    if (mode !== "chroma") setChromaKey(id, { enabled: false });
  };

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

        {/* Remoção de Fundo */}
        <SectionHeader icon={<Scissors size={11} />} title="Remover Fundo" collapsed={!!collapsed["bgRemove"]} onToggle={() => toggle("bgRemove")} />
        {!collapsed["bgRemove"] && (
          <div className="p-3 border-b border-[#1a1a28] space-y-2">
            {/* 1. Recorte Automático (IA) */}
            <div className={`p-2.5 rounded-lg border transition-colors ${autoOn ? "border-[#8b5cf6]/40 bg-[#8b5cf6]/5" : "border-[#1e1e2e] bg-[#13131f]"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className={`text-[11px] font-medium flex items-center gap-1.5 ${autoOn ? "text-purple-300" : "text-gray-200"}`}>
                    <Scissors size={11} /> Recorte Automático
                  </div>
                  <div className="text-[10px] text-gray-500">Remove o fundo de pessoas via IA</div>
                </div>
                <Switch checked={autoOn} onChange={(v) => (v ? activateCutoutMode("auto") : setAutoCutout(selectedItem.id, { enabled: false }))} />
              </div>

              {autoOn && (
                <div className="mt-2.5 space-y-2 pt-2.5 border-t border-[#1e1e2e]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Slider
                        label="Pena (borda)"
                        value={selectedItem.autoCutout?.feather ?? 0}
                        onChange={(v) => setAutoCutout(selectedItem.id, { feather: v })}
                        min={0}
                        max={20}
                        step={1}
                      />
                    </div>
                    <button
                      onClick={() => setAutoCutout(selectedItem.id, { feather: (selectedItem.autoCutout?.feather ?? 0) === 0 ? 6 : 0 })}
                      className="shrink-0 h-8 px-2.5 rounded border border-[#1e1e2e] bg-[#13131f] text-gray-400 hover:text-white text-[10px]"
                      title="Alternar pena padrão"
                    >
                      Auto
                    </button>
                  </div>
                  <ToggleRow
                    label="Inverter máscara"
                    value={selectedItem.autoCutout?.inverted ?? false}
                    onChange={(v) => setAutoCutout(selectedItem.id, { inverted: v })}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-400">Modelo</span>
                    <div className="flex rounded-md overflow-hidden border border-[#1e1e2e]">
                      {([0, 1] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setAutoCutout(selectedItem.id, { modelSelection: m })}
                          className={`px-2.5 py-1 text-[10px] transition-colors ${
                            (selectedItem.autoCutout?.modelSelection ?? 0) === m
                              ? "bg-[#8b5cf6]/20 text-purple-300"
                              : "bg-[#13131f] text-gray-400 hover:text-white"
                          }`}
                        >
                          {m === 0 ? "Rápido" : "Detalhado"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-gray-500">
                    Segmentação 100% local (MediaPipe, ~10 FPS no preview).{" "}
                    {selectedItem.autoCutout?.modelSelection === 1
                      ? "Modelo detalhado — melhor nas bordas, mais pesado."
                      : "Modelo geral — rápido e otimizado para tempo real."}
                  </p>
                </div>
              )}
            </div>

            {/* 2. Recorte Personalizado (Pincel & Borracha) */}
            <div className={`p-2.5 rounded-lg border transition-colors ${manualOn ? "border-[#22d3ee]/40 bg-[#22d3ee]/5" : "border-[#1e1e2e] bg-[#13131f]"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className={`text-[11px] font-medium flex items-center gap-1.5 ${manualOn ? "text-cyan-300" : "text-gray-200"}`}>
                    <Brush size={11} /> Recorte Personalizado
                  </div>
                  <div className="text-[10px] text-gray-500">Pinte áreas manuais para manter ou apagar</div>
                </div>
                <button
                  onClick={() => (manualOn ? setManualMask(selectedItem.id, { enabled: false }) : activateCutoutMode("manual"))}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] flex items-center gap-1 border transition-colors ${
                    manualOn
                      ? "bg-[#22d3ee]/20 border-[#22d3ee]/50 text-cyan-300"
                      : "bg-[#1a1a28] border-[#1e1e2e] text-gray-300 hover:border-[#22d3ee]/50 hover:text-white"
                  }`}
                >
                  <Brush size={11} /> {manualOn ? "Desativar" : "Pincel"}
                </button>
              </div>

              {manualOn && (
                <div className="mt-2.5 space-y-2 pt-2.5 border-t border-[#1e1e2e]">
                  <Slider
                    label="Tamanho do pincel"
                    value={selectedItem.manualMask?.radius ?? 32}
                    onChange={(v) => setManualMask(selectedItem.id, { radius: v })}
                    min={4}
                    max={120}
                    step={2}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-400">Ferramenta</span>
                    <div className="flex rounded-md overflow-hidden border border-[#1e1e2e]">
                      <button
                        onClick={() => setManualMask(selectedItem.id, { eraser: false })}
                        className={`px-2.5 py-1 text-[10px] flex items-center gap-1 transition-colors ${eraserOn ? "bg-[#13131f] text-gray-400 hover:text-white" : "bg-[#22d3ee]/20 text-cyan-300"}`}
                      >
                        <Brush size={10} /> Pincel
                      </button>
                      <button
                        onClick={() => setManualMask(selectedItem.id, { eraser: true })}
                        className={`px-2.5 py-1 text-[10px] flex items-center gap-1 transition-colors ${eraserOn ? "bg-rose-500/20 text-rose-300" : "bg-[#13131f] text-gray-400 hover:text-white"}`}
                      >
                        <Eraser size={10} /> Borracha
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-gray-500">
                    Desenhe direto no clipe:
                    <span className="text-cyan-300"> pincel</span> mostra,{" "}
                    <span className="text-rose-300">borracha</span> esconde. O clipe começa inteiro visível.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">{hasManualMask ? "Máscara salva" : "Máscara em branco"}</span>
                    <button
                      onClick={() => setManualMask(selectedItem.id, { url: undefined })}
                      className="px-2 py-1 rounded border border-[#1e1e2e] bg-[#13131f] text-gray-400 hover:text-white text-[10px]"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Chroma Key */}
            <div className={`p-2.5 rounded-lg border transition-colors ${chromaOn ? "border-[#8b5cf6]/40 bg-[#8b5cf6]/5" : "border-[#1e1e2e] bg-[#13131f]"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className={`text-[11px] font-medium flex items-center gap-1.5 ${chromaOn ? "text-purple-300" : "text-gray-200"}`}>
                    <Droplet size={11} /> Chroma Key
                  </div>
                  <div className="text-[10px] text-gray-500">Remove fundo sólido por cor</div>
                </div>
                <Switch checked={chromaOn} onChange={(v) => (v ? activateCutoutMode("chroma") : setChromaKey(selectedItem.id, { enabled: false }))} />
              </div>

              {chromaOn && (
                <div className="mt-2.5 space-y-2 pt-2.5 border-t border-[#1e1e2e]">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedItem.chromaKey?.targetColor ?? "#00ff00"}
                      onChange={(e) => setChromaKey(selectedItem.id, { targetColor: e.target.value })}
                      className="w-full h-8 bg-[#13131f] border border-[#1e1e2e] rounded cursor-pointer"
                    />
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("chroma-pick-begin", { detail: { id: selectedItem.id } }))}
                      className="shrink-0 h-8 px-2.5 rounded border border-[#1e1e2e] bg-[#13131f] text-gray-400 hover:text-white hover:border-[#8b5cf6] text-[10px] flex items-center gap-1"
                      title="Clique no vídeo para escolher a cor"
                    >
                      <Droplet size={12} /> Conta-gotas
                    </button>
                  </div>
                  <Slider label="Intensidade" value={selectedItem.chromaKey?.similarity ?? 0.45} onChange={(v) => setChromaKey(selectedItem.id, { similarity: v })} min={0} max={1} step={0.01} />
                  <Slider label="Suavização" value={selectedItem.chromaKey?.smoothness ?? 0.08} onChange={(v) => setChromaKey(selectedItem.id, { smoothness: v })} min={0} max={1} step={0.01} />
                  <Slider label="Redução de Spill" value={selectedItem.chromaKey?.spillReduction ?? 0.5} onChange={(v) => setChromaKey(selectedItem.id, { spillReduction: v })} min={0} max={1} step={0.01} />
                </div>
              )}
            </div>
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

function SectionHeader({ icon, title, collapsed, onToggle }: { icon?: ReactNode; title: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-1 py-2 hover:bg-[#13131f] rounded"
    >
      <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon && <span className="text-gray-400">{icon}</span>}
        {title}
      </span>
      <span className="text-[10px] text-gray-600">{collapsed ? "+" : "−"}</span>
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-8 h-4 rounded-full transition-colors shrink-0 ${checked ? "bg-[#8b5cf6]" : "bg-[#1e1e2e]"}`}
    >
      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
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
      <Switch checked={value} onChange={onChange} />
    </div>
  );
}
