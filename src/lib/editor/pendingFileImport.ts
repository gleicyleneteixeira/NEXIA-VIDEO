"use client";

/**
 * Fila de arquivos de mídia pendentes vindos de outras telas (ex.: Criação em
 * Massa) para o editor de vídeo. A página do editor consome no mount e insere
 * os arquivos na timeline, em ordem.
 */

let pendingFiles: File[] | null = null;

export function setPendingFileImport(files: File[]): void {
  pendingFiles = files;
}

export function consumePendingFileImport(): File[] | null {
  const files = pendingFiles;
  pendingFiles = null;
  return files;
}

export function hasPendingFileImport(): boolean {
  return pendingFiles !== null && pendingFiles.length > 0;
}