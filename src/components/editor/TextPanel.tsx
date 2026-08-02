"use client";

import { useState } from "react";
import { useProjectStore, useUIStore, usePlaybackStore } from "@/lib/editor";
import type { TimelineItem, TextProps, TextStylePreset, TextGradient } from "@/lib/editor";
import { DEFAULT_TEXT_PROPS, TEXT_STYLE_PRESETS, DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CANVAS, generateId, createDefaultItem } from "@/lib/editor";
import { Type, Plus, Trash2 } from "lucide-react";

export default function TextPanel() {
  const { project, addItem, updateItem } = useProjectStore();
  const { selectedIds, select } = useUIStore();
  const { currentTime } = usePlaybackStore();

  const [fontFamily] = useState([
    "Inter, system-ui, sans-serif",
    "Arial, sans-serif",
    "Georgia, serif",
    "'Courier New', monospace",
    "Verdana, sans-serif",
    "Impact, sans-serif",
    "'Times New Roman', serif",
  ]);

  const textTrackId = project.timeline.trackOrder.find(
    (id: string) => project.timeline.tracks[id]?.kind === "text"
  );

  const selectedTextItem = project.timeline.items.find(
    (item: TimelineItem) => selectedIds.has(item.id) && item.kind === "text"
  );

  const handleAddText = () => {
    if (!textTrackId) return;

    const playheadFrame = Math.round(currentTime * project.timeline.fps);

    const item = createDefaultItem({
      trackId: textTrackId,
      startFrame: playheadFrame,
      durationInFrames: project.timeline.fps * 3,
      name: "Texto",
      kind: "text",
      transform: { ...DEFAULT_TRANSFORM },
      filters: { ...DEFAULT_FILTERS },
      text: { ...DEFAULT_TEXT_PROPS },
    });

    addItem(item);
    select(item.id);
  };

  const handleUpdateText = (patch: Partial<TextProps>) => {
    if (!selectedTextItem?.id) return;
    const currentText = selectedTextItem.text || DEFAULT_TEXT_PROPS;
    updateItem(selectedTextItem.id, {
      text: { ...currentText, ...patch },
    });
  };

  const handleUpdateGradient = (patch: Partial<TextGradient>) => {
    if (!selectedTextItem?.id) return;
    const currentText = selectedTextItem.text || DEFAULT_TEXT_PROPS;
    updateItem(selectedTextItem.id, {
      text: {
        ...currentText,
        gradient: { ...currentText.gradient, ...patch },
      },
    });
  };

  const text = selectedTextItem?.text || DEFAULT_TEXT_PROPS;

  if (!selectedTextItem) {
    return (
      <div className="h-full bg-[#0d0d16] border-r border-[#1e1e2e] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center gap-2">
          <Type size={14} className="text-[#8b5cf6]" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Texto</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="text-gray-600 text-sm">
              Selecione um item de texto ou adicione um novo
            </div>
            <button
              onClick={handleAddText}
              className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] rounded-lg text-white text-xs font-semibold flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus size={14} />
              Adicionar Texto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0d0d16] border-r border-[#1e1e2e] flex flex-col">
      <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type size={14} className="text-[#8b5cf6]" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Texto</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleAddText}
            className="px-2 py-0.5 bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] rounded hover:bg-[#8b5cf6]/20"
          >
            + Novo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Adicionar Texto */}
        <section>
          <button
            onClick={handleAddText}
            className="w-full py-2 border border-[#1e1e2e] rounded-lg text-gray-400 text-[10px] hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={12} />
            Adicionar Texto
          </button>
        </section>

        {/* Conteúdo */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Conteúdo</h4>
          <textarea
            value={text.content}
            onChange={(e) => handleUpdateText({ content: e.target.value })}
            className="w-full h-20 px-2 py-1.5 bg-[#13131f] border border-[#1e1e2e] rounded-md text-xs text-gray-300 focus:outline-none focus:border-[#8b5cf6] resize-none"
            placeholder="Digite seu texto..."
          />
        </section>

        {/* Tipografia */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tipografia</h4>
          <div className="space-y-2">
            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Família</label>
              <select
                value={text.fontFamily}
                onChange={(e) => handleUpdateText({ fontFamily: e.target.value })}
                className="w-full px-2 py-1.5 bg-[#13131f] border border-[#1e1e2e] rounded-md text-xs text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
              >
                {fontFamily.map((font) => (
                  <option key={font} value={font}>{font.split(",")[0]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Tamanho: {text.fontSize}px</label>
              <input
                type="range"
                min={8}
                max={200}
                value={text.fontSize}
                onChange={(e) => handleUpdateText({ fontSize: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => handleUpdateText({ fontWeight: text.fontWeight === "bold" ? "normal" : "bold" })}
                className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${
                  text.fontWeight === "bold"
                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                }`}
              >
                Bold
              </button>
              <button
                onClick={() => handleUpdateText({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })}
                className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${
                  text.fontStyle === "italic"
                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                }`}
              >
                Italic
              </button>
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Altura da Linha: {text.lineHeight}</label>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={text.lineHeight}
                onChange={(e) => handleUpdateText({ lineHeight: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Espaçamento: {text.letterSpacing}px</label>
              <input
                type="range"
                min={-5}
                max={20}
                step={0.5}
                value={text.letterSpacing}
                onChange={(e) => handleUpdateText({ letterSpacing: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>
          </div>
        </section>

        {/* Cores */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Cores</h4>
          <div className="space-y-2">
            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Cor do Texto</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={text.color}
                  onChange={(e) => handleUpdateText({ color: e.target.value })}
                  className="w-8 h-8 rounded border border-[#1e1e2e] cursor-pointer"
                />
                <input
                  type="text"
                  value={text.color}
                  onChange={(e) => handleUpdateText({ color: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#13131f] border border-[#1e1e2e] rounded-md text-[10px] text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Cor de Fundo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={text.backgroundColor === "transparent" ? "#000000" : text.backgroundColor}
                  onChange={(e) => handleUpdateText({ backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded border border-[#1e1e2e] cursor-pointer"
                />
                <input
                  type="text"
                  value={text.backgroundColor}
                  onChange={(e) => handleUpdateText({ backgroundColor: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#13131f] border border-[#1e1e2e] rounded-md text-[10px] text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Opacidade do Fundo: {Math.round(text.backgroundOpacity * 100)}%</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={text.backgroundOpacity}
                onChange={(e) => handleUpdateText({ backgroundOpacity: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Alinhamento</label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => handleUpdateText({ textAlign: align })}
                    className={`flex-1 py-1.5 text-[10px] rounded border transition-colors ${
                      text.textAlign === align
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
        </section>

        {/* Contorno e Sombra */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Contorno e Sombra</h4>
          <div className="space-y-2">
            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Largura do Contorno: {text.strokeWidth}px</label>
              <input
                type="range"
                min={0}
                max={20}
                value={text.strokeWidth}
                onChange={(e) => handleUpdateText({ strokeWidth: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Cor do Contorno</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={text.strokeColor}
                  onChange={(e) => handleUpdateText({ strokeColor: e.target.value })}
                  className="w-8 h-8 rounded border border-[#1e1e2e] cursor-pointer"
                />
                <input
                  type="text"
                  value={text.strokeColor}
                  onChange={(e) => handleUpdateText({ strokeColor: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#13131f] border border-[#1e1e2e] rounded-md text-[10px] text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Cor da Sombra</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={text.shadowColor}
                  onChange={(e) => handleUpdateText({ shadowColor: e.target.value })}
                  className="w-8 h-8 rounded border border-[#1e1e2e] cursor-pointer"
                />
                <input
                  type="text"
                  value={text.shadowColor}
                  onChange={(e) => handleUpdateText({ shadowColor: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#13131f] border border-[#1e1e2e] rounded-md text-[10px] text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Blur da Sombra: {text.shadowBlur}px</label>
              <input
                type="range"
                min={0}
                max={50}
                value={text.shadowBlur}
                onChange={(e) => handleUpdateText({ shadowBlur: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Offset X: {text.shadowOffsetX}px</label>
              <input
                type="range"
                min={-20}
                max={20}
                value={text.shadowOffsetX}
                onChange={(e) => handleUpdateText({ shadowOffsetX: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>

            <div>
              <label className="text-[9px] text-gray-600 block mb-1">Offset Y: {text.shadowOffsetY}px</label>
              <input
                type="range"
                min={-20}
                max={20}
                value={text.shadowOffsetY}
                onChange={(e) => handleUpdateText({ shadowOffsetY: Number(e.target.value) })}
                className="w-full accent-[#8b5cf6]"
              />
            </div>
          </div>
        </section>

        {/* Estilos Pré-definidos */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Estilos Pré-definidos</h4>
          <div className="grid grid-cols-2 gap-1">
            {TEXT_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleUpdateText({ stylePreset: preset.id })}
                className={`px-2 py-2 text-[10px] rounded border transition-colors ${
                  text.stylePreset === preset.id
                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                    : "bg-[#13131f] border-[#1e1e2e] text-gray-400 hover:border-[#8b5cf6]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* Gradiente */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Gradiente</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] text-gray-600">Ativar Gradiente</label>
              <button
                onClick={() => handleUpdateGradient({ enabled: !text.gradient.enabled })}
                className={`w-10 h-5 rounded-full transition-colors ${
                  text.gradient.enabled ? "bg-[#8b5cf6]" : "bg-[#1e1e2e]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    text.gradient.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {text.gradient.enabled && (
              <>
                <div>
                  <label className="text-[9px] text-gray-600 block mb-1">Cor 1</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={text.gradient.color1}
                      onChange={(e) => handleUpdateGradient({ color1: e.target.value })}
                      className="w-8 h-8 rounded border border-[#1e1e2e] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={text.gradient.color1}
                      onChange={(e) => handleUpdateGradient({ color1: e.target.value })}
                      className="flex-1 px-2 py-1 bg-[#13131f] border border-[#1e1e2e] rounded-md text-[10px] text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-gray-600 block mb-1">Cor 2</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={text.gradient.color2}
                      onChange={(e) => handleUpdateGradient({ color2: e.target.value })}
                      className="w-8 h-8 rounded border border-[#1e1e2e] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={text.gradient.color2}
                      onChange={(e) => handleUpdateGradient({ color2: e.target.value })}
                      className="flex-1 px-2 py-1 bg-[#13131f] border border-[#1e1e2e] rounded-md text-[10px] text-gray-300 focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-gray-600 block mb-1">Ângulo: {text.gradient.angle}°</label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={text.gradient.angle}
                    onChange={(e) => handleUpdateGradient({ angle: Number(e.target.value) })}
                    className="w-full accent-[#8b5cf6]"
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
