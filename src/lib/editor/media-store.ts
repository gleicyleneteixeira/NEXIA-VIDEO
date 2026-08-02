import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";

export interface MediaFile {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  file: File;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  importedAt: number;
}

interface MediaState {
  files: MediaFile[];
  addFile: (file: File) => MediaFile;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

function getMediaType(file: File): MediaFile["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

export const useMediaStore = create<MediaState>()(
  persist(
    ((set: (partial: Partial<MediaState> | ((state: MediaState) => Partial<MediaState>)) => void, get: () => MediaState): MediaState => ({
      files: [],

      addFile: (file: File) => {
        const media: MediaFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: getMediaType(file),
          file,
          url: URL.createObjectURL(file),
          importedAt: Date.now(),
        };
        set((s: MediaState) => ({ files: [...s.files, media] }));
        return media;
      },

      removeFile: (id: string) =>
        set((s: MediaState) => {
          const file = s.files.find((f: MediaFile) => f.id === id);
          if (file?.url) URL.revokeObjectURL(file.url);
          return { files: s.files.filter((f: MediaFile) => f.id !== id) };
        }),

      clearFiles: () =>
        set((s: MediaState) => {
          s.files.forEach((f: MediaFile) => {
            if (f.url) URL.revokeObjectURL(f.url);
          });
          return { files: [] };
        }),
    })) as StateCreator<MediaState, [], [], MediaState>,
    {
      name: "contenthub-editor-media",
      partialize: () => ({}),
    }
  )
);
