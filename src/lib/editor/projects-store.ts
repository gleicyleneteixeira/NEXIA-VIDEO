import { create } from "zustand";
import type { StateCreator } from "zustand";
import type { Project } from "./types";
import { createDefaultProject, generateId } from "./types";
import {
  type EditorProject,
  listProjects,
  getProject,
  saveProject,
  deleteProject,
  createProjectId,
  buildEditorProject,
} from "@/services/projectStorageService";

interface ProjectsState {
  drafts: EditorProject[];
  activeId: string | null;
  /** Recarrega a lista do banco local. */
  refresh: () => void;
  /**
   * Salva o projeto atual como rascunho. Se já houver um rascunho ativo,
   * atualiza-o; caso contrário, cria um novo. Retorna o id do rascunho.
   */
  saveCurrent: (
    project: Project,
    opts?: { name?: string; thumbnailUrl?: string; currentTime?: number; totalDuration?: number }
  ) => string;
  /** Cria um novo rascunho em branco e o torna o ativo. Retorna o id. */
  createNew: (name?: string) => string;
  /** Retorna o projeto de um rascunho (com snapshot) e o marca como ativo. */
  open: (id: string) => EditorProject | null;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  setActive: (id: string | null) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  ((set, get) => ({
    drafts: typeof window !== "undefined" ? listProjects() : [],
    activeId: null,

    refresh: () => set({ drafts: listProjects() }),

    saveCurrent: (project, opts) => {
      const id = get().activeId || createProjectId();
      const existing = get().drafts.find((d) => d.id === id);
      const ep = buildEditorProject({
        id,
        name: opts?.name || existing?.name || "Projeto sem título",
        thumbnailUrl: opts?.thumbnailUrl ?? existing?.thumbnailUrl,
        currentTime: opts?.currentTime ?? existing?.currentTime ?? 0,
        totalDuration: opts?.totalDuration ?? existing?.totalDuration ?? 0,
        tracks: existing?.tracks ?? [],
        project,
      });
      saveProject(ep);
      const drafts = listProjects();
      set({ activeId: id, drafts });
      return id;
    },

    createNew: (name) => {
      const id = createProjectId();
      const ep = buildEditorProject({
        id,
        name: name || "Projeto sem título",
        project: createDefaultProject(),
      });
      saveProject(ep);
      set({ activeId: id, drafts: listProjects() });
      return id;
    },

    open: (id) => {
      const ep = getProject(id);
      if (!ep) return null;
      set({ activeId: id, drafts: listProjects() });
      return ep;
    },

    remove: (id) => {
      deleteProject(id);
      set((s) => ({
        drafts: listProjects(),
        activeId: s.activeId === id ? null : s.activeId,
      }));
    },

    rename: (id, name) => {
      const ep = getProject(id);
      if (ep) saveProject({ ...ep, name });
      set({ drafts: listProjects() });
    },

    setActive: (id) => set({ activeId: id }),
  })) as StateCreator<ProjectsState, [], [], ProjectsState>
);

export function createBlankProject(): Project {
  return createDefaultProject();
}
