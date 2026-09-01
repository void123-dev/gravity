/**
 * GDI-1.3 kernel. Pure functions, no I/O, no UI.
 * Port target: copy this folder (math.ts, types.ts, compute.ts).
 */
export { clamp, fin } from "./math.ts";
export { computeGravity, intervalMs, windowDurationMs } from "./compute.ts";
export type {
  Bar,
  ComputeGravityInput,
  CouplingId,
  GravityComponents,
  GravityPoint,
  GravitySnapshot,
  Interval,
  Leader,
  NetAgree,
  NetPull,
  PullDir,
  RegimeId,
  VenuePull,
  VenueVolume,
} from "./types.ts";
export { INTERVALS } from "./types.ts";
