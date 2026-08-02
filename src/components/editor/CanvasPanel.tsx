"use client";

import { useProjectStore } from "@/lib/editor";
import type { CanvasBackground, AspectRatio } from "@/lib/editor";
import { ASPECT_RATIOS } from "@/lib/editor";
import { Monitor, Square as SquareIcon, Smartphone, Image } from "lucide-react";

export default function CanvasPanel() {
  const { project, setCanvas } = useProjectStore();
  const canvas = project.timeline.canvas;

  const aspectRatioOptions: { ratio: AspectRatio; icon: React.ReactNode; label: string }[] = [
    { ratio: "9:16", icon: <Smartphone size={16} />, label: "TikTok / Shorts / Reels" },
    { ratio: "16:9", icon: <Monitor size={16} />, label: "YouTube (Padrão)" },
    { ratio: "1:1", icon: <SquareIcon size={16} />, label: "Instagram (Post)" },
    { ratio: "4:5", icon: <SquareIcon size={16} />, label: "Instagram (Retrato)" },
    { ratio: "4:3", icon: <Monitor size={16} />, label: "Standard (4:3)" },
    { ratio: "21:9", icon: <Monitor size={16} />, label: "Cinema (21:9)" },
  ];

  const handleAspectRatioChange = (ratio: AspectRatio) => {
    const dimensions = ASPECT_RATIOS[ratio];
    setCanvas({
      aspectRatio: ratio,
      width: dimensions.w,
      height: dimensions.h,
    });
  };

  const handleBackgroundModeChange = (mode: CanvasBackground) => {
    setCanvas({ background: mode });
  };

  return (
    <div className="h-full bg-[#0d0d16] border-r border-[#1e1e2e] flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center gap-2">
        <Monitor size={14} className="text-[#8b5cf6]" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Canvas</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Proporção do Projeto */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Proporção do Projeto</h4>
          <div className="grid grid-cols-2 gap-1">
            {aspectRatioOptions.map((option) => (
              <button
                key={option.ratio}
                onClick={() => handleAspectRatioChange(option.ratio)}
                className={`px-2 py-2 text-[10px] rounded border transition-colors flex items-center justify-center gap-1.5 ${
                  canvas.aspectRatio === option.ratio
                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Fundo */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Fundo</h4>
          <div className="space-y-2">
            <div className="flex gap-1">
              {(["color", "blur", "image"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleBackgroundModeChange(mode)}
                  className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${
                    canvas.background === mode
                      ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                      : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                  }`}
                >
                  {mode === "color" ? "Cor" : mode === "blur" ? "Desfoque" : "Imagem"}
                </button>
              ))}
            </div>

            {canvas.background === "color" && (
              <div>
                <label className="text-[9px] text-gray-600 block mb-1">Cor de Fundo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={canvas.bgColor}
                    onChange={(e) => setCanvas({ bgColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[#1e1e2e] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={canvas.bgColor}
                    onChange={(e) => setCanvas({ bgColor: e.target.value })}
                    className="flex-1 px-2 py-1 bg-[#13131f] border border-[#1e1e2e] rounded-md text-[10px] text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                  />
                </div>
              </div>
            )}

            {canvas.background === "blur" && (
              <div>
                <label className="text-[9px] text-gray-600 block mb-1">Quantidade de Desfoque: {canvas.bgBlurAmount}</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={canvas.bgBlurAmount}
                  onChange={(e) => setCanvas({ bgBlurAmount: Number(e.target.value) })}
                  className="w-full accent-[#8b5cf6]"
                />
              </div>
            )}

            {canvas.background === "image" && (
              <div>
                <label className="text-[9px] text-gray-600 block mb-1">Imagem de Fundo</label>
                <div className="w-full py-6 border-2 border-dashed border-[#1e1e2e] rounded-lg text-gray-500 hover:border-[#8b5cf6]/50 hover:text-[#8b5cf6] transition-colors flex flex-col items-center gap-2">
                  <Image size={20} />
                  <span className="text-[10px]">Clique para selecionar imagem</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Dimensões */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Dimensões</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[9px] text-gray-600 block mb-1">Largura</label>
                <input
                  type="number"
                  value={canvas.width}
                  onChange={(e) => setCanvas({ width: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-[#13131f] border border-[#1e1e2e] rounded-md text-xs text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
              <div className="text-gray-600 mt-4">×</div>
              <div className="flex-1">
                <label className="text-[9px] text-gray-600 block mb-1">Altura</label>
                <input
                  type="number"
                  value={canvas.height}
                  onChange={(e) => setCanvas({ height: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-[#13131f] border border-[#1e1e2e] rounded-md text-xs text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
            </div>
            <div className="text-[9px] text-gray-600 text-center">
              {canvas.width} × {canvas.height}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
