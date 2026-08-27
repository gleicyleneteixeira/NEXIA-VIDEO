"use client";

/**
 * Fila de arquivos de mídia pendentes vindos de outras telas (ex.: Criação em
 * Massa) para o editor de vídeo. A página do editor consome no mount e insere
 * os arquivos na timeline, em ordem.
 *
 * Cada item pode trazer uma `duration` (em segundos) já conhecida — usada para
 * vídeos finalizados enviados da Criação em Massa, evitando o truncamento que
 * acontecia quando a duração era deduzida de metadados ausentes.
 */

export interface PendingImportItem {
  file: File;
  /** Duração conhecida em segundos (opcional). */
  duration?: number;
  /** Nome sugerido para o projeto criado a partir deste envio. */
  projectName?: string;
}

let pendingItems: PendingImportItem[] | null = null;

export function setPendingFileImport(items: PendingImportItem[] | File[]): void {
  pendingItems = (items as Array<File | PendingImportItem>).map((x) =>
    x instanceof File ? { file: x } : x
  );
}

export function consumePendingFileImport(): PendingImportItem[] | null {
  const items = pendingItems;
  pendingItems = null;
  return items;
}

export function hasPendingFileImport(): boolean {
  return pendingItems !== null && pendingItems.length > 0;
}
