export type TrackKind = "video" | "audio" | "text" | "sticker";

export interface TrackFlags {
  id: string;
  name: string;
  kind: TrackKind;
  hidden: boolean;
  muted: boolean;
  locked: boolean;
}

export type ItemKind = "video" | "image" | "audio" | "text" | "sticker" | "solid" | "freeze";

// ── Transform ──────────────────────────────────────────────
export interface ClipTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  flipH: boolean;
  flipV: boolean;
}

// ── Crop ───────────────────────────────────────────────────
export interface ClipCrop {
  enabled: boolean;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ── Filters & Color ────────────────────────────────────────
export interface ClipFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  temperature: number;
  exposure: number;
  highlights: number;
  shadows: number;
  vignette: number;
  vignetteSoftness: number;
  grain: number;
  grainSize: number;
}

export interface HSLAdjustment {
  hue: number;
  saturation: number;
  luminance: number;
}

export type FilterPreset =
  | "none"
  | "cinematic"
  | "vintage"
  | "retro"
  | "bw"
  | "cold"
  | "warm"
  | "dramatic"
  | "pastel"
  | "vivid"
  | "noir"
  | "dreamy";

// ── Blend Modes ────────────────────────────────────────────
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

// ── Masks ──────────────────────────────────────────────────
export type MaskShape = "circle" | "rectangle" | "diamond" | "film" | "custom";

export interface ClipMask {
  enabled: boolean;
  shape: MaskShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  feather: number;
  invert: boolean;
}

// ── Chroma Key ─────────────────────────────────────────────
export interface ChromaKey {
  enabled: boolean;
  color: string;
  intensity: number;
  shadow: number;
  feather: number;
  spill: number;
}

// ── Speed ──────────────────────────────────────────────────
export interface SpeedCurvePoint {
  frame: number;
  speed: number;
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface ClipSpeed {
  rate: number;
  reverse: boolean;
  freezeFrame: number | null;
  curve: SpeedCurvePoint[];
}

// ── Keyframes ──────────────────────────────────────────────
export interface Keyframe {
  frame: number;
  value: number;
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export type KeyframeProp =
  | "x" | "y" | "scaleX" | "scaleY" | "rotation" | "opacity"
  | "volume" | "brightness" | "contrast" | "saturation";

export type ItemKeyframes = Partial<Record<KeyframeProp, Keyframe[]>>;

// ── Animation Presets ──────────────────────────────────────
export type AnimationPreset =
  | "none"
  | "fade-in" | "fade-out"
  | "zoom-in" | "zoom-out"
  | "slide-left" | "slide-right" | "slide-up" | "slide-down"
  | "rotate-in" | "rotate-out"
  | "bounce-in" | "bounce-out"
  | "blur-in" | "blur-out"
  | "typewriter"
  | "pop-in";

export interface ClipAnimation {
  enter: AnimationPreset;
  exit: AnimationPreset;
  durationInFrames: number;
}

// ── Audio ──────────────────────────────────────────────────
export type FadeType = "none" | "linear" | "exponential" | "logarithmic";

export interface AudioFade {
  in: FadeType;
  inDuration: number;
  out: FadeType;
  outDuration: number;
}

export type VoiceEffect = "none" | "deep" | "high" | "echo" | "megaphone" | "robot" | "chipmunk" | "reverb";

export type EQPreset = "none" | "bass-boost" | "treble-boost" | "vocal" | "flat" | "rock" | "electronic";

export interface ClipAudio {
  fade: AudioFade;
  voiceEffect: VoiceEffect;
  eqPreset: EQPreset;
  denoise: boolean;
}

// ── Text Styles ────────────────────────────────────────────
export type TextStylePreset = "none" | "neon" | "3d" | "gradient" | "outline" | "shadow" | "glitch";

export interface TextGradient {
  enabled: boolean;
  color1: string;
  color2: string;
  angle: number;
}

export interface TextProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  textAlign: "left" | "center" | "right";
  x: number;
  y: number;
  strokeWidth: number;
  strokeColor: string;
  strokeEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowEnabled: boolean;
  stylePreset: TextStylePreset;
  gradient: TextGradient;
  lineHeight: number;
  letterSpacing: number;
}

// ── Stickers ───────────────────────────────────────────────
export interface StickerProps {
  emoji: string;
  size: number;
  rotation: number;
}

// ── Canvas / Project Settings ──────────────────────────────
export type CanvasBackground = "color" | "blur" | "image";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3" | "21:9" | "custom";

export interface CanvasSettings {
  background: CanvasBackground;
  bgColor: string;
  bgImage?: string;
  bgBlurAmount: number;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
}

// ── Transitions ────────────────────────────────────────────
export type TransitionType =
  | "crossfade"
  | "fade"
  | "wipe-left" | "wipe-right" | "wipe-up" | "wipe-down"
  | "slide-left" | "slide-right"
  | "zoom-in" | "zoom-out"
  | "push-left" | "push-right"
  | "blink"
  | "dissolve"
  | "spin";

export interface Transition {
  id: string;
  fromItemId: string;
  toItemId: string;
  trackId: string;
  type: TransitionType;
  durationInFrames: number;
}

// ── Video Effects ──────────────────────────────────────────
export type VideoEffectType =
  | "light-leak"
  | "film-grain"
  | "vhs"
  | "glitch"
  | "chromatic-aberration"
  | "scanlines"
  | "old-film"
  | "bokeh"
  | "lens-flare"
  | "rain"
  | "snow"
  | "fire"
  | "smoke";

export interface VideoEffect {
  id: string;
  type: VideoEffectType;
  intensity: number;
  speed: number;
  color: string;
  enabled: boolean;
}

// ── Timeline Item ──────────────────────────────────────────
export interface TimelineItem {
  id: string;
  trackId: string;
  startFrame: number;
  durationInFrames: number;
  name: string;
  kind: ItemKind;

