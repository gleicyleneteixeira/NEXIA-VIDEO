import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "media-gallery";
const RETENTION_HOURS = 96;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();

    const { data: oldItems, error: fetchError } = await supabase
      .from("media_gallery")
      .select("id, media_url, user_id")
      .lt("created_at", cutoff)
      .eq("is_favorite", false);

    if (fetchError) throw fetchError;

    if (!oldItems || oldItems.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: "Nenhuma midia antiga para limpar." });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const item of oldItems) {
      try {
        const urlParts = item.media_url.split(`/${BUCKET}/`);
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from(BUCKET).remove([filePath]);
        }

        const { error: deleteError } = await supabase
          .from("media_gallery")
          .delete()
          .eq("id", item.id);

        if (deleteError) {
          errors.push(`DB delete failed for ${item.id}: ${deleteError.message}`);
        } else {
          deletedCount++;
        }
      } catch (err) {
        errors.push(`Error deleting ${item.id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro na limpeza.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
