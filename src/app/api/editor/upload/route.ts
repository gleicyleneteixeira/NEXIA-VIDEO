import { NextRequest, NextResponse } from "next/server";
import { uploadVideo } from "@/lib/s3Client";

/**
 * POST /api/editor/upload
 * Upload de mídia do editor de vídeo para MinIO/S3, retornando a URL permanente.
 * Body (multipart/form-data): file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const filename = `editor_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { url, key } = await uploadVideo(file, filename, "editor", "editor");

    return NextResponse.json({ success: true, url, key, filename: file.name });
  } catch (error) {
    console.error("[Editor Upload API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}