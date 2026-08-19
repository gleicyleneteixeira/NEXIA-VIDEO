"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Trash2,
  Download,
  Clock,
  RefreshCw,
  CheckCircle2,
  History,
  AlertTriangle,
  Copy,
  Upload,
  X,
} from "lucide-react";
import {
  ScriptHistoryService,
  SavedScriptProject,
} from "@/services/scriptHistoryService";

interface ScriptHistoryPanelProps {
  refreshToken: number;
  onLoad?: (project: SavedScriptProject) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildExportFile(projects: SavedScriptProject[]): string {
  return JSON.stringify(projects, null, 2);
}

function buildTxtFile(projects: SavedScriptProject[]): string {
  return projects
    .map((p) => {
      const parts = [
        `== ${p.topic} (${p.niche || "Geral"}) ==`,
        `Data: ${new Date(p.createdAt).toLocaleString("pt-BR")}`,
        `Quantidade: ${p.variationsCount}`,
        "",
        ...p.variations.map((v, i) => {
          return [
            `--- Roteiro ${i + 1}: ${v.headline} (${v.angleName}) ---`,
            `HOOK:`,
            v.hook,
            ``,
            `DESENVOLVIMENTO:`,
            v.development,
            ``,
            `CTA:`,
            v.cta,
            ``,
          ].join("\n");
        }),
      ];
      return parts.join("\n");
    })
    .join("\n\n\n");
}

export default function ScriptHistoryPanel({ refreshToken, onLoad }: ScriptHistoryPanelProps) {
  const [projects, setProjects] = useState<SavedScriptProject[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ScriptHistoryService.getHistory();
      setProjects(list);
      setSelected((prev) => prev.filter((id) => list.some((p) => p.id === id)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, refreshToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      if (p.topic.toLowerCase().includes(q)) return true;
      if (p.niche.toLowerCase().includes(q)) return true;
      return p.variations.some(
        (v) =>
          v.headline.toLowerCase().includes(q) ||
          v.angleName.toLowerCase().includes(q) ||
          v.hook.toLowerCase().includes(q)
      );
    });
  }, [projects, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.includes(p.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => prev.filter((id) => !filtered.some((p) => p.id === id)));
    } else {
      const ids = filtered.map((p) => p.id);
      setSelected((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const handleDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmDeleteIds(ids);
  };

  const executeDelete = async (ids: string[]) => {
    if (ids.length === 1) {
      await ScriptHistoryService.deleteProject(ids[0]);
    } else {
      await ScriptHistoryService.deleteMultipleProjects(ids);
    }
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    setConfirmDeleteIds(null);
    await load();
  };

  const handleClearAll = () => {
    if (projects.length === 0) return;
    setConfirmClear(true);
  };

  const executeClearAll = async () => {
    await ScriptHistoryService.clearAllHistory();
    setSelected([]);
    setConfirmClear(false);
    await load();
  };

  const handleExport = (ids: string[]) => {
    const target = projects.filter((p) => ids.includes(p.id));
    if (target.length === 0) return;
    const blob = new Blob([buildExportFile(target)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexia-roteiros-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = (ids: string[]) => {
    const target = projects.filter((p) => ids.includes(p.id));
    if (target.length === 0) return;
    const blob = new Blob([buildTxtFile(target)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexia-roteiros-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCaption = async (p: SavedScriptProject) => {
    const caption = p.variations.map((v) => v.fullCaption).join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <div className="glass-card rounded-[var(--radius)] p-5 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tema, nicho, headline ou angulo..."
            className="input-field flex-1 px-3 py-2 rounded-[10px] text-sm"
          />
        </div>
        <button
          onClick={toggleSelectAll}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--primary)]/40 transition-all disabled:opacity-40"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
        </button>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white transition-all"
          title="Recarregar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClearAll}
          disabled={projects.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/25 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all disabled:opacity-40"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Limpar tudo
        </button>
      </div>

      {/* Mass actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--text-secondary)]">
            {selected.length} selecionado{selected.length > 1 ? "s" : ""}:
          </span>
          <button
            onClick={() => handleDelete(selected)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/25 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir selecionados
          </button>
          <button
            onClick={() => handleExport(selected)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/25 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar ({selected.length})
          </button>
          <button
            onClick={() => handleExportTxt(selected)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--accent-orange)]/15 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/25 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar .TXT
          </button>
        </div>
      )}

      {/* Gallery */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-[var(--text-secondary)]">
          <History className="w-8 h-8 opacity-40" />
          <p className="text-sm">Carregando historico...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-[var(--text-secondary)]">
          <History className="w-10 h-10 opacity-30" />
          <p className="text-lg font-bold">Nenhum roteiro encontrado</p>
          <p className="text-sm text-center max-w-xs">
            {search.trim()
              ? "Nada corresponde a essa busca."
              : "Gere roteiros em 'Criar Roteiro' para eles aparecerem aqui automaticamente."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`border rounded-[12px] p-4 transition-all ${
                selected.includes(p.id)
                  ? "border-[var(--primary)]/50 bg-[var(--primary)]/5"
                  : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--border)] hover:bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="mt-1 w-4 h-4 accent-[var(--primary)] cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white truncate">{p.topic}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {onLoad && (
                        <button
                          onClick={() => onLoad(p)}
                          className="text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
                          title="Carregar na tela de criacao"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => void handleCopyCaption(p)}
                        className="text-[var(--text-secondary)] hover:text-white transition-colors"
                        title="Copiar legendas completas"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void handleExport([p.id])}
                        className="text-[var(--text-secondary)] hover:text-white transition-colors"
                        title="Exportar projeto"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete([p.id])}
                        className="text-[var(--danger)] hover:text-[var(--danger)]/80 transition-colors"
                        title="Excluir projeto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)]">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                      {p.niche || "Geral"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(p.createdAt)}
                    </span>
                    <span>{p.variationsCount} roteiros</span>
                  </div>
                  {p.variations[0] && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-zinc-300/80 bg-black/20 rounded-[8px] px-3 py-2">
                      <span className="font-bold text-pink-400 shrink-0">HOOK</span>
                      <span className="line-clamp-2">{p.variations[0].hook}</span>
                    </div>
                  )}
                  {p.variations.length > 1 && (
                    <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                      + {p.variations.length - 1} variacao(acoes)...
                    </p>
                  )}
                </div>
              </div>
              {copied === p.id && (
                <p className="mt-2 text-[11px] text-[var(--accent-green)] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Legendas copiadas!
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmacao de exclusao */}
      {confirmDeleteIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDeleteIds(null)}>
          <div className="glass-card rounded-[16px] p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--danger)]/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir do historico?</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {confirmDeleteIds.length === 1
                    ? "Este projeto sera removido permanentemente."
                    : `${confirmDeleteIds.length} projetos serao removidos permanentemente.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteIds(null)}
                className="px-4 py-2 rounded-[10px] text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void executeDelete(confirmDeleteIds)}
                className="px-4 py-2 rounded-[10px] text-sm font-semibold bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmacao: limpar tudo */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmClear(false)}>
          <div className="glass-card rounded-[16px] p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--danger)]/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Limpar todo o historico?</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Todos os {projects.length} projetos serao removidos permanentemente.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 rounded-[10px] text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void executeClearAll()}
                className="px-4 py-2 rounded-[10px] text-sm font-semibold bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Limpar tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}