  src?: string;
  file?: File;
  thumb?: string;
  srcInFrame?: number;
  srcOutFrame?: number;

  transform: ClipTransform;
  filters: ClipFilters;
  hsl: Record<string, HSLAdjustment>;
  filterPreset: FilterPreset;
  crop: ClipCrop;
  mask: ClipMask;
  chromaKey: ChromaKey;
  blendMode: BlendMode;
  speed: ClipSpeed;
  animation: ClipAnimation;
  audio: ClipAudio;
  effects: VideoEffect[];
  keyframes: ItemKeyframes;

  text?: TextProps;
  sticker?: StickerProps;

  // Compatibility fields (milliseconds & CapCut names)
  startTime?: number;
  duration?: number;
  mediaUrl?: string;
  trimStart?: number;
  trimEnd?: number;

  // Natural dimensions
  mediaWidth?: number;
  mediaHeight?: number;
}

// ── Watermark ─────────────────────────────────────────────
export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export interface Watermark {
  enabled: boolean;
  imageUrl?: string;
  text?: string;
  position: WatermarkPosition;
  opacity: number;
  scale: number;
  padding: number;
}

// ── Beat Markers ───────────────────────────────────────────
export interface BeatMarker {
  id: string;
  frame: number;
  label?: string;
}

// ── Export Settings ────────────────────────────────────────
export type ExportPreset = "web" | "social" | "print" | "custom";

export interface ExportSettings {
  fps: 24 | 25 | 30 | 60;
  resolution: "720" | "1080" | "1440" | "2160" | "custom";
  customWidth: number;
  customHeight: number;
  bitrate: number;
  quality: "low" | "medium" | "high" | "ultra";
  format: "mp4" | "webm" | "mov";
  preset: ExportPreset;
}

// ── Template ───────────────────────────────────────────────
export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string;
  tags: string[];
  duration: number;
  aspectRatio: AspectRatio;
  items: TimelineItem[];
  transitions: Transition[];
  tracks: Record<string, TrackFlags>;
  trackOrder: string[];
  author: string;
  downloads: number;
  rating: number;
}

export type TemplateCategory =
  | "reels" | "tiktok" | "youtube" | "stories"
  | "promo" | "evento" | "musica" | "tutorial"
  | "podcast" | "vlog" | "gaming" | "infantil";

// ── Timeline ───────────────────────────────────────────────
export interface Timeline {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  items: TimelineItem[];
  tracks: Record<string, TrackFlags>;
  trackOrder: string[];
  transitions: Transition[];
  canvas: CanvasSettings;
  beatMarkers: BeatMarker[];
}

// ── Project ────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  cloudId?: string;
  thumbnail?: string;
  watermark: Watermark;
  exportSettings: ExportSettings;
  timeline: Timeline;
}

// ── Defaults ───────────────────────────────────────────────
export const DEFAULT_TRANSFORM: ClipTransform = {
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, flipH: false, flipV: false,
};

export const DEFAULT_FILTERS: ClipFilters = {
  brightness: 0, contrast: 1, saturation: 1, hue: 0, blur: 0, temperature: 0,
  exposure: 0, highlights: 0, shadows: 0, vignette: 0, vignetteSoftness: 50,
  grain: 0, grainSize: 50,
};

export const DEFAULT_CROP: ClipCrop = { enabled: false, top: 0, right: 0, bottom: 0, left: 0 };

