"use client";

import { useState } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, AnimationPreset, KeyframeProp } from "@/lib/editor";
import { ANIMATION_PRESETS } from "@/lib/editor";
import { usePlaybackStore } from "@/lib/editor";
import { Diamond, Play } from "lucide-react";

type CollapsibleKey = "enter" | "exit" | "duration" | "keyframes";

const KEYFRAME_PROPS: { prop: KeyframeProp; label: string }[] = [
  { prop: "x", label: "X" },
  { prop: "y", label: "Y" },
  { prop: "scaleX", label: "Escala X" },
  { prop: "scaleY", label: "Escala Y" },
  { prop: "rotation", label: "Rotação" },
  { prop: "opacity", label: "Opacidade" },
];

export default function AnimationPanel() {
  const { project, updateItem, setKeyframe, removeKeyframe } = useProjectStore();
  const { selectedIds } = useUIStore();
  const { currentTime } = usePlaybackStore();

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  const [collapsed, setCollapsed] = useState<Record<CollapsibleKey, boolean>>({
    enter: false,
    exit: false,
    duration: false,
    keyframes: false,
  });

  const toggle = (key: CollapsibleKey) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const enterPresets = ANIMATION_PRESETS.filter((p) => p.category === "enter");
  const exitPresets = ANIMATION_PRESETS.filter((p) => p.category === "exit");

  if (!selectedItem) {
    return (
      <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e1e2e]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Animações</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs px-4 text-center">
          Selecione um item
        </div>
      </div>
    );
  }

  const addKeyframeForProp = (prop: KeyframeProp) => {
    const frame = Math.round(currentTime * project.timeline.fps);
    let val: number | undefined;

    if (prop in selectedItem.transform) {
      val = (selectedItem.transform as unknown as Record<string, number>)[prop];
    } else if (prop === "volume") {
      val = 1;
    } else if (prop in selectedItem.filters) {
      val = (selectedItem.filters as unknown as Record<string, number>)[prop];
    }
    if (val === undefined) return;

    setKeyframe(selectedItem.id, prop, {
      frame,
      value: val,
      easing: "linear",
    });
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Animações</h3>
      </div>

      {/* Animação de Entrada */}
      <SectionHeader label="Animação de Entrada" collapsed={collapsed.enter} onToggle={() => toggle("enter")} />
      {!collapsed.enter && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="grid grid-cols-3 gap-1.5">
            {enterPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => updateItem(selectedItem.id, { animation: { ...selectedItem.animation, enter: preset.id } })}
                className={`px-2 py-1.5 text-[10px] rounded border transition-colors ${
                  selectedItem.animation.enter === preset.id
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

      {/* Animação de Saída */}
      <SectionHeader label="Animação de Saída" collapsed={collapsed.exit} onToggle={() => toggle("exit")} />
      {!collapsed.exit && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="grid grid-cols-3 gap-1.5">
            {exitPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => updateItem(selectedItem.id, { animation: { ...selectedItem.animation, exit: preset.id } })}
                className={`px-2 py-1.5 text-[10px] rounded border transition-colors ${
                  selectedItem.animation.exit === preset.id
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

      {/* Duração da Animação */}
      <SectionHeader label="Duração da Animação" collapsed={collapsed.duration} onToggle={() => toggle("duration")} icon={<Play size={12} />} />
      {!collapsed.duration && (
        <div className="p-3 border-b border-[#1a1a28]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Duração (frames)</span>
            <span className="text-[10px] text-gray-600 font-mono">{selectedItem.animation.durationInFrames}</span>
          </div>
          <input
            type="range"
            value={selectedItem.animation.durationInFrames}
            onChange={(e) =>
              updateItem(selectedItem.id, {
                animation: { ...selectedItem.animation, durationInFrames: parseInt(e.target.value) },
              })
            }
            min={5}
            max={60}
            step={1}
            className="w-full h-1 bg-[#1e1e2e] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
            <span>5</span>
            <span>60</span>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <SectionHeader label="Keyframes" collapsed={collapsed.keyframes} onToggle={() => toggle("keyframes")} icon={<Diamond size={12} />} />
      {!collapsed.keyframes && (
        <div className="p-3 border-b border-[#1a1a28] space-y-3">
          {KEYFRAME_PROPS.map(({ prop, label }) => {
            const kfs = (selectedItem.keyframes as Record<string, { frame: number; value: number; easing: string }[]>)[prop] || [];
            return (
              <div key={prop}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">{label}</span>
                  <button
                    onClick={() => addKeyframeForProp(prop)}
                    className="text-[9px] text-[#8b5cf6] hover:text-[#a78bfa] flex items-center gap-0.5"
                  >
                    <Diamond size={8} />
                    Adicionar
                  </button>
                </div>
                {kfs.length > 0 ? (
                  <div className="space-y-0.5">
                    {kfs.map((kf) => (
                      <div
                        key={kf.frame}
                        className="flex items-center justify-between bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <Diamond
                            size={10}
                            className="text-[#ec4899]"
                          />
                          <span className="text-[10px] text-gray-400 font-mono">F{kf.frame}</span>
                          <span className="text-[10px] text-gray-500">→</span>
                          <span className="text-[10px] text-gray-300 font-mono">{kf.value.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => removeKeyframe(selectedItem.id, prop, kf.frame)}
                          className="text-[10px] text-gray-600 hover:text-red-400 px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[9px] text-gray-600 italic pl-1">Nenhum keyframe</div>
                )}
              </div>
            );
          })}
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
  icon?: React.ReactNode;
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
