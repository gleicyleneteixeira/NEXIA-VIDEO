import type { ClipSpeed, SpeedCurvePoint } from "./types";

// Computes which SOURCE frame should be displayed at a given timeline
// `localFrame`, based on the item's linear speed and/or speed curve.
// The clip's timeline duration is kept unchanged (we only remap time).

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function curveAt(curve: SpeedCurvePoint[], f: number, duration: number): number {
  if (curve.length === 0) return 1;
  if (curve.length === 1) return curve[0].speed;
  if (f <= curve[0].frame) return curve[0].speed;
  const last = curve[curve.length - 1];
  if (f >= last.frame) return last.speed;

  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    if (f >= a.frame && f <= b.frame) {
      const span = b.frame - a.frame;
      const t = span === 0 ? 0 : (f - a.frame) / span;
      return a.speed + (b.speed - a.speed) * t;
    }
  }
  return last.speed;
}

// ∫ speed over [fromFrame, f]. Uses the curve if present, otherwise the const rate.
function integratedAt(
  curve: SpeedCurvePoint[] | null,
  rate: number,
  fromFrame: number,
  f: number
): number {
  if (!curve || curve.length < 2) {
    // constant speed => ∫ = rate * t
    return rate * Math.max(0, f - fromFrame);
  }

  const step = Math.max(1, Math.round((f - fromFrame) / 40)); // 40 samples, cheap
  let acc = 0;
  let p = fromFrame;
  let prev = curveAt(curve, p, f);
  for (let x = fromFrame + step; x <= f + 1e-9; x += step) {
    const cur = curveAt(curve, Math.min(x, f), f);
    acc += ((cur + prev) / 2) * Math.min(step, x - p);
    p = x;
    prev = cur;
  }
  if (p < f) {
    const cur = curveAt(curve, f, f);
    acc += ((cur + prev) / 2) * (f - p);
  }
  return acc;
}

export function computeSourceFrame(
  localFrame: number,
  durationInFrames: number,
  srcInFrame: number,
  srcOutFrame: number,
  speed: ClipSpeed
): number {
  const srcIn = srcInFrame || 0;
  const srcOut = srcOutFrame && srcOutFrame > srcIn ? srcOutFrame : srcIn + durationInFrames;
  const range = Math.max(1, srcOut - srcIn);
  const rate = Math.max(0.05, speed?.rate || 1);
  const curve = speed?.curve && speed.curve.length >= 2 ? speed.curve : null;
  const reverse = !!speed?.reverse;

  let p: number; // normalized progress 0..1 through the mapping
  if (curve) {
    const total = integratedAt(curve, rate, 0, durationInFrames);
    const acc = integratedAt(curve, rate, 0, Math.min(localFrame, durationInFrames));
    p = total > 0 ? clamp01(acc / total) : clamp01(localFrame / Math.max(1, durationInFrames));
  } else {
    // Constant speed: consumed source grows with rate, relative to the window.
    const consumed = (localFrame / Math.max(1, durationInFrames)) * range * rate;
    p = clamp01(consumed / range);
  }

  if (reverse) p = 1 - p;
  return srcIn + p * range;
}