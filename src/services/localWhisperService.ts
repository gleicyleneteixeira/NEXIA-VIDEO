"use client";

/**
 * Transcricao de video/audio 100% local no navegador.
 *
 * O motor @xenova/transformers e carregado de um CDN (jsDelivr) como ESM
 * puro, via `new Function("url", "return import(url)")`. Esse carregador
 * roda diretamente no motor V8 do navegador, sem passar pela instrumentacao
 * do Turbopack/Next.js — eliminando tanto "Cannot convert undefined or null
 * to object" (empacotamento WASM/ONNX) quanto
 * "__turbopack_context__.x is not a function".
 */

const TRANSFORMERS_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.js";

export type WhisperModelId = "Xenova/whisper-tiny" | "Xenova/whisper-base";

export const WHISPER_MODELS: { id: WhisperModelId; label: string; desc: string }[] = [
  { id: "Xenova/whisper-tiny", label: "Tiny", desc: "Rapido (~39MB)" },
  { id: "Xenova/whisper-base", label: "Base", desc: "Mais preciso (~145MB)" },
];

export interface WhisperProgress {
  status: string;
  loaded?: number;
  total?: number;
  file?: string;
}

type Transcriber = (
  audio: Float32Array,
  options?: Record<string, unknown>
) => Promise<string | { text?: string }>;

interface TransformersEnv {
  allowLocalModels: boolean;
  useBrowserCache: boolean;
  backends: { onnx: { wasm: { proxy?: boolean } } };
}

interface TransformersModule {
  env: TransformersEnv;
  pipeline: (
    task: string,
    model: string,
    options?: { progress_callback?: (p: WhisperProgress) => void }
  ) => Promise<Transcriber>;
}

type NativeImporter = (url: string) => Promise<unknown>;

let transformersModule: TransformersModule | null = null;
const transcriberCache = new Map<WhisperModelId, Promise<Transcriber>>();

/**
 * Carregador nativo que contorna 100% a analise estatica do bundler: o
 * `import(url)` acontece dentro de um `new Function`, fora do alcance do
 * Turbopack, usando o ESM loader do proprio navegador.
 */
async function loadTransformers(): Promise<TransformersModule> {
  if (transformersModule) return transformersModule;
  if (typeof window === "undefined") {
    throw new Error("Transcricao disponivel apenas no navegador.");
  }

  try {
    const nativeImport = new Function("url", "return import(url)") as NativeImporter;
    const mod = (await nativeImport(TRANSFORMERS_CDN_URL)) as TransformersModule;

    mod.env.allowLocalModels = false;
    mod.env.useBrowserCache = true;
    mod.env.backends.onnx.wasm.proxy = true;

    transformersModule = mod;
    return mod;
  } catch (error) {
    console.error("Falha ao carregar Transformers via ESM nativo:", error);
    throw new Error("Nao foi possivel carregar o motor de IA no navegador.");
  }
}

async function getTranscriber(
  model: WhisperModelId,
  onProgress?: (p: WhisperProgress) => void
): Promise<Transcriber> {
  if (!transcriberCache.has(model)) {
    transcriberCache.set(
      model,
      (async () => {
        const transformers = await loadTransformers();
        return transformers.pipeline("automatic-speech-recognition", model, {
          progress_callback: onProgress,
        });
      })()
    );
  }
  return transcriberCache.get(model) as Promise<Transcriber>;
}

async function extractAudioData(file: File): Promise<Float32Array> {
  if (typeof window === "undefined") {
    throw new Error("Transcricao disponivel apenas no navegador.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx({ sampleRate: 16000 });
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

export const LocalWhisperService = {
  /**
   * Transcreve um arquivo de video ou audio para texto (pt-BR).
   * modelName seleciona o modelo Whisper; onProgress recebe (0-100, mensagem).
   */
  async transcribeFile(
    file: File,
    modelName: WhisperModelId = "Xenova/whisper-tiny",
    onProgress?: (pct: number, msg: string) => void
  ): Promise<string> {
    try {
      onProgress?.(10, "Isolando a faixa de audio do arquivo...");

      let audioData: Float32Array;
      try {
        audioData = await extractAudioData(file);
      } catch {
        throw new Error(
          "Nao foi possivel decodificar o audio deste arquivo. Use MP4/WebM/MOV (video) ou MP3/WAV/M4A (audio)."
        );
      }

      onProgress?.(25, "Inicializando o motor Whisper no navegador...");

      const transcriber = await getTranscriber(modelName, (p) => {
        if (p.status === "progress" && p.total && p.loaded !== undefined) {
          const pct = Math.round((p.loaded / p.total) * 35) + 35;
          onProgress?.(pct, `Baixando modelo Whisper (${pct}%)...`);
        }
      });

      if (!transcriber) {
        throw new Error("Falha ao instanciar o pipeline Web.");
      }

      onProgress?.(75, "Transcrevendo a fala em portugues...");

      const output = await transcriber(audioData, {
        language: "portuguese",
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      onProgress?.(100, "Transcricao finalizada com sucesso!");
      return typeof output === "string" ? output : output.text || "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao processar a transcricao local.";
      console.warn("Whisper Web (CDN nativo) falhou:", err);
      throw new Error(msg);
    }
  },
};