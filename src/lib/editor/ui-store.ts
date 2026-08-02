import { create } from "zustand";
import type { StateCreator } from "zustand";

export interface Command {
  name: string;
  execute: () => void;
  undo: () => void;
}

interface UIState {
  selectedIds: Set<string>;
  zoom: number;
  isExporting: boolean;
  exportProgress: number;

  undoStack: Command[];
  redoStack: Command[];

  select: (id: string, multi?: boolean) => void;
  deselect: (id: string) => void;
  clearSelection: () => void;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;

  setExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;

  pushCommand: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

const ZOOM_LEVELS = [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8];

export const useUIStore = create<UIState>()(((set: (partial: Partial<UIState> | ((state: UIState) => Partial<UIState>)) => void, get: () => UIState): UIState => ({
  selectedIds: new Set<string>(),
  zoom: 1,
  isExporting: false,
  exportProgress: 0,
  undoStack: [],
  redoStack: [],

  select: (id: string, multi: boolean = false) =>
    set((s: UIState) => {
      const next = new Set(multi ? s.selectedIds : []);
      next.add(id);
      return { selectedIds: next };
    }),

  deselect: (id: string) =>
    set((s: UIState) => {
      const next = new Set(s.selectedIds);
      next.delete(id);
      return { selectedIds: next };
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  setZoom: (zoom: number) => set({ zoom: Math.max(0.1, Math.min(8, zoom)) }),

  zoomIn: () => {
    const { zoom } = get();
    const idx = ZOOM_LEVELS.findIndex((z: number) => z >= zoom);
    const next = ZOOM_LEVELS[Math.min(idx + 1, ZOOM_LEVELS.length - 1)];
    set({ zoom: next });
  },

  zoomOut: () => {
    const { zoom } = get();
    const idx = ZOOM_LEVELS.findIndex((z: number) => z >= zoom);
    const prev = ZOOM_LEVELS[Math.max(idx - 1, 0)];
    set({ zoom: prev });
  },

  setExporting: (isExporting: boolean) => set({ isExporting }),
  setExportProgress: (exportProgress: number) => set({ exportProgress }),

  pushCommand: (cmd: Command) =>
    set((s: UIState) => {
      cmd.execute();
      return {
        undoStack: [...s.undoStack, cmd],
        redoStack: [],
      };
    }),

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const cmd = undoStack[undoStack.length - 1];
    cmd.undo();
    set((s: UIState) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, cmd],
    }));
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const cmd = redoStack[redoStack.length - 1];
    cmd.execute();
    set((s: UIState) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, cmd],
    }));
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  clearHistory: () => set({ undoStack: [], redoStack: [] }),
})) as StateCreator<UIState, [], [], UIState>);
