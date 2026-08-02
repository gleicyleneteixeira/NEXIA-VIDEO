import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";
import type {
  Project, TimelineItem, TrackFlags, Transition, TransitionType,
  ClipTransform, ClipFilters, ClipCrop, ClipMask, ChromaKey,
  ClipSpeed, ClipAnimation, ClipAudio, BlendMode, FilterPreset,
  VideoEffect, TextProps, CanvasSettings, SpeedCurvePoint, ItemKeyframes,
  Watermark, ExportSettings, BeatMarker,
} from "./types";
import { usePlaybackStore } from "./playback-store";
import { createDefaultProject, generateId, DEFAULT_TRANSFORM, DEFAULT_FILTERS, DEFAULT_CROP, DEFAULT_MASK, DEFAULT_CHROMA_KEY, DEFAULT_SPEED, DEFAULT_ANIMATION, DEFAULT_AUDIO, DEFAULT_WATERMARK, DEFAULT_EXPORT_SETTINGS } from "./types";

function syncCompatibilityFields(item: TimelineItem, fps: number): TimelineItem {
  return {
    ...item,
    startTime: Math.round((item.startFrame * 1000) / fps),
    duration: Math.round((item.durationInFrames * 1000) / fps),
    mediaUrl: item.src,
    trimStart: Math.round(((item.srcInFrame || 0) * 1000) / fps),
    trimEnd: Math.round(((item.srcOutFrame || 0) * 1000) / fps),
  };
}

function migrateItem(item: TimelineItem): TimelineItem {
  const fps = 30;
  const migrated = {
    ...item,
    transform: item.transform || { ...DEFAULT_TRANSFORM },
    filters: item.filters || { ...DEFAULT_FILTERS },
    hsl: item.hsl || {},
    filterPreset: item.filterPreset || "none",
    crop: item.crop || { ...DEFAULT_CROP },
    mask: item.mask || { ...DEFAULT_MASK },
    chromaKey: item.chromaKey || { ...DEFAULT_CHROMA_KEY },
    blendMode: item.blendMode || "normal",
    speed: item.speed || { ...DEFAULT_SPEED },
    animation: item.animation || { ...DEFAULT_ANIMATION },
    audio: item.audio || { ...DEFAULT_AUDIO },
    effects: item.effects || [],
    keyframes: item.keyframes || {},
  };
  return syncCompatibilityFields(migrated, fps);
}

interface ProjectState {
  project: Project;
  setProject: (p: Project) => void;
  updateProjectName: (name: string) => void;

  addItem: (item: TimelineItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<TimelineItem>) => void;
  moveItem: (id: string, patch: { trackId?: string; startFrame?: number }) => void;
  splitItem: (id: string, atFrame: number) => TimelineItem | null;
  duplicateItem: (id: string) => void;
  freezeFrame: (id: string, atFrame: number) => void;
  reverseItem: (id: string) => void;
  mirrorItem: (id: string, axis: "h" | "v") => void;
  rotateItem: (id: string, degrees: number) => void;
  cropItem: (id: string, crop: ClipCrop) => void;
  setItemSpeed: (id: string, rate: number) => void;
  setItemSpeedCurve: (id: string, curve: SpeedCurvePoint[]) => void;
  toggleReverse: (id: string) => void;
  setBlendMode: (id: string, mode: BlendMode) => void;
  setFilterPreset: (id: string, preset: FilterPreset) => void;
  setAnimation: (id: string, anim: Partial<ClipAnimation>) => void;
  setAudioFade: (id: string, fade: ClipAudio["fade"]) => void;
  setVoiceEffect: (id: string, effect: ClipAudio["voiceEffect"]) => void;
  setEQ: (id: string, preset: ClipAudio["eqPreset"]) => void;
  toggleDenoise: (id: string) => void;
  addEffect: (id: string, effect: VideoEffect) => void;
  removeEffect: (id: string, effectId: string) => void;
  toggleEffect: (id: string, effectId: string) => void;
  setMask: (id: string, mask: Partial<ClipMask>) => void;
  setChromaKey: (id: string, key: Partial<ChromaKey>) => void;
  setCanvas: (canvas: Partial<CanvasSettings>) => void;
  setKeyframe: (id: string, prop: string, keyframe: import("./types").Keyframe) => void;
  removeKeyframe: (id: string, prop: string, frame: number) => void;

