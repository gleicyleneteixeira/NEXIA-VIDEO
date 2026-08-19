"use client";

import { StorageDB } from "@/utils/persistentStorage";

export interface TranscriptionHistoryItem {
  id: string;
  title: string;
  fullText: string;
  originalFileName: string;
  charCount: number;
  wordCount: number;
  createdAt: string;
}

const STORAGE_KEY = "@nexia_transcriptions_history_v1";

export const TranscriptionHistoryService = {
  /**
   * Extrai o gancho inicial (primeira frase ate ponto final/interrogacao ou
   * ate ~70 caracteres) para usar como titulo inteligente do registro.
   */
  generateTitleFromText(text: string, fallbackName: string): string {
    const clean = text.trim();
    if (!clean) return fallbackName || "Transcricao sem titulo";

    const firstSentenceMatch = clean.match(/^[^.!?\n]+/);
    const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : clean;

    if (firstSentence.length > 70) {
      return firstSentence.substring(0, 70) + "...";
    }
    return firstSentence;
  },

  async getAll(): Promise<TranscriptionHistoryItem[]> {
    const data = await StorageDB.getItem<TranscriptionHistoryItem[]>(STORAGE_KEY);
    return data || [];
  },

  async saveItem(
    text: string,
    originalFileName: string
  ): Promise<TranscriptionHistoryItem> {
    const history = await this.getAll();
    const trimmed = text.trim();

    // Evita duplicar o mesmo texto transcrito consecutivamente (topo da lista)
    if (history[0] && history[0].fullText === text) return history[0];

    const newItem: TranscriptionHistoryItem = {
      id: `transc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: this.generateTitleFromText(trimmed, originalFileName),
      fullText: text,
      originalFileName: originalFileName || "Arquivo de midia",
      charCount: trimmed.length,
      wordCount: trimmed.split(/\s+/).length,
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...history];
    await StorageDB.setItem(STORAGE_KEY, updated);
    return newItem;
  },

  async deleteItem(id: string): Promise<void> {
    const history = await this.getAll();
    const updated = history.filter((item) => item.id !== id);
    await StorageDB.setItem(STORAGE_KEY, updated);
  },

  async clearAll(): Promise<void> {
    await StorageDB.setItem(STORAGE_KEY, []);
  },
};