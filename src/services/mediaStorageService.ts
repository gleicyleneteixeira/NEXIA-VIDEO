/**
 * GalleryStorageService — persistência real dos vídeos gerados no IndexedDB.
 *
 * Guarda os binários (Blob) dos 3 trechos da combinação (hook/dev/cta) + o vídeo
 * final concatenado + miniatura, para que a Galeria possa recriar as blob URLs
 * após reload/HMR (ver MediaBlobManager) em vez de depender de strings mortas.
 */

import { StorageDB } from "@/utils/persistentStorage";
import {
  sanitizeAndDeduplicateVideos,
  deduplicateById,
} from "@/utils/videoDedup";

const GALLERY_KEY = "@nexia_gallery_videos_v1";

export interface GalleryMediaItem {
  id: string;
  name: string;
  hookIndex: number;
  devIndex: number;
  ctaIndex: number;
  hookBlob?: Blob;
  devBlob?: Blob;
  ctaBlob?: Blob;
  videoBlob?: Blob;
  thumbnailBase64?: string;
  createdAt: string;
  duration: number;
  /** id da linha no Supabase (rendered_videos) para correlacionar no reload */
  supabaseId?: string;
}

export interface GalleryMediaInput extends Omit<GalleryMediaItem, "id" | "createdAt"> {
  /** opcional: sobrescreve o id gerado automaticamente */
  id?: string;
}

export const GALLERY_RETENTION_HOURS = 72;

export function galleryExpiresInMs(createdAt: string | Date): number {
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return GALLERY_RETENTION_HOURS * 3600_000;
  return start + GALLERY_RETENTION_HOURS * 3600_000;
}

export function galleryRemainingLabel(createdAt: string | Date): string {
  const diff = galleryExpiresInMs(createdAt) - Date.now();
  const hours = Math.max(0, Math.floor(diff / 3600_000));
  if (hours >= 48) return `expira em ~${hours}h`;
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes <= 0) return "expirado";
  if (hours >= 1) return `expira em ${hours}h${String(Math.floor((minutes % 60) / 10) * 10).padStart(2, "0")}m`;
  return `expira em ${minutes}m`;
}

export const GalleryStorageService = {
  async saveGeneratedVideo(item: GalleryMediaInput): Promise<void> {
    const list: GalleryMediaItem[] = (await StorageDB.getItem(GALLERY_KEY)) || [];
    // Id estável: se já existe uma entrada para o mesmo supabaseId, reutiliza o
    // id original — jamais cria "clone fantasma" para o mesmo vídeo.
    const existingForSupabase = item.supabaseId
      ? list.find((v) => v.supabaseId === item.supabaseId)
      : undefined;
    const record: GalleryMediaItem = {
      id: existingForSupabase?.id || item.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: item.name,
      hookIndex: item.hookIndex,
      devIndex: item.devIndex,
      ctaIndex: item.ctaIndex,
      hookBlob: item.hookBlob ?? existingForSupabase?.hookBlob,
      devBlob: item.devBlob ?? existingForSupabase?.devBlob,
      ctaBlob: item.ctaBlob ?? existingForSupabase?.ctaBlob,
      videoBlob: item.videoBlob ?? existingForSupabase?.videoBlob,
      thumbnailBase64: item.thumbnailBase64 ?? existingForSupabase?.thumbnailBase64,
      createdAt: existingForSupabase?.createdAt || new Date().toISOString(),
      duration: item.duration || existingForSupabase?.duration || 0,
      supabaseId: item.supabaseId ?? existingForSupabase?.supabaseId,
    };
    const updated = sanitizeAndDeduplicateVideos([record, ...list]);
    await StorageDB.setItem(GALLERY_KEY, updated);
  },

  /** Salva um lote inteiro de uma vez, deduplicando por id e por supabaseId. */
  async saveBatch(items: GalleryMediaInput[]): Promise<void> {
    if (items.length === 0) return;
    const list: GalleryMediaItem[] = (await StorageDB.getItem(GALLERY_KEY)) || [];
    const incoming: GalleryMediaItem[] = items.map((item) => ({
      id: item.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: item.name,
      hookIndex: item.hookIndex,
      devIndex: item.devIndex,
      ctaIndex: item.ctaIndex,
      hookBlob: item.hookBlob,
      devBlob: item.devBlob,
      ctaBlob: item.ctaBlob,
      videoBlob: item.videoBlob,
      thumbnailBase64: item.thumbnailBase64,
      createdAt: new Date().toISOString(),
      duration: item.duration || 0,
      supabaseId: item.supabaseId,
    }));
    const merged = deduplicateById([...incoming, ...list], (v) => v.supabaseId || v.id);
    await StorageDB.setItem(GALLERY_KEY, merged);
  },

  /** Higieniza duplicados/órfãos existentes no IndexedDB e devolve a lista limpa. */
  async cleanCorruptedGalleryState(): Promise<GalleryMediaItem[]> {
    const currentList = await this.getGalleryVideos();
    const cleanList = deduplicateById(currentList, (v) => v.supabaseId || v.id);
    if (cleanList.length !== currentList.length) {
      await StorageDB.setItem(GALLERY_KEY, cleanList);
    }
    return cleanList;
  },

  async updateVideo(id: string, patch: Partial<GalleryMediaItem>): Promise<void> {
    const list = await this.getGalleryVideos();
    const updated = list.map((v) => (v.id === id ? { ...v, ...patch } : v));
    await StorageDB.setItem(GALLERY_KEY, sanitizeAndDeduplicateVideos(updated));
  },

  async getGalleryVideos(): Promise<GalleryMediaItem[]> {
    return (await StorageDB.getItem<GalleryMediaItem[]>(GALLERY_KEY)) || [];
  },

  async deleteVideo(id: string): Promise<void> {
    const list = await this.getGalleryVideos();
    const updated = list.filter((v) => v.id !== id);
    await StorageDB.setItem(GALLERY_KEY, updated);
  },

  async clearGallery(): Promise<void> {
    await StorageDB.setItem(GALLERY_KEY, []);
  },
};