"use client";

import { useState } from "react";
import { useProjectStore, useUIStore } from "@/lib/editor";
import type { TimelineItem, FilterPreset as FilterPresetType } from "@/lib/editor";

const FILTER_PRESETS_UI: { id: FilterPresetType; name: string; color: string }[] = [
  { id: "bw", name: "P&B", color: "#888888" },
  { id: "vintage", name: "Sépia", color: "#A0522D" },
  { id: "warm", name: "Quente", color: "#FFA500" },
  { id: "cold", name: "Frio", color: "#4169E1" },
  { id: "cinematic", name: "Cinematográfico", color: "#6A0DAD" },
  { id: "dramatic", name: "Alto Contraste", color: "#FFFFFF" },
  { id: "vintage", name: "Vintage", color: "#8B4513" },
  { id: "vivid", name: "Neônio", color: "#39FF14" },
  { id: "pastel", name: "Cyberpunk", color: "#FF00FF" },
];

export default function FiltersPanel() {
  const { project, updateItem } = useProjectStore();
  const { selectedIds } = useUIStore();

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  const applyFilter = (preset: FilterPresetType | null) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      filterPreset: preset ?? "none",
    });
  };

  if (!selectedItem) {
    return (
      <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e1e2e]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filtros</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          Selecione um clipe para aplicar filtros
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filtros</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Presets de Cor</div>
          <div className="grid grid-cols-3 gap-2">
            {FILTER_PRESETS_UI.map((f) => (
              <button
                key={f.id}
                onClick={() => applyFilter(f.id)}
                className={`p-2 rounded border transition-all ${
                  selectedItem.filterPreset === f.id
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10 text-[#8b5cf6]"
                    : "border-[#2a2a38] bg-[#1a1a28] text-gray-300 hover:border-[#8b5cf6]/50"
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: f.color }} />
                </div>
                <span className="text-[9px] font-medium">{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            onClick={() => applyFilter(null)}
            className="w-full p-2 text-[10px] text-gray-400 hover:text-white hover:bg-[#1e1e2e] rounded transition-colors"
          >
            Remover Filtro
          </button>
        </div>

        {selectedItem.filterPreset !== "none" && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Intensidade ({selectedItem.filters.brightness !== undefined ? Math.round((selectedItem.filters.brightness + 1) * 50) : 100}%)
            </div>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="100"
              onChange={(e) => {
                const val = (parseInt(e.target.value) - 50) / 50;
                updateItem(selectedItem.id, {
                  filters: { ...selectedItem.filters, brightness: val, contrast: 1 + val * 0.5, saturation: 1 + val * 0.5 },
                });
              }}
              className="w-full h-1 bg-[#1e1e2e] rounded-full appearance-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
