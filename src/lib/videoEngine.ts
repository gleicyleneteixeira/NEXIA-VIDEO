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
  blocks: VideoBlock[];
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
 * Gera a matriz de combinações (suporta 3 ou 4 blocos)
 */
export function generateMatrix(
  ...categories: VideoBlock[][]
): Variation[] {
  if (categories.length < 2) return [];

  const variations: Variation[] = [];
  const indices = categories.map(() => 0);

  const totalCombos = categories.reduce((acc, cat) => acc * cat.length, 1);

  for (let i = 0; i < totalCombos; i++) {
    const blocks = categories.map((cat, catIdx) => cat[indices[catIdx]]);
    const idParts = indices.map((idx) => idx + 1).join("_");
    const expectedDuration = blocks.reduce((acc, b) => acc + b.duration, 0);

    variations.push({
      id: `var_${idParts}`,
      blocks,
      expectedDuration,
    });

    // Increment indices
    for (let j = indices.length - 1; j >= 0; j--) {
      indices[j]++;
      if (indices[j] < categories[j].length) break;
      indices[j] = 0;
    }
  }

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

export type VideoFormat = {
  label: string;
  width: number;
  height: number;
  value: string;
};

export const VIDEO_FORMATS: VideoFormat[] = [
  { label: "9:16 Vertical", width: 1080, height: 1920, value: "9:16" },
  { label: "16:9 Horizontal", width: 1920, height: 1080, value: "16:9" },
  { label: "1:1 Quadrado", width: 1080, height: 1080, value: "1:1" },
  { label: "4:5 Retrato", width: 1080, height: 1350, value: "4:5" },
];

/**
 * Concatena vídeos usando FFmpeg.wasm (suporta 3 ou 4 blocos)
 * Aceita array dinâmico de File/Blob
 */
export async function concatenateVideosFFmpeg(
  inputs: (File | Blob)[],
  outputFilename: string,
  onProgress?: (progress: number) => void,
  mode: RenderMode = "fast",
  format: VideoFormat = VIDEO_FORMATS[0],
  transition: "none" | "fade" | "wipe" = "none",
  transitionDuration: number = 0.5
): Promise<ConcatenateResult> {
  const ffmpeg = await initFFmpeg(onProgress);
  const n = inputs.length;
  const fileNames = inputs.map((_, i) => `input_${i}.mp4`);
  const outputFile = outputFilename || "output.mp4";
  const concatList = "concat.txt";

  try {
    if (onProgress) onProgress(10);

    // Validar e ler cada arquivo de entrada
    for (let i = 0; i < n; i++) {
      const input = inputs[i];
      console.log(`[FFmpeg] Reading input ${i + 1}/${n}...`);
      if (input instanceof File && input.size === 0) {
        throw new Error(`Arquivo ${input.name} está vazio (0 bytes).`);
      }
      const data = await readFileToArray(input);
      if (data.byteLength === 0) throw new Error(`Input ${i + 1} data is empty (0 bytes)`);
      await ffmpeg.writeFile(fileNames[i], data);
      if (onProgress) onProgress(10 + Math.round((i + 1) / n * 40));
    }

    // Create concat list
    const concatContent = fileNames.map(f => `file '${f}'`).join("\n");
    await ffmpeg.writeFile(concatList, concatContent);

    if (onProgress) onProgress(55);
    console.log(`[FFmpeg] Concatenating ${n} videos (mode: ${mode}, format: ${format.width}x${format.height})...`);

    // Probe input durations for xfade transitions
    const durations: number[] = [];
    for (let i = 0; i < n; i++) {
      const url = URL.createObjectURL(inputs[i]);
      const dur = await getOutputDuration(url);
      URL.revokeObjectURL(url);
      durations.push(dur);
    }

    if (transition !== "none" && n >= 2) {
      await ffmpegReEncode(ffmpeg, fileNames, outputFile, format, transition, transitionDuration, durations);
    } else if (mode === "fast") {
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
        await ffmpegReEncode(ffmpeg, fileNames, outputFile, format, "none", 0.5, []);
      }
    } else {
      await ffmpegReEncode(ffmpeg, fileNames, outputFile, format, "none", 0.5, []);
    }

    if (onProgress) onProgress(85);
    console.log("[FFmpeg] Reading output...");

    const outputData = await ffmpeg.readFile(outputFile);
    const outputSize = typeof outputData === "string" ? outputData.length : outputData.byteLength;
    console.log("Tamanho do vídeo final gerado:", outputSize);

    if (outputSize === 0) {
      throw new Error("O FFmpeg gerou um arquivo output.mp4 com 0 bytes.");
    }

    const blob = new Blob([outputData as BlobPart], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const duration = await getOutputDuration(url);

    if (onProgress) onProgress(100);
    console.log("[FFmpeg] Done! Duration:", duration);

    cleanupFiles(ffmpeg, [...fileNames, concatList, outputFile]);

    return { blob, url, duration, filename: outputFile };
  } catch (error) {
    console.error("[FFmpeg] Error:", error);
    throw error;
  }
}

/**
 * Re-encode com filter_complex — suporta 3 ou 4 blocos
 */
async function ffmpegReEncode(
  ffmpeg: FFmpeg,
  fileNames: string[],
  outputFile: string,
  format: VideoFormat = VIDEO_FORMATS[0],
  transition: "none" | "fade" | "wipe" = "none",
  transitionDuration: number = 0.5,
  durations: number[] = []
) {
  const { width, height } = format;
  const n = fileNames.length;
  console.log(`[FFmpeg] Re-encoding ${n} videos to ${width}x${height} (passthrough)...`);

  // Construir filter_complex dinamicamente
  const videoFilters: string[] = [];
  const audioFilters: string[] = [];

  for (let i = 0; i < n; i++) {
    videoFilters.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p[v${i}]`
    );
    audioFilters.push(
      `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a${i}]`
    );
  }

  let filterComplex = "";
  if (transition !== "none" && n >= 2 && durations.length === n) {
    let currentVideo = "v0";
    let currentAudio = "a0";
    let accumulatedTime = durations[0];

    const transitionName = transition === "wipe" ? "slideleft" : "fade";

    let vFilters = videoFilters.join("; ") + "; ";
    let aFilters = audioFilters.join("; ") + "; ";
    filterComplex = vFilters + aFilters;

    for (let i = 1; i < n; i++) {
      const nextVideo = `v${i}`;
      const nextAudio = `a${i}`;
      const outVideo = `v_out_${i}`;
      const outAudio = `a_out_${i}`;

      const offset = accumulatedTime - transitionDuration;

      filterComplex += `[${currentVideo}][${nextVideo}]xfade=transition=${transitionName}:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outVideo}]; `;
      filterComplex += `[${currentAudio}][${nextAudio}]acrossfade=d=${transitionDuration}:c1=tri:c2=tri[${outAudio}]; `;

      currentVideo = outVideo;
      currentAudio = outAudio;

      accumulatedTime = accumulatedTime + durations[i] - transitionDuration;
    }

    // Map final outputs
    filterComplex += `[${currentVideo}]copy[outv]; [${currentAudio}]copy[outa]`;
  } else {
    const concatInputs = Array.from({ length: n }, (_, i) => `[v${i}][a${i}]`).join("");
    filterComplex = [...videoFilters, ...audioFilters, `${concatInputs}concat=n=${n}:v=1:a=1[outv][outa]`].join(";");
  }

  const inputs: string[] = [];
  for (const f of fileNames) {
    inputs.push("-i", f);
  }

  await ffmpeg.exec([
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-fps_mode", "passthrough",
    "-c:a", "aac",
    "-b:a", "192k",
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
