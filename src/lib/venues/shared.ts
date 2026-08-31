import type { Bar, Interval, PitId, SymbolCode, VenueId } from "../types";

export const UA = "GRAVITY/1.3 (https://github.com/void123-dev/gravity)";

export type Candle = {
  t: number;
  close: number;
  vol: number;
  buy?: number;
  sell?: number;
};

export type Feed = {
  bars: Bar[];
  funding: number | null;
  premium: number | null;
  oiUsd: number | null;
};

export function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(timer) };
}

export async function jsonGet<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function firstJson<T>(urls: string[], signal: AbortSignal): Promise<T> {
  let last: Error | undefined;
  for (const url of urls) {
    try {
      return await jsonGet<T>(url, signal);
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw last ?? new Error("no host");
}

export function toMap<T>(rows: T[], ts: (row: T) => number): Map<number, T> {
  const map = new Map<number, T>();
  for (const row of rows) map.set(ts(row), row);
  return map;
}

export function nearest<T>(map: Map<number, T>, t: number, maxDist: number): T | undefined {
  const hit = map.get(t);
  if (hit) return hit;
  let best: T | undefined;
  let bestD = Infinity;
  for (const [k, v] of map) {
    const d = Math.abs(k - t);
    if (d < bestD && d <= maxDist) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function sumTaker(
  map: Map<number, { buy: number; sell: number }>,
  t0: number,
  t1: number,
): { buy: number; sell: number } | undefined {
  let buy = 0;
  let sell = 0;
  let n = 0;
  for (const [k, v] of map) {
    if (k >= t0 && k < t1) {
      buy += v.buy;
      sell += v.sell;
      n++;
    }
  }
  if (n > 0) return { buy, sell };
  return nearest(map, t0, Math.max(t1 - t0, 60_000));
}

export function alignBars(
  spot: Candle[],
  perp: Candle[],
  oi: Map<number, number>,
  ms: number,
  extra?: {
    spotTaker?: Map<number, { buy: number; sell: number }>;
    perpTaker?: Map<number, { buy: number; sell: number }>;
  },
): Bar[] {
  const pMap = toMap(perp, (r) => r.t);
  const maxDist = Math.max(ms, 60_000);
  const bars: Bar[] = [];
  for (const s of spot) {
    const p = nearest(pMap, s.t, maxDist);
    if (!p) continue;
    const oiHit = nearest(oi, s.t, maxDist * 1.2);
    const st = extra?.spotTaker ? sumTaker(extra.spotTaker, s.t, s.t + ms) : undefined;
    const pt = extra?.perpTaker ? sumTaker(extra.perpTaker, s.t, s.t + ms) : undefined;
    bars.push({
      t: s.t,
      spot: s.close,
      perp: p.close,
      spotVol: s.vol,
      perpVol: p.vol,
      oi: oiHit,
      spotBuy: st?.buy ?? s.buy,
      spotSell: st?.sell ?? s.sell,
      perpBuy: pt?.buy ?? p.buy,
      perpSell: pt?.sell ?? p.sell,
    });
  }
  return bars;
}

export function parseVenue(raw: unknown): PitId {
  const v = String(raw ?? "okx").toLowerCase();
  if (v === "all" || v === "consensus" || v === "market") return "all";
  if (v === "binance" || v === "bybit" || v === "okx") return v;
  return "okx";
}

export type Adapter = (
  symbol: SymbolCode,
  interval: Interval,
  window: number,
) => Promise<Feed>;
