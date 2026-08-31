import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^\/shorts\/[a-zA-Z0-9_-]{11}$/.test(u.pathname)) return u.pathname.split("/")[2];
    return null;
  } catch {
    return null;
  }
}

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com\//.test(url) || /vm\.tiktok\.com\//.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /instagram\.com\//.test(url);
}

async function fetchTikTokOembed(url: string): Promise<{ title: string; author: string; description: string } | null> {
  try {
    const resp = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return { title: data.title || "", author: data.author_name || "", description: data.title || "" };
  } catch {
    return null;
  }
}

async function fetchInstagramOembed(url: string): Promise<{ title: string; author: string } | null> {
  try {
    const resp = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return { title: data.title || "", author: data.author_name || "" };
  } catch {
    return null;
  }
}

async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const playerResp = await fetchYouTubePlayerResponse(videoId);
    if (!playerResp) return null;

    const captions = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) return null;

    const ptTrack = captions.find((t: any) => t.languageCode === "pt" || t.languageCode === "pt-BR");
    const enTrack = captions.find((t: any) => t.languageCode === "en");
    const track = ptTrack || enTrack || captions[0];
    if (!track?.baseUrl) return null;

    const resp = await fetch(track.baseUrl + "&fmt=json3", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      const respXml = await fetch(track.baseUrl, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(15000),
      });
      if (!respXml.ok) return null;
      const xml = await respXml.text();
      return parseCaptionsXml(xml);
    }

    const json = await resp.json();
    const events = json.events || [];
    return events
      .filter((e: any) => e.segs)
      .map((e: any) => e.segs.map((s: any) => s.utf8).join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() || null;
  } catch {
    return null;
  }
}

async function fetchYouTubePlayerResponse(videoId: string): Promise<any> {
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) return null;
  const html = await resp.text();

  const patterns = [
    /var ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/,
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/,
    /"playerResponse":"(\{.+?\})"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }
  return null;
}

function parseCaptionsXml(xml: string): string {
  const segments: string[] = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const text = m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .replace(/\n/g, " ")
      .trim();
    if (text) segments.push(text);
  }
  return segments.join(" ");
}

function parseVtt(content: string): string {
  return content
    .split("\n")
    .filter(
      (l: string) =>
        !l.startsWith("WEBVTT") &&
        !l.startsWith("NOTE") &&
        !l.startsWith("STYLE") &&
        l.trim() &&
        !/^\d+$/.test(l.trim()) &&
        !l.includes("-->")
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL obrigatoria" }, { status: 400 });
    }

    if (isTikTokUrl(url)) {
      try {
        const tiktok = await fetchTikTokOembed(url);
        if (tiktok && tiktok.description) {
          return NextResponse.json({
            success: true,
            transcript: `[Descricao do TikTok por ${tiktok.author}]\n\n${tiktok.description}`,
            used_ai: false,
            method: "tiktok_description",
          });
        }
        return NextResponse.json({
          success: false,
          transcript: "",
          used_ai: false,
          method: "none",
          message: "TikTok nao disponibiliza legendas para este video.",
        });
      } catch {
        return NextResponse.json({
          success: false,
          transcript: "",
          used_ai: false,
          method: "none",
          message: "Nao foi possivel acessar o TikTok.",
        });
      }
    }

    if (isInstagramUrl(url)) {
      try {
        const ig = await fetchInstagramOembed(url);
        if (ig && ig.title) {
          return NextResponse.json({
            success: true,
            transcript: `[Descricao do Instagram por ${ig.author}]\n\n${ig.title}`,
            used_ai: false,
            method: "instagram_description",
          });
        }
      } catch {}
      return NextResponse.json({
        success: false,
        transcript: "",
        used_ai: false,
        method: "none",
        message: "Instagram nao disponibiliza legendas via API.",
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "URL invalida. Use links do YouTube, TikTok ou Instagram." },
        { status: 400 }
      );
    }

    const transcript = await getYouTubeTranscript(videoId);
    if (transcript && transcript.trim()) {
      return NextResponse.json({
        success: true,
        transcript,
        used_ai: false,
        method: "native",
      });
    }

    return NextResponse.json({
      success: false,
      transcript: "",
      used_ai: false,
      method: "none",
      message: "Este video nao possui legendas disponiveis.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao processar a URL." },
      { status: 500 }
    );
  }
}
