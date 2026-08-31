import { computeGravity, intervalMs } from "./gravity";
import type { Bar, GravitySnapshot, Interval, SymbolCode } from "./types";

const OKX = "https://www.okx.com";

type OkxCandle = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const cache = new Map<string, { at: number; data: GravitySnapshot }>();
const TTL_MS = 12_000;

function instIds(symbol: SymbolCode) {
  return {
    spot: `${symbol}-USDT`,
    swap: `${symbol}-USDT-SWAP`,
    ccy: symbol,
  };
}

function barSize(interval: Interval): string {
  return interval;
}

function auxPeriod(interval: Interval): "5m" | "1H" {
  return interval === "1H" || interval === "4H" ? "1H" : "5m";
}

async function okxGet<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(`${OKX}${path}`, {
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "GRAVITY/1.0 (openmarket indicator)",
    },
  });
  if (!res.ok) throw new Error(`OKX ${res.status} ${path}`);
  const json = (await res.json()) as { code?: string; msg?: string; data?: T };
  if (json.code && json.code !== "0") {
    throw new Error(`OKX ${json.code}: ${json.msg ?? path}`);
  }
  if (json.data === undefined) throw new Error(`OKX empty ${path}`);
  return json.data;
}

function toMap<T>(
  rows: T[],
  ts: (row: T) => number,
): Map<number, T> {
  const map = new Map<number, T>();
  for (const row of rows) map.set(ts(row), row);
  return map;
}

