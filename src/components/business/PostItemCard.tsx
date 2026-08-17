"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Video,
  RefreshCw,
  Star,
  CalendarClock,
} from "lucide-react";
import { useBusinessStore } from "@/lib/business/business-store";
import type { StudioPost } from "@/lib/business/types";
import { POST_STATUS_LABELS } from "@/lib/business/types";
import { generateCaptionVariation } from "@/lib/business/calendarEngine";
import { setPendingPostImport } from "@/lib/editor/pendingPost";

const STATUS_ORDER = ["pendente", "editando", "agendado", "publicado"] as const;

export default function PostItemCard({ profileId, post }: { profileId: string; post: StudioPost }) {
  const router = useRouter();
  const { updatePost, profiles } = useBusinessStore();
  const profile = profiles.find((p) => p.id === profileId);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<null | "caption" | "variation">(null);
  const [variation, setVariation] = useState<string | null>(null);

  const copy = async (text: string, which: "caption" | "variation") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard indisponível */
    }
  };

  const download = () => {
    if (!post.previewImageUrl) return;
    const a = document.createElement("a");
    a.href = post.previewImageUrl;
    a.download = `post-dia-${post.dayNumber}.png`;
    a.click();
  };

  const newVariation = () => {
    if (!profile) return;
    setVariation(generateCaptionVariation(post, profile.business));
  };

  const openInEditor = () => {
    if (post.previewImageUrl) {
      setPendingPostImport({
        imageDataUrl: post.previewImageUrl,
        hook: post.hook,
        dayNumber: post.dayNumber,
        pillarLabel: post.pillarLabel,
        format: post.format,
      });
    }
    router.push(`/editor?dia=${post.dayNumber}`);
  };

  const cycleStatus = () => {
    const idx = STATUS_ORDER.indexOf(post.status as (typeof STATUS_ORDER)[number]);
    const next = idx >= 0 ? STATUS_ORDER[(idx + 1) % STATUS_ORDER.length] : "pendente";
    updatePost(profileId, post.id, { status: next });
  };

  const displayCaption = variation ?? post.caption;

  return (
    <div className="bg-[#1c1c28] border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Cabeçalho: dia + status + favorito */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center text-sm font-bold flex-shrink-0">
          {post.dayNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500">{post.scheduledDate}</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-[var(--primary)]/10 text-[var(--primary)]">
            {post.pillarLabel} · {post.format}
          </span>
        </div>
        <button
          onClick={() => updatePost(profileId, post.id, { favorite: !post.favorite })}
          className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 transition-colors"
          title="Favoritar"
        >
          <Star className={`w-4 h-4 ${post.favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
        </button>
      </div>

      {/* Arte */}
      <div className="p-4 pb-0">
        {post.previewImageUrl ? (
          <img
            src={post.previewImageUrl}
            alt={`Arte do dia ${post.dayNumber}`}
            className="rounded-xl w-full aspect-square object-cover border border-gray-800"
          />
        ) : (
          <div className="rounded-xl w-full aspect-square bg-[#252535] border border-gray-800 flex items-center justify-center text-gray-600 text-xs">
            Gere o calendário para ver a arte
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="px-4 py-4 flex-1">
        <p className="text-sm font-medium text-white mb-2 line-clamp-2">{post.hook}</p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-[11px] text-gray-400 hover:text-white transition-colors py-1"
        >
          <span>{expanded ? "Recolher legenda" : "Ver mais"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expanded && (
          <div className="p-3 rounded-xl bg-[#252535] border border-gray-800 text-xs text-gray-300 whitespace-pre-wrap max-h-56 overflow-y-auto">
            {displayCaption}
          </div>
        )}
      </div>

      {/* Barra de ações */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <button
          onClick={download}
          disabled={!post.previewImageUrl}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" /> Baixar
        </button>
        <button
          onClick={() => copy(displayCaption, "caption")}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1c1c28] border border-gray-700 text-gray-300 text-[11px] font-semibold hover:text-white hover:border-gray-500 transition-colors"
        >
          {copied === "caption" ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" /> Copiado!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copiar Legenda
            </>
          )}
        </button>
        <button
          onClick={newVariation}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1c1c28] border border-gray-700 text-gray-300 text-[11px] font-semibold hover:text-white hover:border-gray-500 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Gerar Nova Legenda
        </button>
        <button
          onClick={openInEditor}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-700/30 border border-gray-700 text-gray-300 text-[11px] font-semibold hover:bg-[var(--accent-pink)]/20 hover:text-white transition-colors"
        >
          <Video className="w-3.5 h-3.5" /> Criar Vídeo
        </button>
      </div>

      {/* Status */}
      <div className="px-4 pb-4">
        <button
          onClick={cycleStatus}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-700 text-[11px] text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          title="Clique para alternar o status"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          Status: {POST_STATUS_LABELS[post.status]}
        </button>
      </div>
    </div>
  );
}
