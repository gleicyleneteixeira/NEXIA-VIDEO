import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";

export const maxDuration = 120;
import { readdirSync, readFileSync, rmSync, mkdirSync, existsSync, unlinkSync, statSync } from "fs";
import { createReadStream } from "fs";
import { Readable } from "stream";

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

    if (combined.includes("ENOENT") || combined.includes("not found") || combined.includes("no such file")) {
      throw new Error("yt-dlp nao esta instalado no servidor.");
    }
    if (combined.includes("429") || combined.toLowerCase().includes("too many requests")) {
      throw new Error("Plataforma esta limitando as requisicoes. Aguarde alguns minutos e tente novamente.");
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

function getVideoTitle(args: string[]): string {
  const titleArgs = ["--print", "title", "--skip-download", ...args];
  try {
    const { stdout } = require("child_process").execFileSync(
      "yt-dlp",
      titleArgs,
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

export async function POST(request: NextRequest) {
  const tempDir = join(tmpdir(), `nexia-download-${Date.now()}`);
  try {
    const body = await request.json();
    const { url, format } = body;

    if (!url) {
      return NextResponse.json({ error: "URL obrigatoria" }, { status: 400 });
    }
    if (format !== "video" && format !== "audio") {
      return NextResponse.json({ error: "Formato invalido. Use 'video' ou 'audio'." }, { status: 400 });
    }

    mkdirSync(tempDir, { recursive: true });

    const baseName = "download";
    const outputTemplate = join(tempDir, baseName);

    if (format === "audio") {
      await runYtDlp([
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--output", outputTemplate + ".%(ext)s",
        "--no-playlist",
        url,
      ]);
    } else {
      await runYtDlp([
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--output", outputTemplate + ".%(ext)s",
        "--no-playlist",
        url,
      ]);
    }

    const files = readdirSync(tempDir);
    const mediaFile = files.find((f: string) => {
      if (format === "audio") return f.endsWith(".mp3") || f.endsWith(".wav") || f.endsWith(".m4a");
      return f.endsWith(".mp4") || f.endsWith(".webm");
    });

    if (!mediaFile) {
      return NextResponse.json(
        { error: "Nao foi possivel baixar a midia. Formato nao suportado ou video privado." },
        { status: 400 }
      );
    }

    const filePath = join(tempDir, mediaFile);
    const fileStat = statSync(filePath);
    const ext = mediaFile.split(".").pop() || (format === "audio" ? "mp3" : "mp4");
    const contentType = format === "audio" ? "audio/mpeg" : "video/mp4";

    let title = baseName;
    try {
      title = getVideoTitle(["--no-playlist", url]);
    } catch {}

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", String(fileStat.size));
    headers.set("Content-Disposition", `attachment; filename="${title}.${ext}"`);
    headers.set("Cache-Control", "no-cache");

    const fileBuffer = readFileSync(filePath);

    setTimeout(() => {
      try {
        if (existsSync(tempDir)) {
          for (const f of readdirSync(tempDir)) {
            unlinkSync(join(tempDir, f));
          }
          rmSync(tempDir);
        }
      } catch {}
    }, 5000);

    return new NextResponse(fileBuffer, { status: 200, headers });
  } catch (error) {
    try {
      if (existsSync(tempDir)) {
        for (const f of readdirSync(tempDir)) {
          unlinkSync(join(tempDir, f));
        }
        rmSync(tempDir);
      }
    } catch {}

    const msg = error instanceof Error ? error.message : "Falha ao baixar midia.";
    const lowerMsg = msg.toLowerCase();
    let userMessage = msg;
    if (lowerMsg.includes("video nao encontrado") || lowerMsg.includes("indisponivel")) {
      userMessage = "Video nao encontrado ou indisponivel. Verifique a URL.";
    } else if (lowerMsg.includes("privado") || lowerMsg.includes("login")) {
      userMessage = "Este video e privado ou requer login.";
    } else if (lowerMsg.includes("429") || lowerMsg.includes("limitando")) {
      userMessage = "Plataforma limitando requisicoes. Aguarde alguns minutos.";
    }
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
