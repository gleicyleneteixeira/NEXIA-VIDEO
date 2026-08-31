import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatekmiki.com",
  "https://api-dl.cgm.rs",
  "https://dl.khyernet.xyz",
  "https://cobalt.canine.tools",
];

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com\//.test(url) || /vm\.tiktok\.com\//.test(url);
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com\//.test(url) || /youtu\.be\//.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /instagram\.com\//.test(url);
}

function isFacebookUrl(url: string): boolean {
  return /facebook\.com\//.test(url) || /fb\.watch\//.test(url);
}

async function tryCobaltInstance(
  instance: string,
  url: string,
  mode: "audio" | "video"
): Promise<{ downloadUrl: string; filename: string }> {
  const resp = await fetch(`${instance}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": UA,
    },
    body: JSON.stringify({
      url,
      downloadMode: mode === "audio" ? "audio" : "auto",
      audioFormat: mode === "audio" ? "mp3" : undefined,
      filenameStyle: "pretty",
      videoQuality: "1080",
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await resp.json().catch(() => null);
  if (!data) throw new Error("Resposta invalida do servidor.");

  if (data.status === "error") {
    const code = data.error?.code || data.error || "";
    if (code === "error.api.unauthorized") throw new Error("API_AUTH_REQUIRED");
    throw new Error(code || "Erro desconhecido");
  }

  if (data.status === "tunnel" && data.url) {
    return { downloadUrl: data.url, filename: data.filename || `download_${Date.now()}` };
  }

  if (data.status === "redirect" && data.url) {
    return { downloadUrl: data.url, filename: data.filename || `download_${Date.now()}` };
  }

  if (data.status === "picker" && data.picker && data.picker.length > 0) {
    const first = data.picker[0];
    if (first.url) {
      return { downloadUrl: first.url, filename: data.pickerAudioFilename || data.filename || `download_${Date.now()}` };
    }
  }

  if (data.url) {
    return { downloadUrl: data.url, filename: data.filename || `download_${Date.now()}` };
  }

  throw new Error("Resposta inesperada");
}

async function downloadWithCobalt(url: string, mode: "audio" | "video"): Promise<{ downloadUrl: string; filename: string }> {
  const errors: string[] = [];

  for (const instance of COBALT_INSTANCES) {
    try {
      const result = await tryCobaltInstance(instance, url, mode);
      return result;
    } catch (err: any) {
      const msg = err?.message || "unknown";
      if (msg === "API_AUTH_REQUIRED") continue;
      errors.push(`${instance}: ${msg}`);
    }
  }

  throw new Error(
    `Nao foi possivel baixar este video. Todas asinstancias de download retornaram erro. ` +
    `Tente novamente mais tarde ou use outro link.`
  );
}

async function resolveTikTokUrl(url: string): Promise<string> {
  if (!isTikTokUrl(url)) return url;
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return resp.url || url;
  } catch {
    return url;
  }
}

function getVideoTitleFallback(url: string): string {
  try {
    const u = new URL(url);
    if (isYouTubeUrl(url)) return `video_youtube_${Date.now()}`;
    if (isTikTokUrl(url)) return `video_tiktok_${Date.now()}`;
    if (isInstagramUrl(url)) return `video_instagram_${Date.now()}`;
    if (isFacebookUrl(url)) return `video_facebook_${Date.now()}`;
  } catch {}
  return `download_${Date.now()}`;
}

function getSupportedPlatform(url: string): boolean {
  return isYouTubeUrl(url) || isTikTokUrl(url) || isInstagramUrl(url) || isFacebookUrl(url);
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

    if (!getSupportedPlatform(url)) {
      return NextResponse.json(
        { error: "Plataforma nao suportada. Use links do YouTube, TikTok, Instagram ou Facebook." },
        { status: 400 }
      );
    }

    const resolvedUrl = await resolveTikTokUrl(url);
    const { downloadUrl, filename } = await downloadWithCobalt(resolvedUrl, format);

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
    const title = (filename || "").replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 80) || getVideoTitleFallback(url);

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
    } else if (lowerMsg.includes("nao suportada")) {
      userMessage = "Plataforma nao suportada. Use links do YouTube, TikTok, Instagram ou Facebook.";
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
