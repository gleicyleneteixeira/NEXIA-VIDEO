"use client";

import { useEffect, useState } from "react";
import { useProjectsStore, createBlankProject } from "@/lib/editor/projects-store";
import { useProjectStore } from "@/lib/editor/project-store";
import { usePlaybackStore } from "@/lib/editor/playback-store";
import { Trash2, FolderOpen, Plus, X } from "lucide-react";

type EditorProject = ReturnType<typeof useProjectsStore.getState>["drafts"][number];

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "editado agora mesmo";
    if (min < 60) return `editado há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `editado há ${h} h`;
    const d = Math.floor(h / 24);
    return `editado há ${d} d`;
  } catch {
    return "";
  }
}

export default function ProjectsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const drafts = useProjectsStore((s) => s.drafts);
  const activeId = useProjectsStore((s) => s.activeId);
  const openDraft = useProjectsStore((s) => s.open);
  const remove = useProjectsStore((s) => s.remove);
  const rename = useProjectsStore((s) => s.rename);
  const createNew = useProjectsStore((s) => s.createNew);
  const refresh = useProjectsStore((s) => s.refresh);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const sorted = [...drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const handleOpen = (id: string) => {
    const ep = openDraft(id);
    if (ep?.project) {
      useProjectStore.getState().setProject(ep.project);
      if (typeof ep.currentTime === "number") usePlaybackStore.getState().seekTo(ep.currentTime);
      onClose();
    }
  };

  const handleNew = () => {
    createNew();
    useProjectStore.getState().setProject(createBlankProject());
    onClose();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Excluir o projeto "${name}"? Esta ação não pode ser desfeita.`)) {
      remove(id);
    }
  };

  const commitRename = () => {
    if (editingId && draftName.trim()) rename(editingId, draftName.trim());
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[720px] max-w-[94vw] max-h-[84vh] bg-[#0d0d16] border border-[#1e1e2e] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e2e]">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">📁 Meus Projetos</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#1e1e2e] rounded text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#1e1e2e]">
          <button
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Novo projeto
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {sorted.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-10">
              Nenhum rascunho ainda. Edite um vídeo e ele será salvo automaticamente aqui.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {sorted.map((d: EditorProject) => {
                const isActive = d.id === activeId;
                const itemCount = d.project?.timeline.items.length ?? 0;
                return (
                  <div
                    key={d.id}
                    onDoubleClick={() => handleOpen(d.id)}
                    className={`rounded-xl border overflow-hidden flex flex-col cursor-pointer transition-colors ${
                      isActive ? "border-purple-500/60 bg-purple-500/10" : "border-[#1e1e2e] bg-[#0a0a12] hover:border-[#2a2a3a]"
                    }`}
                  >
                    <div className="h-28 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a12] relative">
                      {d.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.thumbnailUrl} alt={d.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                          {itemCount} clipe{itemCount === 1 ? "" : "s"}
                        </div>
                      )}
                      {isActive && (
                        <span className="absolute top-1 right-1 text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded">
                          ativo
                        </span>
                      )}
                    </div>

                    <div className="p-2 flex flex-col gap-1">
                      {editingId === d.id ? (
                        <input
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => e.key === "Enter" && commitRename()}
                          className="bg-[#13131f] text-white text-xs rounded px-2 py-1 outline-none border border-purple-500/50"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(d.id);
                            setDraftName(d.name);
                          }}
                          className="text-left text-white text-xs font-medium truncate hover:text-purple-300"
                          title="Clique para renomear"
                        >
                          {d.name}
                        </button>
                      )}
                      <span className="text-[10px] text-gray-500">{relativeTime(d.updatedAt)}</span>

                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => handleOpen(d.id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs"
                        >
                          <FolderOpen size={13} /> Abrir
                        </button>
                        <button
                          onClick={() => handleDelete(d.id, d.name)}
                          className="p-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/30 text-red-300"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-2 border-t border-[#1e1e2e] text-[10px] text-gray-600">
          Dica: clique duplo em um card também abre o projeto.
        </div>
      </div>
    </div>
  );
}
