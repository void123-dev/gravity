/** Host re-export of the GDI kernel. Prefer `@/gdi` for a port. */
export {
  clamp,
  computeGravity,
  fin,
  intervalMs,
  windowDurationMs,
} from "../gdi/index.ts";
export type { Bar, ComputeGravityInput, GravitySnapshot } from "../gdi/index.ts";
