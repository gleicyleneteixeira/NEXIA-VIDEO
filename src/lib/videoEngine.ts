/**
 * FFmpeg.wasm Video Concatenation Engine
 * Motor de concatenação de vídeos usando FFmpeg.wasm
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Singleton
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

export interface VideoBlock {
  id: string;
  url: string;
  duration: number;
  file: File;
}

export interface Variation {
  id: string;
  hook: VideoBlock;
  body: VideoBlock;
  cta: VideoBlock;
  expectedDuration: number;
}

export interface ConcatenateResult {
  blob: Blob;
  url: string;
  duration: number;
  filename: string;
}

/**
 * Inicializa o FFmpeg.wasm usando toBlobURL para CDN
 */
export async function initFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance;
  }

  if (ffmpegLoading && loadPromise) {
    return loadPromise;
  }

  ffmpegLoading = true;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    ffmpegInstance = ffmpeg;

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    ffmpeg.on("progress", ({ progress }) => {
      if (onProgress) {
        onProgress(Math.round(progress * 100));
      }
    });

    try {
      console.log("[FFmpeg] Loading core from CDN...");

      const baseURL = typeof window !== "undefined"
        ? `${window.location.origin}/ffmpeg`
        : "";

      // Load from local /public/ffmpeg - no CORS issues
      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      );
      console.log("[FFmpeg] Core JS loaded");

      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      );
      console.log("[FFmpeg] Core WASM loaded");

      await ffmpeg.load({ coreURL, wasmURL });

      ffmpegLoaded = true;
      console.log("[FFmpeg] Loaded successfully!");
    } catch (error) {
      console.error("[FFmpeg] Failed to load:", error);
      ffmpegLoading = false;
      throw error;
    }

    return ffmpeg;
  })();

  return loadPromise;
}

/**
 * Gera a matriz de combinações
 */
export function generateMatrix(
  hooks: VideoBlock[],
  bodies: VideoBlock[],
  ctas: VideoBlock[]
): Variation[] {
  const variations: Variation[] = [];

  hooks.forEach((h, hIndex) => {
    bodies.forEach((b, bIndex) => {
      ctas.forEach((c, cIndex) => {
        variations.push({
          id: `var_${hIndex + 1}_${bIndex + 1}_${cIndex + 1}`,
          hook: h,
          body: b,
          cta: c,
          expectedDuration: h.duration + b.duration + c.duration,
        });
      });
    });
  });

  return variations;
}

/**
 * Lê um File/Blob direto da memória - sem fetch/rede
 */
