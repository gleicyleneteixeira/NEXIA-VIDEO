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
 * Arquivos de cada slot de uma variacao. Usado para montar a lista de tracks
 * de forma explicita: EXATAMENTE um arquivo por slot ativo, sem loops que
 * re-insiram o mesmo clipe na mesma variacao.
 */
export type BulkSlotFiles = {
  hook?: File;
  bodyWithCta?: File;
  development?: File;
  painOrDesire?: File;
  solution?: File;
  cta?: File;
};

/**
 * Monta a lista de arquivos de uma unica variacao a partir dos slots da
 * modalidade. Garante que cada variacao receba estritamente um arquivo de
 * cada slot ativo, na ordem correta, sem duplicacoes internas.
 */
export function buildSingleVariationTrackList(
  structureMode: "2-slots" | "3-slots" | "4-slots",
  selectedFiles: BulkSlotFiles
): File[] {
  const tracks: File[] = [];
  const push = (f?: File) => {
    if (f) tracks.push(f);
  };

  if (structureMode === "2-slots") {
    push(selectedFiles.hook);
    push(selectedFiles.bodyWithCta);
  } else if (structureMode === "3-slots") {
    push(selectedFiles.hook);
    push(selectedFiles.development);
    push(selectedFiles.cta);
  } else {
    // 4-slots
    push(selectedFiles.hook);
    push(selectedFiles.painOrDesire);
    push(selectedFiles.solution);
    push(selectedFiles.cta);
  }

  // NUNCA fazer loops 'for' internos duplicando tracks dentro da mesma variacao
  return tracks;
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

/**
 * Recupera uma extensao segura para o FFmpeg a partir do nome/tipo do arquivo,
 * evitando gravar clipes nao-mp4 com extensao .mp4 (que faz o FFmpeg detectar
 * o formato errado e produzir saida quebrada).
 */
function getFileExtension(input: File | Blob): string {
  const f = input as File;
  if (f && typeof f.name === "string" && f.name.includes(".")) {
    const ext = f.name.split(".").pop()!.toLowerCase();
    if (["mp4", "webm", "mov", "mkv", "avi", "m4v", "ogv", "ts"].includes(ext)) return ext;
  }
  if (f && typeof f.type === "string" && f.type.includes("/")) {
    const sub = f.type.split("/")[1].toLowerCase();
    if (sub.startsWith("quicktime")) return "mov";
    if (sub === "x-matroska") return "mkv";
    if (["mp4", "webm", "mov", "mkv", "avi", "ogg", "ogv"].includes(sub)) return sub;
  }
  return "mp4";
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
  transitionDuration: number = 0.5,
  durations?: number[]
): Promise<ConcatenateResult> {
  let ffmpeg = await initFFmpeg(onProgress);
  const n = inputs.length;
  if (n === 0) throw new Error("Nenhum arquivo de entrada para concatenacao.");
  const fileNames = inputs.map((inp, i) => `input_${i}.${getFileExtension(inp)}`);
  const outputFile = outputFilename || "output.mp4";

  try {
    // Nucleo da concatenacao de UMA variacao. Isolado para permitir reset+retry
    // seguro caso o MEMFS do FFmpeg.wasm corrompa (FS error).
    const runConcat = async (): Promise<ConcatenateResult> => {
      // LIMPEZA PREVENTIVA DO RESIDUAL: remove inputs e output de tentativas
      // anteriores ANTES de escrever, para nao acumular no disco virtual.
      for (const f of fileNames) await safeUnlink(ffmpeg, f);
      await safeUnlink(ffmpeg, outputFile);

      if (onProgress) onProgress(10);

      // Validar e escrever cada arquivo de entrada no FS do FFmpeg
      for (let i = 0; i < n; i++) {
        const input = inputs[i];
        console.log(`[FFmpeg] Reading input ${i + 1}/${n}...`);
        if (input instanceof File && input.size === 0) {
          throw new Error(`Arquivo ${input.name} está vazio (0 bytes).`);
        }
        const data = await readFileToArray(input);
        if (data.byteLength === 0) throw new Error(`Input ${i + 1} data is empty (0 bytes)`);
        await ffmpeg.writeFile(fileNames[i], data);
        if (onProgress) onProgress(10 + Math.round((i + 1) / n * 30));
      }

      if (onProgress) onProgress(55);
      console.log(`[FFmpeg] Concatenating ${n} videos (mode: ${mode}, format: ${format.width}x${format.height})...`);

      if (transition !== "none" && n >= 2) {
        // Transicoes (fade/wipe) exigem re-encode via xfade. Sonda duracoes p/ offsets.
        const durations: number[] = [];
        for (let i = 0; i < n; i++) {
          const url = URL.createObjectURL(inputs[i]);
          durations.push(await getOutputDuration(url));
          URL.revokeObjectURL(url);
        }
        await ffmpegReEncode(ffmpeg, fileNames, outputFile, format, transition, transitionDuration, durations);
      } else {
        // SEM TRANSICAO. Tenta -c copy (concat demuxer) primeiro — é ~10x mais
        // rápido porque apenas copia os streams sem re-encode. Se as resoluções
        // dos inputs diferem, o copy congela o vídeo no 2o clipe, então saltamos
        // direto pro re-encode normalizado. Se o copy falhar por outro motivo,
        // fazemos fallback seguro para re-encode.
        const sameRes = await inputsSameResolution(inputs);
        if (sameRes) {
          const copyOk = await concatCopyDemuxer(ffmpeg, fileNames, outputFile, durations);
          if (copyOk) {
            console.log("[FFmpeg] concat demuxer -c copy OK (rápido)");
          } else {
            console.log("[FFmpeg] -c copy falhou, fallback para re-encode...");
            await ffmpegReEncode(ffmpeg, fileNames, outputFile, format, "none", 0.5, []);
          }
        } else {
          console.log("[FFmpeg] Resoluções diferentes, re-encode forçado...");
          await ffmpegReEncode(ffmpeg, fileNames, outputFile, format, "none", 0.5, []);
        }
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
      // Le a duracao REAL do Blob (trata 9h fantasma como 0) para os cards.
      const duration = await getBlobRealDuration(blob);

      if (onProgress) onProgress(100);
      console.log("[FFmpeg] Done! Duration:", duration);

      return { blob, url, duration, filename: outputFile };
    };

    // Tenta executar a variacao. Se ocorrer "FS error" (MEMFS corrompido),
    // reseta a instancia do FFmpeg.wasm e RE-TENTA UMA VEZ. Isso impede que a
    // falha de uma variacao se propague em cascata para as demais da fila
    // (cards com "Erro desconhecido").
    let result: ConcatenateResult;
    try {
      result = await runConcat();
    } catch (firstErr) {
      if (/FS error|errno|FS\/|failed to (read|write)|cannot (read|write)/i.test(String((firstErr as Error)?.message || firstErr))) {
        console.warn("[FFmpeg] FS error detectado — resetando instancia e re-tentando uma vez...", firstErr);
        ffmpeg = await resetFFmpegInstance(onProgress);
        result = await runConcat();
      } else {
        throw firstErr;
      }
    }
    return result;
  } catch (error) {
    console.error("[FFmpeg] Error:", error);
    throw error;
  } finally {
    // LIMPEZA OBRIGATORIA DO MEMFS: remove TODOS os arquivos temporarios de
    // entrada e saida, mesmo se a concatenacao falhou. Isso evita o acumulo
    // de arquivos no sistema de arquivos virtual do FFmpeg.wasm que causa o
    // "ErrnoError: FS error" (estouro de memoria / RAM do navegador) ao
    // processar muitas variacoes em sequencia na fila.
    await cleanupFiles(ffmpeg, [...fileNames, outputFile]);
  }
}

/**
 * Concatenacao rapida via concat demuxer com -c copy (sem re-encode).
 * Apenas "cola" os streams quando as midias sao compativeis (mesmo codec,
 * resolucao, framerate e parametros de audio). Retorna false se o FFmpeg
 * falhar ou gerar saida vazia, para que o chamador faca fallback ao re-encode.
 */
async function concatCopyDemuxer(
  ffmpeg: FFmpeg,
  fileNames: string[],
  outputFile: string,
  durations?: number[]
): Promise<boolean> {
  // Monta a lista do concat demuxer. Se tivermos as duracoes por clipe,
  // anotamos `duration X` em cada entrada e limitamos a saida com `-t` somado,
  // evitando que o FFmpeg processe um container sem fim (duracao fantasma ~9h)
  // e o `Aborted()` por estouro de tempo/memoria no wasm.
  let concatText = "";
  fileNames.forEach((f, i) => {
    concatText += `file '${f}'\n`;
    const d = durations?.[i];
    if (d && isFinite(d) && d > 0) concatText += `duration ${d.toFixed(3)}\n`;
  });
  await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatText));

  const totalDuration = (durations || []).reduce((acc, d) => acc + (isFinite(d) ? d : 0), 0);

  const args: string[] = [
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
  ];
  if (totalDuration > 0) {
    args.push("-t", totalDuration.toFixed(3));
  }
  args.push(
    "-c", "copy",
    "-fflags", "+genpts",
    "-avoid_negative_ts", "make_zero",
    "-movflags", "+faststart",
    "-y", outputFile
  );

  try {
    await ffmpeg.exec(args);
    const out = await ffmpeg.readFile(outputFile);
    const size = typeof out === "string" ? out.length : out.byteLength;
    return size > 0;
  } catch (e) {
    console.warn("[FFmpeg] concat demuxer -c copy falhou:", e);
    return false;
  } finally {
    try {
      await ffmpeg.deleteFile("concat.txt");
    } catch (e) {
      // Ignore
    }
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
    // Reconstroi PTS de cada entrada para evitar saltos de tempo.
    // (sem `+async`: nao e sub-flag valida de -fflags no FFmpeg.wasm)
    inputs.push("-fflags", "+genpts", "-avoid_negative_ts", "make_zero", "-i", f);
  }

  await ffmpeg.exec([
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "zerolatency",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-threads", "0",
    "-c:a", "aac",
    "-ar", "44100",
    "-b:a", "96k",
    "-avoid_negative_ts", "make_zero",
    "-fflags", "+genpts",
    "-async", "1",
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

// Remove um arquivo do MEMFS de forma defensiva (silencia se nao existir).
// Usado para limpar o residual ANTES de escrever, evitando o "ErrnoError: FS error"
// causado por arquivos de tentativas anteriores ainda alocados no disco virtual.
async function safeUnlink(ffmpeg: FFmpeg, fileName: string) {
  try {
    await ffmpeg.deleteFile(fileName);
  } catch (e) {
    // Arquivo pode nao existir no FS; ignora silenciosamente
  }
}

// Reseta completamente a instancia do FFmpeg.wasm para recuperar de um FS
// corrompido. Usado como ultimo recurso apos um "FS error" para que a falha
// de uma variacao NAO se propague em cascata para as proximas da fila.
async function resetFFmpegInstance(onProgress?: (p: number) => void): Promise<FFmpeg> {
  try {
    if (ffmpegInstance) ffmpegInstance.terminate();
  } catch (e) {
    // Ignore
  }
  ffmpegInstance = null;
  ffmpegLoaded = false;
  ffmpegLoading = false;
  loadPromise = null;
  return initFFmpeg(onProgress);
}

/**
 * Get video duration from URL (não revoga a URL)
 */
async function getOutputDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const d = video.duration;
      // Protege contra duracao fantasma (Infinity / NaN) que o navegador
      // as vezes reporta para containers MP4 mal indexados.
      resolve(isFinite(d) && !isNaN(d) ? d : 0);
    };
    video.onerror = () => {
      resolve(0);
    };
    video.src = url;
  });
}

