import type { GravitySnapshot, Interval, PitId, SymbolCode } from "./types";
import type { VenueCatalog } from "./venues/catalog";

export const GRAVITY_POLL_MS = 15_000;

declare global {
  interface Window {
    __GRAVITY__?: GravitySnapshot;
  }
}

export async function fetchGravity(input: {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue: PitId;
}): Promise<GravitySnapshot> {
  const params = new URLSearchParams({
    symbol: input.symbol,
    interval: input.interval,
    window: String(input.window),
    venue: input.venue,
  });
  const res = await fetch(`/api/gravity?${params.toString()}`);
  if (!res.ok) throw new Error(`gravity ${res.status}`);
  return (await res.json()) as GravitySnapshot;
}

export async function fetchVenueCatalog(): Promise<VenueCatalog> {
  const res = await fetch("/api/venues");
  if (!res.ok) throw new Error(`venues ${res.status}`);
  return (await res.json()) as VenueCatalog;
}

export function readBootSnapshot(): GravitySnapshot | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.__GRAVITY__) return window.__GRAVITY__;
  const el = document.getElementById("gravity-ssr");
  if (!el?.textContent) return undefined;
  try {
    return JSON.parse(el.textContent) as GravitySnapshot;
  } catch {
    return undefined;
  }
}

export function bootScript(data: GravitySnapshot): string {
  return `window.__GRAVITY__=${JSON.stringify(data).replace(/</g, "\\u003c")}`;
}

export function exportHref(input: {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue: PitId;
  format: "json" | "csv";
}): string {
  const params = new URLSearchParams({
    symbol: input.symbol,
    interval: input.interval,
    window: String(input.window),
    venue: input.venue,
    format: input.format,
  });
  if (input.format === "json") params.set("download", "1");
  return `/api/gdi?${params.toString()}`;
}
