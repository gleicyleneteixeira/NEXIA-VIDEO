"use client";
 
import { useState } from "react";
import {
  Clock,
  Trash2,
  Eye,
  ArrowLeft,
  Loader2,
  FileText,
  Tag,
  CheckCircle2,
  Film,
} from "lucide-react";
import Link from "next/link";
import { useGeneratedScripts, GeneratedScript } from "@/hooks/useGeneratedScripts";
import ContentCard, { Variation } from "@/components/ContentCard";
 
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
  const { scripts, isLoading, deleteScript, toggleVideoGenerated } = useGeneratedScripts();
  const [viewing, setViewing] = useState<GeneratedScript | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
 
  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este roteiro?")) return;
    await deleteScript(id);
    if (viewing?.id === id) setViewing(null);
  };
 
  const filteredScripts = scripts.filter((s) => {
    if (statusFilter === "pending") return !s.video_generated;
    if (statusFilter === "completed") return s.video_generated;
    return true;
  });
 
  // Viewing mode — show the saved feed
  if (viewing) {
    const cards = (viewing.cards_data || []) as Variation[];
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
              <h1 className="text-2xl font-bold tracking-tight mb-1">{viewing.tema}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                {viewing.duracao && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
                    <Clock className="w-3 h-3" /> {viewing.duracao}
                  </span>
                )}
                {viewing.objetivos && viewing.objetivos.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
                    <Tag className="w-3 h-3" /> {viewing.objetivos.join(", ")}
                  </span>
                )}
                <span>{cards.length} videos</span>
                <span>{new Date(viewing.created_at).toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <button
              onClick={async () => {
                const ok = await toggleVideoGenerated(viewing.id, viewing.video_generated);
                if (ok) {
                  setViewing({ ...viewing, video_generated: !viewing.video_generated });
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border transition-colors text-xs font-semibold ${
                viewing.video_generated
                  ? "bg-[var(--accent-green)]/15 border-[var(--accent-green)]/30 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/25"
                  : "bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800/90 hover:text-gray-300"
              }`}
            >
              {viewing.video_generated ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Vídeo Gerado</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Vídeo Pendente</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {cards.map((v, i) => (
            <ContentCard key={i} index={i} variation={v} theme={viewing.tema} />
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
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Roteiros <span className="gradient-text">Salvos</span>
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-[15px] mt-1">
          Historico de todas as geracoes de conteudo
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
          Todos ({scripts.length})
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            statusFilter === "pending"
              ? "border-[var(--primary)] text-white"
              : "border-transparent text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Vídeo Pendente ({scripts.filter(s => !s.video_generated).length})
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            statusFilter === "completed"
              ? "border-[var(--primary)] text-white"
              : "border-transparent text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Vídeo Gerado ({scripts.filter(s => s.video_generated).length})
        </button>
      </div>
 
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Carregando historico...</p>
        </div>
      )}
 
      {!isLoading && scripts.length === 0 && (
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
 
      {!isLoading && scripts.length > 0 && filteredScripts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
          <p className="text-base font-semibold mb-1">Nenhum roteiro corresponde ao filtro</p>
          <p className="text-xs">Altere a aba de filtro no topo para ver outros roteiros.</p>
        </div>
      )}
 
      {!isLoading && filteredScripts.length > 0 && (
        <div className="space-y-3">
          {filteredScripts.map((s) => {
            const cards = (s.cards_data || []) as Variation[];
            const objLabel = s.objetivos && s.objetivos.length > 0
              ? s.objetivos.length > 2
                ? s.objetivos.slice(0, 2).join(", ") + " +" + (s.objetivos.length - 2)
                : s.objetivos.join(", ")
              : null;
 
            return (
              <div
                key={s.id}
                className="glass-card rounded-[var(--radius)] p-4 flex items-center justify-between gap-4 group animate-slide-up"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate mb-1">{s.tema}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <TimeAgo date={s.created_at} />
                    </span>
                    {s.duracao && (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                        {s.duracao}
                      </span>
                    )}
                    {objLabel && (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/8 border border-[var(--primary)]/15 text-[var(--primary)]">
                        {objLabel}
                      </span>
                    )}
                    <span>{cards.length} videos</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Interactive status flag */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleVideoGenerated(s.id, s.video_generated);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border transition-colors text-xs font-medium ${
                      s.video_generated
                        ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/20"
                        : "bg-gray-800/40 border-gray-700/60 text-gray-400 hover:bg-gray-800/80 hover:text-gray-300"
                    }`}
                    title={s.video_generated ? "Marcar como pendente" : "Marcar como vídeo gerado"}
                  >
                    {s.video_generated ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Vídeo Gerado</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Vídeo Pendente</span>
                      </>
                    )}
                  </button>
 
                  <button
                    onClick={() => setViewing(s)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-2.5 py-2 rounded-[8px] bg-[var(--danger)]/8 border border-[var(--danger)]/15 text-[var(--danger)] text-xs hover:bg-[var(--danger)]/15 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
