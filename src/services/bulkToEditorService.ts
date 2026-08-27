/**
 * bulkToEditorService — enfileira vídeos da Criação em Massa para o editor de
 * vídeo. Diferente da versão anterior (que enviava os blocos separados e
 * causava truncamento), aqui enviamos o VÍDEO FINAL CONCATENADO, com a
 * duração real já conhecida, para que o editor receba o clipe completo.
 *
 * Mantém um fallback para os blocos quando o vídeo final não está disponível
 * (ex.: variação recarregada sem os binários locais).
 */

import { setPendingFileImport, type PendingImportItem } from "@/lib/editor/pendingFileImport";
import type { Variation } from "@/lib/videoEngine";
import { MediaVault } from "@/services/persistentMediaVault";

export interface FinalVideoInput {
  blob?: Blob | null;
  videoUrl?: string | null;
  blobUrl?: string | null;
  duration: number;
  name?: string;
}

const BLOCK_VAULT_KEY = (blockId: string) => `block-${blockId}`;

async function resolveFinalFile(input: FinalVideoInput): Promise<File | null> {
  const name = input.name || "video.mp4";

  if (input.blob && input.blob.size > 0) {
    return new File([input.blob], name, { type: input.blob.type || "video/mp4" });
  }

  const url = input.videoUrl || input.blobUrl;
  if (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.size > 0) {
        return new File([blob], name, { type: blob.type || "video/mp4" });
      }
    } catch {
      /* cai no fallback de blocos abaixo */
    }
  }
  return null;
}

/**
 * Envio individual: envia o vídeo final concatenado de UMA combinação.
 * Retorna 1 se o vídeo final foi enfileirado, 0 se não foi possível obter.
 */
export async function sendFinalVideoToEditor(input: FinalVideoInput): Promise<number> {
  const file = await resolveFinalFile(input);
  if (!file) return 0;
  const items: PendingImportItem[] = [{ file, duration: input.duration, projectName: input.name }];
  setPendingFileImport(items);
  return 1;
}

/**
 * Envio em massa: enfileira os vídeos finais de várias combinações em sequência
 * para criar compilados contínuos na timeline. Retorna o total enfileirado.
 */
export async function sendFinalVideosToEditor(inputs: FinalVideoInput[]): Promise<number> {
  const items: PendingImportItem[] = [];
  for (const input of inputs) {
    const file = await resolveFinalFile(input);
    if (file) items.push({ file, duration: input.duration, projectName: input.name });
  }
  if (items.length === 0) return 0;
  setPendingFileImport(items);
  return items.length;
}

/* ----------------------- fallback (blocos separados) ----------------------- */

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
        restored.push(new File([blob], `${block.id}.mp4`, { type: blob.type || "video/mp4" }));
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
 * Envio individual (fallback): monta os cortes de UMA combinação na ordem
 * original dos blocos. Retorna quantos arquivos foram enfileirados (0 se vazio).
 */
export async function sendToEditor(variation: Variation | null | undefined): Promise<number> {
  const files = await variationToFiles(variation);
  if (!files) return 0;
  setPendingFileImport(files);
  return files.length;
}

/**
 * Envio em massa (fallback): enfileira vários vídeos em sequência.
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