  setWatermark: (watermark: Partial<Watermark>) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  addBeatMarker: (frame: number, label?: string) => void;
  removeBeatMarker: (id: string) => void;
  moveBeatMarker: (id: string, frame: number) => void;
  clearBeatMarkers: () => void;

  addTrack: (kind: TrackFlags["kind"], name?: string) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, patch: Partial<TrackFlags>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  addTransition: (transition: Transition) => void;
  removeTransition: (id: string) => void;
  updateTransition: (id: string, patch: Partial<Transition>) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    ((set: (partial: Partial<ProjectState> | ((s: ProjectState) => Partial<ProjectState>)) => void, get: () => ProjectState): ProjectState => ({
      project: createDefaultProject(),

      setProject: (p: Project) => set({ project: p }),
      updateProjectName: (name: string) =>
        set((s: ProjectState) => ({ project: { ...s.project, name, updatedAt: new Date().toISOString() } })),

      addItem: (item: TimelineItem) =>
        set((s: ProjectState) => {
          const fps = s.project.timeline.fps || 30;
          return {
            project: { ...s.project, updatedAt: new Date().toISOString(), timeline: { ...s.project.timeline, items: [...s.project.timeline.items, syncCompatibilityFields(item, fps)] } },
          };
        }),

      removeItem: (id: string) =>
        set((s: ProjectState) => {
          const newItems = s.project.timeline.items.filter((i: TimelineItem) => i.id !== id);
          const lastEnd = newItems.length > 0
            ? Math.max(...newItems.map((i: TimelineItem) => i.startFrame + i.durationInFrames))
            : s.project.timeline.fps * 10;
          const now = usePlaybackStore.getState().currentTime;
          if (now > lastEnd) {
            usePlaybackStore.getState().seekTo(Math.max(0, lastEnd - 1));
          }
          return {
            project: {
              ...s.project, updatedAt: new Date().toISOString(),
              timeline: {
                ...s.project.timeline,
                items: newItems,
                transitions: s.project.timeline.transitions.filter((t: Transition) => t.fromItemId !== id && t.toItemId !== id),
              },
            },
          };
        }),

      updateItem: (id: string, patch: Partial<TimelineItem>) =>
        set((s: ProjectState) => {
          const fps = s.project.timeline.fps || 30;
          return {
            project: {
              ...s.project, updatedAt: new Date().toISOString(),
              timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? syncCompatibilityFields({ ...i, ...patch }, fps) : i) },
            },
          };
        }),

      moveItem: (id: string, patch: { trackId?: string; startFrame?: number }) =>
        set((s: ProjectState) => {
          const fps = s.project.timeline.fps || 30;
          return {
            project: {
              ...s.project, updatedAt: new Date().toISOString(),
              timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? syncCompatibilityFields({ ...i, ...patch }, fps) : i) },
            },
          };
        }),

      splitItem: (id: string, atFrame: number): TimelineItem | null => {
        const { project } = get();
        const item = project.timeline.items.find((i: TimelineItem) => i.id === id);
        if (!item) return null;
        const rel = atFrame - item.startFrame;
        if (rel <= 0 || rel >= item.durationInFrames) return null;

        const firstDur = rel;
        const secondDur = item.durationInFrames - rel;
        const speedRate = item.speed.rate || 1;

        const first: TimelineItem = {
          ...item, id: generateId(), durationInFrames: firstDur,
          srcOutFrame: (item.srcInFrame || 0) + Math.round(firstDur * speedRate),
        };
        const second: TimelineItem = {
          ...item, id: generateId(), startFrame: atFrame, durationInFrames: secondDur,
          srcInFrame: (item.srcInFrame || 0) + Math.round(firstDur * speedRate),
        };

        const fps = project.timeline.fps || 30;
        const firstSynced = syncCompatibilityFields(first, fps);
        const secondSynced = syncCompatibilityFields(second, fps);

        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: [...s.project.timeline.items.filter((i: TimelineItem) => i.id !== id), firstSynced, secondSynced] },
          },
        }));
        return second;
      },

      duplicateItem: (id: string) => {
        const { project } = get();
        const item = project.timeline.items.find((i: TimelineItem) => i.id === id);
        if (!item) return;
        const fps = project.timeline.fps || 30;
        const duplicatedItem = syncCompatibilityFields({ ...item, id: generateId(), startFrame: item.startFrame + item.durationInFrames }, fps);
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: [...s.project.timeline.items, duplicatedItem],
            },
          },
        }));
      },

      freezeFrame: (id: string, atFrame: number) => {
        const { project } = get();
        const item = project.timeline.items.find((i: TimelineItem) => i.id === id);
        if (!item || item.kind === "audio") return;
        const freezeDur = 90;
        const freeze: TimelineItem = {
          ...item, id: generateId(), kind: "freeze" as const,
          startFrame: atFrame, durationInFrames: freezeDur,
          srcInFrame: atFrame - item.startFrame + (item.srcInFrame || 0),
          srcOutFrame: atFrame - item.startFrame + (item.srcInFrame || 0) + 1,
          name: `${item.name} (Congelado)`,
        };
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: [...s.project.timeline.items, freeze] },
          },
        }));
      },

      reverseItem: (id: string) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: s.project.timeline.items.map((i: TimelineItem) =>
                i.id === id ? { ...i, speed: { ...i.speed, reverse: !i.speed.reverse } } : i
              ),
            },
          },
        })),

      mirrorItem: (id: string, axis: "h" | "v") =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: s.project.timeline.items.map((i: TimelineItem) =>
                i.id === id
                  ? { ...i, transform: { ...i.transform, flipH: axis === "h" ? !i.transform.flipH : i.transform.flipH, flipV: axis === "v" ? !i.transform.flipV : i.transform.flipV } }
                  : i
              ),
            },
          },
        })),

      rotateItem: (id: string, degrees: number) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: s.project.timeline.items.map((i: TimelineItem) =>
                i.id === id ? { ...i, transform: { ...i.transform, rotation: (i.transform.rotation + degrees) % 360 } } : i
              ),
            },
          },
        })),

      cropItem: (id: string, crop: ClipCrop) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, crop } : i) },
          },
        })),

      setItemSpeed: (id: string, rate: number) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, speed: { ...i.speed, rate } } : i) },
          },
        })),

      setItemSpeedCurve: (id: string, curve: SpeedCurvePoint[]) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, speed: { ...i.speed, curve } } : i) },
          },
        })),

      toggleReverse: (id: string) => {
        const { project } = get();
        const item = project.timeline.items.find((i: TimelineItem) => i.id === id);
        if (!item) return;
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, speed: { ...i.speed, reverse: !i.speed.reverse } } : i) },
          },
        }));
      },

      setBlendMode: (id: string, mode: BlendMode) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, blendMode: mode } : i) },
          },
        })),

      setFilterPreset: (id: string, preset: FilterPreset) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, filterPreset: preset } : i) },
          },
        })),

      setAnimation: (id: string, anim: Partial<ClipAnimation>) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, animation: { ...i.animation, ...anim } } : i) },
          },
        })),

      setAudioFade: (id: string, fade: ClipAudio["fade"]) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, audio: { ...i.audio, fade } } : i) },
          },
        })),

      setVoiceEffect: (id: string, effect: ClipAudio["voiceEffect"]) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, audio: { ...i.audio, voiceEffect: effect } } : i) },
          },
        })),

      setEQ: (id: string, preset: ClipAudio["eqPreset"]) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, audio: { ...i.audio, eqPreset: preset } } : i) },
          },
        })),

      toggleDenoise: (id: string) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, audio: { ...i.audio, denoise: !i.audio.denoise } } : i) },
          },
        })),

      addEffect: (id: string, effect: VideoEffect) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, effects: [...i.effects, effect] } : i) },
          },
        })),

      removeEffect: (id: string, effectId: string) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, effects: i.effects.filter((e: VideoEffect) => e.id !== effectId) } : i) },
          },
        })),

      toggleEffect: (id: string, effectId: string) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: s.project.timeline.items.map((i: TimelineItem) =>
                i.id === id ? { ...i, effects: i.effects.map((e: VideoEffect) => e.id === effectId ? { ...e, enabled: !e.enabled } : e) } : i
              ),
            },
          },
        })),

      setMask: (id: string, mask: Partial<ClipMask>) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, mask: { ...i.mask, ...mask } } : i) },
          },
        })),

      setChromaKey: (id: string, key: Partial<ChromaKey>) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, items: s.project.timeline.items.map((i: TimelineItem) => i.id === id ? { ...i, chromaKey: { ...i.chromaKey, ...key } } : i) },
          },
        })),

      setCanvas: (canvas: Partial<CanvasSettings>) =>
        set((s: ProjectState) => {
          const updatedCanvas = { ...s.project.timeline.canvas, ...canvas };
          const canvasW = updatedCanvas.width;
          const canvasH = updatedCanvas.height;

          // Auto-center and recalculate scale to Preenchimento (Fill) mode
          const updatedItems = s.project.timeline.items.map((item: TimelineItem) => {
            if (["video", "image", "text", "sticker", "freeze", "solid"].includes(item.kind)) {
              let fillScale = 1;
              if (item.mediaWidth && item.mediaHeight) {
                const canvasRatio = canvasW / canvasH;
                const mediaRatio = item.mediaWidth / item.mediaHeight;

                if (mediaRatio > canvasRatio) {
                  fillScale = canvasH / (canvasW / mediaRatio);
                } else {
                  fillScale = canvasW / (canvasH * mediaRatio);
                }
              }

              return {
                ...item,
                transform: {
                  ...item.transform,
                  x: 0,
                  y: 0,
                  scaleX: fillScale,
                  scaleY: fillScale,
                }
              };
            }
            return item;
          });

          return {
            project: {
              ...s.project,
              updatedAt: new Date().toISOString(),
              timeline: {
                ...s.project.timeline,
                canvas: updatedCanvas,
                width: updatedCanvas.width,
                height: updatedCanvas.height,
                items: updatedItems,
              },
            },
          };
        }),

      setKeyframe: (id: string, prop: string, kf: import("./types").Keyframe) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: s.project.timeline.items.map((i: TimelineItem) => {
                if (i.id !== id) return i;
                const existing = (i.keyframes as Record<string, import("./types").Keyframe[]>)[prop] || [];
                const filtered = existing.filter((k: import("./types").Keyframe) => k.frame !== kf.frame);
                return { ...i, keyframes: { ...i.keyframes, [prop]: [...filtered, kf].sort((a: import("./types").Keyframe, b: import("./types").Keyframe) => a.frame - b.frame) } };
              }),
            },
          },
        })),

      removeKeyframe: (id: string, prop: string, frame: number) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              items: s.project.timeline.items.map((i: TimelineItem) => {
                if (i.id !== id) return i;
                const existing = (i.keyframes as Record<string, import("./types").Keyframe[]>)[prop] || [];
                return { ...i, keyframes: { ...i.keyframes, [prop]: existing.filter((k: import("./types").Keyframe) => k.frame !== frame) } };
              }),
            },
          },
        })),

      addTrack: (kind: TrackFlags["kind"], name?: string) => {
        const id = generateId();
        const count = Object.keys(get().project.timeline.tracks).length;
        const track: TrackFlags = { id, name: name || `${kind} ${count + 1}`, kind, hidden: false, muted: false, locked: false };
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, tracks: { ...s.project.timeline.tracks, [id]: track }, trackOrder: [...s.project.timeline.trackOrder, id] },
          },
        }));
      },

      removeTrack: (id: string) =>
        set((s: ProjectState) => {
          const { [id]: _, ...rest } = s.project.timeline.tracks;
          return {
            project: {
              ...s.project, updatedAt: new Date().toISOString(),
              timeline: {
                ...s.project.timeline, tracks: rest,
                trackOrder: s.project.timeline.trackOrder.filter((t: string) => t !== id),
                items: s.project.timeline.items.filter((i: TimelineItem) => i.trackId !== id),
              },
            },
          };
        }),

      updateTrack: (id: string, patch: Partial<TrackFlags>) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, tracks: { ...s.project.timeline.tracks, [id]: { ...s.project.timeline.tracks[id], ...patch } } },
          },
        })),

      reorderTracks: (fromIndex: number, toIndex: number) =>
        set((s: ProjectState) => {
          const order = [...s.project.timeline.trackOrder];
          const [moved] = order.splice(fromIndex, 1);
          order.splice(toIndex, 0, moved);
          return { project: { ...s.project, timeline: { ...s.project.timeline, trackOrder: order } } };
        }),

      addTransition: (transition: Transition) =>
        set((s: ProjectState) => ({
          project: { ...s.project, timeline: { ...s.project.timeline, transitions: [...s.project.timeline.transitions, transition] } },
        })),

      removeTransition: (id: string) =>
        set((s: ProjectState) => ({
          project: { ...s.project, timeline: { ...s.project.timeline, transitions: s.project.timeline.transitions.filter((t: Transition) => t.id !== id) } },
        })),

      updateTransition: (id: string, patch: Partial<Transition>) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: { ...s.project.timeline, transitions: s.project.timeline.transitions.map((t: Transition) => t.id === id ? { ...t, ...patch } : t) },
          },
        })),

      setWatermark: (watermark: Partial<Watermark>) =>
        set((s: ProjectState) => ({
          project: { ...s.project, updatedAt: new Date().toISOString(), watermark: { ...s.project.watermark, ...watermark } },
        })),

      setExportSettings: (settings: Partial<ExportSettings>) =>
        set((s: ProjectState) => ({
          project: { ...s.project, updatedAt: new Date().toISOString(), exportSettings: { ...s.project.exportSettings, ...settings } },
        })),

      addBeatMarker: (frame: number, label?: string) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              beatMarkers: [...s.project.timeline.beatMarkers, { id: generateId(), frame, label }].sort((a: BeatMarker, b: BeatMarker) => a.frame - b.frame),
            },
          },
        })),

      removeBeatMarker: (id: string) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              beatMarkers: s.project.timeline.beatMarkers.filter((m: BeatMarker) => m.id !== id),
            },
          },
        })),

      moveBeatMarker: (id: string, frame: number) =>
        set((s: ProjectState) => ({
          project: {
            ...s.project, updatedAt: new Date().toISOString(),
            timeline: {
              ...s.project.timeline,
              beatMarkers: s.project.timeline.beatMarkers.map((m: BeatMarker) => m.id === id ? { ...m, frame } : m).sort((a: BeatMarker, b: BeatMarker) => a.frame - b.frame),
            },
          },
        })),

      clearBeatMarkers: () =>
        set((s: ProjectState) => ({
          project: { ...s.project, updatedAt: new Date().toISOString(), timeline: { ...s.project.timeline, beatMarkers: [] } },
        })),
    })) as StateCreator<ProjectState, [], [], ProjectState>,
    {
      name: "contenthub-editor-project",
      partialize: (state: ProjectState) => ({ project: state.project }),
      merge: (persisted: unknown, current: ProjectState): ProjectState => {
        const data = persisted as { project?: Project };
        if (!data?.project) return current;
        const project = data.project;
        return {
          ...current,
          project: {
            ...project,
            watermark: project.watermark || { ...DEFAULT_WATERMARK },
            exportSettings: project.exportSettings || { ...DEFAULT_EXPORT_SETTINGS },
            timeline: {
              ...project.timeline,
              canvas: project.timeline.canvas || { background: "color" as const, bgColor: "#000000", bgBlurAmount: 20, aspectRatio: "16:9" as const, width: 1920, height: 1080 },
              beatMarkers: project.timeline.beatMarkers || [],
              items: (project.timeline.items || []).map(migrateItem),
              tracks: project.timeline.tracks || {},
              trackOrder: project.timeline.trackOrder || [],
              transitions: project.timeline.transitions || [],
            },
          },
        };
      },
    }
  )
);

if (typeof window !== "undefined") {
  (window as any).__projectStore = useProjectStore;
}
