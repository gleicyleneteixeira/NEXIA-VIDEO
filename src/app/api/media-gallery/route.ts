import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";

export const maxDuration = 120;
import { join } from "path";
import { readdirSync, readFileSync, rmSync, mkdirSync, existsSync, unlinkSync, statSync } from "fs";

const execFileAsync = promisify(execFile);
const BUCKET = "rendered-videos";

function getEnhancedPath(): string {
  const extra = [
    join(process.env.USERPROFILE || process.env.HOME || "", ""),
    join(process.env.APPDATA || "", "npm"),
    "/usr/local/bin",
    "/usr/bin",
  ].filter(Boolean);
  const base = process.env.PATH || "";
  return [...extra, base].join(process.platform === "win32" ? ";" : ":");
}

async function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const defaultArgs = [
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "--socket-timeout", "30",
    "--retries", "3",
    "--fragment-retries", "5",
    "--js-runtimes", "node",
    "--sleep-requests", "2",
  ];
  try {
    return await execFileAsync("yt-dlp", [...defaultArgs, ...args], {
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env, PATH: getEnhancedPath() },
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = err?.stderr || "";
    const combined = msg + " " + stderr;
    if (combined.includes("ENOENT") || combined.includes("not found")) {
      throw new Error("yt-dlp nao esta instalado no servidor.");
    }
    if (combined.includes("429") || combined.toLowerCase().includes("too many requests")) {
      throw new Error("Plataforma limitando requisicoes. Aguarde alguns minutos.");
    }
    if (combined.includes("Video unavailable") || combined.includes("not available")) {
      throw new Error("Video nao encontrado ou indisponivel. Verifique a URL.");
    }
    if (combined.includes("Private video") || combined.includes("Login required")) {
      throw new Error("Este video e privado ou requer login.");
    }
    const stderrLines = stderr.split("\n").filter((l: string) => l.startsWith("ERROR:"));
    const detail = stderrLines.length > 0 ? "\n" + stderrLines.join("\n") : "";
    throw new Error("Falha ao processar midia." + detail);
  }
}

