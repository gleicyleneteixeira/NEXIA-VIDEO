"use client";

/**
 * Import pendente de um post do calendário para o editor.
 * O card "Criar Vídeo no Editor" grava aqui a arte (dataURL) e o gancho;
 * a página do editor consome no mount para inserir a imagem na trilha de
 * vídeo e o gancho na trilha de texto.
 */

export interface PendingPostImport {
  imageDataUrl: string;
  hook: string;
  dayNumber: number;
  pillarLabel: string;
  format: string;
  scriptTexts?: string[];
}

let pending: PendingPostImport | null = null;

export function setPendingPostImport(importItem: PendingPostImport): void {
  pending = importItem;
}

export function consumePendingPostImport(): PendingPostImport | null {
  const item = pending;
  pending = null;
  return item;
}

export function hasPendingPostImport(): boolean {
  return pending !== null;
}