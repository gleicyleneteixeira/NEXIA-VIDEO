"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Trash2,
  Eye,
  ArrowLeft,
  Loader2,
  FileText,
  Tag,
  CheckCircle2,
  History,
} from "lucide-react";
import Link from "next/link";
import ContentCard from "@/components/ContentCard";
import {
  ScriptHistoryService,
  SavedScriptProject,
  savedVariationToVariation,
} from "@/services/scriptHistoryService";

function TimeAgo({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  let text = "";
  if (diffMin < 1) text = "Agora";
  else if (diffMin < 60) text = diffMin + "min atras";
  else if (diffH < 24) text = diffH + "h atras";
  else text = diffD + "d atras";

  return <span title={d.toLocaleString("pt-BR")}>{text}</span>;
}

export default function HistoryPage() {
  const [projects, setProjects] = useState<SavedScriptProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<SavedScriptProject | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ScriptHistoryService.getHistory();
      setProjects(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este roteiro?")) return;
    await ScriptHistoryService.deleteProject(id);
    if (viewing?.id === id) setViewing(null);
    await load();
  };

  const handleToggleVideo = async (p: SavedScriptProject) => {
    const next = !p.videoGenerated;
    await ScriptHistoryService.updateProject(p.id, { videoGenerated: next });
    setViewing((cur) => (cur && cur.id === p.id ? { ...cur, videoGenerated: next } : cur));
    await load();
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === "pending") return !p.videoGenerated;
    if (statusFilter === "completed") return !!p.videoGenerated;
    return true;
  });

  // Viewing mode — show the saved feed
  if (viewing) {
    const cards = viewing.variations.map(savedVariationToVariation);
    return (
      <div className="max-w-7xl mx-auto stagger">
        <div className="mb-6 animate-fade-in">
          <button
            onClick={() => setViewing(null)}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar ao Historico
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">{viewing.topic}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
                  <Tag className="w-3 h-3" /> {viewing.niche || "Geral"}
                </span>
                <span>{cards.length} videos</span>
                <span>{new Date(viewing.createdAt).toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <button
              onClick={() => void handleToggleVideo(viewing)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border transition-colors text-xs font-semibold ${
                viewing.videoGenerated
                  ? "bg-[var(--accent-green)]/15 border-[var(--accent-green)]/30 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/25"
                  : "bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800/90 hover:text-gray-300"
              }`}
            >
              {viewing.videoGenerated ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Video Gerado</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Video Pendente</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {cards.map((v, i) => (
            <ContentCard key={i} index={i} variation={v} theme={viewing.topic} />
          ))}
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div className="max-w-5xl mx-auto stagger">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--accent-cyan)]/15">
            <History className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Roteiros <span className="gradient-text">Salvos</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-[15px] mt-1">
          Historico de todas as geracoes de conteudo (salvo localmente no navegador)
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] mb-6 gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            statusFilter === "all"
              ? "border-[var(--primary)] text-white"
              : "border-transparent text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Todos ({projects.length})
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            statusFilter === "pending"
              ? "border-[var(--primary)] text-white"
              : "border-transparent text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Video Pendente ({projects.filter((p) => !p.videoGenerated).length})
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            statusFilter === "completed"
              ? "border-[var(--primary)] text-white"
              : "border-transparent text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Video Gerado ({projects.filter((p) => !!p.videoGenerated).length})
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Carregando historico...</p>
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
          <div className="w-20 h-20 rounded-[20px] bg-[var(--primary)]/5 flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 opacity-20" />
          </div>
          <p className="text-lg font-bold mb-1">Nenhum roteiro salvo</p>
          <p className="text-sm mb-4">Gere conteudo no Gerador para aparecer aqui</p>
          <Link href="/script" className="btn-primary px-5 py-2.5 rounded-[10px] text-sm">
            Ir para o Gerador
          </Link>
        </div>
      )}

      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
          <p className="text-base font-semibold mb-1">Nenhum roteiro corresponde ao filtro</p>
          <p className="text-xs">Altere a aba de filtro no topo para ver outros roteiros.</p>
        </div>
      )}

      {!loading && filteredProjects.length > 0 && (
        <div className="space-y-3">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="glass-card rounded-[var(--radius)] p-4 flex items-center justify-between gap-4 group animate-slide-up"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate mb-1">{p.topic}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <TimeAgo date={p.createdAt} />
                  </span>
                  {p.niche && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                      {p.niche}
                    </span>
                  )}
                  <span>{p.variations.length} videos</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => void handleToggleVideo(p)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border transition-colors text-xs font-medium ${
                    p.videoGenerated
                      ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/20"
                      : "bg-gray-800/40 border-gray-700/60 text-gray-400 hover:bg-gray-800/80 hover:text-gray-300"
                  }`}
                  title={p.videoGenerated ? "Marcar como pendente" : "Marcar como video gerado"}
                >
                  {p.videoGenerated ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Video Gerado</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Video Pendente</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setViewing(p)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </button>
                <button
                  onClick={() => void handleDelete(p.id)}
                  className="px-2.5 py-2 rounded-[8px] bg-[var(--danger)]/8 border border-[var(--danger)]/15 text-[var(--danger)] text-xs hover:bg-[var(--danger)]/15 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}