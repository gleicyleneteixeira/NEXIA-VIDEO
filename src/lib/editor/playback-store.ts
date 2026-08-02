import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  loopEnabled: boolean;
  volume: number;
  isMuted: boolean;
  playbackLockedReason: string | null;

  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seekTo: (time: number) => void;
  setCurrentTime: (time: number | ((prev: number) => number)) => void;
  setLoop: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  lockPlayback: (reason: string) => void;
  unlockPlayback: () => void;
  seekToMs: (ms: number) => void;
  getCurrentTimeMs: () => number;
}

const getFps = () => {
  if (typeof window !== "undefined" && (window as any).__projectStore) {
    return (window as any).__projectStore.getState().project.timeline.fps || 30;
  }
  return 30;
};

export const usePlaybackStore = create<PlaybackState>()(
  persist(
    ((set: (partial: Partial<PlaybackState> | ((state: PlaybackState) => Partial<PlaybackState>)) => void, get: () => PlaybackState): PlaybackState => ({
      isPlaying: false,
      currentTime: 0,
      loopEnabled: false,
      volume: 80,
      isMuted: false,
      playbackLockedReason: null,

      play: () => {
        if (get().playbackLockedReason) return;
        set({ isPlaying: true });
      },

      pause: () => set({ isPlaying: false }),

      togglePlayback: () => {
        if (get().playbackLockedReason) return;
        set((s: PlaybackState) => ({ isPlaying: !s.isPlaying }));
      },

      seekTo: (time: number) => set({ currentTime: Math.max(0, time) }),

      setCurrentTime: (time: number | ((prev: number) => number)) =>
        set((s: PlaybackState) => ({
          currentTime: typeof time === "function" ? time(s.currentTime) : time,
        })),

      setLoop: (enabled: boolean) => set({ loopEnabled: enabled }),

      setVolume: (volume: number) => set({ volume, isMuted: volume === 0 }),

      toggleMute: () => set((s: PlaybackState) => ({ isMuted: !s.isMuted })),

      lockPlayback: (reason: string) => set({ playbackLockedReason: reason, isPlaying: false }),

      unlockPlayback: () => set({ playbackLockedReason: null }),

      seekToMs: (ms: number) => {
        const fps = getFps();
        set({ currentTime: Math.max(0, Math.round((ms * fps) / 1000)) });
      },

      getCurrentTimeMs: () => {
        const fps = getFps();
        return Math.round((get().currentTime * 1000) / fps);
      },
    })) as StateCreator<PlaybackState, [], [], PlaybackState>,
    {
      name: "contenthub-editor-playback",
      partialize: (state: PlaybackState) => ({
        volume: state.volume,
        loopEnabled: state.loopEnabled,
      }),
    }
  )
);
