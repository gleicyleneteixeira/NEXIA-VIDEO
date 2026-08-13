"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Grid, List } from "lucide-react";
import { useProjectStore } from "@/lib/editor";
import { generateId, DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, DEFAULT_TEXT_PROPS } from "@/lib/editor";
import type { TimelineItem } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";

const STICKER_CATEGORIES = ["Tendências", "Setas", "Emojis", "Inscrição/Like", "Fogo", "Vlogs", "Promoção"];
const STICKER_EMOJIS = [
  "😀","😂","😍","🥰","😎","🤩","👍","👎","❤️","🔥","⭐","🎉",
  "💯","🚀","🎬","🎵","📸","💡","🎯","🏆","💎","🌈","☀️","🌙",
  "⚡","💥","✨","🌟","🎪","🎭","🎨","📝","📌","🔔","💬","👁️",
  "🎯","🏆","💡","📸","🎬","🎵","🎵","🔥","⭐","🎉","👍","❤️",
];

const GIPHY_API_KEY = "dc6zaTmF2YaL4";

interface StickerData {
  id: string;
  url: string;
  name: string;
}

export default function StickersPanel() {
  const { project, addItem } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tendências");
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStickers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query + " sticker")}&limit=24&rating=pg`
        : `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_API_KEY}&limit=24`;
      const res = await fetch(url);
      const data = await res.json();
      const items = data.data?.map((g: any) => ({
        id: g.id,
        url: g.images?.previewGif?.url || g.images?.downsized?.url || "",
        name: g.title || "Sticker",
      })) || [];
      setStickers(items);
    } catch {
      const emojiStickers: StickerData[] = STICKER_EMOJIS.map((emoji, i) => ({
        id: `emoji-${i}`,
        url: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="%23ffffff"><text y="42" font-size="36" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`,
        name: emoji,
      }));
      setStickers(emojiStickers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      fetchStickers(searchQuery);
    } else {
      fetchStickers("");
    }
  }, [searchQuery, fetchStickers]);

  const addStickerToTimeline = (sticker: StickerData) => {
    const timeline = project.timeline;
    const overlayTrackId = timeline.trackOrder.find(
      (tid: string) => timeline.tracks[tid]?.kind === "sticker"
    );
    if (!overlayTrackId) return;

    const item: TimelineItem = {
      id: generateId(),
      trackId: overlayTrackId,
      startFrame: Math.round(timeline.items.length > 0 ? Math.max(...timeline.items.filter((i: TimelineItem) => i.trackId === overlayTrackId).map((i: TimelineItem) => i.startFrame + i.durationInFrames)) : 0),
      durationInFrames: timeline.fps * 5,
      name: sticker.name,
      kind: "sticker",
      src: sticker.url,
      transform: { ...DEFAULT_TRANSFORM },
      filters: { ...DEFAULT_FILTERS },
      crop: { ...DEFAULT_CROP },
      mask: { ...DEFAULT_MASK },
      chromaKey: { ...DEFAULT_CHROMA_KEY },
      blendMode: "normal",
      speed: { ...DEFAULT_SPEED },
      animation: { ...DEFAULT_ANIMATION },
      audio: { ...DEFAULT_AUDIO },
      effects: [],
      hsl: {},
      filterPreset: "none",
      keyframes: {},
      sticker: { emoji: sticker.name, size: 64, rotation: 0 },
    };

    withHistory("Adicionar sticker", () => addItem(item));
  };

  return (
    <div className="h-full bg-[#0d0d16] border-l border-[#1e1e2e] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stickers</h3>
      </div>

      <div className="p-2 border-b border-[#1a1a28]">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="🔍 Buscar stickers, emojis ou GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1 bg-[#1a1a28] border border-[#2a2a38] rounded text-xs text-[#a0a0b0] outline-none focus:border-[#8b5cf6]/50"
          />
        </div>
      </div>

      <div className="px-2 py-2 border-b border-[#1a1a28] overflow-x-auto">
        <div className="flex gap-1">
          {STICKER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                  : "text-gray-500 hover:bg-[#1e1e2e] hover:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border border-gray-600 border-t-[#8b5cf6]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {stickers.map((sticker) => (
              <div
                key={sticker.id}
                onClick={() => addStickerToTimeline(sticker)}
                className="aspect-square bg-[#1a1a28] border border-[#2a2a38] rounded-lg overflow-hidden cursor-pointer hover:border-[#8b5cf6]/50 hover:brightness-110 transition-all flex items-center justify-center group"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[#8b5cf6]/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <span className="text-[10px] text-white">Clique para adicionar</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
