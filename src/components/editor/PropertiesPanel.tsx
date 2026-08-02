"use client";
import { useProjectStore, useUIStore, usePlaybackStore } from "@/lib/editor";
import type { TimelineItem, ClipTransform, ClipFilters, ClipCrop, ClipSpeed, TextProps, Keyframe, KeyframeProp } from "@/lib/editor";
import { DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_SPEED } from "@/lib/editor";
import { RotateCcw, Scissors, Copy, Trash2, FlipHorizontal, FlipVertical, RotateCw, Snowflake, Rewind, Crop } from "lucide-react";
import SpeedCurve from "./SpeedCurve";

export default function PropertiesPanel() {
  const { project, updateItem, removeItem, duplicateItem, splitItem, freezeFrame, reverseItem, mirrorItem, rotateItem, setKeyframe, removeKeyframe } = useProjectStore();
  const { selectedIds } = useUIStore();
  const { currentTime } = usePlaybackStore();

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  if (!selectedItem) {
    return (
      <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e1e2e]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Propriedades</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          Selecione um item
        </div>
      </div>
    );
  }

  const updateTransform = (patch: Partial<ClipTransform>) => {
    updateItem(selectedItem.id, {
      transform: { ...selectedItem.transform, ...patch },
    });
  };

  const updateFilters = (patch: Partial<ClipFilters>) => {
    updateItem(selectedItem.id, {
      filters: { ...DEFAULT_FILTERS, ...selectedItem.filters, ...patch },
    });
  };

  const updateCrop = (patch: Partial<ClipCrop>) => {
    updateItem(selectedItem.id, {
      crop: { ...DEFAULT_CROP, ...selectedItem.crop, ...patch },
    });
  };

  const updateSpeed = (patch: Partial<ClipSpeed>) => {
    updateItem(selectedItem.id, {
      speed: { ...DEFAULT_SPEED, ...selectedItem.speed, ...patch },
    });
  };

  const updateText = (patch: Partial<TextProps>) => {
    if (!selectedItem.text) return;
    updateItem(selectedItem.id, {
      text: { ...selectedItem.text, ...patch },
    });
  };

  const updateSticker = (patch: Partial<typeof selectedItem.sticker>) => {
    if (!selectedItem.sticker) return;
    updateItem(selectedItem.id, {
      sticker: { ...selectedItem.sticker, ...patch },
    });
  };

  const durationSec = (selectedItem.durationInFrames / project.timeline.fps).toFixed(2);

  const toggleKeyframe = (prop: KeyframeProp) => {
    const kfs = selectedItem.keyframes?.[prop] || [];
    const localFrame = Math.round(currentTime - selectedItem.startFrame);
    const existing = kfs.find((kf: Keyframe) => kf.frame === localFrame);
    if (existing) {
      removeKeyframe(selectedItem.id, prop, localFrame);
    } else {
      let value = 0;
      switch (prop) {
        case "x": value = selectedItem.transform.x; break;
        case "y": value = selectedItem.transform.y; break;
        case "scaleX": value = selectedItem.transform.scaleX; break;
        case "scaleY": value = selectedItem.transform.scaleY; break;
        case "rotation": value = selectedItem.transform.rotation; break;
        case "opacity": value = selectedItem.transform.opacity; break;
        case "brightness": value = selectedItem.filters.brightness ?? 0; break;
        case "contrast": value = selectedItem.filters.contrast ?? 1; break;
        case "saturation": value = selectedItem.filters.saturation ?? 1; break;
      }
      setKeyframe(selectedItem.id, prop, { frame: localFrame, value, easing: "easeInOut" });
    }
  };

  const hasKeyframeAtPlayhead = (prop: KeyframeProp): boolean => {
    const kfs = selectedItem.keyframes?.[prop] || [];
    const localFrame = Math.round(currentTime - selectedItem.startFrame);
    return kfs.some((kf: Keyframe) => kf.frame === localFrame);
  };

  const kindIcons: Record<string, string> = {
    video: "🎬", image: "🖼️", audio: "🎵", text: "📝", sticker: "🏷️", solid: "🎨", freeze: "❄️",
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto max-h-full">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Propriedades</h3>
      </div>

      <div className="p-3 border-b border-[#1a1a28]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Item Info</div>
        <div className="flex items-center gap-2">
          <span className="text-sm">{kindIcons[selectedItem.kind] || "📦"}</span>
          <span className="text-xs text-white flex-1 truncate">{selectedItem.name}</span>
          <span className="text-[10px] text-gray-500">{selectedItem.durationInFrames}f</span>
          <span className="text-[10px] text-gray-500">{durationSec}s</span>
        </div>
      </div>

      <div className="p-3 border-b border-[#1a1a28]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Ações Rápidas</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => splitItem(selectedItem.id, selectedItem.startFrame + Math.floor(selectedItem.durationInFrames / 2))}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Dividir"
          >
            <Scissors size={14} />
          </button>
          <button
            onClick={() => duplicateItem(selectedItem.id)}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Duplicar"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => removeItem(selectedItem.id)}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => freezeFrame(selectedItem.id, selectedItem.startFrame + Math.floor(selectedItem.durationInFrames / 2))}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Congelar Frame"
          >
            <Snowflake size={14} />
          </button>
          <button
            onClick={() => reverseItem(selectedItem.id)}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Inverter"
          >
            <Rewind size={14} />
          </button>
          <button
            onClick={() => mirrorItem(selectedItem.id, "h")}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Espelho Horizontal"
          >
            <FlipHorizontal size={14} />
          </button>
          <button
            onClick={() => mirrorItem(selectedItem.id, "v")}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Espelho Vertical"
          >
            <FlipVertical size={14} />
          </button>
          <button
            onClick={() => rotateItem(selectedItem.id, 90)}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400"
            title="Rotacionar 90°"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={() => updateItem(selectedItem.id, { transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, flipH: false, flipV: false } })}
            className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400 ml-auto"
            title="Resetar"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-[#1a1a28]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Keyframes</div>
        <div className="grid grid-cols-3 gap-1">
          {([
            ["x", "X"],
            ["y", "Y"],
            ["scaleX", "Esc X"],
            ["scaleY", "Esc Y"],
            ["rotation", "Rotação"],
            ["opacity", "Opacidade"],
          ] as [KeyframeProp, string][]).map(([prop, label]) => (
            <button
              key={prop}
              onClick={() => toggleKeyframe(prop)}
              className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-medium transition-colors ${
                hasKeyframeAtPlayhead(prop)
                  ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/50"
                  : "bg-[#1a1a28] text-gray-400 hover:bg-[#252535] border border-transparent"
              }`}
            >
              <span className={`text-xs ${hasKeyframeAtPlayhead(prop) ? "text-yellow-400" : "text-gray-500"}`}>◆</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-b border-[#1a1a28]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Transform</div>
        <div className="grid grid-cols-2 gap-2">
          <PropInput label="X" value={selectedItem.transform.x} onChange={(v) => updateTransform({ x: v })} step={1} />
          <PropInput label="Y" value={selectedItem.transform.y} onChange={(v) => updateTransform({ y: v })} step={1} />
          <PropInput label="ScaleX" value={selectedItem.transform.scaleX} onChange={(v) => updateTransform({ scaleX: v })} step={0.05} />
          <PropInput label="ScaleY" value={selectedItem.transform.scaleY} onChange={(v) => updateTransform({ scaleY: v })} step={0.05} />
          <PropInput label="Rotação" value={selectedItem.transform.rotation} onChange={(v) => updateTransform({ rotation: v })} step={1} />
          <PropSlider label="Opacidade" value={selectedItem.transform.opacity} onChange={(v) => updateTransform({ opacity: v })} min={0} max={1} step={0.05} />
        </div>
      </div>

      <div className="p-3 border-b border-[#1a1a28]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Crop</div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-[10px] text-gray-500">Ativar</label>
          <input
            type="checkbox"
            checked={(selectedItem.crop?.enabled ?? false)}
            onChange={(e) => updateCrop({ enabled: e.target.checked })}
            className="accent-[#8b5cf6]"
          />
        </div>
        {(selectedItem.crop?.enabled ?? false) && (
          <div className="space-y-2">
            <PropSlider label="Topo" value={(selectedItem.crop?.top ?? 0)} onChange={(v) => updateCrop({ top: v })} min={0} max={100} step={1} />
            <PropSlider label="Direita" value={(selectedItem.crop?.right ?? 0)} onChange={(v) => updateCrop({ right: v })} min={0} max={100} step={1} />
            <PropSlider label="Baixo" value={(selectedItem.crop?.bottom ?? 0)} onChange={(v) => updateCrop({ bottom: v })} min={0} max={100} step={1} />
            <PropSlider label="Esquerda" value={(selectedItem.crop?.left ?? 0)} onChange={(v) => updateCrop({ left: v })} min={0} max={100} step={1} />
          </div>
        )}
      </div>

      {selectedItem.kind !== "audio" && selectedItem.kind !== "text" && selectedItem.kind !== "sticker" && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Velocidade</div>
          <div className="space-y-2">
            <PropSlider label="Taxa" value={(selectedItem.speed?.rate ?? 1)} onChange={(v) => updateSpeed({ rate: v })} min={0.25} max={4} step={0.05} />
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500">Inverter</label>
              <input
                type="checkbox"
                checked={(selectedItem.speed?.reverse ?? false)}
                onChange={(e) => updateSpeed({ reverse: e.target.checked })}
                className="accent-[#8b5cf6]"
              />
            </div>
            <SpeedCurve
              points={(selectedItem.speed?.curve ?? [])}
              durationInFrames={selectedItem.durationInFrames}
              onChange={(curve) => updateSpeed({ curve })}
            />
          </div>
        </div>
      )}

      {selectedItem.kind !== "audio" && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Filtros</div>
          <div className="space-y-2">
            <PropSlider label="Brilho" value={(selectedItem.filters?.brightness ?? 0)} onChange={(v) => updateFilters({ brightness: v })} min={-1} max={1} step={0.05} />
            <PropSlider label="Contraste" value={(selectedItem.filters?.contrast ?? 1)} onChange={(v) => updateFilters({ contrast: v })} min={0} max={3} step={0.05} />
            <PropSlider label="Saturação" value={(selectedItem.filters?.saturation ?? 1)} onChange={(v) => updateFilters({ saturation: v })} min={0} max={3} step={0.05} />
            <PropSlider label="Matiz" value={(selectedItem.filters?.hue ?? 0)} onChange={(v) => updateFilters({ hue: v })} min={-180} max={180} step={1} />
            <PropSlider label="Blur" value={(selectedItem.filters?.blur ?? 0)} onChange={(v) => updateFilters({ blur: v })} min={0} max={20} step={0.5} />
            <PropSlider label="Temperatura" value={(selectedItem.filters?.temperature ?? 0)} onChange={(v) => updateFilters({ temperature: v })} min={-100} max={100} step={1} />
            <PropSlider label="Exposição" value={(selectedItem.filters?.exposure ?? 0)} onChange={(v) => updateFilters({ exposure: v })} min={-1} max={1} step={0.05} />
            <PropSlider label="Realces" value={(selectedItem.filters?.highlights ?? 0)} onChange={(v) => updateFilters({ highlights: v })} min={-1} max={1} step={0.05} />
            <PropSlider label="Sombras" value={(selectedItem.filters?.shadows ?? 0)} onChange={(v) => updateFilters({ shadows: v })} min={-1} max={1} step={0.05} />
          </div>
        </div>
      )}

      <div className="p-3 border-b border-[#1a1a28]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Áudio</div>
        <div className="space-y-2">
          <PropSlider label="Taxa" value={(selectedItem.speed?.rate ?? 1)} onChange={(v) => updateItem(selectedItem.id, { speed: { ...DEFAULT_SPEED, ...selectedItem.speed, rate: v } })} min={0.25} max={4} step={0.05} />
        </div>
      </div>

      {selectedItem.kind === "text" && selectedItem.text && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Texto</div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Conteúdo</label>
              <textarea
                value={selectedItem.text.content}
                onChange={(e) => updateText({ content: e.target.value })}
                rows={2}
                className="w-full bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Fonte</label>
                <select
                  value={selectedItem.text.fontFamily}
                  onChange={(e) => updateText({ fontFamily: e.target.value })}
                  className="w-full bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                >
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Courier New, monospace">Courier</option>
                </select>
              </div>
              <PropInput label="Tamanho" value={selectedItem.text.fontSize} onChange={(v) => updateText({ fontSize: v })} step={1} min={8} max={200} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Peso</label>
              <select
                value={selectedItem.text.fontWeight}
                onChange={(e) => updateText({ fontWeight: e.target.value as "normal" | "bold" })}
                className="w-full bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="bold">Negrito</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Cor</label>
                <input
                  type="color"
                  value={selectedItem.text.color}
                  onChange={(e) => updateText({ color: e.target.value })}
                  className="w-full h-7 bg-[#13131f] border border-[#1e1e2e] rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Fundo</label>
                <input
                  type="color"
                  value={selectedItem.text.backgroundColor}
                  onChange={(e) => updateText({ backgroundColor: e.target.value })}
                  className="w-full h-7 bg-[#13131f] border border-[#1e1e2e] rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => updateText({ textAlign: align })}
                  className={`px-2 py-1 text-[10px] rounded border ${
                    selectedItem.text!.textAlign === align
                      ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                      : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                  }`}
                >
                  {align === "left" ? "Esq" : align === "center" ? "Centro" : "Dir"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedItem.kind === "sticker" && selectedItem.sticker && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Sticker</div>
          <div className="space-y-2">
            <div className="text-2xl text-center py-1">{selectedItem.sticker.emoji}</div>
            <PropSlider label="Tamanho" value={selectedItem.sticker.size} onChange={(v) => updateSticker({ size: v })} min={24} max={200} step={1} />
          </div>
        </div>
      )}
    </div>
  );
}

function PropInput({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) {
            let clamped = v;
            if (min !== undefined) clamped = Math.max(min, clamped);
            if (max !== undefined) clamped = Math.min(max, clamped);
            onChange(clamped);
          }
        }}
        step={step}
        min={min}
        max={max}
        className="w-full bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
      />
    </div>
  );
}

function PropSlider({
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
        <span className="text-[10px] text-gray-600 font-mono">
          {Math.round(value * 100) / 100}
        </span>
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
