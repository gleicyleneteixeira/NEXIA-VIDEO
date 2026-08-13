import { NextRequest, NextResponse } from "next/server";

/**
 * Text-to-Speech proxy. Uses Google Translate's free TTS endpoint
 * (no API key required). Text is split into chunks ("tw" client limit ~200 chars)
 * and concatenated into a single MP3 buffer.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, lang } = await req.json();
    const trimmed = (text || "").toString().trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
    }
    const locale = /^[a-z]{2}([-_][A-Za-z]{2})?$/.test((lang || "pt").toString())
      ? (lang || "pt").toString()
      : "pt";

    const chunks = splitChunks(trimmed, 180);
    const parts: Buffer[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${locale}&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Referer": "https://translate.google.com/",
        },
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Falha no TTS (${res.status})` }, { status: 502 });
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 64) parts.push(buf);
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: "Nenhum áudio gerado" }, { status: 500 });
    }

    const merged = Buffer.concat(parts);
    return new NextResponse(new Uint8Array(merged), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="tts.mp3"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("TTS route error", err);
    return NextResponse.json({ error: "Erro interno no TTS" }, { status: 500 });
  }
}

function splitChunks(text: string, max: number): string[] {
  const out: string[] = [];
  let current = "";
  // split by sentences then words to avoid breaking mid-word too often
  const tokens = text.match(/[^.!?]+[.!?]?/g) || [text];
  for (const token of tokens) {
    const t = token.trim();
    if (!t) continue;
    if ((current + " " + t).trim().length <= max) {
      current = (current + " " + t).trim();
    } else {
      // chunk further by words if a single sentence exceeds max
      if (current) out.push(current);
      current = "";
      for (const w of t.split(/\s+/)) {
        if ((current + " " + w).trim().length > max) {
          if (current) out.push(current);
          current = w;
        } else {
          current = (current + " " + w).trim();
        }
      }
    }
  }
  if (current) out.push(current);
  return out.filter((c) => c.length > 0);
}