import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

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

function getSupportedPlatform(url: string): boolean {
  return isYouTubeUrl(url) || isTikTokUrl(url) || isInstagramUrl(url) || isFacebookUrl(url);
}

async function downloadTikTok(url: string, mode: "audio" | "video"): Promise<{ buffer: Buffer; filename: string; ext: string }> {
  const resp = await fetch("https://www.tikwm.com/api/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: new URLSearchParams({ url, hd: "1" }),
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`TikTok API erro ${resp.status}`);
  const data = await resp.json();
  if (data.code !== 0 || !data.data) {
    throw new Error(data.msg || "Nao foi possivel baixar este video do TikTok.");
  }

  const downloadUrl = mode === "audio"
    ? (data.data.music || data.data.play)
    : (data.data.hdplay || data.data.play);

  if (!downloadUrl) throw new Error("URL de download nao encontrada no TikTok.");

  const fullUrl = downloadUrl.startsWith("http") ? downloadUrl : `https://www.tikwm.com${downloadUrl}`;
  const mediaResp = await fetch(fullUrl, {
    headers: { "User-Agent": UA, Referer: "https://www.tikwm.com/" },
    signal: AbortSignal.timeout(60000),
  });
  if (!mediaResp.ok) throw new Error("Falha ao baixar arquivo do TikTok.");

  const arrayBuf = await mediaResp.arrayBuffer();
  const title = (data.data.title || "tiktok_video").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 60) || "tiktok_video";
  const ext = mode === "audio" ? "mp3" : "mp4";

  return { buffer: Buffer.from(arrayBuf), filename: title, ext };
}

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://api-dl.cgm.rs",
  "https://cobalt.canine.tools",
];

async function downloadWithCobalt(url: string, mode: "audio" | "video"): Promise<{ buffer: Buffer; filename: string; ext: string }> {
  const errors: string[] = [];

  for (const instance of COBALT_INSTANCES) {
    try {
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
      if (!data) { errors.push(`${instance}: invalid json`); continue; }

      if (data.status === "error") {
        errors.push(`${instance}: ${data.error?.code || data.error || "error"}`);
        continue;
      }

      let downloadUrl = "";
      if (data.status === "tunnel" && data.url) downloadUrl = data.url;
      else if (data.status === "redirect" && data.url) downloadUrl = data.url;
      else if (data.status === "picker" && data.picker?.[0]?.url) downloadUrl = data.picker[0].url;
      else if (data.url) downloadUrl = data.url;

      if (!downloadUrl) { errors.push(`${instance}: no url in response`); continue; }

      const mediaResp = await fetch(downloadUrl, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(120000),
      });
      if (!mediaResp.ok) { errors.push(`${instance}: media download failed ${mediaResp.status}`); continue; }

      const arrayBuf = await mediaResp.arrayBuffer();
      const filename = (data.filename || "download").replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 60) || "download";
      const ext = mode === "audio" ? "mp3" : "mp4";

      return { buffer: Buffer.from(arrayBuf), filename, ext };
    } catch (err: any) {
      errors.push(`${instance}: ${err?.message || "timeout"}`);
    }
  }

  throw new Error(`Servidores de download retornaram erro. Tente novamente mais tarde.`);
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

    let result: { buffer: Buffer; filename: string; ext: string };

    if (isTikTokUrl(url)) {
      try {
        result = await downloadTikTok(url, format);
      } catch (tiktokErr) {
        result = await downloadWithCobalt(url, format);
      }
    } else {
      result = await downloadWithCobalt(url, format);
    }

    const contentType = format === "audio" ? "audio/mpeg" : "video/mp4";
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${result.filename}.${result.ext}"`);
    headers.set("Cache-Control", "no-cache");
    headers.set("Content-Length", String(result.buffer.length));

    return new NextResponse(new Uint8Array(result.buffer), { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao baixar midia.";
    const lowerMsg = msg.toLowerCase();
    let userMessage = msg;

    if (lowerMsg.includes("privado") || lowerMsg.includes("restrito") || lowerMsg.includes("login")) {
      userMessage = "Este video e privado ou requer login.";
    } else if (lowerMsg.includes("indisponivel") || lowerMsg.includes("nao encontrado")) {
      userMessage = "Video nao encontrado ou indisponivel.";
    } else if (lowerMsg.includes("muitas") || lowerMsg.includes("429") || lowerMsg.includes("rate")) {
      userMessage = "Muitas requisicoes. Aguarde alguns minutos.";
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
