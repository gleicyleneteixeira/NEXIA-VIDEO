import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadVideo } from "@/lib/s3Client";

/**
 * POST /api/upload
 * Upload de vídeo para MinIO/S3 + salvar URL no Supabase
 *
 * Body (multipart/form-data):
 *   - file: File (obrigatório)
 *   - category: string (hook | development | cta | generated)
 *   - projectName?: string (para vídeos gerados)
 *   - hookName?: string
 *   - bodyName?: string
 *   - ctaName?: string
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "uploads";
    const projectName = formData.get("projectName") as string | null;
    const hookName = formData.get("hookName") as string | null;
    const bodyName = formData.get("bodyName") as string | null;
    const ctaName = formData.get("ctaName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Upload para S3/MinIO
    const filename = `${category}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { url, key } = await uploadVideo(file, filename, user.id, "uploads");

    // Salvar referência no Supabase
    const mediaData: Record<string, unknown> = {
      user_id: user.id,
      title: file.name,
      category,
      file_url: url,
      duration_seconds: 0,
    };

    // Se for vídeo gerado, salvar na tabela generated_variations
    if (category === "generated" && projectName) {
      const { data: project, error: projectError } = await supabase
        .from("mass_projects")
        .insert({
          user_id: user.id,
          project_name: projectName,
          total_variations: 1,
        })
        .select()
        .single();

      if (!projectError && project) {
        await supabase.from("generated_variations").insert({
          project_id: project.id,
          user_id: user.id,
          title: file.name,
          hook_name: hookName,
          body_name: bodyName,
          cta_name: ctaName,
          total_duration: "0:00",
        });
      }
    } else {
      // Salvar na tabela user_medias
      await supabase.from("user_medias").insert(mediaData);
    }

    return NextResponse.json({
      success: true,
      url,
      key,
      filename: file.name,
    });
  } catch (error) {
    console.error("[Upload API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}
