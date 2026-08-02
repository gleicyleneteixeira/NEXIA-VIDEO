import type { Keyframe, KeyframeProp, ItemKeyframes, ClipTransform, ClipFilters } from "./types";

function easeIn(t: number): number {
  return t * t;
}

function easeOut(t: number): number {
  return t * (2 - t);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function interpolateValue(a: number, b: number, t: number, easing: Keyframe["easing"]): number {
  let eased: number;
  switch (easing) {
    case "easeIn": eased = easeIn(t); break;
    case "easeOut": eased = easeOut(t); break;
    case "easeInOut": eased = easeInOut(t); break;
    default: eased = t;
  }
  return a + (b - a) * eased;
}

export function getKeyframeValue(
  keyframes: Keyframe[] | undefined,
  currentFrame: number,
  startFrame: number
): number | undefined {
  if (!keyframes || keyframes.length === 0) return undefined;

  const localFrame = currentFrame - startFrame;

  if (localFrame <= keyframes[0].frame) return keyframes[0].value;
  if (localFrame >= keyframes[keyframes.length - 1].frame) return keyframes[keyframes.length - 1].value;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const kfA = keyframes[i];
    const kfB = keyframes[i + 1];
    if (localFrame >= kfA.frame && localFrame <= kfB.frame) {
      const range = kfB.frame - kfA.frame;
      const t = range === 0 ? 0 : (localFrame - kfA.frame) / range;
      return interpolateValue(kfA.value, kfB.value, t, kfB.easing);
    }
  }

  return keyframes[keyframes.length - 1].value;
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
