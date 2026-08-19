/**
 * persistentMediaVault — cofre binário persistente (IndexedDB).
 *
 * Garante que o arquivo binário REAL (Blob/File) de cada mídia fique gravado
 * com chave única, permitindo recriar blob URLs ativas após reload/HMR e
 * recuperar os cortes fonte mesmo quando o projeto é reaberto.
 *
 * Implementado sobre o StorageDB IndexedDB (sem dependência externa `idb`).
 */
"use client";

import { StorageDB } from "@/utils/persistentStorage";

const KEY_PREFIX = "media-vault";

export const mediaVaultKey = (mediaId: string): string => `${KEY_PREFIX}/${mediaId}`;

export const MediaVault = {
  /** Grava o arquivo binário real no banco. */
  async storeMedia(mediaId: string, fileOrBlob: Blob | File): Promise<void> {
    if (!fileOrBlob) return;
    await StorageDB.setItem(mediaVaultKey(mediaId), fileOrBlob);
  },

  /** Grava apenas se ainda não existir (evita duplicar/quota). */
  async storeMediaIfMissing(mediaId: string, fileOrBlob: Blob | File): Promise<void> {
    const existing = await this.retrieveMedia(mediaId);
    if (existing) return;
    await this.storeMedia(mediaId, fileOrBlob);
  },

  /** Recupera o Blob/File original. */
  async retrieveMedia(mediaId: string): Promise<Blob | null> {
    try {
      const blob = await StorageDB.getItem<Blob>(mediaVaultKey(mediaId));
      return blob instanceof Blob ? blob : null;
    } catch {
      return null;
    }
  },

  /** Recupera e recria uma blob URL ativa a partir do binário salvo. */
  async retrieveMediaUrl(mediaId: string): Promise<string | null> {
    const blob = await this.retrieveMedia(mediaId);
    return blob ? URL.createObjectURL(blob) : null;
  },

  /** Verifica se o arquivo existe fisicamente no banco local. */
  async hasMedia(mediaId: string): Promise<boolean> {
    return (await this.retrieveMedia(mediaId)) !== null;
  },

  /** Remove o arquivo (ex.: ao excluir projeto). */
  async deleteMedia(mediaId: string): Promise<void> {
    await StorageDB.removeItem(mediaVaultKey(mediaId));
  },
};