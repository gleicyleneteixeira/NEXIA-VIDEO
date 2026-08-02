"use client";
import { useState, useRef } from "react";
import { useProjectStore } from "@/lib/editor";
import type { Watermark, WatermarkPosition } from "@/lib/editor";
import { DEFAULT_WATERMARK } from "@/lib/editor";
import { Upload, Image, Type, Eye, EyeOff, Trash2, Move } from "lucide-react";

type FullPosition =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

const POSITIONS: FullPosition[] = [
  "top-left", "top-center", "top-right",
  "middle-left", "center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

const POSITION_MAP: Record<FullPosition, string> = {
  "top-left": "top-left",
  "top-center": "top-right",
  "top-right": "top-right",
  "middle-left": "bottom-left",
  "center": "center",
  "middle-right": "bottom-right",
  "bottom-left": "bottom-left",
  "bottom-center": "bottom-right",
  "bottom-right": "bottom-right",
};

export default function WatermarkPanel() {
  const { project, setWatermark } = useProjectStore();
  const [mode, setMode] = useState<"image" | "text">(
    project.watermark.imageUrl ? "image" : "text"
  );
  const [localPosition, setLocalPosition] = useState<FullPosition>(
    (project.watermark.position as FullPosition) || "bottom-right"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wm = project.watermark;

  const update = (patch: Partial<Watermark>) => {
    setWatermark(patch);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update({ imageUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    update({ imageUrl: undefined });
    setMode("text");
  };

  const handlePositionChange = (pos: FullPosition) => {
    setLocalPosition(pos);
    update({ position: POSITION_MAP[pos] as WatermarkPosition });
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Move size={12} /> Marca d&apos;água
        </h3>
      </div>

      <div className="p-3 space-y-0.5">
        {/* Master Toggle */}
        <div className="p-3 border-b border-[#1a1a28]">
          <ToggleRow
            label="Ativar Marca d&apos;água"
            value={wm.enabled}
            onChange={(v) => update({ enabled: v })}
          />
        </div>

        {/* Type Selector */}
        <SectionHeader title="Tipo" collapsed={false} onToggle={() => {}} />
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="flex gap-1">
            <button
              onClick={() => setMode("image")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] rounded border ${
                mode === "image"
                  ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                  : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
              }`}
            >
              <Image size={10} />
              Imagem
            </button>
            <button
              onClick={() => setMode("text")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] rounded border ${
                mode === "text"
                  ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                  : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
              }`}
            >
              <Type size={10} />
              Texto
            </button>
          </div>
        </div>

        {/* Image Mode */}
        {mode === "image" && (
          <div className="p-3 border-b border-[#1a1a28] space-y-2">
            <div
              className="border-2 border-dashed border-[#1e1e2e] rounded-lg p-4 text-center cursor-pointer hover:border-[#8b5cf6] hover:bg-[#13131f] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {wm.imageUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={wm.imageUrl}
                    alt="Logo"
                    className="h-12 object-contain rounded"
                  />
                  <span className="text-[10px] text-gray-500">Clique para trocar</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={20} className="text-gray-600" />
                  <span className="text-[10px] text-gray-500">
                    Clique para selecionar logo
                  </span>
                </div>
              )}
            </div>
            {wm.imageUrl && (
              <button
                onClick={handleRemoveImage}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] rounded border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 size={10} />
                Remover Imagem
              </button>
            )}
          </div>
        )}

        {/* Text Mode */}
        {mode === "text" && (
          <div className="p-3 border-b border-[#1a1a28] space-y-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Texto</label>
              <input
                type="text"
                value={wm.text || ""}
                onChange={(e) => update({ text: e.target.value })}
                placeholder="Marca d&apos;água"
                className="w-full bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:border-[#8b5cf6] focus:outline-none"
              />
            </div>
            <Slider
              label="Tamanho da Fonte"
              value={16}
              onChange={() => {}}
              min={12}
              max={48}
              step={1}
              disabled
            />
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Fonte</label>
              <select
                className="w-full bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1.5 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              >
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
              </select>
            </div>
          </div>
        )}

        {/* Position Grid */}
        <SectionHeader title="Posição" collapsed={false} onToggle={() => {}} />
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 grid grid-cols-3 gap-0.5">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => handlePositionChange(pos)}
                  className={`rounded-sm transition-colors ${
                    localPosition === pos
                      ? "bg-[#8b5cf6]"
                      : "bg-[#1e1e2e] hover:bg-[#2a2a3e]"
                  }`}
                  title={pos}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-600">{localPosition}</span>
          </div>
        </div>

        {/* Opacity */}
        <SectionHeader title="Opacidade" collapsed={false} onToggle={() => {}} />
        <div className="p-3 border-b border-[#1a1a28]">
          <Slider
            label="Opacidade"
            value={wm.opacity}
            onChange={(v) => update({ opacity: v })}
            min={0}
            max={1}
            step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        </div>

        {/* Scale */}
        <SectionHeader title="Escala" collapsed={false} onToggle={() => {}} />
        <div className="p-3 border-b border-[#1a1a28]">
          <Slider
            label="Escala"
            value={wm.scale}
            onChange={(v) => update({ scale: v })}
            min={0.05}
            max={0.5}
            step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        </div>

        {/* Padding */}
        <SectionHeader title="Espaçamento" collapsed={false} onToggle={() => {}} />
        <div className="p-3 border-b border-[#1a1a28]">
          <Slider
            label="Padding"
            value={wm.padding}
            onChange={(v) => update({ padding: v })}
            min={0}
            max={100}
            step={1}
            formatValue={(v) => `${Math.round(v)}px`}
          />
        </div>

        {/* Preview */}
        <SectionHeader title="Pré-visualização" collapsed={false} onToggle={() => {}} />
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="bg-[#08080d] rounded-lg p-4 h-32 flex items-center justify-center relative">
            {wm.enabled ? (
              <div
                className="absolute"
                style={{
                  top: localPosition.includes("middle")
                    ? "50%"
                    : localPosition.includes("top")
                    ? `${wm.padding / 4}px`
                    : undefined,
                  bottom: localPosition.includes("bottom") ? `${wm.padding / 4}px` : undefined,
                  left: localPosition.includes("left") ? `${wm.padding / 4}px` : undefined,
                  right: localPosition.includes("right") ? `${wm.padding / 4}px` : undefined,
                  transform: localPosition === "center" || localPosition.includes("middle") ? "translateY(-50%)" : undefined,
                  opacity: wm.opacity,
                }}
              >
                {mode === "image" && wm.imageUrl ? (
                  <img
                    src={wm.imageUrl}
                    alt="Preview"
                    className="h-6 object-contain"
                  />
                ) : mode === "text" && wm.text ? (
                  <span className="text-xs text-white font-medium">
                    {wm.text}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-600">
                    {wm.imageUrl ? "Logo" : "Texto"}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-gray-600">
                Marca d&apos;água desativada
              </span>
            )}
          </div>
        </div>
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
  formatValue,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] text-gray-500">{label}</label>
        <span className="text-[10px] text-gray-600 font-mono">
          {formatValue ? formatValue(value) : Math.round(value * 100) / 100}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full h-1 bg-[#1e1e2e] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed"
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