import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tmpdir } from "os";
import { join } from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

async function transcribeWithGroq(audioPath: string, groqKey: string): Promise<string> {
  const audioBuffer = fs.readFileSync(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
  const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });

  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("model", "whisper-large-v3");
  formData.append("language", "pt");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: formData,
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[Groq Whisper]", response.status, errBody);
    throw new Error(`Groq Whisper erro ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const result = await response.json();
  return result.text || "";
}

async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-i", videoPath,
    "-vn",
    "-acodec", "libmp3lame",
    "-ar", "16000",
    "-ac", "1",
    "-q:a", "4",
    "-y",
    audioPath,
  ], {
    timeout: 90000,
    env: { ...process.env, PATH: getEnhancedPath() },
  });
}

function cleanupDir(dir: string) {
  try {
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        try { fs.unlinkSync(join(dir, f)); } catch {}
      }
      try { fs.rmSync(dir); } catch {}
    }
  } catch {}
}

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const tempDir = join(tmpdir(), `nexia-transcribe-${Date.now()}`);
  try {
    const groqKey = request.headers.get("x-groq-key") || process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
    console.log("[Transcribe] groq key from header:", !!request.headers.get("x-groq-key"), "length:", groqKey.length);

    if (!groqKey) {
      return NextResponse.json(
        { error: "Chave da API da Groq nao encontrada. Configure-a em Configuracoes > API Keys." },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch (e) {
      console.error("[Transcribe] Supabase client creation failed:", e);
      return NextResponse.json({ error: "Falha ao conectar com Supabase." }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[Transcribe] Auth error:", authError);
      return NextResponse.json({ error: "Nao autenticado. Faca login e tente novamente." }, { status: 401 });
    }
    console.log("[Transcribe] user:", user.id);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }
    console.log("[Transcribe] file:", file.name, "size:", file.size, "type:", file.type);

    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande. Limite: 100MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const isAudio = ["mp3", "wav", "m4a", "ogg"].includes(ext);
    const contentType = file.type || (isAudio ? "audio/mpeg" : "video/mp4");

    fs.mkdirSync(tempDir, { recursive: true });
    const filePath = join(tempDir, `upload.${ext}`);
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    console.log("[Transcribe] file saved to:", filePath);

    let transcript = "";
    let method = "none";

    const audioPath = join(tempDir, "audio.mp3");
    try {
      if (isAudio) {
        if (ext !== "mp3") {
          console.log("[Transcribe] converting audio to mp3...");
          await extractAudio(filePath, audioPath);
        } else {
          fs.writeFileSync(audioPath, fs.readFileSync(filePath));
        }
      } else {
        console.log("[Transcribe] extracting audio from video...");
        await extractAudio(filePath, audioPath);
      }

      if (fs.existsSync(audioPath)) {
        const audioStats = fs.statSync(audioPath);
        console.log("[Transcribe] audio extracted, size:", audioStats.size);

        const GROQ_LIMIT = 24 * 1024 * 1024;
        if (audioStats.size > GROQ_LIMIT) {
          const chunkDuration = 600;
          const totalDuration = Math.ceil(audioStats.size / (16000 * 2));
          const chunks = Math.ceil(totalDuration / chunkDuration);
          const texts: string[] = [];
          for (let i = 0; i < chunks; i++) {
            const chunkPath = join(tempDir, `chunk_${i}.mp3`);
            await execFileAsync("ffmpeg", [
              "-i", audioPath, "-ss", String(i * chunkDuration), "-t", String(chunkDuration),
              "-acodec", "libmp3lame", "-q:a", "4", "-y", chunkPath,
            ], { timeout: 60000, env: { ...process.env, PATH: getEnhancedPath() } });
            try {
              const chunkText = await transcribeWithGroq(chunkPath, groqKey);
              if (chunkText.trim()) texts.push(chunkText);
            } catch (e) { console.error(`[Transcribe] chunk ${i} failed:`, e); }
            try { fs.unlinkSync(chunkPath); } catch {}
          }
          transcript = texts.join("\n\n");
        } else {
          console.log("[Transcribe] sending audio to Groq Whisper...");
          transcript = await transcribeWithGroq(audioPath, groqKey);
          console.log("[Transcribe] transcript length:", transcript.length);
        }
        method = "groq_whisper";
      } else {
        console.error("[Transcribe] audio file was not created");
      }
    } catch (err) {
      console.error("[Transcribe] transcription step failed:", err);
      method = "none";
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}_${cleanFileName}`;
    const fileBuffer = fs.readFileSync(filePath);

    console.log("[Transcribe] uploading to storage:", storagePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("rendered-videos")
      .upload(storagePath, fileBuffer, { cacheControl: "3600", contentType, upsert: true });

    if (uploadError) {
      console.error("[Transcribe] storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Falha ao salvar arquivo: ${uploadError.message}` },
        { status: 500 }
      );
    }
    console.log("[Transcribe] storage upload OK");

    const { data: urlData } = supabase.storage.from("rendered-videos").getPublicUrl(storagePath);

    console.log("[Transcribe] inserting into media_gallery...");
    const { error: dbError } = await supabase.from("media_gallery").insert({
      user_id: user.id,
      title: file.name.replace(/\.[^.]+$/, ""),
      media_url: urlData.publicUrl,
      original_url: null,
      media_type: isAudio ? "audio" : "video",
      is_favorite: false,
      transcription: transcript || null,
    });

    if (dbError) {
      console.error("[Transcribe] DB insert error:", dbError);
    } else {
      console.log("[Transcribe] DB insert OK");
    }

    cleanupDir(tempDir);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      transcript: transcript || "",
      method,
      filename: file.name,
    });
  } catch (error) {
    console.error("[Transcribe] FATAL:", error);
    cleanupDir(tempDir);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
