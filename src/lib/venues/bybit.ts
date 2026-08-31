import { intervalMs } from "../gravity";
import type { Interval, SymbolCode } from "../types";
import { alignBars, jsonGet, type Candle, type Feed, withTimeout } from "./shared";

type Bybit<T> = { retCode: number; retMsg: string; result?: T };

function bar(interval: Interval): string {
  if (interval === "1m") return "1";
  if (interval === "5m") return "5";
  if (interval === "15m") return "15";
  if (interval === "1H") return "60";
  return "240";
}

function oiPeriod(interval: Interval): string {
  if (interval === "1H") return "1h";
  if (interval === "4H") return "4h";
  if (interval === "15m") return "15min";
  return "5min";
}

async function bybitGet<T>(path: string, signal: AbortSignal): Promise<T> {
  const json = await jsonGet<Bybit<T>>(`https://api.bybit.com${path}`, signal);
  if (json.retCode !== 0) throw new Error(`Bybit ${json.retCode}: ${json.retMsg}`);
  if (json.result === undefined) throw new Error(`Bybit empty ${path}`);
  return json.result;
}

function parseKlines(list: string[][] | undefined): Candle[] {
  if (!list) return [];
  return list
    .map((c) => {
      const close = Number(c[4]);
      const turnover = Number(c[6]);
      const volBase = Number(c[5]);
      const vol =
        Number.isFinite(turnover) && turnover > 0
          ? turnover
          : Number.isFinite(volBase) && volBase > 0 && close > 0
            ? volBase * close
            : 0;
      return { t: Number(c[0]), close, vol };
    })
    .filter((c) => Number.isFinite(c.t) && c.close > 0)
    .sort((a, b) => a.t - b.t);
}

export async function fetchBybit(
  symbol: SymbolCode,
  interval: Interval,
  _window: number,
): Promise<Feed> {
  const pair = `${symbol}USDT`;
  const iv = bar(interval);
  const oiIv = oiPeriod(interval);
  const limit = 180;
  const { signal, clear } = withTimeout(9000);
  try {
    const [spotRaw, perpRaw, oiRaw, tickRaw] = await Promise.all([
      bybitGet<{ list?: string[][] }>(
        `/v5/market/kline?category=spot&symbol=${pair}&interval=${iv}&limit=${limit}`,
        signal,
      ),
      bybitGet<{ list?: string[][] }>(
        `/v5/market/kline?category=linear&symbol=${pair}&interval=${iv}&limit=${limit}`,
        signal,
      ),
      bybitGet<{ list?: { openInterest: string; timestamp: string }[] }>(
        `/v5/market/open-interest?category=linear&symbol=${pair}&intervalTime=${oiIv}&limit=200`,
        signal,
      ).catch(() => ({ list: [] })),
      bybitGet<{
        list?: {
          fundingRate?: string;
          markPrice?: string;
          indexPrice?: string;
          openInterestValue?: string;
        }[];
      }>(`/v5/market/tickers?category=linear&symbol=${pair}`, signal).catch(() => ({ list: [] })),
    ]);

    const spot = parseKlines(spotRaw.list);
    const perp = parseKlines(perpRaw.list);
    const oi = new Map<number, number>();
    for (const row of oiRaw.list ?? []) {
      const t = Number(row.timestamp);
      const contracts = Number(row.openInterest);
      if (!Number.isFinite(t) || !Number.isFinite(contracts)) continue;
      const px = perp.find((p) => p.t === t)?.close ?? perp[perp.length - 1]?.close ?? 0;
      oi.set(t, contracts * (px > 0 ? px : 1));
    }
    const bars = alignBars(spot, perp, oi, intervalMs(interval));
    if (bars.length < 16) throw new Error("bybit aligned series too short");
    const tick = tickRaw.list?.[0];
    const mark = Number(tick?.markPrice);
    const index = Number(tick?.indexPrice);
    const last = bars[bars.length - 1];
    const oiUsd = tick?.openInterestValue ? Number(tick.openInterestValue) : last?.oi ?? null;
    return {
      bars,
      funding: tick?.fundingRate != null ? Number(tick.fundingRate) : null,
      premium: index > 0 && Number.isFinite(mark) ? (mark - index) / index : last ? (last.perp - last.spot) / last.spot : null,
      oiUsd: oiUsd && Number.isFinite(oiUsd) ? oiUsd : null,
    };
  } finally {
    clear();
  }
}
