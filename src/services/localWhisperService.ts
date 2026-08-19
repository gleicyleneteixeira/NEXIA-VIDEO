"use client";

import { pipeline, env } from "@xenova/transformers";

/**
 * Transcricao de video/audio 100% local no navegador.
 * Modelo Whisper (Xenova/whisper-tiny ~39MB) via Transformers.js / ONNX WASM.
 * A inferencia roda em um Web Worker interno (env.backends.onnx.wasm.proxy)
 * para nao travar a interface durante o processamento.
 */

env.allowLocalModels = false;
env.useBrowserCache = true;
(env.backends.onnx.wasm as unknown as { proxy?: boolean }).proxy = true;

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

const pipelineCache = new Map<WhisperModelId, Promise<Transcriber>>();

function getPipeline(
  model: WhisperModelId,
  onProgress?: (p: WhisperProgress) => void
): Promise<Transcriber> {
  if (!pipelineCache.has(model)) {
    pipelineCache.set(
      model,
      pipeline("automatic-speech-recognition", model, {
        progress_callback: onProgress,
      }) as unknown as Promise<Transcriber>
    );
  }
  return pipelineCache.get(model) as Promise<Transcriber>;
}

async function extractAudio(file: File): Promise<Float32Array> {
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
   * Transcreve um arquivo de video ou audio em texto (pt-BR).
   * onProgress recebe (percentual de 0 a 100, texto de status).
   */
  async transcribe(
    file: File,
    onProgress?: (pct: number, msg: string) => void,
    model: WhisperModelId = "Xenova/whisper-tiny"
  ): Promise<string> {
    onProgress?.(15, "Isolando a trilha de audio do arquivo...");

    let audioData: Float32Array;
    try {
      audioData = await extractAudio(file);
    } catch {
      throw new Error(
        "Nao foi possivel decodificar o audio deste arquivo. Use MP4/WebM/MOV (video) ou MP3/WAV/M4A (audio)."
      );
    }

    onProgress?.(35, "Carregando motor Whisper no navegador...");

    const transcriber = await getPipeline(model, (p) => {
      if (p.status === "progress" && p.total && p.loaded !== undefined) {
        const pct = Math.round((p.loaded / p.total) * 35) + 35;
        onProgress?.(pct, `Preparando modelo de fala (${pct}%)...`);
      }
    });

    onProgress?.(75, "Transcrevendo a fala em portugues...");

    const result = await transcriber(audioData, {
      language: "portuguese",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    onProgress?.(100, "Transcricao concluida!");
    return typeof result === "string" ? result : result?.text || "";
  },
};