// Parser de metadados obrigatorio para a UI: le a duracao REAL do Blob gerado
// e trata valores fantasma (Infinity/NaN) como 0. Usado para corrigir o
// "player de 9 horas" (09:50:00) exibido nos cards da interface.
export const getBlobRealDuration = (videoBlob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(videoBlob);
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(isFinite(duration) && !isNaN(duration) ? duration : 0);
    };
    video.onerror = () => resolve(0);
  });
};

// Le a resolucao real (videoWidth x videoHeight) de um input de video via
// elemento oculto. Retorna null se nao conseguir (imagens, arquivos corrompidos).
async function getVideoResolution(input: File | Blob): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(input);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      URL.revokeObjectURL(url);
      resolve(w > 0 && h > 0 ? { w, h } : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

// Verifica se TODOS os inputs de video tem EXATAMENTE a mesma resolucao.
// O -c copy (concat demuxer) CONGELA a imagem do 2o clipe quando as resolucoes
// diferem (o audio continua, mas o video trava no ultimo frame do clipe anterior).
// Se qualquer input divergir (ou nao for possivel ler), retorna false para
// forcar o re-encode normalizado (fps=30, format=yuv420p, scale) e evitar o freeze.
async function inputsSameResolution(inputs: (File | Blob)[]): Promise<boolean> {
  try {
    const dims = await Promise.all(inputs.map(getVideoResolution));
    const valid = dims.filter((d): d is { w: number; h: number } => !!d);
    if (valid.length < 2) return true; // nada a comparar ou <2 videos legiveis
    const { w, h } = valid[0];
    return valid.every((d) => d.w === w && d.h === h);
  } catch {
    return false; // ante qualquer erro, preferimos o re-encode (seguro)
  }
}

/**
 * Format seconds to MM:SS (ou Hh Mmin Ss quando passa de 1h).
 * Sanitiza valores que chegam em milissegundos (metadados sujos do FFmpeg):
 * se o numero for absurdamente grande (> 100000), trata como ms e converte.
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";

  const safeSeconds = seconds > 100000 ? Math.floor(seconds / 1000) : Math.floor(seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;

  if (mins < 60) {
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}min ${String(secs).padStart(2, "0")}s`;
}

/**
 * Format seconds to readable text. Mesma sanitizacao de ms do formatDuration.
 */
export function formatDurationLong(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "0s";

  const s = seconds > 100000 ? Math.floor(seconds / 1000) : Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

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
