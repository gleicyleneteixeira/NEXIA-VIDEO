import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";
import {
  persistMediaToIdb,
  deleteMediaFromIdb,
  getAllMediaFromIdb,
} from "./media-persistence";

export interface MediaFile {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  file: File;
  url: string;
  mediaUrl?: string; // permanent address on MinIO/S3
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  importedAt: number;
}

interface MediaState {
  files: MediaFile[];
  addFile: (file: File, duration?: number) => MediaFile;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  hydrate: () => Promise<MediaFile[]>;
  setMediaUrl: (id: string, url: string) => void;
}

function getMediaType(file: File): MediaFile["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

async function uploadToS3(file: File, mediaId: string): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/editor/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data?.success && data?.url) {
      window.dispatchEvent(
        new CustomEvent("editor-media-uploaded", { detail: { mediaId, url: data.url } })
      );
      return data.url;
    }
    return null;
  } catch {
    return null;
  }
}

export function mediaFileFromFile(file: File, duration?: number): MediaFile {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: getMediaType(file),
    file,
    url: URL.createObjectURL(file),
    importedAt: Date.now(),
    duration,
  };
}

export const useMediaStore = create<MediaState>()(
  persist(
    ((set: (partial: Partial<MediaState> | ((state: MediaState) => Partial<MediaState>)) => void): MediaState => ({
      files: [],

      addFile: (file: File, duration?: number) => {
        const media = mediaFileFromFile(file, duration);
        persistMediaToIdb({
          id: media.id,
          name: media.name,
          type: media.type,
          blob: file,
          importedAt: media.importedAt,
        });
        // Save permanent copy on MinIO/S3 in the background so the project
        // survives page reloads (and different machines).
        uploadToS3(file, media.id).then((url) => {
          if (url) {
            set((s: MediaState) => ({
              files: s.files.map((f) => (f.id === media.id ? { ...f, mediaUrl: url } : f)),
            }));
          }
        });
        set((s: MediaState) => ({ files: [...s.files, media] }));
        return media;
      },

      setMediaUrl: (id: string, url: string) =>
        set((s: MediaState) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, mediaUrl: url } : f)),
        })),

      // Objetos blob permanecem vivos durante toda a sessão: clipes na
      // timeline podem ainda referenciá-los. As URLs são coletadas pelo
      // navegador quando o File original sai de escopo (GC). Evita
      // ERR_FILE_NOT_FOUND ao remover mídia ainda usada no projeto.
      removeFile: (id: string) =>
        set((s: MediaState) => {
          deleteMediaFromIdb(id);
          return { files: s.files.filter((f: MediaFile) => f.id !== id) };
        }),

      clearFiles: () => set({ files: [] }),

      // Restore media persisted in IndexedDB (runs once on load).
      hydrate: async () => {
        const stored = await getAllMediaFromIdb();
        const files: MediaFile[] = stored.map((m) => {
          const file = new File([m.blob], m.name, {
            type: m.blob.type || (m.type === "image" ? "image/*" : m.type === "audio" ? "audio/*" : "video/*"),
          });
          const media: MediaFile = {
            id: m.id,
            name: m.name,
            type: m.type,
            file,
            url: URL.createObjectURL(file),
            importedAt: m.importedAt,
          };
          return media;
        });
        set({ files });
        return files;
      },
    })) as StateCreator<MediaState, [], [], MediaState>,
    {
      name: "contenthub-editor-media",
      partialize: () => ({}),
    }
  )
);