async function readFileToArray(fileOrBlob: File | Blob): Promise<Uint8Array> {
  if (fileOrBlob instanceof File || fileOrBlob instanceof Blob) {
    const buffer = await fileOrBlob.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return await fetchFile(fileOrBlob);
}

export type RenderMode = "fast" | "compatibility";

/**
 * Concatena 3 vídeos usando FFmpeg.wasm
 * Aceita File ou Blob diretamente (lê da memória, sem fetch)
 * mode: 'fast' = -c copy (rápido), 'compatibility' = re-encode (lento mas compatível)
 */
export async function concatenateVideosFFmpeg(
  hookInput: File | Blob,
  bodyInput: File | Blob,
  ctaInput: File | Blob,
  outputFilename: string,
  onProgress?: (progress: number) => void,
  mode: RenderMode = "fast"
): Promise<ConcatenateResult> {
  const ffmpeg = await initFFmpeg(onProgress);

  const hookFile = "hook.mp4";
  const bodyFile = "body.mp4";
  const ctaFile = "cta.mp4";
  const outputFile = outputFilename || "output.mp4";
  const concatList = "concat.txt";

  try {
    if (onProgress) onProgress(10);

    // Validar arquivos de entrada
    console.log("[FFmpeg] Validating input files...");
    if (hookInput instanceof File) console.log("Hook size:", hookInput.size);
    if (bodyInput instanceof File) console.log("Body size:", bodyInput.size);
    if (ctaInput instanceof File) console.log("CTA size:", ctaInput.size);

    if (
      (hookInput instanceof File && hookInput.size === 0) ||
      (bodyInput instanceof File && bodyInput.size === 0) ||
      (ctaInput instanceof File && ctaInput.size === 0)
    ) {
      throw new Error("Um ou mais arquivos de mídia selecionados estão vazios (0 bytes) ou revogados da memória.");
    }

    console.log("[FFmpeg] Reading hook video...");
    const hookData = await readFileToArray(hookInput);
    if (hookData.byteLength === 0) throw new Error("Hook video data is empty (0 bytes)");
    await ffmpeg.writeFile(hookFile, hookData);

    if (onProgress) onProgress(25);
    console.log("[FFmpeg] Reading body video...");
    const bodyData = await readFileToArray(bodyInput);
    if (bodyData.byteLength === 0) throw new Error("Body video data is empty (0 bytes)");
    await ffmpeg.writeFile(bodyFile, bodyData);

    if (onProgress) onProgress(40);
    console.log("[FFmpeg] Reading CTA video...");
    const ctaData = await readFileToArray(ctaInput);
    if (ctaData.byteLength === 0) throw new Error("CTA video data is empty (0 bytes)");
    await ffmpeg.writeFile(ctaFile, ctaData);

    if (onProgress) onProgress(50);

    // Step 2: Create concat list file
    const concatContent = `file '${hookFile}'
file '${bodyFile}'
file '${ctaFile}'`;
    await ffmpeg.writeFile(concatList, concatContent);

    if (onProgress) onProgress(55);
    console.log(`[FFmpeg] Concatenating (mode: ${mode})...`);

    if (mode === "fast") {
      // Fast path: stream copy — tenta sem re-encode
      try {
        await ffmpeg.exec([
          "-f", "concat",
          "-safe", "0",
          "-i", concatList,
          "-c", "copy",
          "-movflags", "+faststart",
          "-y",
          outputFile
        ]);
        // Valida se o output tem duração real
        const testDuration = await getOutputDuration(
          URL.createObjectURL(new Blob([await ffmpeg.readFile(outputFile) as BlobPart], { type: "video/mp4" }))
        );
        if (testDuration > 0) {
          console.log("[FFmpeg] Stream copy succeeded!");
        } else {
          throw new Error("Invalid output duration");
        }
      } catch (copyError) {
        console.warn("[FFmpeg] Stream copy failed, falling back to re-encode...", copyError);
        await ffmpegReEncode(ffmpeg, hookFile, bodyFile, ctaFile, outputFile);
      }
    } else {
      // Compatibility path: full re-encode with filter_complex
      await ffmpegReEncode(ffmpeg, hookFile, bodyFile, ctaFile, outputFile);
    }

    if (onProgress) onProgress(85);
    console.log("[FFmpeg] Reading output...");

    // Step 4: Read output file
    const outputData = await ffmpeg.readFile(outputFile);
    const outputSize = typeof outputData === "string" ? outputData.length : outputData.byteLength;
    console.log("Tamanho do vídeo final gerado:", outputSize);

    if (outputSize === 0) {
      throw new Error("O FFmpeg gerou um arquivo output.mp4 com 0 bytes.");
    }

    // Step 5: Create blob from output
    const blob = new Blob([outputData as BlobPart], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);

    // Step 6: Get actual duration
    const duration = await getOutputDuration(url);

    if (onProgress) onProgress(100);
    console.log("[FFmpeg] Done! Duration:", duration);

    // Cleanup files in FFmpeg filesystem
    cleanupFiles(ffmpeg, [hookFile, bodyFile, ctaFile, concatList, outputFile]);

    return { blob, url, duration, filename: outputFile };
  } catch (error) {
    console.error("[FFmpeg] Error:", error);
    throw error;
  }
}

/**
 * Re-encode com filter_complex — padroniza 1080x1920, H.264, AAC, faststart
 */
async function ffmpegReEncode(
  ffmpeg: FFmpeg,
  hookFile: string,
  bodyFile: string,
  ctaFile: string,
  outputFile: string
) {
  console.log("[FFmpeg] Re-encoding with filter_complex...");
  await ffmpeg.exec([
    "-i", hookFile,
    "-i", bodyFile,
    "-i", ctaFile,
    "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];" +
    "[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];" +
    "[2:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v2];" +
    "[v0][0:a][v1][1:a][v2][2:a]concat=n=3:v=1:a=1[outv][outa]",
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-movflags", "+faststart",
    "-y",
    outputFile
  ]);
  console.log("[FFmpeg] Re-encode succeeded!");
}

/**
 * Cleanup FFmpeg filesystem
 */
async function cleanupFiles(ffmpeg: FFmpeg, files: string[]) {
  for (const file of files) {
    try {
      await ffmpeg.deleteFile(file);
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Get video duration from URL (não revoga a URL)
 */
async function getOutputDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve(video.duration);
    };
    video.onerror = () => {
      resolve(0);
    };
    video.src = url;
  });
}

/**
 * Format seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds to readable text
 */
export function formatDurationLong(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}min ${secs}s`;
  } else if (mins > 0) {
    return `${mins}min ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Get video duration from URL
 */
export function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(0);
    };
    video.src = url;
  });
}
