"use client";

import { useProjectStore, useUIStore } from "@/lib/editor";
import type { TransitionType } from "@/lib/editor";
import { Zap } from "lucide-react";

const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: "dissolve", label: "Dissolver" },
  { id: "slide-left", label: "Deslizar Esquerda" },
  { id: "slide-right", label: "Deslizar Direita" },
  { id: "zoom-in", label: "Zoom In" },
  { id: "zoom-out", label: "Zoom Out" },
  { id: "wipe-left", label: "Wipe Esquerda" },
  { id: "wipe-right", label: "Wipe Direita" },
  { id: "wipe-up", label: "Wipe Cima" },
  { id: "wipe-down", label: "Wipe Baixo" },
  { id: "push-left", label: "Push Esquerda" },
  { id: "push-right", label: "Push Direita" },
  { id: "blink", label: "Piscar" },
  { id: "spin", label: "Empurrar" },
];

export default function TransitionsPanel() {
  const { project } = useProjectStore();
  const { selectedIds } = useUIStore();

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap size={12} /> Transições
        </h3>
      </div>

      <div className="p-3 space-y-3">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Selecione dois clips adjacentes na timeline para aplicar uma transição entre eles.
        </p>

        <div className="space-y-1.5">
          {TRANSITIONS.map((t) => {
            const isActive = project.timeline.transitions.some(
              (tr) => tr.type === t.id && selectedIds.has(tr.fromItemId)
            );
            return (
              <div
                key={t.id}
                className={`bg-[#13131f] border rounded px-3 py-2 text-xs cursor-default ${
                  isActive ? "border-[#8b5cf6] text-white" : "border-[#1e1e2e] text-gray-400"
                }`}
              >
                {t.label}
              </div>
            );
          })}
        </div>

        {project.timeline.transitions.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Aplicadas</div>
            <div className="space-y-1">
              {project.timeline.transitions.map((tr) => (
                <div key={tr.id} className="bg-[#13131f] border border-[#1e1e2e] rounded px-2 py-1.5 text-[10px] text-gray-300 flex items-center justify-between">
                  <span>{TRANSITIONS.find((t) => t.id === tr.type)?.label || tr.type}</span>
                  <span className="text-gray-600">{tr.durationInFrames}f</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