export const DEFAULT_MASK: ClipMask = {
  enabled: false, shape: "circle", x: 50, y: 50, width: 80, height: 80,
  rotation: 0, feather: 0, invert: false,
};

export const DEFAULT_CHROMA_KEY: ChromaKey = {
  enabled: false, color: "#00ff00", intensity: 0.5, shadow: 0, feather: 0, spill: 0,
};

export const DEFAULT_SPEED: ClipSpeed = {
  rate: 1, reverse: false, freezeFrame: null, curve: [],
};

export const DEFAULT_ANIMATION: ClipAnimation = {
  enter: "none", exit: "none", durationInFrames: 15,
};

export const DEFAULT_AUDIO: ClipAudio = {
  fade: { in: "none", inDuration: 0, out: "none", outDuration: 0 },
  voiceEffect: "none", eqPreset: "none", denoise: false,
};

export const DEFAULT_TEXT_PROPS: TextProps = {
  content: "Texto", fontFamily: "Inter, system-ui, sans-serif", fontSize: 48,
  fontWeight: "bold", fontStyle: "normal", color: "#ffffff",
  backgroundColor: "transparent", backgroundOpacity: 0, textAlign: "center",
  x: 50, y: 50,
  strokeWidth: 0, strokeColor: "#000000", strokeEnabled: false,
  shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 10, shadowOffsetX: 2, shadowOffsetY: 2,
  shadowEnabled: false,
  stylePreset: "none", gradient: { enabled: false, color1: "#8b5cf6", color2: "#ec4899", angle: 0 },
  lineHeight: 1.2, letterSpacing: 0,
};

export const DEFAULT_CANVAS: CanvasSettings = {
  background: "color", bgColor: "#000000", bgBlurAmount: 20,
  aspectRatio: "16:9", width: 1920, height: 1080,
};

export const DEFAULT_WATERMARK: Watermark = {
  enabled: false, position: "bottom-right", opacity: 0.5, scale: 0.15, padding: 20,
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  fps: 30, resolution: "1080", customWidth: 1920, customHeight: 1080,
  bitrate: 8000, quality: "high", format: "mp4", preset: "web",
};

export const ASPECT_RATIOS: Record<AspectRatio, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "4:3": { w: 1440, h: 1080 },
  "21:9": { w: 2560, h: 1080 },
  "custom": { w: 1920, h: 1080 },
};

export const FILTER_PRESETS: Record<FilterPreset, Partial<ClipFilters>> = {
  none: {},
  cinematic: { contrast: 1.2, saturation: 0.85, temperature: 10, exposure: 0.05 },
  vintage: { contrast: 0.9, saturation: 0.7, temperature: 20, hue: 10, brightness: 0.03 },
  retro: { contrast: 1.1, saturation: 0.6, temperature: 15, hue: 20 },
  bw: { saturation: 0, contrast: 1.3 },
  cold: { saturation: 0.9, temperature: -25, contrast: 1.05 },
  warm: { saturation: 1.2, temperature: 25, brightness: 0.03 },
  dramatic: { contrast: 1.5, saturation: 0.8, brightness: -0.05, highlights: -0.2, shadows: -0.2 },
  pastel: { saturation: 0.6, brightness: 0.08, contrast: 0.85 },
  vivid: { saturation: 1.5, contrast: 1.15, brightness: 0.02 },
  noir: { saturation: 0, contrast: 1.4, brightness: -0.03 },
  dreamy: { brightness: 0.08, contrast: 0.85, saturation: 0.7, blur: 1.5, temperature: 10 },
};

export const HSL_COLORS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta"] as const;

export const ANIMATION_PRESETS: { id: AnimationPreset; label: string; category: "enter" | "exit" | "combo" }[] = [
  { id: "fade-in", label: "Fade In", category: "enter" },
  { id: "zoom-in", label: "Zoom In", category: "enter" },
  { id: "slide-left", label: "Slide Esquerda", category: "enter" },
  { id: "slide-right", label: "Slide Direita", category: "enter" },
  { id: "slide-up", label: "Slide Cima", category: "enter" },
  { id: "slide-down", label: "Slide Baixo", category: "enter" },
  { id: "rotate-in", label: "Rotacionar In", category: "enter" },
  { id: "bounce-in", label: "Bounce In", category: "enter" },
  { id: "blur-in", label: "Blur In", category: "enter" },
  { id: "pop-in", label: "Pop In", category: "enter" },
  { id: "typewriter", label: "Typewriter", category: "enter" },
  { id: "fade-out", label: "Fade Out", category: "exit" },
  { id: "zoom-out", label: "Zoom Out", category: "exit" },
  { id: "rotate-out", label: "Rotacionar Out", category: "exit" },
  { id: "bounce-out", label: "Bounce Out", category: "exit" },
  { id: "blur-out", label: "Blur Out", category: "exit" },
];

