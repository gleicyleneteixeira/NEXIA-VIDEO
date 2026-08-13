"use client";

import { useProjectStore, useUIStore, DEFAULT_FILTERS } from "@/lib/editor";
import type { TimelineItem, ClipFilters } from "@/lib/editor";

export default function AdjustPanel() {
  const { project, updateItem } = useProjectStore();
  const { selectedIds } = useUIStore();

  const selectedItem =
    selectedIds.size === 1
      ? project.timeline.items.find((i: TimelineItem) => selectedIds.has(i.id))
      : null;

  const updateFilter = (patch: Partial<ClipFilters>) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      filters: { ...DEFAULT_FILTERS, ...selectedItem.filters, ...patch },
    });
  };

  const Slider = ({ label, value, onChange, min = -100, max = 100, unit = "" }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    unit?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className="text-[10px] text-gray-500">{value.toFixed(1)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-[#1e1e2e] rounded-full appearance-none accent-[#8b5cf6]"
      />
    </div>
  );

  if (!selectedItem) {
    return (
      <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e1e2e]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ajuste</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-xs">
          Selecione um clipe para ajustar
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ajuste</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Imagem</div>
          <div className="space-y-3">
            <Slider
              label="Brilho"
              value={selectedItem.filters.brightness ?? 0}
              onChange={(v) => updateFilter({ brightness: v })}
              min={-1}
              max={1}
            />
            <Slider
              label="Contraste"
              value={selectedItem.filters.contrast ?? 1}
              onChange={(v) => updateFilter({ contrast: v })}
              min={0}
              max={2}
            />
            <Slider
              label="Saturação"
              value={selectedItem.filters.saturation ?? 1}
              onChange={(v) => updateFilter({ saturation: v })}
              min={0}
              max={2}
            />
            <Slider
              label="Matiz"
              value={selectedItem.filters.hue ?? 0}
              onChange={(v) => updateFilter({ hue: v })}
              min={-180}
              max={180}
              unit="°"
            />
            <Slider
              label="Exposição"
              value={selectedItem.filters.exposure ?? 0}
              onChange={(v) => updateFilter({ exposure: v })}
              min={-1}
              max={1}
            />
            <Slider
              label="Highlights"
              value={selectedItem.filters.highlights ?? 0}
              onChange={(v) => updateFilter({ highlights: v })}
              min={-1}
              max={1}
            />
            <Slider
              label="Sombras"
              value={selectedItem.filters.shadows ?? 0}
              onChange={(v) => updateFilter({ shadows: v })}
              min={-1}
              max={1}
            />
            <Slider
              label="Desfoque"
              value={selectedItem.filters.blur ?? 0}
              onChange={(v) => updateFilter({ blur: v })}
              min={0}
              max={20}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Efeitos de Lente</div>
          <div className="space-y-3">
            <Slider
              label="Vignette"
              value={selectedItem.filters.vignette ?? 0}
              onChange={(v) => updateFilter({ vignette: v })}
              min={0}
              max={1}
            />
            <Slider
              label="Grain"
              value={selectedItem.filters.grain ?? 0}
              onChange={(v) => updateFilter({ grain: v })}
              min={0}
              max={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
