import type { Keyframe, KeyframeProp, ItemKeyframes, ClipTransform, ClipFilters } from "./types";

export type KeyframeEasing = Keyframe["easing"];

/**
 * Aplica a curva de aceleração (easing) sobre o progresso linear p ∈ [0,1].
 * Aceita tanto a convenção kebab-case (`ease-in-out`) quanto a camelCase
 * (`easeInOut`) usada no projeto, e garante clamp do progresso.
 */
export function getEasingProgress(p: number, easing: string = "linear"): number {
  const t = Math.max(0, Math.min(1, p));
  switch (easing) {
    case "ease-in":
    case "easeIn":
      return t * t;
    case "ease-out":
    case "easeOut":
      return t * (2 - t);
    case "ease-in-out":
    case "easeInOut":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case "linear":
    default:
      return t;
  }
}

/**
 * Interpolação segmento-a-segmento: valor de A + (valor de B - valor de A) * easedProgress.
 * O easing aplicado é o do keyframe de DESTINO (B), como convencionado no player.
 */
function interpolateSegment(a: number, b: number, p: number, easing?: string): number {
  return a + (b - a) * getEasingProgress(p, easing);
}

/** Acha o instante de um keyframe aceitando tanto `time` (segundos) quanto `frame` (local). */
function timeOf(kf: { time?: number; frame?: number }): number {
  return kf.frame !== undefined ? kf.frame : kf.time !== undefined ? kf.time : 0;
}

export interface InterpolatableKeyframe {
  time?: number;
  frame?: number;
  value: number;
  easing?: string;
}

/**
 * Motor de interpolação rigoroso:
 * 1. Ordena os keyframes por tempo (garantia contra dados fora de ordem).
 * 2. Antes do primeiro → valor do primeiro; depois do último → valor do último.
 * 3. Encontra o par (A, B) que cerca `currentTime`.
 * 4. Progresso linear normalizado p = (t - timeA) / (timeB - timeA).
 * 5. Easing sobre p e valor final interpolado a partir de B.
 */
export function interpolateKeyframes<K extends InterpolatableKeyframe>(
  keyframes: K[] | undefined,
  currentTime: number
): number {
  if (!keyframes || keyframes.length === 0) return 0;

  const sorted = [...keyframes].sort((a, b) => timeOf(a) - timeOf(b));

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const timeFirst = timeOf(first);
  const timeLast = timeOf(last);

  if (currentTime <= timeFirst) return first.value;
  if (currentTime >= timeLast) return last.value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const kfA = sorted[i];
    const kfB = sorted[i + 1];
    const timeA = timeOf(kfA);
    const timeB = timeOf(kfB);
    if (currentTime >= timeA && currentTime <= timeB) {
      const denom = timeB - timeA;
      const p = denom === 0 ? 0 : (currentTime - timeA) / denom;
      return interpolateSegment(kfA.value, kfB.value, p, kfB.easing);
    }
  }

  return first.value;
}

/**
 * Valor interpolado de uma lista de keyframes relativos ao clip
 * (os `frame` já são locais ao startFrame do item).
 * Reinjeita sobre `interpolateKeyframes` para garantir consistência total.
 */
export function getKeyframeValue(
  keyframes: Keyframe[] | undefined,
  currentFrame: number,
  startFrame: number
): number | undefined {
  if (!keyframes || keyframes.length === 0) return undefined;
  const localFrame = currentFrame - startFrame;
  return interpolateKeyframes(keyframes, localFrame);
}

export function applyKeyframes(
  keyframes: ItemKeyframes,
  currentFrame: number,
  startFrame: number,
  transform: ClipTransform,
  filters: ClipFilters
): { transform: ClipTransform; filters: ClipFilters } {
  const t = { ...transform };
  const f = { ...filters };

  const x = getKeyframeValue(keyframes.x, currentFrame, startFrame);
  if (x !== undefined) t.x = x;

  const y = getKeyframeValue(keyframes.y, currentFrame, startFrame);
  if (y !== undefined) t.y = y;

  const scaleX = getKeyframeValue(keyframes.scaleX, currentFrame, startFrame);
  if (scaleX !== undefined) t.scaleX = scaleX;

  const scaleY = getKeyframeValue(keyframes.scaleY, currentFrame, startFrame);
  if (scaleY !== undefined) t.scaleY = scaleY;

  const rotation = getKeyframeValue(keyframes.rotation, currentFrame, startFrame);
  if (rotation !== undefined) t.rotation = rotation;

  const opacity = getKeyframeValue(keyframes.opacity, currentFrame, startFrame);
  if (opacity !== undefined) t.opacity = opacity;

  const brightness = getKeyframeValue(keyframes.brightness, currentFrame, startFrame);
  if (brightness !== undefined) f.brightness = brightness;

  const contrast = getKeyframeValue(keyframes.contrast, currentFrame, startFrame);
  if (contrast !== undefined) f.contrast = contrast;

  const saturation = getKeyframeValue(keyframes.saturation, currentFrame, startFrame);
  if (saturation !== undefined) f.saturation = saturation;

  return { transform: t, filters: f };
}

export function getAllKeyframeFrames(keyframes: ItemKeyframes): number[] {
  const frames = new Set<number>();
  for (const prop of Object.keys(keyframes) as KeyframeProp[]) {
    const kfs = keyframes[prop];
    if (kfs) {
      kfs.forEach((kf) => frames.add(kf.frame));
    }
  }
  return Array.from(frames).sort((a, b) => a - b);
}