export const VOICE_EFFECTS: { id: VoiceEffect; label: string }[] = [
  { id: "none", label: "Normal" },
  { id: "deep", label: "Grave" },
  { id: "high", label: "Agudo" },
  { id: "echo", label: "Eco" },
  { id: "megaphone", label: "Megafone" },
  { id: "robot", label: "Robô" },
  { id: "chipmunk", label: "Chipmunk" },
  { id: "reverb", label: "Reverb" },
];

export const EQ_PRESETS: { id: EQPreset; label: string }[] = [
  { id: "none", label: "Flat" },
  { id: "bass-boost", label: "Bass Boost" },
  { id: "treble-boost", label: "Treble Boost" },
  { id: "vocal", label: "Vocal" },
  { id: "rock", label: "Rock" },
  { id: "electronic", label: "Eletrônico" },
];

export const VIDEO_EFFECTS: { id: VideoEffectType; label: string; icon: string }[] = [
  { id: "light-leak", label: "Vazamento de Luz", icon: "☀️" },
  { id: "film-grain", label: "Grão de Filme", icon: "🎞️" },
  { id: "vhs", label: "VHS", icon: "📼" },
  { id: "glitch", label: "Glitch", icon: "⚡" },
  { id: "chromatic-aberration", label: "Aberração Cromática", icon: "🌈" },
  { id: "scanlines", label: "Scanlines", icon: "📺" },
  { id: "old-film", label: "Filme Antigo", icon: "🎬" },
  { id: "bokeh", label: "Bokeh", icon: "✨" },
  { id: "lens-flare", label: "Lens Flare", icon: "💫" },
  { id: "rain", label: "Chuva", icon: "🌧️" },
  { id: "snow", label: "Neve", icon: "❄️" },
  { id: "fire", label: "Fogo", icon: "🔥" },
  { id: "smoke", label: "Fumaça", icon: "💨" },
];

export const TEXT_STYLE_PRESETS: { id: TextStylePreset; label: string }[] = [
  { id: "none", label: "Padrão" },
  { id: "neon", label: "Neon" },
  { id: "3d", label: "3D" },
  { id: "gradient", label: "Gradiente" },
  { id: "outline", label: "Contorno" },
  { id: "shadow", label: "Sombra" },
  { id: "glitch", label: "Glitch" },
];

export const STICKER_EMOJIS = [
  "😀","😂","😍","🥰","😎","🤩","👍","👎","❤️","🔥","⭐","🎉",
  "💯","🚀","🎬","🎵","📸","💡","🎯","🏆","💎","🌈","☀️","🌙",
  "⚡","💥","✨","🌟","🎪","🎭","🎨","📝","📌","🔔","💬","👁️",
];

export const createDefaultProject = (): Project => {
  const v = "v1", a = "a1", t = "t1", s = "s1";
  return {
    id: crypto.randomUUID(), name: "Novo Projeto",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    watermark: { ...DEFAULT_WATERMARK },
    exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
    timeline: {
      id: crypto.randomUUID(), name: "Timeline Principal", fps: 30,
      width: 1920, height: 1080, items: [],
      tracks: {
        [v]: { id: v, name: "Vídeo", kind: "video", hidden: false, muted: false, locked: false },
        [a]: { id: a, name: "Áudio", kind: "audio", hidden: false, muted: false, locked: false },
        [t]: { id: t, name: "Texto", kind: "text", hidden: false, muted: false, locked: false },
        [s]: { id: s, name: "Stickers", kind: "sticker", hidden: false, muted: false, locked: false },
      },
      trackOrder: [v, a, t, s],
      transitions: [],
      canvas: { ...DEFAULT_CANVAS },
      beatMarkers: [],
    },
  };
};

export const generateId = (): string => crypto.randomUUID();

export const createDefaultItem = (partial: Partial<TimelineItem> = {}): TimelineItem => ({
  id: generateId(), trackId: "", startFrame: 0, durationInFrames: 90, name: "Item",
  kind: "video", transform: { ...DEFAULT_TRANSFORM }, filters: { ...DEFAULT_FILTERS },
  hsl: {}, filterPreset: "none", crop: { ...DEFAULT_CROP }, mask: { ...DEFAULT_MASK },
  chromaKey: { ...DEFAULT_CHROMA_KEY }, blendMode: "normal", speed: { ...DEFAULT_SPEED },
  animation: { ...DEFAULT_ANIMATION }, audio: { ...DEFAULT_AUDIO }, effects: [],
  keyframes: {}, ...partial,
});
