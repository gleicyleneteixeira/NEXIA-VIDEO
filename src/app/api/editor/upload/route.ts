import { NextRequest, NextResponse } from "next/server";
import { uploadVideo } from "@/lib/s3Client";

/**
 * POST /api/editor/upload
 * Upload de mídia do editor de vídeo para MinIO/S3, retornando a URL permanente.
 * Body (multipart/form-data): file
 */
export async function POST(request: NextRequest) {
  let fileInfo = "desconhecido";
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Sanidade: arquivo vazio ou com encoding duvidoso nao deve virar 500 generico.
    fileInfo = `name=${file.name} type=${file.type} size=${file.size}`;
    if (file.size === 0) {
      console.error("[Editor Upload API] Arquivo vazio recebido:", fileInfo);
      return NextResponse.json({ error: "Arquivo vazio (0 bytes)" }, { status: 400 });
    }

    const filename = `editor_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { url, key } = await uploadVideo(file, filename, "editor", "editor");

    return NextResponse.json({ success: true, url, key, filename: file.name });
  } catch (error) {
    // Log detalhado para nao responder 500 generico silenciosamente.
    console.error("[Editor Upload API] Falha no upload:", {
      file: fileInfo,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao fazer upload",
        detail: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}