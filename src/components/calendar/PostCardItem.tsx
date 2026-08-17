"use client";

import { useState } from "react";
import { Download, Copy, Check, ChevronDown, ChevronUp, Video, Clapperboard } from "lucide-react";
import type { ContentPostItem } from "@/data/contentMatrixTemplates";
import { EDITORIAL_PILLARS } from "@/data/contentMatrixTemplates";

interface PostCardItemProps {
  post: ContentPostItem;
  onOpenVideo: (post: ContentPostItem) => void;
}

export default function PostCardItem({ post, onOpenVideo }: PostCardItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const pillar = EDITORIAL_PILLARS[post.pillar];

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(post.caption);
      setCopied("caption");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard indisponível */
    }
  };

  const downloadImage = () => {
    if (!post.previewImageUrl) return;
    const a = document.createElement("a");
    a.href = post.previewImageUrl;
    a.download = `post-dia-${post.dayNumber}.png`;
    a.click();
  };

  return (
    <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Cabeçalho: dia + pilar + tag de formato */}
      <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: pillar.color }}
        >
          {post.dayNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{post.hook}</p>
        </div>
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 inline-flex items-center gap-1"
          style={{ color: pillar.color, backgroundColor: `${pillar.color}22` }}
        >
          <Clapperboard className="w-3 h-3" />
          {post.format}
        </span>
      </div>

      {/* Imagem gerada */}
      <div className="p-4 pb-0">
        {post.previewImageUrl ? (
          <img
            src={post.previewImageUrl}
            alt={`Arte do dia ${post.dayNumber} — ${post.pillarLabel}`}
            className="rounded-xl w-full aspect-square object-cover border border-gray-800"
          />
        ) : (
          <div
            className="rounded-xl w-full aspect-square flex items-center justify-center text-gray-600 text-xs border border-gray-800"
            style={{ backgroundColor: `${pillar.color}0d` }}
          >
            Gere os posts para visualizar a arte
          </div>
        )}
      </div>

      {/* Legenda SEO */}
      <div className="px-5 py-4 flex-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-1 py-2 text-[11px] text-gray-400 hover:text-white transition-colors"
        >
          <span className="font-medium uppercase tracking-wider text-gray-500">
            Legenda com SEO ({post.caption.split("\n").pop()?.trim().split(" ").length ?? 0} hashtags)
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="p-3 rounded-xl bg-[#252535] border border-gray-800 text-xs text-gray-300 whitespace-pre-wrap max-h-56 overflow-y-auto">
            {post.caption}
          </div>
        )}
      </div>

      {/* Barra de ações rápidas */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-2">
        <button
          onClick={downloadImage}
          disabled={!post.previewImageUrl}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          title="Baixar imagem PNG"
        >
          <Download className="w-4 h-4" />
          Baixar Imagem
        </button>
        <button
          onClick={copyCaption}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[#1c1c28] border border-gray-700 text-gray-300 text-[11px] font-semibold hover:text-white hover:border-gray-500 transition-colors"
          title="Copiar legenda completa com hashtags"
        >
          {copied === "caption" ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar Legenda
            </>
          )}
        </button>
        <button
          onClick={() => onOpenVideo(post)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-gray-700/30 border border-gray-700 text-gray-300 text-[11px] font-semibold hover:bg-[var(--accent-pink)]/20 hover:text-white transition-colors"
          title="Abrir no editor com a imagem e o gancho inseridos"
        >
          <Video className="w-4 h-4" />
          Criar Vídeo
        </button>
      </div>
    </div>
  );
}