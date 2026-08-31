"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Film,
  Music,
  Loader2,
  AlertTriangle,
  Globe,
  Star,
  Trash2,
  FileText,
  Copy,
  Clipboard,
  Calendar,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface GalleryItem {
  id: string;
  title: string;
  media_url: string;
  original_url: string | null;
  media_type: "video" | "audio";
  is_favorite: boolean;
  transcription: string | null;
  created_at: string;
}

type Filter = "all" | "favorites";

export default function MediaGalleryTab() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (filter === "favorites") params.set("favorites", "true");
      const res = await fetch(`/api/media-gallery?${params.toString()}`);
      const data = await res.json();
      if (data.setup_required) setNeedsSetup(true);
      if (data.success) setItems(data.items || []);
    } catch {
      setError("Falha ao carregar galeria.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const toggleFavorite = async (item: GalleryItem) => {
    try {
      const res = await fetch("/api/media-gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_favorite: !item.is_favorite }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i))
        );
      }
    } catch {}
  };

  const deleteItem = async (item: GalleryItem) => {
    if (item.is_favorite) return;
    try {
      const res = await fetch(`/api/media-gallery?id=${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    } catch {}
  };

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const favCount = items.filter((i) => i.is_favorite).length;

  return (
    <div className="glass-card rounded-[var(--radius)] p-6 space-y-5 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-pink)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--accent-orange)]/15">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Galeria de Midias</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Videos e audios salvos na nuvem. Favoritos nunca sao excluidos automaticamente.
          </p>
        </div>
      </div>

      {needsSetup && (
        <div className="p-4 rounded-[12px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
          <p className="font-semibold mb-1">Configuracao necessaria</p>
          <p className="text-[11px] opacity-80">
            A tabela <code>media_gallery</code> nao existe no Supabase. Execute o SQL da migration{" "}
            <code>008_create_media_gallery.sql</code> no SQL Editor do painel Supabase.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-[12px] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--text-secondary)] font-medium">Filtrar:</span>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-[8px] text-xs font-medium transition-all ${
            filter === "all"
              ? "bg-[var(--primary)]/15 text-[var(--primary)]"
              : "text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Todas ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("favorites")}
          className={`flex items-center gap-1 px-3 py-1 rounded-[8px] text-xs font-medium transition-all ${
            filter === "favorites"
              ? "bg-yellow-500/15 text-yellow-400"
              : "text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          <Star className="w-3 h-3" />
          Favoritas ({favCount})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando galeria...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
          <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma midia salva ainda.</p>
          <p className="text-xs mt-1">Use a aba "Baixar Midia" para enviar arquivos por URL.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-[14px] border overflow-hidden transition-all ${
                  item.is_favorite
                    ? "border-yellow-500/40 bg-yellow-500/5"
                    : "border-[var(--border)] bg-[var(--surface)]/50"
                }`}
              >
                <div className="relative bg-black/40 aspect-video flex items-center justify-center">
                  {item.media_type === "video" ? (
                    <video
                      src={item.media_url}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <Music className="w-10 h-10 text-[var(--accent-pink)]" />
                      <audio src={item.media_url} controls className="w-full max-w-[200px]" preload="metadata" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(item)}
                    className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-sm transition-colors ${
                      item.is_favorite
                        ? "bg-yellow-500/30 text-yellow-400"
                        : "bg-black/40 text-white/60 hover:text-yellow-400"
                    }`}
                    title={item.is_favorite ? "Remover favorito" : "Favoritar"}
                  >
                    <Star className="w-4 h-4" fill={item.is_favorite ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-white truncate" title={item.title}>
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    {item.original_url && (
                      <a
                        href={item.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[var(--primary)] hover:underline ml-auto"
                      >
                        <ExternalLink className="w-3 h-3" /> Original
                      </a>
                    )}
                  </div>

                  {item.transcription && (
                    <div className="relative">
                      <div
                        className={`p-2 rounded-[8px] bg-[var(--primary)]/5 border border-[var(--primary)]/10 text-xs text-[var(--text-secondary)] ${
                          isExpanded ? "max-h-48 overflow-y-auto" : "max-h-16 overflow-hidden"
                        }`}
                      >
                        {item.transcription}
                      </div>
                      {item.transcription.length > 120 && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="mt-1 flex items-center gap-0.5 text-[10px] text-[var(--primary)] hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {isExpanded ? "Recolher" : "Expandir"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-1">
                    {item.transcription && (
                      <button
                        type="button"
                        onClick={() => void copyText(item.transcription!, item.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40 transition-all"
                      >
                        {copiedId === item.id ? <Check className="w-3 h-3 text-[var(--accent-green)]" /> : <Copy className="w-3 h-3" />}
                        {copiedId === item.id ? "Copiado!" : "Copiar Texto"}
                      </button>
                    )}

                    {!item.is_favorite && (
                      <button
                        type="button"
                        onClick={() => void deleteItem(item)}
                        className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-[8px] text-[11px] text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
