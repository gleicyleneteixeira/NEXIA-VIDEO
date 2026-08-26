import { createClient } from "@/lib/supabase/client";

/**
 * Upload de vídeos gerados na "Criação em Massa" para o Supabase Storage.
 * Retorna a URL pública do arquivo hospedado (bucket `rendered-videos`).
 *
 * O caller deve tratar o erro graciosamente: se o bucket não estiver
 * configurado (ou a rede falhar), mantemos o fallback local/S3.
 */

const VIDEO_BUCKET = "rendered-videos";

export async function uploadVideoToSupabase(
  videoBlob: Blob,
  fileName: string
): Promise<string> {
  const supabase = createClient();

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `masstasks/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(filePath, videoBlob, {
      contentType: videoBlob.type || "video/mp4",
      upsert: true,
    });

  if (error) {
    console.error("[Supabase Storage] Erro ao subir vídeo:", error);
    throw error;
  }

  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
