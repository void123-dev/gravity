/** Portable numeric helpers. No UI, no DOM. */

export function fin(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
