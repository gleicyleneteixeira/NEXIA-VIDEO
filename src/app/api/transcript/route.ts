import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { readdirSync, readFileSync, rmSync, mkdirSync, existsSync, unlinkSync } from "fs";

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

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com\//.test(url) || /vm\.tiktok\.com\//.test(url);
}

async function fetchTikTokOembed(url: string): Promise<{ title: string; author: string; description: string } | null> {
  try {
    const resp = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      title: data.title || "",
      author: data.author_name || "",
      description: data.title || "",
    };
  } catch {
    return null;
  }
}

async function runYtDlp(args: string[], retries = 2): Promise<{ stdout: string; stderr: string }> {
  const defaultArgs = [
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "--socket-timeout", "30",
    "--retries", "3",
    "--fragment-retries", "5",
    "--skip-download",
    "--js-runtimes", "node",
    "--sleep-requests", "2",
    "--sleep-interval", "3",
  ];
  try {
    return await execFileAsync("yt-dlp", [...defaultArgs, ...args], {
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, PATH: getEnhancedPath() },
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = err?.stderr || "";
    const combined = msg + " " + stderr;

    if (combined.includes("ENOENT") || combined.includes("not found") || combined.includes("no such file")) {
      throw new Error(
        "yt-dlp nao esta instalado no servidor. Instale via 'pip install yt-dlp' ou baixe o executavel de https://github.com/yt-dlp/yt-dlp/releases"
      );
    }

    if (combined.includes("429") || combined.toLowerCase().includes("too many requests")) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 5000));
        return runYtDlp(args, retries - 1);
      }
      throw new Error("YouTube esta limitando as requisicoes. Aguarde alguns minutos e tente novamente.");
    }

    if (combined.includes("No supported JavaScript runtime")) {
      throw new Error(
        "yt-dlp precisa de um runtime JavaScript (Node.js ou Deno). Instale o Node.js."
      );
    }

    const stderrLines = stderr.split("\n").filter((l: string) => l.startsWith("ERROR:") || l.startsWith("WARNING:"));
    const detail = stderrLines.length > 0 ? "\n" + stderrLines.join("\n") : "";
    throw new Error("Falha ao extrair legendas." + detail);
  }
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
    .replace(/\n+/g, " ");
}

function parseVttJson(content: string): string {
  const data = JSON.parse(content);
  const events = data.events || data;
  return events
    .filter((e: any) => e.type === "paragraph" || e.type === "cue")
    .map((e: any) => e.text || e.segments?.map((s: any) => s.text).join("") || "")
    .filter(Boolean)
    .join(" ");
}

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
          message: "TikTok nao disponibiliza legendas para este video. A descricao do video foi extraida, mas nao ha transcricao de audio disponivel.",
        });
      } catch {
        return NextResponse.json({
          success: false,
          transcript: "",
          used_ai: false,
          method: "none",
          message: "Nao foi possivel acessar o TikTok. Verifique se a URL esta correta e o video e publico.",
        });
      }
    }

    const tempDir = join(tmpdir(), `nexia-transcript-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    const cleanup = () => {
      try {
        if (existsSync(tempDir)) {
          for (const file of readdirSync(tempDir)) {
            unlinkSync(join(tempDir, file));
          }
          rmSync(tempDir);
        }
      } catch {}
    };

    try {
      await runYtDlp([
        "--write-auto-subs",
        "--sub-lang", "pt,en",
        "--output", join(tempDir, "video"),
        "--no-overwrites",
        url,
      ]);

      const files = readdirSync(tempDir);
      const subFile = files.find(
        (f: string) =>
          f.endsWith(".vtt") ||
          f.endsWith(".json") ||
          f.endsWith(".srv1") ||
          f.endsWith(".srv2") ||
          f.endsWith(".srv3")
      );

      if (!subFile) {
        cleanup();
        return NextResponse.json({
          success: false,
          transcript: "",
          used_ai: false,
          method: "none",
          message: "Este video nao possui legendas nativas disponiveis para extracao automatica.",
        });
      }

      const subtitlePath = join(tempDir, subFile);
      const content = readFileSync(subtitlePath, "utf-8");
      const transcript = subFile.endsWith(".json")
        ? parseVttJson(content)
        : parseVtt(content);

      cleanup();

      if (!transcript.trim()) {
        return NextResponse.json({
          success: false,
          transcript: "",
          used_ai: false,
          method: "none",
          message: "Este video nao possui legendas nativas disponiveis para extracao automatica.",
        });
      }

      return NextResponse.json({
        success: true,
        transcript,
        used_ai: false,
        method: "native",
      });
    } catch (error) {
      cleanup();
      const msg = error instanceof Error ? error.message : "Falha ao processar a URL.";
      const lowerMsg = msg.toLowerCase();
      let userMessage = msg;
      if (lowerMsg.includes("cookie") || lowerMsg.includes("authentication") || lowerMsg.includes("login") || lowerMsg.includes("sign in")) {
        userMessage = "Este video e privado ou requer autenticacao. Tente com um video publico.";
      } else if (lowerMsg.includes("unable to extract") || lowerMsg.includes("signature") || lowerMsg.includes("age-restricted")) {
        userMessage = "Nao foi possivel extrair a transcricao deste video. Pode ser privado, restrito por idade ou removido.";
      } else if (lowerMsg.includes("youtube") && lowerMsg.includes("not be available")) {
        userMessage = "Legenda nao disponivel para este video do YouTube.";
      } else if (lowerMsg.includes("429") || lowerMsg.includes("too many requests")) {
        userMessage = "YouTube esta limitando as requisicoes. Aguarde alguns minutos e tente novamente.";
      } else if (lowerMsg.includes("javascript runtime")) {
        userMessage = "Servidor sem runtime JavaScript configurado para yt-dlp. Contate o administrador.";
      }
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Requisicao invalida." },
      { status: 400 }
    );
  }
}