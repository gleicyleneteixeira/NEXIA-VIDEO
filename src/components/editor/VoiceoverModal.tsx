"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Mic, Square, AlertTriangle, VolumeX, Volume2 } from "lucide-react";
import { useProjectStore, usePlaybackStore, useUIStore } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import type { TimelineItem } from "@/lib/editor";

const BAR_COUNT = 20;
const COUNTDOWN_SECONDS = 3;

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const EMPTY_LEVELS = new Array(BAR_COUNT).fill(0);

/**
 * Gravação de narração (voiceover) estilo CapCut:
 *  - Solicita a permissão do microfone AO ABRIR o modal (getUserMedia).
 *  - Contagem regressiva 3 → 2 → 1 antes de gravar.
 *  - Sync com a timeline: o clipe começa exatamente no frame onde a gravação
 *    começou (currentTime) e a duração é (currentTime ao parar) − início.
 *  - Play automático do projeto durante a gravação (com opção de silenciar o
 *    vídeo para evitar microfonia).
 *  - VU meter em tempo real (AnalyserNode) alimentando as barras.
 *  - Auto-stop quando a timeline chega ao fim (Preview pausa → finaliza).
 *  - Libera o stream/contexto ao fechar para o navegador não manter o mic ativo.
 */
export default function VoiceoverModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<"idle" | "countdown" | "recording">("idle");
  const [micReady, setMicReady] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(EMPTY_LEVELS);
  const [starting, setStarting] = useState(false);
  // Silenciar o vídeo durante a gravação vem MARCADO por padrão — evita que a
  // narração capture o áudio do próprio projeto (eco/microfonia).
  const [muteWhileRecording, setMuteWhileRecording] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startFrameRef = useRef(0);
  const discardRef = useRef(false);
  const muteSnapshotRef = useRef<{ trackId: string; muted: boolean }[]>([]);

  const stopMeter = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    if (countdownRef.current !== null) clearInterval(countdownRef.current);
    countdownRef.current = null;
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

  // Cria o stream do microfone + MediaRecorder + AnalyserNode (VU meter).
  const ensureMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      recorderRef.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      setMicReady(true);
      setError(null);

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
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? `Não foi possível acessar o microfone: ${e.message}`
          : "Não foi possível acessar o microfone."
      );
      return false;
    }
  }, []);

  // Silencia temporariamente as trilhas de vídeo (evita microfonia na gravação).
  const applyMuteSnapshot = useCallback(() => {
    const tl = useProjectStore.getState().project.timeline;
    muteSnapshotRef.current = tl.trackOrder
      .filter((tid) => tl.tracks[tid]?.kind === "video")
      .map((tid) => ({ trackId: tid, muted: !!tl.tracks[tid]?.muted }));
    muteSnapshotRef.current.forEach(({ trackId }) => {
      useProjectStore.getState().updateTrack(trackId, { muted: true });
    });
  }, []);

  const restoreMuteSnapshot = useCallback(() => {
    const snap = muteSnapshotRef.current;
    muteSnapshotRef.current = [];
    snap.forEach(({ trackId, muted }) => {
      useProjectStore.getState().updateTrack(trackId, { muted });
    });
  }, []);

  const finalize = useCallback((blob: Blob) => {
    const fps = useProjectStore.getState().project.timeline.fps || 30;
    const endFrame = usePlaybackStore.getState().currentTime;
    // Duração sincronizada com a timeline (currentTime está em frames).
    const durationInFrames = Math.max(
      Math.round(fps * 0.5),
      Math.round(endFrame - startFrameRef.current)
    );
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
    setMicReady(false);
    onClose();
  }, [onClose, releaseResources]);

  const handleStop = useCallback(() => {
    const recorder = recorderRef.current;
    stopMeter();
    setStage("idle");
    usePlaybackStore.getState().pause();
    restoreMuteSnapshot();

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        if (discardRef.current) return;
        finalize(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.stop();
    } else if (!discardRef.current) {
      finalize(new Blob(chunksRef.current, { type: "audio/webm" }));
    }
  }, [stopMeter, restoreMuteSnapshot, finalize]);

  const beginRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    startFrameRef.current = usePlaybackStore.getState().currentTime || 0;
    setElapsedMs(0);
    setStage("recording");
    discardRef.current = false;

    recorder.onstop = () => {
      if (discardRef.current) return;
      finalize(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
    };
    recorder.start(100);
    usePlaybackStore.getState().play();

    // Timer sincronizado com o relógio da timeline + auto-stop no fim da peça.
    timerRef.current = setInterval(() => {
      const fps = useProjectStore.getState().project.timeline.fps || 30;
      setElapsedMs(Math.max(0, ((usePlaybackStore.getState().currentTime - startFrameRef.current) * 1000) / fps));
      if (!usePlaybackStore.getState().isPlaying) {
        handleStop();
      }
    }, 100);
  }, [handleStop, finalize]);

  const startCountdown = useCallback(() => {
    // Muda o estado do vídeo AINDA na contagem (3..2..1), não só ao gravar.
    if (muteWhileRecording) applyMuteSnapshot();
    setCountdown(COUNTDOWN_SECONDS);
    setStage("countdown");
    let count = COUNTDOWN_SECONDS;
    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        if (countdownRef.current !== null) clearInterval(countdownRef.current);
        countdownRef.current = null;
        beginRecording();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [muteWhileRecording, applyMuteSnapshot, beginRecording]);

  const handleStart = useCallback(async () => {
    setError(null);
    if (!streamRef.current) {
      setStarting(true);
      const ok = await ensureMic();
      setStarting(false);
      if (!ok) return;
    }
    startCountdown();
  }, [ensureMic, startCountdown]);

  // Solicita permissão do microfone e inicia o medidor VU.
  useEffect(() => {
    if (!open) return;
    discardRef.current = false;
    // ensureMic só notifica o estado (setMicReady/setError) de forma assíncrona,
    // após o await do getUserMedia — nada de setState síncrono aqui.
    Promise.resolve().then(() => ensureMic());
  }, [open, ensureMic]);

  // Cleanup ao desmontar (o modal é remontado por ciclo de abertura via `key`
  // no Timeline, então unmount == fechamento): descarta a captura em andamento
  // SEM inserir clipe, pausa o playback, restaura o som do vídeo e libera o
  // microfone — o navegador não mantém o stream ativo.
  useEffect(() => {
    return () => {
      discardRef.current = true;
      if (usePlaybackStore.getState().isPlaying) usePlaybackStore.getState().pause();
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      restoreMuteSnapshot();
      stopMeter();
      releaseResources();
    };
  }, [stopMeter, releaseResources, restoreMuteSnapshot]);

  if (!open) return null;

  const recording = stage === "recording";
  const inCountdown = stage === "countdown";
  const levelsToShow = recording ? levels : micReady ? levels.map((l) => l * 0.55) : EMPTY_LEVELS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => { if (!recording && !inCountdown) onClose(); }}
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
          <span className={`text-[10px] font-semibold ${recording ? "text-red-400 animate-pulse" : "text-gray-500"}`}>
            {recording ? "GRAVANDO" : micReady ? "Microfone pronto" : starting ? "Solicitando permissão..." : "Sem microfone"}
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
              {recording ? formatElapsed(elapsedMs) : "00:00"}
            </span>
          </div>
          <div className="flex items-end gap-[3px] h-10 bg-black/40 rounded-md px-2 py-1.5">
            {levelsToShow.map((lvl, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-[height] duration-75"
                style={{
                  height: `${Math.round(Math.max(lvl, 0.04) * 100)}%`,
                  backgroundColor: lvl > 0.8 ? "#f43f5e" : lvl > 0.5 ? "#f472b6" : "#22d3ee",
                  opacity: recording || micReady ? 0.9 : 0.15,
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contagem regressiva centralizada (3, 2, 1) */}
        {inCountdown && (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="text-[72px] font-bold text-white drop-shadow-[0_0_24px_rgba(244,114,182,0.6)] leading-none animate-in zoom-in-90 duration-200">
              {countdown}
            </div>
            <p className="text-[11px] text-white/50">Prepare-se… a gravação começa automaticamente.</p>
          </div>
        )}

        {/* Botão circular Gravar / Parar (feedback pulsante vermelho) */}
        <div className="flex flex-col items-center gap-3 py-1">
          <button
            onClick={recording ? () => handleStop() : handleStart}
            disabled={starting || inCountdown}
            title={recording ? "Parar e inserir na timeline" : "Iniciar gravação (conta 3, 2, 1)"}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              recording
                ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 animate-pulse ring-4 ring-red-600/30"
                : "bg-[#ec4899] hover:bg-[#db2777] text-white shadow-lg shadow-pink-600/30"
            }`}
          >
            {recording ? <Square size={22} fill="currentColor" /> : <Mic size={22} />}
            {recording && <span className="absolute inset-0 rounded-full border-2 border-red-400/60 animate-ping pointer-events-none" />}
          </button>
          <span className="text-[11px] text-gray-400">
            {starting
              ? "Pedindo permissão do microfone…"
              : recording
                ? "Gravando — parar para inserir na timeline"
                : inCountdown
                  ? "Contagem regressiva…"
                  : micReady
                    ? "Toque para gravar (3, 2, 1)"
                    : "Clique para solicitar o microfone"}
          </span>

          {/* Checkbox: silenciar vídeo durante a contagem e a gravação */}
          <label className={`flex items-center gap-2 cursor-pointer select-none transition-colors ${inCountdown || recording ? "opacity-50 cursor-not-allowed text-gray-500" : "text-gray-300 hover:text-white"}`}>
            <button
              type="button"
              role="checkbox"
              aria-checked={muteWhileRecording}
              disabled={inCountdown || recording}
              onClick={() => setMuteWhileRecording((v) => !v)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                muteWhileRecording ? "bg-[#f472b6] border-[#f472b6]" : "border-white/30 bg-black/30"
              }`}
            >
              {muteWhileRecording && <span className="text-[10px] text-white font-bold">✓</span>}
            </button>
            <span className="flex items-center gap-1 text-[11px]">
              {muteWhileRecording ? <VolumeX size={12} className="text-[#f472b6]" /> : <Volume2 size={12} className="text-gray-500" />}
              Silenciar vídeo durante a gravação
            </span>
          </label>
        </div>

        <p className="text-[10px] text-white/40 leading-relaxed border-t border-white/10 pt-3">
          A gravação inicia após a contagem com o vídeo tocando no ponto da agulha.
          Ao parar (ou chegar ao fim da timeline), o clipe de áudio entra na faixa
          de narração exatamente onde a gravação começou.
        </p>
      </div>
    </div>
  );
}