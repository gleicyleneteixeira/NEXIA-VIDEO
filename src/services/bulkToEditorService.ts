/**
 * bulkToEditorService — enfileira combinações da Criação em Massa para o
 * editor de vídeo. Usa a mesma fila de import pendente (pendingFileImport) que
 * a página /editor consome no mount, inserindo os cortes na trilha principal em
 * sequência (Hook + Desenvolvimento + CTA por vídeo).
 *
 * Fallback de integridade: quando os cortes não existem mais em memória
 * (vídeo carregado do banco após reload), os binários são restaurados do
 * MediaVault (IndexedDB) e reconstruídos como File.
 */

import { setPendingFileImport } from "@/lib/editor/pendingFileImport";
import type { Variation } from "@/lib/videoEngine";
import { MediaVault } from "@/services/persistentMediaVault";

const BLOCK_VAULT_KEY = (blockId: string) => `block-${blockId}`;

function directFiles(variation: Variation): File[] | null {
  if (!variation || !variation.blocks) return null;
  const files = variation.blocks
    .map((b) => b.file)
    .filter((f): f is File => !!f && typeof File !== "undefined" && f instanceof File && f.size > 0);
  return files.length >= 2 ? files : null;
}

async function restoredFiles(variation: Variation): Promise<File[] | null> {
  const restored: File[] = [];
  for (const block of variation.blocks) {
    try {
      const blob = await MediaVault.retrieveMedia(BLOCK_VAULT_KEY(block.id));
      if (blob instanceof Blob) {
        restored.push(
          new File([blob], `${block.id}.mp4`, { type: blob.type || "video/mp4" })
        );
      }
    } catch {
      /* noop */
    }
  }
  return restored.length >= 2 ? restored : null;
}

async function variationToFiles(variation: Variation | null | undefined): Promise<File[] | null> {
  if (!variation) return null;
  return directFiles(variation) || (await restoredFiles(variation));
}

/**
 * Envio individual: monta os cortes de UMA combinação na ordem original dos
 * blocos. Retorna quantos arquivos foram enfileirados (0 se não houver mídia).
 */
export async function sendToEditor(variation: Variation | null | undefined): Promise<number> {
  const files = await variationToFiles(variation);
  if (!files) return 0;
  setPendingFileImport(files);
  return files.length;
}

/**
 * Envio em massa: enfileira vários vídeos em sequência para criar compilados
 * contínuos na timeline. Retorna o total de arquivos enfileirado.
 */
export async function sendBatchToEditor(
  variations: Array<Variation | null | undefined>
): Promise<number> {
  const files: File[] = [];
  for (const v of variations) {
    const f = await variationToFiles(v);
    if (f) files.push(...f);
  }
  if (files.length === 0) return 0;
  setPendingFileImport(files);
  return files.length;
}