"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Mic, Square, AlertTriangle } from "lucide-react";
import { useProjectStore, usePlaybackStore, useUIStore } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import type { TimelineItem } from "@/lib/editor";

const BAR_COUNT = 20;

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const EMPTY_LEVELS = new Array(BAR_COUNT).fill(0);

/**
 * Gravação de narração (voiceover) via MediaRecorder.
 *  - Pede permissão do microfone (getUserMedia).
 *  - Mede o nível de áudio em tempo real (VU meter via AnalyserNode).
 *  - Dá play automático na timeline a partir da posição da agulha.
 *  - Ao parar: gera o Blob de áudio + ObjectURL e cria um clipe na timeline
 *    que inicia exatamente onde a gravação começou (com waveform na faixa).
 */
export default function VoiceoverModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(EMPTY_LEVELS);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const startFrameRef = useRef(0);

  const stopMeter = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const releaseResources = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const handleStart = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;

      // AnalyserNode para o medidor VU (volume do mic em tempo real)
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      // Marca o frame de início e dá play automático na timeline
      startFrameRef.current = usePlaybackStore.getState().currentTime || 0;
      setElapsedMs(0);
      recorder.start(250);
      setRecording(true);
      startedAtRef.current = performance.now();
      usePlaybackStore.getState().play();

      timerRef.current = setInterval(() => {
        setElapsedMs(performance.now() - startedAtRef.current);
      }, 100);

      const draw = () => {
        const an = analyserRef.current;
        if (an) {
          const data = new Uint8Array(an.frequencyBinCount);
          an.getByteFrequencyData(data);
          const band = Math.max(1, Math.floor((data.length * 0.65) / BAR_COUNT));
          const next = new Array(BAR_COUNT).fill(0).map((_, i) => {
            let sum = 0;
            let n = 0;
            for (let j = i * band; j < Math.min((i + 1) * band, data.length); j++) {
              sum += data[j];
              n++;
            }
            const avg = n ? sum / n : 0;
            return Math.min(1, Math.max(0.04, avg / 180));
          });
          setLevels(next);
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Não foi possível acessar o microfone: ${e.message}`
          : "Não foi possível acessar o microfone."
      );
    } finally {
      setStarting(false);
    }
  }, []);

  const handleStop = useCallback(() => {
    const recorder = recorderRef.current;
    stopMeter();
    setRecording(false);
    usePlaybackStore.getState().pause();

    const finalize = (blob: Blob) => {
      const fps = useProjectStore.getState().project.timeline.fps || 30;
      const durMs = Math.max(100, performance.now() - startedAtRef.current);
      const durationInFrames = Math.max(1, Math.round((durMs / 1000) * fps));
      const url = URL.createObjectURL(blob);
      const file = new File([blob], "narracao.webm", { type: blob.type || "audio/webm" });

      const holder: { item: TimelineItem | null } = { item: null };
      withHistory("Gravar narração", () => {
        holder.item = useProjectStore.getState().addVoiceover({
          src: url,
          file,
          startFrame: startFrameRef.current,
          durationInFrames,
          name: "Narração",
        });
      });
      useUIStore.getState().clearSelection();
      if (holder.item) useUIStore.getState().select(holder.item.id);
      releaseResources();
      onClose();
    };

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        finalize(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.stop();
    } else {
      finalize(new Blob(chunksRef.current, { type: "audio/webm" }));
    }
  }, [stopMeter, releaseResources, onClose]);

  // Fechar o modal no meio de uma gravação descarta a captura sem salvar.
  useEffect(() => {
    if (!open) {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      stopMeter();
      releaseResources();
      setRecording(false);
    }
  }, [open, stopMeter, releaseResources]);

  // Cleanup final ao desmontar.
  useEffect(() => {
    return () => {
      stopMeter();
      releaseResources();
    };
  }, [stopMeter, releaseResources]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => { if (!recording) onClose(); }}
    >
      <div
        className="w-[400px] bg-[#13131f]/95 border border-white/10 rounded-xl shadow-2xl p-5 flex flex-col gap-4 font-sans text-white text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <Mic size={16} className="text-[#f472b6]" />
            Gravar Narração
          </span>
          <button
            onClick={onClose}
            disabled={recording}
            className="text-gray-400 hover:text-white transition-colors text-sm disabled:opacity-30"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Medidor VU + tempo */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Nível de Áudio</span>
            <span className={`font-mono font-semibold ${recording ? "text-[#f472b6]" : "text-gray-500"}`}>
              {formatElapsed(recording ? elapsedMs : 0)}
            </span>
          </div>
          <div className="flex items-end gap-[3px] h-10 bg-black/40 rounded-md px-2 py-1.5">
            {(recording ? levels : EMPTY_LEVELS).map((lvl, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-[height] duration-75"
                style={{
                  height: `${Math.round(Math.max(lvl, 0.04) * 100)}%`,
                  backgroundColor: lvl > 0.8 ? "#f43f5e" : lvl > 0.5 ? "#f472b6" : "#22d3ee",
                  opacity: recording ? 0.9 : 0.15,
                }}
              />
            ))}
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed">
            {recording
              ? "A reprodução está em andamento — fale por cima do vídeo. O clipe começa na posição da gravação."
              : "Ao iniciar, dá play automático no vídeo a partir da agulha. Quando parar, o clipe de áudio entra no timeline no mesmo ponto."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          {!recording ? (
            <button
              onClick={handleStart}
              disabled={starting}
              className="px-4 py-2 rounded-lg bg-[#f472b6] hover:bg-[#ec4899] text-white font-semibold transition-all shadow-md shadow-pink-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Mic size={14} />
              {starting ? "Pedindo permissão..." : "Iniciar Gravação"}
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold transition-all shadow-md shadow-red-600/20 flex items-center gap-2"
            >
              <Square size={14} fill="currentColor" />
              Parar e Inserir na Timeline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}