function sumTaker(
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

function nearest<T>(
  map: Map<number, T>,
  t: number,
  maxDist: number,
): T | undefined {
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

function parseCandles(raw: OkxCandle[]): { t: number; close: number; vol: number }[] {
  const rows = raw
    .map((c) => {
      const close = Number(c[4]);
      const volQuote = Number(c[7]);
      const volCcy = Number(c[6]);
      const volBase = Number(c[5]);
      const vol =
        Number.isFinite(volQuote) && volQuote > 0
          ? volQuote
          : Number.isFinite(volCcy) && volCcy > 0
            ? volCcy
            : Number.isFinite(volBase) && volBase > 0 && close > 0
              ? volBase * close
              : 0;
      return { t: Number(c[0]), close, vol };
    })
    .filter((c) => Number.isFinite(c.t) && c.close > 0)
    .sort((a, b) => a.t - b.t);
  return rows;
}

type TakerRow = [string, string, string];
type OiRow = [string, string, string, string];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DEMO_PX: Record<SymbolCode, number> = {
  BTC: 79600,
  ETH: 2480,
  SOL: 152,
  XRP: 2.38,
  DOGE: 0.142,
  BNB: 618,
};

function buildDemo(
  symbol: SymbolCode,
  interval: Interval,
  window: number,
): GravitySnapshot {
  const n = Math.max(window + 40, 140);
  const ms = intervalMs(interval);
  const now = Math.floor(Date.now() / ms) * ms;
  const rng = mulberry32(hashStr(symbol) + Math.floor(Date.now() / 180_000));
  const shocks: number[] = [];
  const vol = symbol === "BTC" ? 0.0011 : symbol === "ETH" ? 0.0014 : 0.002;
  for (let i = 0; i < n + 4; i++) {
    shocks.push((rng() - 0.49) * vol * (rng() > 0.94 ? 3.2 : 1));
  }
  let spot = DEMO_PX[symbol] * (0.992 + rng() * 0.016);
  let perp = spot;
  let oi = 2.1e9 * (0.8 + rng() * 0.5);
  const bars: Bar[] = [];
  const lag = 2;
  for (let i = 0; i < n; i++) {
    const perpShock = shocks[i + lag] ?? 0;
    const spotShock = (shocks[i] ?? 0) * 0.72 + (rng() - 0.5) * vol * 0.25;
    perp *= Math.exp(perpShock);
    spot *= Math.exp(spotShock);
    const basisDrift = (rng() - 0.5) * 0.00012;
    perp = perp * (1 + basisDrift);
    oi *= 1 + (perpShock * 4 + (rng() - 0.5) * 0.004);
    const t = now - (n - 1 - i) * ms;
    const pBuy = 0.42 + rng() * 0.22 + Math.sign(perpShock) * 0.08;
    const sBuy = 0.42 + rng() * 0.22 + Math.sign(spotShock) * 0.05;
    const pVol = 8e6 * (0.6 + rng());
    const sVol = 2e6 * (0.6 + rng());
    bars.push({
      t,
      spot,
      perp,
      spotVol: sVol,
      perpVol: pVol,
      oi,
      spotBuy: sVol * sBuy,
      spotSell: sVol * (1 - sBuy),
      perpBuy: pVol * pBuy,
      perpSell: pVol * (1 - pBuy),
    });
  }
  return computeGravity({
    bars,
    window,
    symbol,
    interval,
    source: "demo",
    funding: (rng() - 0.45) * 0.00008,
    premium: (perp - spot) / spot,
    oiUsd: oi,
  });
}

async function fetchLive(
  symbol: SymbolCode,
  interval: Interval,
  window: number,
): Promise<GravitySnapshot> {
  const { spot, swap, ccy } = instIds(symbol);
  const bar = barSize(interval);
  const period = auxPeriod(interval);
  const limit = 180;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);

  try {
    const [spotRaw, perpRaw, oiRaw, spotTaker, perpTaker, fundingRaw, oiNow] =
      await Promise.all([
        okxGet<OkxCandle[]>(
          `/api/v5/market/candles?instId=${spot}&bar=${bar}&limit=${limit}`,
          ctrl.signal,
        ),
        okxGet<OkxCandle[]>(
          `/api/v5/market/candles?instId=${swap}&bar=${bar}&limit=${limit}`,
          ctrl.signal,
        ),
        okxGet<OiRow[]>(
          `/api/v5/rubik/stat/contracts/open-interest-history?instId=${swap}&period=${period}&limit=200`,
          ctrl.signal,
        ).catch(() => [] as OiRow[]),
        okxGet<TakerRow[]>(
          `/api/v5/rubik/stat/taker-volume?ccy=${ccy}&instType=SPOT&period=${period}&limit=200`,
          ctrl.signal,
        ).catch(() => [] as TakerRow[]),
        okxGet<TakerRow[]>(
          `/api/v5/rubik/stat/taker-volume?ccy=${ccy}&instType=CONTRACTS&period=${period}&limit=200`,
          ctrl.signal,
        ).catch(() => [] as TakerRow[]),
        okxGet<
          { fundingRate: string; premium: string; nextFundingRate?: string }[]
        >(`/api/v5/public/funding-rate?instId=${swap}`, ctrl.signal).catch(
          () => [],
        ),
        okxGet<{ oiUsd: string }[]>(
          `/api/v5/public/open-interest?instId=${swap}`,
          ctrl.signal,
        ).catch(() => []),
      ]);

    const spotBars = parseCandles(spotRaw);
    const perpBars = parseCandles(perpRaw);
    const perpMap = toMap(perpBars, (r) => r.t);
    const oiMap = toMap(
      oiRaw.map((r) => ({
        t: Number(r[0]),
        oi: Number(r[3] || r[2] || r[1]),
      })),
      (r) => r.t,
    );
    const sTakerMap = toMap(
      spotTaker.map((r) => ({
        t: Number(r[0]),
        sell: Number(r[1]),
        buy: Number(r[2]),
      })),
      (r) => r.t,
    );
    const pTakerMap = toMap(
      perpTaker.map((r) => ({
        t: Number(r[0]),
        sell: Number(r[1]),
        buy: Number(r[2]),
      })),
      (r) => r.t,
    );

    const ms = intervalMs(interval);
    const maxDist = Math.max(ms, intervalMs(period === "1H" ? "1H" : "5m"));
    const bars: Bar[] = [];
    for (const s of spotBars) {
      const p = nearest(perpMap, s.t, maxDist);
      if (!p) continue;
      const oi = nearest(oiMap, s.t, maxDist * 1.2);
      const st = sumTaker(sTakerMap, s.t, s.t + ms);
      const pt = sumTaker(pTakerMap, s.t, s.t + ms);
      // OKX SPOT taker-volume is base (BTC); CONTRACTS is quote (USDT).
      const spotPx = s.close > 0 ? s.close : 0;
      bars.push({
        t: s.t,
        spot: s.close,
        perp: p.close,
        spotVol: s.vol,
        perpVol: p.vol,
        oi: oi?.oi,
        spotBuy: st && spotPx ? st.buy * spotPx : st?.buy,
        spotSell: st && spotPx ? st.sell * spotPx : st?.sell,
        perpBuy: pt?.buy,
        perpSell: pt?.sell,
      });
    }

    if (bars.length < 16) throw new Error("aligned series too short");

    const fund = fundingRaw[0];
    const oiUsd = oiNow[0]?.oiUsd ? Number(oiNow[0].oiUsd) : (bars[bars.length - 1]?.oi ?? null);

    return computeGravity({
      bars,
      window,
      symbol,
      interval,
      source: "okx",
      funding: fund ? Number(fund.fundingRate) : null,
      premium: fund ? Number(fund.premium) : null,
      oiUsd: oiUsd && Number.isFinite(oiUsd) ? oiUsd : null,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function loadGravity(input: {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
}): Promise<GravitySnapshot> {
  const key = `${input.symbol}:${input.interval}:${input.window}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const data = await fetchLive(input.symbol, input.interval, input.window);
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    const data = buildDemo(input.symbol, input.interval, input.window);
    cache.set(key, { at: Date.now(), data });
    return data;
  }
}