function getVideoTitle(url: string): string {
  try {
    const { stdout } = require("child_process").execFileSync(
      "yt-dlp",
      ["--print", "title", "--skip-download", "--no-playlist", url],
      {
        timeout: 30000,
        env: { ...process.env, PATH: getEnhancedPath() },
        encoding: "utf-8",
      }
    );
    return stdout.trim().replace(/[<>:"/\\|?*]/g, "_").substring(0, 80);
  } catch {
    return `midia_${Date.now()}`;
  }
}

async function ensureBucket(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.storage.getBucket(BUCKET);
  if (error) throw new Error(`Bucket '${BUCKET}' nao encontrado no Supabase.`);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const favoritesOnly = searchParams.get("favorites") === "true";

    let query = supabase
      .from("media_gallery")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (favoritesOnly) {
      query = query.eq("is_favorite", true);
    }

    const { data, error } = await query;
    if (error) {
      const errMsg = error.message || "";
      if (errMsg.includes("does not exist") || errMsg.includes("relation") || errMsg.includes("42P01")) {
        return NextResponse.json({ success: true, items: [], setup_required: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true, items: data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao listar midias.";
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01")) {
      return NextResponse.json({ success: true, items: [], setup_required: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tempDir = join(tmpdir(), `nexia-gallery-${Date.now()}`);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    await ensureBucket(supabase);

    const body = await request.json();
    const { url, format, title } = body;

    if (!url) {
      return NextResponse.json({ error: "URL obrigatoria" }, { status: 400 });
    }
    const mediaType = format === "audio" ? "audio" : "video";

    mkdirSync(tempDir, { recursive: true });
    const baseName = "download";
    const outputTemplate = join(tempDir, baseName);

    if (mediaType === "audio") {
      await runYtDlp([
        "-x", "--audio-format", "mp3", "--audio-quality", "0",
        "--output", outputTemplate + ".%(ext)s",
        "--no-playlist", url,
      ]);
    } else {
      await runYtDlp([
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--output", outputTemplate + ".%(ext)s",
        "--no-playlist", url,
      ]);
    }

    const files = readdirSync(tempDir);
    const mediaFile = files.find((f: string) => {
      if (mediaType === "audio") return f.endsWith(".mp3") || f.endsWith(".wav") || f.endsWith(".m4a");
      return f.endsWith(".mp4") || f.endsWith(".webm");
    });

    if (!mediaFile) {
      return NextResponse.json(
        { error: "Nao foi possivel baixar a midia. Formato nao suportado ou video privado." },
        { status: 400 }
      );
    }

    const filePath = join(tempDir, mediaFile);
    const fileBuffer = readFileSync(filePath);
    const ext = mediaFile.split(".").pop() || (mediaType === "audio" ? "mp3" : "mp4");
    const contentType = mediaType === "audio" ? "audio/mpeg" : "video/mp4";

    const videoTitle = title || getVideoTitle(url);
    const safeName = `${Date.now()}_${videoTitle.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(safeName, fileBuffer, {
        cacheControl: "3600",
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[Upload Error]", uploadError.message);
      throw new Error(uploadError.message);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(safeName);

    const { data: record, error: dbError } = await supabase
      .from("media_gallery")
      .insert({
        user_id: user.id,
        title: videoTitle,
        media_url: urlData.publicUrl,
        original_url: url,
        media_type: mediaType,
        is_favorite: false,
      })
      .select()
      .single();

    if (dbError) {
      const errMsg = dbError.message || "";
      if (errMsg.includes("does not exist") || errMsg.includes("relation") || errMsg.includes("42P01")) {
        return NextResponse.json({ error: "Tabela media_gallery nao existe. Execute a migration no Supabase." }, { status: 500 });
      }
      throw dbError;
    }

    try {
      if (existsSync(tempDir)) {
        for (const f of readdirSync(tempDir)) unlinkSync(join(tempDir, f));
        rmSync(tempDir);
      }
    } catch {}

    return NextResponse.json({ success: true, item: record });
  } catch (error) {
    try {
      if (existsSync(tempDir)) {
        for (const f of readdirSync(tempDir)) unlinkSync(join(tempDir, f));
        rmSync(tempDir);
      }
    } catch {}
    const msg = error instanceof Error ? error.message : "Falha ao salvar midia.";
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01")) {
      return NextResponse.json({ error: "Tabela media_gallery nao existe. Execute a migration no Supabase." }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, is_favorite, title } = body;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof is_favorite === "boolean") updates.is_favorite = is_favorite;
    if (typeof title === "string") updates.title = title;

    const { data, error } = await supabase
      .from("media_gallery")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      const errMsg = error.message || "";
      if (errMsg.includes("does not exist") || errMsg.includes("relation") || errMsg.includes("42P01")) {
        return NextResponse.json({ error: "Tabela media_gallery nao existe." }, { status: 500 });
      }
      throw error;
    }
    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao atualizar.";
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01")) {
      return NextResponse.json({ error: "Tabela media_gallery nao existe." }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });
    }

    const { data: item, error: fetchError } = await supabase
      .from("media_gallery")
      .select("media_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !item) {
      const errMsg = fetchError?.message || "";
      if (errMsg.includes("does not exist") || errMsg.includes("relation") || errMsg.includes("42P01")) {
        return NextResponse.json({ error: "Tabela media_gallery nao existe." }, { status: 500 });
      }
      return NextResponse.json({ error: "Midia nao encontrada." }, { status: 404 });
    }

    const urlParts = item.media_url.split(`/${BUCKET}/`);
    if (urlParts.length > 1) {
      const filePath = decodeURIComponent(urlParts[1]);
      await supabase.storage.from(BUCKET).remove([filePath]);
    }

    const { error: deleteError } = await supabase
      .from("media_gallery")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      const errMsg = deleteError.message || "";
      if (errMsg.includes("does not exist") || errMsg.includes("relation") || errMsg.includes("42P01")) {
        return NextResponse.json({ error: "Tabela media_gallery nao existe." }, { status: 500 });
      }
      throw deleteError;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao excluir.";
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01")) {
      return NextResponse.json({ error: "Tabela media_gallery nao existe." }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
