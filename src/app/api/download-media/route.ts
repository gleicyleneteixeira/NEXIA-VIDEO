import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const COBALT_API = "https://api.cobalt.tools";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function downloadWithCobalt(url: string, mode: "audio" | "video"): Promise<{ downloadUrl: string; filename: string }> {
  const resp = await fetch(`${COBALT_API}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": UA,
    },
    body: JSON.stringify({
      url,
      downloadMode: mode,
      audioFormat: mode === "audio" ? "mp3" : undefined,
      filenameStyle: "pretty",
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    if (resp.status === 400) {
      throw new Error("URL invalida ou plataforma nao suportada.");
    }
    if (resp.status === 403) {
      throw new Error("Video privado ou restrito.");
    }
    if (resp.status === 429) {
      throw new Error("Muitas requisicoes. Aguarde alguns minutos e tente novamente.");
    }
    if (resp.status === 500) {
      throw new Error("Servidor de download temporariamente indisponivel. Tente novamente em alguns minutos.");
    }
    throw new Error(`Erro ao baixar midia (HTTP ${resp.status}).`);
  }

  const data = await resp.json();

  if (data.status === "error") {
    const msg = data.error?.code || data.error || "Erro desconhecido";
    if (msg === "error.fetch") throw new Error("Nao foi possivel acessar o video. Verifique a URL.");
    if (msg === "error.unavailable") throw new Error("Video nao encontrado ou indisponivel.");
    if (msg === "error.rate-limited") throw new Error("Muitas requisicoes. Aguarde alguns minutos.");
    if (msg === "error.tiktok-caption-missing") throw new Error("TikTok: legenda nao disponivel.");
    throw new Error(`Falha ao baixar: ${msg}`);
  }

  if (data.status === "tunnel") {
    return { downloadUrl: data.url, filename: data.filename || `download_${Date.now()}` };
  }

  if (data.status === "redirect") {
    return { downloadUrl: data.url, filename: data.filename || `download_${Date.now()}` };
  }

  if (data.url) {
    return { downloadUrl: data.url, filename: data.filename || `download_${Date.now()}` };
  }

  throw new Error("Resposta inesperada do servidor de download.");
}

function getVideoTitleFallback(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      return `video_youtube_${Date.now()}`;
    }
    if (u.hostname.includes("tiktok.com")) {
      return `video_tiktok_${Date.now()}`;
    }
  } catch {}
  return `download_${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, format } = body;

    if (!url) {
      return NextResponse.json({ error: "URL obrigatoria" }, { status: 400 });
    }
    if (format !== "video" && format !== "audio") {
      return NextResponse.json({ error: "Formato invalido. Use 'video' ou 'audio'." }, { status: 400 });
    }

    const { downloadUrl, filename } = await downloadWithCobalt(url, format);

    const mediaResp = await fetch(downloadUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(120000),
    });

    if (!mediaResp.ok) {
      return NextResponse.json(
        { error: "Falha ao baixar o arquivo de midia." },
        { status: 500 }
      );
    }

    const ext = format === "audio" ? "mp3" : "mp4";
    const contentType = format === "audio" ? "audio/mpeg" : "video/mp4";
    const title = filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 80) || getVideoTitleFallback(url);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${title}.${ext}"`);
    headers.set("Cache-Control", "no-cache");

    if (mediaResp.headers.get("content-length")) {
      headers.set("Content-Length", mediaResp.headers.get("content-length")!);
    }

    const bodyBuffer = await mediaResp.arrayBuffer();

    return new NextResponse(bodyBuffer, { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao baixar midia.";
    const lowerMsg = msg.toLowerCase();
    let userMessage = msg;

    if (lowerMsg.includes("privado") || lowerMsg.includes("restrito") || lowerMsg.includes("login")) {
      userMessage = "Este video e privado ou requer login.";
    } else if (lowerMsg.includes("indisponivel") || lowerMsg.includes("nao encontrado")) {
      userMessage = "Video nao encontrado ou indisponivel. Verifique a URL.";
    } else if (lowerMsg.includes("muitas") || lowerMsg.includes("429") || lowerMsg.includes("rate")) {
      userMessage = "Muitas requisicoes. Aguarde alguns minutos e tente novamente.";
    } else if (lowerMsg.includes("servidor")) {
      userMessage = "Servidor de download temporariamente indisponivel. Tente novamente.";
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
