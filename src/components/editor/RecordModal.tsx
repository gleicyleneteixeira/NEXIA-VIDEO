"use client";

import { useState, useRef, useEffect } from "react";
import { useMediaStore, useProjectStore } from "@/lib/editor";
import { generateId, DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO } from "@/lib/editor";
import type { TimelineItem, MediaFile } from "@/lib/editor";
import { withHistory } from "@/lib/editor/history";
import { Camera, StopCircle, Check, X, Mic, MicOff } from "lucide-react";

interface RecordingDevice {
  deviceId: string;
  label: string;
}

export default function RecordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<"devices" | "preview" | "countdown" | "recording">("devices");
  const [cameras, setCameras] = useState<RecordingDevice[]>([]);
  const [microphones, setMicrophones] = useState<RecordingDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<number | null>(null);
  const recordIntervalRef = useRef<number | null>(null);
  const { addFile } = useMediaStore();
  const { addItem } = useProjectStore();

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const loadDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      const mics = devices.filter((d) => d.kind === "audioinput");

      setCameras(cams.map((c, i) => ({ deviceId: c.deviceId || `camera-${i}`, label: c.label || `Câmera ${i + 1}` })));
      setMicrophones(mics.map((m, i) => ({ deviceId: m.deviceId || `mic-${i}`, label: m.label || `Microfone ${i + 1}` })));
      setStage("devices");
    } catch (err) {
      alert("Não foi possível acessar câmera/microfone. Permita o acesso e tente novamente.");
      onClose();
    }
  };

  useEffect(() => {
    if (open) loadDevices();
    return stopAllTracks;
  }, [open]);

  const startPreview = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play();
      }
      setStage("preview");
    } catch (err) {
      alert("Erro ao acessar dispositivos.");
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    setStage("countdown");
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        startRecording();
      } else {
        setCountdown(count);
      }
    }, 1000);
    countdownRef.current = interval as unknown as number;
  };

  const startRecording = async () => {
    setStage("recording");
    setRecordingTime(0);

    if (streamRef.current) {
      const options: MediaRecorderOptions = { mimeType: "video/webm; codecs=vp9" };
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const file = new File([blob], `gravacao-${Date.now()}.webm`, { type: "video/webm" });
        const url = URL.createObjectURL(file);

        const mediaFile: MediaFile = {
          id: generateId(),
          name: file.name,
          type: "video",
          file,
          url,
          importedAt: Date.now(),
        };

        const { addFile: addMedia } = useMediaStore.getState();
        const media = addMedia(file);

        const { project } = useProjectStore.getState();
        const tl = project.timeline;
        const videoTrackId = tl.trackOrder.find((tid: string) => tl.tracks[tid]?.kind === "video");
        if (videoTrackId) {
          const lastItem = tl.items
            .filter((i) => i.trackId === videoTrackId)
            .sort((a, b) => (a.startFrame + a.durationInFrames) - (b.startFrame + b.durationInFrames))
            .pop();
          const startFrame = lastItem ? lastItem.startFrame + lastItem.durationInFrames : 0;
          const dur = Math.ceil(file.size / 10000);

          const item: TimelineItem = {
            id: generateId(),
            trackId: videoTrackId,
            startFrame,
            durationInFrames: Math.max(dur, 1),
            name: mediaFile.name,
            kind: "video",
            src: media.url,
            file: media.file,
            mediaId: media.id,
            srcInFrame: 0,
            srcOutFrame: Math.max(dur, 1),
            transform: { ...DEFAULT_TRANSFORM },
            filters: { ...DEFAULT_FILTERS },
            crop: { ...DEFAULT_CROP },
            mask: { ...DEFAULT_MASK },
            chromaKey: { ...DEFAULT_CHROMA_KEY },
            blendMode: "normal",
            speed: { ...DEFAULT_SPEED },
            animation: { ...DEFAULT_ANIMATION },
            audio: { ...DEFAULT_AUDIO },
            effects: [],
            hsl: {},
            filterPreset: "none",
            keyframes: {},
          };
          withHistory("Adicionar gravação", () => addItem(item));
        }
      };

      mediaRecorder.start(100);
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      recordIntervalRef.current = interval as unknown as number;
    }
  };

  const stopRecording = () => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setStage("devices");
    setRecordingTime(0);
  };

  const reset = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    stopAllTracks();
    setStage("devices");
    setCountdown(3);
    setRecordingTime(0);
    setCountdown(3);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#0d0d16] border border-[#1e1e2e] rounded-xl w-[640px] max-w-full mx-4">
        <div className="p-4 border-b border-[#1e1e2e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Gravar Vídeo</h3>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {stage === "devices" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Câmera</label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full mt-1 px-2 py-1 bg-[#1a1a28] border border-[#2a2a38] rounded text-xs text-white outline-none focus:border-[#8b5cf6]/50"
                >
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>{cam.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Microfone</label>
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full mt-1 px-2 py-1 bg-[#1a1a28] border border-[#2a2a38] rounded text-xs text-white outline-none focus:border-[#8b5cf6]/50"
                >
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>{mic.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={startPreview}
                  disabled={!cameras.length}
                  className="px-4 py-1.5 bg-[#8b5cf6] text-black text-xs font-medium rounded hover:bg-[#8b5cf6]/80 disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {stage === "preview" && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={previewRef}
                  className="w-full h-[240px] object-cover"
                  muted
                  playsInline
                />
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className={`p-1.5 rounded bg-black/50 ${cameraEnabled ? "text-white" : "text-gray-500"}`}
                  >
                    <Camera size={14} />
                  </button>
                  <button
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`p-1.5 rounded bg-black/50 ${micEnabled ? "text-white" : "text-gray-500"}`}
                  >
                    <Mic size={14} />
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setStage("devices")}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={startCountdown}
                  className="px-4 py-1.5 bg-[#ec4899] text-white text-xs font-medium rounded hover:bg-[#ec4899]/80"
                >
                  Gravar
                </button>
              </div>
            </div>
          )}

          {stage === "countdown" && (
            <div className="flex items-center justify-center h-[280px]">
              <div className="text-[80px] font-bold text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                {countdown > 0 ? countdown : "▶"}
              </div>
            </div>
          )}

          {stage === "recording" && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-[240px] object-cover"
                  muted
                  playsInline
                />
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/30 px-2 py-1 rounded">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-white font-medium">GRAVANDO</span>
                </div>
              </div>
              <div className="text-center text-xs text-gray-400">
                Tempo: {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={stopRecording}
                  className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <StopCircle size={16} />
                  Parar Gravação
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
